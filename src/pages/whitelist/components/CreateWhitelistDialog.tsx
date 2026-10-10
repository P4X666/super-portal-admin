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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import {
  OPEN_ID_MAX_LENGTH,
  REMARK_MAX_LENGTH,
  WHITELIST_FEATURES,
  FEATURE_LABELS,
  type WhitelistFeature,
} from '@/constants/whitelist'
import { ApiError } from '@/types/api'
import type { CreateWhitelistPayload } from '@/types/whitelist'

/**
 * 新增授权弹窗（PRD §7.6）
 * - openId 必填 ≤128；feature 必选；remark 选填 ≤512，默认预填「操作人：{姓名}」便于追溯
 * - 后端 409（openId+feature 已存在）→ 弹窗不关，openId 字段下就地提示
 * - 表单为条件挂载：每次打开重新初始化（预填操作人），无需 effect 重置
 */
interface CreateWhitelistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (payload: CreateWhitelistPayload) => Promise<void>
  creating: boolean
}

export function CreateWhitelistDialog({
  open,
  onOpenChange,
  onCreate,
  creating,
}: CreateWhitelistDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <CreateWhitelistForm onOpenChange={onOpenChange} onCreate={onCreate} creating={creating} />}
    </Dialog>
  )
}

function CreateWhitelistForm({
  onOpenChange,
  onCreate,
  creating,
}: {
  onOpenChange: (open: boolean) => void
  onCreate: (payload: CreateWhitelistPayload) => Promise<void>
  creating: boolean
}) {
  const { user } = useAuth()
  const [openId, setOpenId] = useState('')
  const [feature, setFeature] = useState<WhitelistFeature | null>(null)
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
    if (!feature) {
      errors.feature = '请选择权限点'
    }
    if (remark.length > REMARK_MAX_LENGTH) {
      errors.remark = `备注最长 ${REMARK_MAX_LENGTH} 字符`
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validate() || !feature) return
    try {
      await onCreate({
        openId: openId.trim(),
        feature,
        // 备注被清空时传 undefined（后端写 NULL）
        remark: remark.trim() || undefined,
      })
      toast.success('授权成功')
      onOpenChange(false)
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setFieldErrors({ openId: '该用户已拥有此权限点' })
      } else {
        toast.error(e instanceof Error ? e.message : '新增失败')
      }
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>新增授权</DialogTitle>
        <DialogDescription>
          一条记录 = 一个用户的单个权限点；同一用户可分别授权多个权限点
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
          <Select
            value={feature}
            onValueChange={(next) => {
              if (next === null) return
              setFeature(next as WhitelistFeature)
              setFieldErrors((prev) => ({ ...prev, feature: undefined }))
            }}
          >
            <SelectTrigger className="w-full" aria-invalid={fieldErrors.feature ? true : undefined}>
              <SelectValue>
                {feature ? FEATURE_LABELS[feature] : (
                  <span className="text-text-placeholder">请选择权限点</span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {WHITELIST_FEATURES.map((f) => (
                <SelectItem key={f} value={f}>
                  {FEATURE_LABELS[f]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
