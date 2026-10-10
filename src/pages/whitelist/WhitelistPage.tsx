import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useWhitelistList } from '@/hooks/useWhitelistList'
import { useWhitelistMutations } from '@/hooks/useWhitelistMutations'
import { FEATURE_LABELS, type WhitelistFeature } from '@/constants/whitelist'
import { ApiError } from '@/types/api'
import type { WhitelistItem } from '@/types/whitelist'
import { CreateWhitelistDialog } from './components/CreateWhitelistDialog'
import { EditRemarkDialog } from './components/EditRemarkDialog'
import { FilterBar } from './components/FilterBar'
import { WhitelistTable } from './components/WhitelistTable'

const PAGE_SIZE_OPTIONS = [20, 50, 100]

/**
 * 白名单管理页（PRD 模块二）
 * 列表分页（默认 100，id ASC）+ feature 服务端筛选 + 当前页 openId 前端过滤
 * + 新增 / 编辑备注 / 删除（删除确认弹窗展示 openId + 权限点中文名防误删）
 */
export function WhitelistPage() {
  const list = useWhitelistList()
  const [keyword, setKeyword] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<WhitelistItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WhitelistItem | null>(null)

  // 记录不存在（并发编辑/删除冲突）：toast + 刷新为最新状态（PRD §7.6）
  const handleNotFound = useCallback(() => {
    toast.error('记录不存在（可能已被其他管理员删除）')
    list.refetch()
  }, [list])

  const mutations = useWhitelistMutations({
    onChanged: list.refetch,
    onNotFound: handleNotFound,
  })

  // V1 仅当前页前端过滤（后端列表接口暂不支持 openId 参数，PRD Q2）
  const filteredItems = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return list.items
    return list.items.filter((item) => item.openId.toLowerCase().includes(kw))
  }, [list.items, keyword])
  const filtering = keyword.trim().length > 0

  const totalPages = Math.max(1, Math.ceil(list.total / list.params.pageSize))

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await mutations.remove({
        openId: deleteTarget.openId,
        feature: deleteTarget.feature,
      })
      toast.success('已移除授权')
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

  const emptyNode = filtering || list.params.feature ? (
    <EmptyState
      title="当前筛选条件下无结果"
      description="试试清除搜索关键词或切换权限点筛选"
    />
  ) : (
    <EmptyState title="暂无白名单数据" description="点击「新增授权」添加第一条记录" />
  )

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-medium">白名单管理</h1>
        <p className="mt-1 text-caption text-text-tertiary">
          控制 super-portal 侧边栏功能入口的可见性（openId × 权限点，一条记录 = 一个授权，加入即生效）
        </p>
      </div>

      <FilterBar
        feature={list.params.feature}
        onFeatureChange={list.setFeature}
        keyword={keyword}
        onKeywordChange={setKeyword}
        onCreate={() => setCreateOpen(true)}
      />

      <div className="rounded-xl border border-border-weak bg-card">
        {list.loading ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : list.error ? (
          <ErrorState message={list.error} onRetry={list.refetch} />
        ) : filteredItems.length === 0 ? (
          emptyNode
        ) : (
          <WhitelistTable
            items={filteredItems}
            removingKey={mutations.removingKey}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
          />
        )}
      </div>

      {/* 分页：总数 + 页大小 + 上下页（页大小切换回第一页） */}
      {!list.loading && !list.error && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-caption text-text-tertiary">
            共 {list.total} 条
            {filtering && ` · 当前页搜索命中 ${filteredItems.length} 条`}
          </span>
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
              {list.params.page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="xs"
              disabled={list.params.page >= totalPages || list.loading}
              onClick={() => list.setPage(list.params.page + 1)}
            >
              下一页
              <ChevronRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </div>
      )}

      <CreateWhitelistDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={mutations.create}
        creating={mutations.creating}
      />

      <EditRemarkDialog
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onUpdate={mutations.updateRemark}
        updating={mutations.updating}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="确认移除授权？"
        danger
        confirmLabel={mutations.removingKey ? '删除中…' : '确认删除'}
        confirmLoading={mutations.removingKey !== null}
        onConfirm={() => void handleDeleteConfirm()}
        description={
          deleteTarget && (
            <div className="flex flex-col gap-1">
              <span>
                用户：<span className="break-all text-text-primary">{deleteTarget.openId}</span>
              </span>
              <span>
                权限点：
                <span className="text-text-primary">
                  {FEATURE_LABELS[deleteTarget.feature as WhitelistFeature] ?? deleteTarget.feature}
                </span>
              </span>
            </div>
          )
        }
        hint="删除为物理删除且立即生效：该用户将失去此权限点（用户端刷新页面后不可见）。"
      />
    </div>
  )
}
