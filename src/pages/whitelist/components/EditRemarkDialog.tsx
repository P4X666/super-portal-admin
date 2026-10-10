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
import { Textarea } from '@/components/ui/textarea'
import { FEATURE_BADGE_VARIANTS, FEATURE_LABELS, REMARK_MAX_LENGTH } from '@/constants/whitelist'
import { ApiError } from '@/types/api'
import type { UpdateWhitelistPayload, WhitelistItem } from '@/types/whitelist'

/**
 * 修改备注弹窗（PRD §7.1：openId/feature 为定位键不可改，仅 remark 可编辑）
 * - remark 留空提交 = 清空备注（后端把空串归一化为 NULL）
 * - 404（记录已被其他管理员删除）→ 弹窗关闭，列表刷新与提示由页面统一处理
 * - 表单条件挂载：target 变化即重新初始化（remark 取目标记录当前值），无需 effect
 */
interface EditRemarkDialogProps {
  /** 编辑目标（null = 关闭） */
  target: WhitelistItem | null
  onClose: () => void
  onUpdate: (payload: UpdateWhitelistPayload) => Promise<void>
  updating: boolean
}

export function EditRemarkDialog({ target, onClose, onUpdate, updating }: EditRemarkDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      {target && (
        <EditRemarkForm target={target} onClose={onClose} onUpdate={onUpdate} updating={updating} />
      )}
    </Dialog>
  )
}

function EditRemarkForm({
  target,
  onClose,
  onUpdate,
  updating,
}: {
  target: WhitelistItem
  onClose: () => void
  onUpdate: (payload: UpdateWhitelistPayload) => Promise<void>
  updating: boolean
}) {
  const [remark, setRemark] = useState(target.remark ?? '')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = remark.trim()
    if (trimmed.length > REMARK_MAX_LENGTH) {
      setError(`备注最长 ${REMARK_MAX_LENGTH} 字符`)
      return
    }
    try {
      await onUpdate({
        openId: target.openId,
        feature: target.feature,
        remark: trimmed,
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

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>编辑备注</DialogTitle>
        <DialogDescription className="flex flex-wrap items-center gap-2">
          <span className="break-all text-text-secondary">{target.openId}</span>
          <Badge variant={FEATURE_BADGE_VARIANTS[target.feature]}>
            {FEATURE_LABELS[target.feature]}
          </Badge>
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-remark" className="text-caption text-text-secondary">
            备注<span className="text-text-tertiary">（留空提交则清空备注）</span>
          </label>
          <Textarea
            id="edit-remark"
            value={remark}
            onChange={(e) => {
              setRemark(e.target.value)
              setError(null)
            }}
            placeholder="内部维护，不对外展示"
            aria-invalid={error ? true : undefined}
            disabled={updating}
          />
          <div className="flex items-center justify-between">
            {error ? (
              <p className="text-caption text-destructive" role="alert">
                {error}
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
