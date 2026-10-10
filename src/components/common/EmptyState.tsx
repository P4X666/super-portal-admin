import { InboxIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * 空数据态（区分「无任何白名单数据」与「筛选/搜索无结果」，PRD §7.7）
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <InboxIcon className="size-8 text-text-tertiary" />
      <p className="text-body text-text-secondary">{title}</p>
      {description && <p className="text-caption text-text-tertiary">{description}</p>}
      {action}
    </div>
  )
}
