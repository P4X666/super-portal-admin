import { ChevronLeftIcon, ChevronRightIcon, Loader2Icon, SearchIcon } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAssetRemoval, useAssetsQuery } from '@/hooks/useAssetsQuery'
import { ApiError } from '@/types/api'
import type { AssetItem } from '@/types/assets'
import { AssetQueryTable } from './AssetQueryTable'

const PAGE_SIZE_OPTIONS = [20, 50, 100]

/** 数据集下拉固定选项（知识库 HIAGENT_DATASETS 全量别名） */
const DATASET_OPTIONS = [
  'product-shoes',
  'product-bag',
  'product-hat',
  'product-pants',
  'product-outerwear',
  'product-top',
]
/** 「全部数据集」哨兵值：接口层不传 DatasetId 即查全部 */
const ALL_DATASETS = 'all'

/**
 * 资产查询与删除卡片（资产同步页模块三）：
 * - 查询：GET /assets 按 DatasetId（固定下拉：全部或 product-* 别名）+ Keywords（文件名/款名模糊）分页筛选，
 *   条件由「查询」按钮显式提交；首次进入不自动请求
 * - 删除：DELETE /assets/:id 物理删除不合规商品，成功后刷新列表与资产总数；
 *   重新查询无该商品即确认删除（注意列表仅含 active=1 可见资产，主站隐藏≠删除）
 */
export function AssetQueryCard({ onAssetsChanged }: { onAssetsChanged: () => void }) {
  const list = useAssetsQuery()
  const [datasetFilter, setDatasetFilter] = useState(ALL_DATASETS)
  const [keywords, setKeywords] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AssetItem | null>(null)

  const removal = useAssetRemoval({
    onChanged: () => {
      list.refetch()
      onAssetsChanged()
    },
    onNotFound: () => {
      toast.error('资产不存在（可能已被删除）')
      list.refetch()
    },
  })

  const handleQuery = (e: FormEvent) => {
    e.preventDefault()
    list.setQuery({
      datasetId: datasetFilter === ALL_DATASETS ? undefined : datasetFilter,
      keywords: keywords.trim() || undefined,
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await removal.remove(deleteTarget.id)
      toast.success(`已删除资产 #${deleteTarget.id}`)
      setDeleteTarget(null)
    } catch (e) {
      // 404 已由 onNotFound 提示并刷新，此时记录已不存在，关闭弹窗
      if (e instanceof ApiError && e.status === 404) {
        setDeleteTarget(null)
      } else {
        toast.error(e instanceof Error ? e.message : '删除失败')
      }
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border-weak bg-card p-5">
      <div className="flex items-center gap-2 text-body font-medium text-text-primary">
        <SearchIcon className="size-4 text-badge-green" />
        资产查询与删除
      </div>
      <div className="text-caption text-text-tertiary">
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>用途：同步后如发现不合规商品，在此按数据集 / 关键词定位并删除对应资产。</li>
          <li>
            查询：数据集从下拉框选择（全部数据集或 6 个 product-* 别名）；关键词对文件名与款名模糊匹配（不区分大小写）。
          </li>
          <li>删除：物理删除且不可恢复，删除成功后自动刷新列表与资产总数。</li>
          <li>
            删除确认：重新查询无该商品即已删除。注意列表仅含可见（active=1）资产——主站已隐藏的商品同样不会出现，删除与否以删除接口结果为准。
          </li>
        </ul>
      </div>

      <form onSubmit={handleQuery} className="flex flex-wrap items-center gap-3">
        <Select
          value={datasetFilter}
          onValueChange={(next) => {
            if (next !== null) setDatasetFilter(next)
          }}
        >
          <SelectTrigger className="w-56" aria-label="数据集筛选">
            <SelectValue>{datasetFilter === ALL_DATASETS ? '全部数据集' : datasetFilter}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_DATASETS}>全部数据集</SelectItem>
            {DATASET_OPTIONS.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="按文件名 / 款名模糊搜索"
            className="w-64 pl-8"
            aria-label="关键词搜索"
            maxLength={128}
          />
        </div>
        <Button type="submit" disabled={list.loading}>
          {list.loading ? (
            <Loader2Icon data-icon="inline-start" className="animate-spin" />
          ) : (
            <SearchIcon data-icon="inline-start" />
          )}
          查询
        </Button>
      </form>

      <div className="rounded-lg border border-border-weak bg-background/40">
        {!list.started ? (
          <EmptyState
            title="输入条件后点击「查询」"
            description="数据集默认查全部，关键词可留空，也可只按其一筛选"
          />
        ) : list.loading ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : list.error ? (
          <ErrorState message={list.error} onRetry={list.refetch} />
        ) : list.items.length === 0 ? (
          <EmptyState
            title="当前条件下无结果"
            description="若条件无误，说明该商品已不在可见资产中（已删除，或在主站被隐藏）"
          />
        ) : (
          <AssetQueryTable
            items={list.items}
            removingId={removal.removingId}
            onDelete={setDeleteTarget}
          />
        )}
      </div>

      {/* 分页：总数 + 页大小 + 上下页（页大小切换回第一页） */}
      {!list.loading && !list.error && list.started && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-caption text-text-tertiary">共 {list.total} 条</span>
          <div className="flex items-center gap-2">
            <Select
              value={String(list.params.pageSize)}
              onValueChange={(next) => {
                if (next !== null) list.setPageSize(Number(next))
              }}
            >
              <SelectTrigger className="w-28" size="sm" aria-label="每页条数">
                <SelectValue>{list.params.pageSize} 条/页</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} 条/页
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="xs"
              disabled={list.params.page <= 1 || list.loading}
              onClick={() => list.setPage(list.params.page - 1)}
            >
              <ChevronLeftIcon data-icon="inline-start" />
              上一页
            </Button>
            <span className="text-caption text-text-secondary">
              {list.params.page} / {Math.max(1, Math.ceil(list.total / list.params.pageSize))}
            </span>
            <Button
              variant="outline"
              size="xs"
              disabled={
                list.params.page >= Math.ceil(list.total / list.params.pageSize) || list.loading
              }
              onClick={() => list.setPage(list.params.page + 1)}
            >
              下一页
              <ChevronRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="确认删除该资产？"
        danger
        confirmLabel={removal.removingId ? '删除中…' : '确认删除'}
        confirmLoading={removal.removingId !== null}
        onConfirm={() => void handleDeleteConfirm()}
        description={
          deleteTarget && (
            <div className="flex flex-col gap-1">
              <span>
                ID：<span className="text-text-primary">#{deleteTarget.id}</span>
              </span>
              <span>
                文件名：
                <span className="break-all text-text-primary">{deleteTarget.filename || '-'}</span>
              </span>
              {deleteTarget.sku && (
                <span>
                  SKU：<span className="text-text-primary">{deleteTarget.sku}</span>
                </span>
              )}
              {deleteTarget.des && (
                <span>
                  款名：<span className="text-text-primary">{deleteTarget.des}</span>
                </span>
              )}
            </div>
          )
        }
        hint="删除为物理删除且不可恢复；删除成功后列表自动刷新，也可重新查询确认该商品已不在结果中。"
      />
    </div>
  )
}
