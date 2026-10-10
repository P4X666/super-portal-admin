import type { ReactNode } from 'react'
import { cn } from 'cn'

/**
 * 迁移结果统计卡（三格：数据集数 / 写入条数 / 解析失败条数）
 * warning=true 时数字用警示色（parseFailed > 0 场景）
 */
export function StatCard({
  label,
  value,
  warning = false,
  suffix,
}: {
  label: string
  value: ReactNode
  warning?: boolean
  suffix?: string
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-xl border border-border-weak bg-card px-4 py-3">
      <span className="text-caption text-text-tertiary">{label}</span>
      <span
        className={cn(
          'text-xl font-medium',
          warning ? 'text-warning' : 'text-text-primary',
        )}
      >
        {value}
        {suffix && <span className="ml-1 text-caption font-normal text-text-tertiary">{suffix}</span>}
      </span>
    </div>
  )
}
