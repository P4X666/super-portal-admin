import { Loader2Icon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
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
import { Textarea } from '@/components/ui/textarea'
import {
  NAME_CN_MAX_LENGTH,
  SKILL_MAPPING_STATUSES,
  SKILL_MODULES,
  SKILL_STATUS_LABELS,
  SKILL_TEXT_MAX_LENGTH,
  type SkillMappingStatus,
} from '@/constants/skillMapping'
import { ApiError } from '@/types/api'
import type { SkillMappingItem, UpdateSkillMappingPayload } from '@/types/skillMapping'

/**
 * 编辑 Skill 弹窗（skillId/nameEn 为与 hiagent 的对应键不可改，仅维护人工字段）
 * - 可改：nameCn / module / status / desc / input / output / remark，整表单全量提交（PATCH 语义）
 * - 文本留空提交 = 清空该字段（后端存空串/NULL，列表展示「-」）
 * - 404（记录已被其他管理员删除）→ 弹窗关闭，列表刷新与提示由页面统一处理
 * - 表单条件挂载：target 变化即重新初始化（取目标记录当前值），无需 effect
 */
interface EditSkillDialogProps {
  /** 编辑目标（null = 关闭） */
  target: SkillMappingItem | null
  onClose: () => void
  onUpdate: (id: string, payload: UpdateSkillMappingPayload) => Promise<void>
  updating: boolean
}

export function EditSkillDialog({ target, onClose, onUpdate, updating }: EditSkillDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      {target && (
        <EditSkillForm target={target} onClose={onClose} onUpdate={onUpdate} updating={updating} />
      )}
    </Dialog>
  )
}

/** 长文本字段统一配置（用途说明/输入/输出/备注） */
const TEXT_FIELDS: Array<{ key: 'desc' | 'input' | 'output' | 'remark'; label: string; placeholder: string }> = [
  { key: 'desc', label: '用途说明', placeholder: 'skill 用途，给用户展示' },
  { key: 'input', label: '输入说明', placeholder: '可接受的入参/资料类型，给用户展示' },
  { key: 'output', label: '输出说明', placeholder: '返回结果形态，给用户展示' },
  { key: 'remark', label: '备注', placeholder: '内部维护，不对外展示' },
]

function EditSkillForm({
  target,
  onClose,
  onUpdate,
  updating,
}: {
  target: SkillMappingItem
  onClose: () => void
  onUpdate: (id: string, payload: UpdateSkillMappingPayload) => Promise<void>
  updating: boolean
}) {
  const [nameCn, setNameCn] = useState(target.nameCn ?? '')
  const [module, setModule] = useState(target.module ?? '')
  const [status, setStatus] = useState<SkillMappingStatus>(
    (SKILL_MAPPING_STATUSES as readonly string[]).includes(target.status)
      ? (target.status as SkillMappingStatus)
      : 'pending_translation',
  )
  const [texts, setTexts] = useState({
    desc: target.desc ?? '',
    input: target.input ?? '',
    output: target.output ?? '',
    remark: target.remark ?? '',
  })
  const [error, setError] = useState<string | null>(null)

  const nameCnTrimmed = nameCn.trim()
  const overLimitField = TEXT_FIELDS.find((f) => texts[f.key].length > SKILL_TEXT_MAX_LENGTH)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (nameCnTrimmed.length > NAME_CN_MAX_LENGTH) {
      setError(`中文名最长 ${NAME_CN_MAX_LENGTH} 字符`)
      return
    }
    if (overLimitField) {
      setError(`${overLimitField.label}最长 ${SKILL_TEXT_MAX_LENGTH} 字符`)
      return
    }
    try {
      await onUpdate(target.id, {
        nameCn: nameCnTrimmed,
        module: module.trim() || '',
        status,
        desc: texts.desc.trim(),
        input: texts.input.trim(),
        output: texts.output.trim(),
        remark: texts.remark.trim(),
      })
      toast.success('已保存')
      onClose()
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        onClose() // onNotFound 已提示并刷新列表
      } else {
        setError(e instanceof Error ? e.message : '保存失败')
      }
    }
  }

  const labelClass = 'text-caption text-text-secondary'

  return (
    <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto thin-scroll">
      <DialogHeader>
        <DialogTitle>编辑 Skill</DialogTitle>
        <DialogDescription className="flex flex-wrap items-center gap-2">
          <span className="break-all text-text-secondary">{target.skillId}</span>
          <span className="break-all text-text-tertiary">（{target.nameEn}）</span>
          <Badge variant="outline">{target.module || '未设置模块'}</Badge>
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-skill-nameCn" className={labelClass}>
              中文名
            </label>
            <Input
              id="edit-skill-nameCn"
              value={nameCn}
              onChange={(e) => {
                setNameCn(e.target.value)
                setError(null)
              }}
              placeholder="PM 确认后填写，留空 = 清空"
              autoComplete="off"
              disabled={updating}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>所属模块</span>
            <Select
              value={module.trim() || 'none'}
              onValueChange={(next) => {
                if (next === null) return
                setModule(next === 'none' ? '' : next)
                setError(null)
              }}
            >
              <SelectTrigger className="w-full" aria-label="所属模块" disabled={updating}>
                <SelectValue>{module.trim() || '未设置'}</SelectValue>
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
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>状态</span>
          <Select
            value={status}
            onValueChange={(next) => {
              if (next !== null) setStatus(next as SkillMappingStatus)
            }}
          >
            <SelectTrigger className="w-full" aria-label="状态" disabled={updating}>
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
          <p className="text-caption text-text-placeholder">
            展示中=用户端可见；翻译中=中文名未确认暂不展示；已下线=hiagent 已下线不再展示（不删除记录）
          </p>
        </div>

        {TEXT_FIELDS.map((field) => (
          <div key={field.key} className="flex flex-col gap-1.5">
            <label htmlFor={`edit-skill-${field.key}`} className={labelClass}>
              {field.label}
              <span className="text-text-tertiary">（留空提交则清空）</span>
            </label>
            <Textarea
              id={`edit-skill-${field.key}`}
              value={texts[field.key]}
              onChange={(e) => {
                setTexts((prev) => ({ ...prev, [field.key]: e.target.value }))
                setError(null)
              }}
              placeholder={field.placeholder}
              aria-invalid={overLimitField?.key === field.key ? true : undefined}
              disabled={updating}
            />
            <div className="flex items-center justify-end">
              <span className="text-caption text-text-placeholder">
                {texts[field.key].length}/{SKILL_TEXT_MAX_LENGTH}
              </span>
            </div>
          </div>
        ))}

        {error && (
          <p className="text-caption text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={updating} onClick={onClose}>
            取消
          </Button>
          <Button type="submit" disabled={updating}>
            {updating && <Loader2Icon className="animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
