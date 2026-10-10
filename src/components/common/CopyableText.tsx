import { CheckIcon, CopyIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from 'cn'

/**
 * 长文本截断 + hover 展示全文 + 一键复制（openId 列 / 顶栏 openId 用）
 * 复制成功短态反馈；剪贴板 API 不可用（非安全上下文）时 toast 降级提示
 */
export function CopyableText({
  text,
  className,
  displayText,
}: {
  text: string
  className?: string
  /** 展示文本（缺省展示原文，截断由容器类控制） */
  displayText?: string
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }

  return (
    <span className={cn('group/copy inline-flex min-w-0 items-center gap-1', className)}>
      <span className="truncate" title={text}>
        {displayText ?? text}
      </span>
      <button
        type="button"
        aria-label={`复制 ${text}`}
        className="shrink-0 text-text-tertiary opacity-0 transition-opacity group-hover/copy:opacity-100 focus-visible:opacity-100"
        onClick={(e) => {
          e.stopPropagation()
          void copy()
        }}
      >
        {copied ? (
          <CheckIcon className="size-3.5 text-badge-green" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </button>
    </span>
  )
}
