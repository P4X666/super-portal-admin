import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteAsset, fetchAssets } from '@/services/assets'
import { ApiError } from '@/types/api'
import type { AssetItem } from '@/types/assets'

/**
 * 资产查询与删除模块 hooks（资产同步页，Node GET /assets + DELETE /assets/:id）
 * - useAssetsQuery：DatasetId/Keywords 服务端筛选 + 分页 + 竞态守卫（机制对齐 useSkillMappingList）。
 *   关键词为文本输入（逐键触发会形成请求风暴），故统一由「查询」按钮显式提交（setQuery），首次查询前不发请求
 * - useAssetRemoval：单条物理删除，行级 loading；404 视为并发删除冲突交由回调处理，其余异常向上抛
 */
export interface AssetQueryFilters {
  datasetId?: string
  keywords?: string
}

interface AssetQueryListParams extends AssetQueryFilters {
  page: number
  pageSize: number
}

export function useAssetsQuery(): {
  params: AssetQueryListParams
  items: AssetItem[]
  total: number
  loading: boolean
  error: string | null
  /** 是否已发起过查询（未查询时展示引导态而非空列表） */
  started: boolean
  setQuery: (filters: AssetQueryFilters) => void
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  refetch: () => void
} {
  const [params, setParams] = useState<AssetQueryListParams>({ page: 1, pageSize: 50 })
  const [started, setStarted] = useState(false)
  const [items, setItems] = useState<AssetItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seqRef = useRef(0)

  useEffect(() => {
    if (!started) return
    // 竞态守卫：仅最后一次发起的请求可落地结果
    const seq = ++seqRef.current
    let cancelled = false
    fetchAssets({
      page: params.page,
      pageSize: params.pageSize,
      datasetId: params.datasetId,
      keywords: params.keywords,
    }).then(
      (data) => {
        if (cancelled || seq !== seqRef.current) return
        setItems(data.items)
        setTotal(data.total)
        setError(null)
        setLoading(false)
        setPending(false)
      },
      (e: unknown) => {
        if (cancelled || seq !== seqRef.current) return
        setError(e instanceof Error ? e.message : '资产查询失败')
        setLoading(false)
        setPending(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [params, started])

  const setQuery = useCallback((filters: AssetQueryFilters) => {
    setPending(true)
    setStarted(true)
    setParams((p) => ({ ...p, ...filters, page: 1 }))
  }, [])
  const setPage = useCallback((page: number) => {
    setPending(true)
    setParams((p) => ({ ...p, page }))
  }, [])
  const setPageSize = useCallback((pageSize: number) => {
    setPending(true)
    setParams((p) => ({ ...p, pageSize, page: 1 }))
  }, [])
  // 以新对象身份触发 effect 重跑（复用当前参数重新拉取）
  const refetch = useCallback(() => {
    setParams((p) => ({ ...p }))
  }, [])

  return {
    params,
    items,
    total,
    loading: loading || pending,
    error,
    started,
    setQuery,
    setPage,
    setPageSize,
    refetch,
  }
}

/** 单条删除（物理删除）；404 = 记录已不存在（并发删除），回调提示后由调用方刷新列表 */
export function useAssetRemoval(options: {
  onChanged: () => void
  onNotFound: () => void
}): {
  removingId: string | null
  remove: (id: string) => Promise<void>
} {
  const { onChanged, onNotFound } = options
  // 删除中的行主键，行级 loading 用
  const [removingId, setRemovingId] = useState<string | null>(null)

  const remove = useCallback(
    async (id: string) => {
      setRemovingId(id)
      try {
        await deleteAsset(id)
        onChanged()
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) onNotFound()
        throw e
      } finally {
        setRemovingId(null)
      }
    },
    [onChanged, onNotFound],
  )

  return { removingId, remove }
}
