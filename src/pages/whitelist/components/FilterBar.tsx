import { PlusIcon, SearchIcon } from 'lucide-react'
import {
  WHITELIST_FEATURES,
  FEATURE_LABELS,
  type WhitelistFeature,
} from '@/constants/whitelist'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/** 筛选栏：权限点下拉（服务端过滤，切换即重新请求）+ 当前页 openId 搜索（纯前端过滤，无请求开销故不防抖） */
interface FilterBarProps {
  feature: WhitelistFeature | undefined
  onFeatureChange: (feature: WhitelistFeature | undefined) => void
  keyword: string
  onKeywordChange: (keyword: string) => void
  onCreate: () => void
}

const FILTER_OPTIONS: { value: WhitelistFeature | 'all'; label: string }[] = [
  { value: 'all', label: '全部权限点' },
  ...WHITELIST_FEATURES.map((f) => ({ value: f, label: FEATURE_LABELS[f] })),
]

export function FilterBar({
  feature,
  onFeatureChange,
  keyword,
  onKeywordChange,
  onCreate,
}: FilterBarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <Select
        value={feature ?? 'all'}
        onValueChange={(next) => {
          if (next === null) return
          onFeatureChange(next === 'all' ? undefined : (next as WhitelistFeature))
        }}
      >
        <SelectTrigger className="w-40" aria-label="权限点筛选">
          <SelectValue>{feature ? FEATURE_LABELS[feature] : '全部权限点'}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {FILTER_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
        <Input
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          placeholder="搜索 openId（仅当前页）"
          className="w-64 pl-8"
          aria-label="搜索 openId"
        />
      </div>

      <div className="min-w-4 flex-1" />

      <Button onClick={onCreate}>
        <PlusIcon data-icon="inline-start" />
        新增授权
      </Button>
    </div>
  )
}
