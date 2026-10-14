import { Loader2Icon, PlusIcon, XIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import type { CreateProgress } from '@/hooks/useSkillMappingMutations'
import {
  CREATE_CHUNK_SIZE,
  CREATE_MAX_ROWS,
  NAME_CN_MAX_LENGTH,
  NAME_EN_MAX_LENGTH,
  SKILL_ID_MAX_LENGTH,
  SKILL_MAPPING_STATUSES,
  SKILL_MODULES,
  SKILL_STATUS_LABELS,
  SKILL_TEXT_MAX_LENGTH,
  type SkillMappingStatus,
} from '@/constants/skillMapping'
import type { CreateSkillMappingBatchResult, CreateSkillMappingPayload } from '@/types/skillMapping'

/**
 * 批量新增 Skill 弹窗（多行动态表单，一次提交多条）
 * - 每行一条记录：skillId/nameEn 必填，nameCn/module 选填；status 与 remark 为整批公共字段
 * - 后端无批量接口，提交时由 mutations 层按 5 条一组分组循环调单条 POST（组内并发、组间串行），
 *   部分成功时弹窗不关：仅保留未成功的行便于重试，409（skillId 已存在）就地提示
 * - 表单为条件挂载：每次打开重新初始化（预填操作人），无需 effect 重置
 */
interface CreateSkillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateMany: (payloads: CreateSkillMappingPayload[]) => Promise<CreateSkillMappingBatchResult>
  creating: boolean
  progress: CreateProgress | null
}

/** 弹窗壳：open=false 时卸载表单，重开即重置 */
export function CreateSkillDialog({
  open,
  onOpenChange,
  onCreateMany,
  creating,
  progress,
}: CreateSkillDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <CreateSkillForm
          onOpenChange={onOpenChange}
          onCreateMany={onCreateMany}
          creating={creating}
          progress={progress}
        />
      )}
    </Dialog>
  )
}

interface SkillDraftRow {
  /** 行标识（自增，仅作 React key / 错误映射，非业务字段） */
  key: number
  skillId: string
  nameEn: string
  nameCn: string
  module: string
}

type SkillRowErrors = Record<number, { skillId?: string; nameEn?: string; nameCn?: string }>

/** 行标识自增序列（模块级计数：仅作 React key / 错误映射，弹窗卸载不重置也无妨） */
let rowKeySeq = 0
function nextRowKey(): number {
  rowKeySeq += 1
  return rowKeySeq
}

