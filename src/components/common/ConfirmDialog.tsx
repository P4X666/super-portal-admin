import { Loader2Icon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * 通用确认弹窗（迁移确认 / 白名单删除确认共用）
 * danger=true 时确认按钮为 destructive 样式（删除场景），迁移为普通主按钮
 */
interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  /** 补充说明（如幂等性文案），弱化展示 */
  hint?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  /** 确认按钮 loading（确认请求进行中阻止重复提交） */
  confirmLoading?: boolean
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  hint,
  confirmLabel,
  cancelLabel = '取消',
  danger = false,
  confirmLoading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {hint && <p className="text-caption text-text-tertiary">{hint}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            disabled={confirmLoading}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'destructive' : 'default'}
            disabled={confirmLoading}
            onClick={onConfirm}
          >
            {confirmLoading && <Loader2Icon className="animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
