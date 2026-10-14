import { PlusIcon, SearchIcon } from 'lucide-react'
import {
  SKILL_MAPPING_STATUSES,
  SKILL_MODULES,
  SKILL_STATUS_LABELS,
  type SkillMappingStatus,
} from '@/constants/skillMapping'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * 筛选栏：status / module 下拉（服务端过滤，切换即重新请求）
 * + 当前页关键词搜索（skillId/nameEn/nameCn 前端过滤，无请求开销故不防抖）
 */
interface SkillFilterBarProps {
  status: SkillMappingStatus | undefined
  onStatusChange: (status: SkillMappingStatus | undefined) => void
  module: string | undefined
  onModuleChange: (module: string | undefined) => void
  keyword: string
  onKeywordChange: (keyword: string) => void
  onCreate: () => void
}

export function SkillFilterBar({
  status,
  onStatusChange,
  module,
  onModuleChange,
  keyword,
  onKeywordChange,
  onCreate,
}: SkillFilterBarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <Select
        value={status ?? 'all'}
        onValueChange={(next) => {
          if (next === null) return
          onStatusChange(next === 'all' ? undefined : (next as SkillMappingStatus))
        }}
      >
        <SelectTrigger className="w-36" aria-label="状态筛选">
          <SelectValue>{status ? SKILL_STATUS_LABELS[status] : '全部状态'}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部状态</SelectItem>
          {SKILL_MAPPING_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {SKILL_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={module ?? 'all'}
        onValueChange={(next) => {
          if (next === null) return
          onModuleChange(next === 'all' ? undefined : next)
        }}
      >
        <SelectTrigger className="w-36" aria-label="所属模块筛选">
          <SelectValue>{module ?? '全部模块'}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部模块</SelectItem>
          {SKILL_MODULES.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
        <Input
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          placeholder="搜索 skillId / 名称（仅当前页）"
          className="w-64 pl-8"
          aria-label="搜索 skill"
        />
      </div>

      <div className="min-w-4 flex-1" />

      <Button onClick={onCreate}>
        <PlusIcon data-icon="inline-start" />
        新增 Skill
      </Button>
    </div>
  )
}