function CreateSkillForm({
  onOpenChange,
  onCreateMany,
  creating,
  progress,
}: {
  onOpenChange: (open: boolean) => void
  onCreateMany: (payloads: CreateSkillMappingPayload[]) => Promise<CreateSkillMappingBatchResult>
  creating: boolean
  progress: CreateProgress | null
}) {
  const { user } = useAuth()
  const [rows, setRows] = useState<SkillDraftRow[]>(() => [
    { key: nextRowKey(), skillId: '', nameEn: '', nameCn: '', module: '' },
  ])
  const [status, setStatus] = useState<SkillMappingStatus>('active')
  const [remark, setRemark] = useState(user ? `操作人：${user.name}` : '')
  const [rowErrors, setRowErrors] = useState<SkillRowErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const updateRow = (key: number, patch: Partial<Omit<SkillDraftRow, 'key'>>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))
    setRowErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setFormError(null)
  }

  const addRow = () => {
    setRows((prev) =>
      prev.length >= CREATE_MAX_ROWS
        ? prev
        : [...prev, { key: nextRowKey(), skillId: '', nameEn: '', nameCn: '', module: '' }],
    )
  }

  const removeRow = (key: number) => {
    setRows((prev) => prev.filter((row) => row.key !== key))
    setRowErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const validate = (): boolean => {
    const errors: SkillRowErrors = {}
    // skillId 表单内去重：同批重复必 409，提交前就地拦截
    const idCount = new Map<string, number>()
    for (const row of rows) {
      const trimmed = row.skillId.trim()
      if (trimmed) idCount.set(trimmed, (idCount.get(trimmed) ?? 0) + 1)
    }
    for (const row of rows) {
      const rowError: NonNullable<SkillRowErrors[number]> = {}
      const skillId = row.skillId.trim()
      const nameEn = row.nameEn.trim()
      const nameCn = row.nameCn.trim()
      if (!skillId) {
        rowError.skillId = 'skillId 不能为空'
      } else if (skillId.length > SKILL_ID_MAX_LENGTH) {
        rowError.skillId = `最长 ${SKILL_ID_MAX_LENGTH} 字符`
      } else if ((idCount.get(skillId) ?? 0) > 1) {
        rowError.skillId = 'skillId 在本表单中重复'
      }
      if (!nameEn) {
        rowError.nameEn = '英文名不能为空'
      } else if (nameEn.length > NAME_EN_MAX_LENGTH) {
        rowError.nameEn = `最长 ${NAME_EN_MAX_LENGTH} 字符`
      }
      if (nameCn.length > NAME_CN_MAX_LENGTH) {
        rowError.nameCn = `最长 ${NAME_CN_MAX_LENGTH} 字符`
      }
      if (Object.keys(rowError).length > 0) errors[row.key] = rowError
    }
    setRowErrors(errors)
    return rows.length > 0 && Object.keys(errors).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validate()) return
    const payloads: CreateSkillMappingPayload[] = rows.map((row) => ({
      skillId: row.skillId.trim(),
      nameEn: row.nameEn.trim(),
      // 选填字段清空时传 undefined（后端写 NULL）
      nameCn: row.nameCn.trim() || undefined,
      module: row.module || undefined,
      status,
      remark: remark.trim() || undefined,
    }))
    try {
      const result = await onCreateMany(payloads)
      if (result.failed.length === 0 && result.duplicates.length === 0) {
        toast.success(
          result.succeeded.length > 1 ? `已新增 ${result.succeeded.length} 条 skill` : '新增成功',
        )
        onOpenChange(false)
        return
      }
      // 部分成功/部分失败：弹窗保留，仅保留未成功的行便于修正后重试
      if (result.succeeded.length > 0) {
        toast.success(`已新增 ${result.succeeded.length} 条 skill`)
      }
      const notes: string[] = []
      if (result.duplicates.length > 0) {
        notes.push(
          `已存在（未重复创建）：${result.duplicates.map((p) => p.skillId).join('、')}`,
        )
      }
      if (result.failed.length > 0) {
        notes.push(
          `新增失败：${result.failed.map((f) => `${f.payload.skillId}（${f.message}）`).join('、')}`,
        )
      }
      setRows(
        [...result.duplicates, ...result.failed.map((f) => f.payload)].map((payload) => ({
          key: nextRowKey(),
          skillId: payload.skillId,
          nameEn: payload.nameEn,
          nameCn: payload.nameCn ?? '',
          module: payload.module ?? '',
        })),
      )
      setFormError(notes.join('；'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '新增失败')
    }
  }

  const labelCell = 'text-caption text-text-secondary'

  return (
    <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto thin-scroll">
      <DialogHeader>
        <DialogTitle>新增 Skill</DialogTitle>
        <DialogDescription>
          可一次填写多条（每 {CREATE_CHUNK_SIZE} 条为一批分组提交）；skillId 唯一，重复会提示「已存在」不重复创建
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {/* 表头标签行 */}
          <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_2rem] gap-x-2">
            <span className={labelCell}>
              skillId <span className="text-destructive">*</span>
            </span>
            <span className={labelCell}>
              英文名 <span className="text-destructive">*</span>
            </span>
            <span className={labelCell}>中文名</span>
            <span className={labelCell}>所属模块</span>
            <span />
          </div>

          <div className="thin-scroll flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
            {rows.map((row) => {
              const error = rowErrors[row.key]
              return (
                <div
                  key={row.key}
                  className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_2rem] items-start gap-x-2"
                >
                  <div className="flex flex-col gap-1">
                    <Input
                      value={row.skillId}
                      onChange={(e) => updateRow(row.key, { skillId: e.target.value })}
                      placeholder="如 weather_query"
                      autoComplete="off"
                      aria-invalid={error?.skillId ? true : undefined}
                      aria-label="skillId"
                      disabled={creating}
                    />
                    {error?.skillId && (
                      <p className="text-caption text-destructive" role="alert">
                        {error.skillId}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Input
                      value={row.nameEn}
                      onChange={(e) => updateRow(row.key, { nameEn: e.target.value })}
                      placeholder="同步自 hiagent"
                      autoComplete="off"
                      aria-invalid={error?.nameEn ? true : undefined}
                      aria-label="英文名"
                      disabled={creating}
                    />
                    {error?.nameEn && (
                      <p className="text-caption text-destructive" role="alert">
                        {error.nameEn}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Input
                      value={row.nameCn}
                      onChange={(e) => updateRow(row.key, { nameCn: e.target.value })}
                      placeholder="选填"
                      autoComplete="off"
                      aria-invalid={error?.nameCn ? true : undefined}
                      aria-label="中文名"
                      disabled={creating}
                    />
                    {error?.nameCn && (
                      <p className="text-caption text-destructive" role="alert">
                        {error.nameCn}
                      </p>
                    )}
                  </div>
                  <Select
                    value={row.module || 'none'}
                    onValueChange={(next) => {
                      if (next === null) return
                      updateRow(row.key, { module: next === 'none' ? '' : next })
                    }}
                  >
                    <SelectTrigger className="w-full" aria-label="所属模块" disabled={creating}>
                      <SelectValue>{row.module || '未设置'}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">未设置</SelectItem>
                      {SKILL_MODULES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="移除此行"
                    disabled={creating || rows.length <= 1}
                    className="text-text-tertiary hover:text-destructive"
                    onClick={() => removeRow(row.key)}
                  >
                    <XIcon />
                  </Button>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={creating || rows.length >= CREATE_MAX_ROWS}
              onClick={addRow}
            >
              <PlusIcon data-icon="inline-start" />
              添加一条
            </Button>
            <span className="text-caption text-text-placeholder">
              {rows.length}/{CREATE_MAX_ROWS} 条
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <span className={labelCell}>状态（整批）</span>
            <Select
              value={status}
              onValueChange={(next) => {
                if (next !== null) setStatus(next as SkillMappingStatus)
              }}
            >
              <SelectTrigger className="w-full" aria-label="状态" disabled={creating}>
                <SelectValue>{SKILL_STATUS_LABELS[status]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SKILL_MAPPING_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SKILL_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={labelCell}>
              备注<span className="text-text-tertiary">（整批，内部维护）</span>
            </span>
            <Input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              maxLength={SKILL_TEXT_MAX_LENGTH}
              autoComplete="off"
              disabled={creating}
            />
          </div>
        </div>

        {formError && (
          <p className="text-caption text-destructive" role="alert">
            {formError}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={creating} onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="submit" disabled={creating || rows.length === 0}>
            {creating && <Loader2Icon className="animate-spin" />}
            {creating && progress
              ? `提交中 ${progress.done}/${progress.total}`
              : rows.length > 1
                ? `确认新增（${rows.length} 条）`
                : '确认新增'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
