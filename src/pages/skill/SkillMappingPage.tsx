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
import { useSkillMappingList } from '@/hooks/useSkillMappingList'
import { useSkillMappingMutations } from '@/hooks/useSkillMappingMutations'
import { ApiError } from '@/types/api'
import type { SkillMappingItem } from '@/types/skillMapping'
import { CreateSkillDialog } from './components/CreateSkillDialog'
import { EditSkillDialog } from './components/EditSkillDialog'
import { SkillFilterBar } from './components/SkillFilterBar'
import { SkillMappingTable } from './components/SkillMappingTable'

const PAGE_SIZE_OPTIONS = [20, 50, 100]

/**
 * skill 管理页（HiAgent skill 中文名映射表维护）
 * 列表分页（默认 100，id ASC）+ status/module 服务端筛选 + 当前页关键词前端过滤
 * + 批量新增（多行表单，分组提交）/ 编辑（人工字段）/ 删除（物理删除，下线场景建议改状态）
 */
export function SkillMappingPage() {
  const list = useSkillMappingList()
  const [keyword, setKeyword] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<SkillMappingItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SkillMappingItem | null>(null)

  // 记录不存在（并发编辑/删除冲突）：toast + 刷新为最新状态
  const handleNotFound = useCallback(() => {
    toast.error('记录不存在（可能已被其他管理员删除）')
    list.refetch()
  }, [list])

  const mutations = useSkillMappingMutations({
    onChanged: list.refetch,
    onNotFound: handleNotFound,
  })

  // 当前页关键词前端过滤（skillId/nameEn/nameCn 任一命中；后端列表接口无关键词参数）
  const filteredItems = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return list.items
    return list.items.filter(
      (item) =>
        item.skillId.toLowerCase().includes(kw) ||
        item.nameEn.toLowerCase().includes(kw) ||
        (item.nameCn ?? '').toLowerCase().includes(kw),
    )
  }, [list.items, keyword])
  const filtering = keyword.trim().length > 0

  const totalPages = Math.max(1, Math.ceil(list.total / list.params.pageSize))

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await mutations.remove(deleteTarget.id)
      toast.success('已删除 skill')
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

  const emptyNode = filtering || list.params.status || list.params.module ? (
    <EmptyState
      title="当前筛选条件下无结果"
      description="试试清除搜索关键词或切换状态/模块筛选"
    />
  ) : (
    <EmptyState title="暂无 skill 数据" description="点击「新增 Skill」添加第一条记录" />
  )

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-medium">Skill 管理</h1>
        <p className="mt-1 text-caption text-text-tertiary">
          维护 HiAgent skill 中文名映射表（skillId ↔ 中文名/模块/状态/说明），供用户端 Skill
          下拉框按中文名展示
        </p>
      </div>

      <SkillFilterBar
        status={list.params.status}
        onStatusChange={list.setStatus}
        module={list.params.module}
        onModuleChange={list.setModule}
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
          <SkillMappingTable
            items={filteredItems}
            removingId={mutations.removingId}
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

      <CreateSkillDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreateMany={mutations.createMany}
        creating={mutations.creating}
        progress={mutations.progress}
      />

      <EditSkillDialog
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onUpdate={mutations.update}
        updating={mutations.updating}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="确认删除 skill？"
        danger
        confirmLabel={mutations.removingId ? '删除中…' : '确认删除'}
        confirmLoading={mutations.removingId !== null}
        onConfirm={() => void handleDeleteConfirm()}
        description={
          deleteTarget && (
            <div className="flex flex-col gap-1">
              <span>
                skillId：<span className="break-all text-text-primary">{deleteTarget.skillId}</span>
              </span>
              <span>
                名称：
                <span className="text-text-primary">
                  {deleteTarget.nameCn || deleteTarget.nameEn}
                </span>
              </span>
            </div>
          )
        }
        hint="删除为物理删除且不可恢复。若 skill 仅是 hiagent 侧已下线，建议编辑改状态为「已下线」保留映射记录。"
      />
    </div>
  )
}
