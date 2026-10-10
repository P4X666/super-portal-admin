import { AlertCircleIcon, RotateCcwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * 错误态 + 重试入口（列表加载失败 / 网络异常统一使用）
 */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <AlertCircleIcon className="size-8 text-destructive" />
      <p className="text-body text-text-secondary">{message || '请求失败，请稍后重试'}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcwIcon data-icon="inline-start" />
          重试
        </Button>
      )}
    </div>
  )
}
