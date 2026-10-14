import { Loader2Icon, PencilIcon, Trash2Icon } from 'lucide-react'
import { CopyableText } from '@/components/common/CopyableText'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  SKILL_STATUS_BADGE_VARIANTS,
  SKILL_STATUS_LABELS,
  type SkillMappingStatus,
} from '@/constants/skillMapping'
import { formatDateTime } from '@/utils/format'
import type { SkillMappingItem } from '@/types/skillMapping'

/**
 * skill 表格（展示组件：数据/状态由页面注入）
 * skillId 复制；名称/说明截断 + hover 全文；未填中文名/模块/说明展示「-」；操作列行级删除 loading
 */
interface SkillMappingTableProps {
  items: SkillMappingItem[]
  removingId: string | null
  onEdit: (item: SkillMappingItem) => void
  onDelete: (item: SkillMappingItem) => void
}

export function SkillMappingTable({ items, removingId, onEdit, onDelete }: SkillMappingTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-48">skillId</TableHead>
          <TableHead className="w-32">英文名</TableHead>
          <TableHead className="w-28">中文名</TableHead>
          <TableHead className="w-24">所属模块</TableHead>
          <TableHead className="w-24">状态</TableHead>
          <TableHead>用途说明</TableHead>
          <TableHead className="w-32">更新时间</TableHead>
          <TableHead className="w-40 text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const removing = removingId === item.id
          return (
            <TableRow key={item.id}>
              <TableCell>
                <CopyableText text={item.skillId} className="w-40 text-text-secondary" />
              </TableCell>
              <TableCell>
                <span className="block max-w-28 truncate text-text-secondary" title={item.nameEn}>
                  {item.nameEn}
                </span>
              </TableCell>
              <TableCell>
                {item.nameCn ? (
                  <span className="block max-w-24 truncate text-text-secondary" title={item.nameCn}>
                    {item.nameCn}
                  </span>
                ) : (
                  <span className="text-text-tertiary">-</span>
                )}
              </TableCell>
              <TableCell>
                {item.module ? (
                  <Badge variant="outline">{item.module}</Badge>
                ) : (
                  <span className="text-text-tertiary">-</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={SKILL_STATUS_BADGE_VARIANTS[item.status as SkillMappingStatus] ?? 'outline'}>
                  {SKILL_STATUS_LABELS[item.status as SkillMappingStatus] ?? item.status}
                </Badge>
              </TableCell>
              <TableCell>
                {item.desc ? (
                  <span className="block max-w-56 truncate text-text-secondary" title={item.desc}>
                    {item.desc}
                  </span>
                ) : (
                  <span className="text-text-tertiary">-</span>
                )}
              </TableCell>
              <TableCell className="text-text-tertiary">
                {formatDateTime(item.updatedAt)}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="xs"
                    disabled={removing}
                    onClick={() => onEdit(item)}
                  >
                    <PencilIcon data-icon="inline-start" />
                    编辑
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-destructive hover:text-destructive"
                    disabled={removing}
                    onClick={() => onDelete(item)}
                  >
                    {removing ? (
                      <Loader2Icon data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <Trash2Icon data-icon="inline-start" />
                    )}
                    删除
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
