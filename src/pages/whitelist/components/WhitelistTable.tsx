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
  FEATURE_BADGE_VARIANTS,
  FEATURE_LABELS,
  type WhitelistFeature,
} from '@/constants/whitelist'
import { formatDateTime } from '@/utils/format'
import type { WhitelistItem } from '@/types/whitelist'

/**
 * 白名单表格（展示组件：数据/状态由页面注入）
 * openId 列截断 + hover 全文 + 复制；备注空展示「-」；操作列行级删除 loading
 */
interface WhitelistTableProps {
  items: WhitelistItem[]
  removingKey: string | null
  onEdit: (item: WhitelistItem) => void
  onDelete: (item: WhitelistItem) => void
}

export function WhitelistTable({ items, removingKey, onEdit, onDelete }: WhitelistTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-72">openId</TableHead>
          <TableHead className="w-28">权限点</TableHead>
          <TableHead>备注</TableHead>
          <TableHead className="w-36">创建时间</TableHead>
          <TableHead className="w-36">更新时间</TableHead>
          <TableHead className="w-40 text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const rowKey = `${item.openId}:${item.feature}`
          const removing = removingKey === rowKey
          return (
            <TableRow key={item.id}>
              <TableCell>
                <CopyableText
                  text={item.openId}
                  className="w-64 text-text-secondary"
                />
              </TableCell>
              <TableCell>
                <Badge variant={FEATURE_BADGE_VARIANTS[item.feature as WhitelistFeature] ?? 'outline'}>
                  {FEATURE_LABELS[item.feature as WhitelistFeature] ?? item.feature}
                </Badge>
              </TableCell>
              <TableCell>
                {item.remark ? (
                  <span
                    className="block max-w-56 truncate text-text-secondary"
                    title={item.remark}
                  >
                    {item.remark}
                  </span>
                ) : (
                  <span className="text-text-tertiary">-</span>
                )}
              </TableCell>
              <TableCell className="text-text-tertiary">
                {formatDateTime(item.createdAt)}
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
                    编辑备注
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
