import { Loader2Icon, Trash2Icon } from 'lucide-react'
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
import { formatDateTime } from '@/utils/format'
import type { AssetItem } from '@/types/assets'

/**
 * 资产查询结果表格（展示组件：数据/状态由卡片注入）
 * id/SKU 可复制（便于对照接口确认删除结果）；文本列截断 + hover 全文；空值展示「-」；操作列行级删除 loading
 */
interface AssetQueryTableProps {
  items: AssetItem[]
  removingId: string | null
  onDelete: (item: AssetItem) => void
}

export function AssetQueryTable({ items, removingId, onDelete }: AssetQueryTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-20">ID</TableHead>
          <TableHead>文件名</TableHead>
          <TableHead className="w-32">SKU</TableHead>
          <TableHead className="w-20">视角</TableHead>
          <TableHead className="w-20">性别线</TableHead>
          <TableHead className="w-40">款名</TableHead>
          <TableHead className="w-24">年份/季节</TableHead>
          <TableHead className="w-32">创建时间</TableHead>
          <TableHead className="w-20 text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const removing = removingId === item.id
          return (
            <TableRow key={item.id}>
              <TableCell>
                <CopyableText text={item.id} className="w-14 text-text-secondary" />
              </TableCell>
              <TableCell>
                {item.filename ? (
                  <span className="block max-w-64 truncate text-text-secondary" title={item.filename}>
                    {item.filename}
                  </span>
                ) : (
                  <span className="text-text-tertiary">-</span>
                )}
              </TableCell>
              <TableCell>
                {item.sku ? (
                  <CopyableText text={item.sku} className="w-24 text-text-secondary" />
                ) : (
                  <span className="text-text-tertiary">-</span>
                )}
              </TableCell>
              <TableCell>
                {item.view ? <Badge variant="outline">{item.view}</Badge> : <span className="text-text-tertiary">-</span>}
              </TableCell>
              <TableCell>
                {item.gender ? (
                  <span className="block max-w-16 truncate text-text-secondary" title={item.gender}>
                    {item.gender}
                  </span>
                ) : (
                  <span className="text-text-tertiary">-</span>
                )}
              </TableCell>
              <TableCell>
                {item.des ? (
                  <span className="block max-w-36 truncate text-text-secondary" title={item.des}>
                    {item.des}
                  </span>
                ) : (
                  <span className="text-text-tertiary">-</span>
                )}
              </TableCell>
              <TableCell className="text-text-secondary">
                {item.year} {item.season}
              </TableCell>
              <TableCell className="text-text-tertiary">{formatDateTime(item.createdAt)}</TableCell>
              <TableCell>
                <div className="flex items-center justify-end">
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
