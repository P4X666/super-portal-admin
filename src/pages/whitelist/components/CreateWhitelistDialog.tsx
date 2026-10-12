import { Loader2Icon } from 'lucide-react'
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
import { MultiSelect } from '@/components/ui/multi-select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import {
  OPEN_ID_MAX_LENGTH,
  REMARK_MAX_LENGTH,
  WHITELIST_FEATURES,
  FEATURE_LABELS,
  type WhitelistFeature,
} from '@/constants/whitelist'
import type { CreateWhitelistBatchResult, CreateWhitelistPayload } from '@/types/whitelist'

/**
 * 新增授权弹窗（PRD §7.6，权限点多选版）
 * - openId 必填 ≤128；feature 必选（可多选，一次批量授权，每项生成一条独立记录）；remark 选填 ≤512，默认预填「操作人：{姓名}」便于追溯
 * - 后端无批量接口，前端循环调用单条 POST；部分成功时弹窗不关：未成功的权限点保留勾选便于重试，
 *   409（openId+feature 已存在）视为「已存在，未重复创建」就地提示
 * - 表单为条件挂载：每次打开重新初始化（预填操作人），无需 effect 重置
 */
interface CreateWhitelistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateMany: (payloads: CreateWhitelistPayload[]) => Promise<CreateWhitelistBatchResult>
  creating: boolean
}

export function CreateWhitelistDialog({
  open,
  onOpenChange,
  onCreateMany,
  creating,
}: CreateWhitelistDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <CreateWhitelistForm onOpenChange={onOpenChange} onCreateMany={onCreateMany} creating={creating} />
      )}
    </Dialog>
  )
}

/** 按 WHITELIST_FEATURES 的枚举顺序排序（结果归集为并发完成序，展示需稳定） */
function sortByCanonicalOrder(features: WhitelistFeature[]): WhitelistFeature[] {
  return WHITELIST_FEATURES.filter((f) => features.includes(f))
}

function CreateWhitelistForm({
  onOpenChange,
  onCreateMany,
  creating,
}: {
  onOpenChange: (open: boolean) => void
  onCreateMany: (payloads: CreateWhitelistPayload[]) => Promise<CreateWhitelistBatchResult>
  creating: boolean
}) {
  const { user } = useAuth()
  const [openId, setOpenId] = useState('')
  const [features, setFeatures] = useState<WhitelistFeature[]>([])
  const [remark, setRemark] = useState(user ? `操作人：${user.name}` : '')
  const [fieldErrors, setFieldErrors] = useState<{ openId?: string; feature?: string; remark?: string }>({})

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {}
    const trimmed = openId.trim()
    if (!trimmed) {
      errors.openId = 'openId 不能为空'
    } else if (trimmed.length > OPEN_ID_MAX_LENGTH) {
      errors.openId = `openId 最长 ${OPEN_ID_MAX_LENGTH} 字符`
    }
    if (features.length === 0) {
      errors.feature = '请至少选择一个权限点'
    }
    if (remark.length > REMARK_MAX_LENGTH) {
      errors.remark = `备注最长 ${REMARK_MAX_LENGTH} 字符`
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validate()) return
    try {
      const result = await onCreateMany(
        features.map((feature) => ({
          openId: openId.trim(),
          feature,
          // 备注被清空时传 undefined（后端写 NULL）
          remark: remark.trim() || undefined,
        })),
      )
      if (result.failed.length === 0 && result.duplicates.length === 0) {
        toast.success(result.succeeded.length > 1 ? `已新增 ${result.succeeded.length} 条授权` : '授权成功')
        onOpenChange(false)
        return
      }
      // 部分成功/部分失败：弹窗保留，仅保留未成功的勾选，便于「确认新增」只重试失败项
      if (result.succeeded.length > 0) {
        toast.success(`已新增 ${result.succeeded.length} 条授权`)
      }
      const notes: string[] = []
      if (result.duplicates.length > 0) {
        notes.push(
          `已存在（未重复创建）：${sortByCanonicalOrder(result.duplicates).map((f) => FEATURE_LABELS[f]).join('、')}`,
        )
      }
      if (result.failed.length > 0) {
        notes.push(
          `新增失败：${sortByCanonicalOrder(result.failed.map((f) => f.feature))
            .map((f) => FEATURE_LABELS[f])
            .join('、')}`,
        )
      }
      setFeatures(sortByCanonicalOrder([...result.duplicates, ...result.failed.map((f) => f.feature)]))
      setFieldErrors({ feature: notes.join('；') })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '新增失败')
    }
  }

  const featureOptions = WHITELIST_FEATURES.map((f) => ({ value: f, label: FEATURE_LABELS[f] }))

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>新增授权</DialogTitle>
        <DialogDescription>
          为一个用户勾选一个或多个权限点，每个权限点生成一条独立记录
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="create-openId" className="text-caption text-text-secondary">
            openId <span className="text-destructive">*</span>
          </label>
          <Input
            id="create-openId"
            value={openId}
            onChange={(e) => setOpenId(e.target.value)}
            placeholder="飞书 openId，如 ou_xxxxxxxx"
            autoComplete="off"
            aria-invalid={fieldErrors.openId ? true : undefined}
            disabled={creating}
          />
          {fieldErrors.openId && (
            <p className="text-caption text-destructive" role="alert">
              {fieldErrors.openId}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-caption text-text-secondary">
            权限点 <span className="text-destructive">*</span>
          </span>
          <MultiSelect
            value={features}
            onValueChange={(next) => {
              setFeatures(next)
              setFieldErrors((prev) => ({ ...prev, feature: undefined }))
            }}
            options={featureOptions}
            placeholder="请选择权限点（可多选）"
            aria-label="权限点"
            invalid={fieldErrors.feature ? true : undefined}
            disabled={creating}
            className="w-full"
          />
          {fieldErrors.feature && (
            <p className="text-caption text-destructive" role="alert">
              {fieldErrors.feature}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="create-remark" className="text-caption text-text-secondary">
            备注<span className="text-text-tertiary">（内部维护，不对外展示）</span>
          </label>
          <Textarea
            id="create-remark"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="选填，默认预填操作人便于追溯"
            aria-invalid={fieldErrors.remark ? true : undefined}
            disabled={creating}
          />
          <div className="flex items-center justify-between">
            {fieldErrors.remark ? (
              <p className="text-caption text-destructive" role="alert">
                {fieldErrors.remark}
              </p>
            ) : (
              <span />
            )}
            <span className="text-caption text-text-placeholder">
              {remark.length}/{REMARK_MAX_LENGTH}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={creating} onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="submit" disabled={creating}>
            {creating && <Loader2Icon className="animate-spin" />}
            确认新增
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
