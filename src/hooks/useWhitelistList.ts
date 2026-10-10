import { useCallback, useEffect, useRef, useState } from 'react'
import type { WhitelistFeature } from '@/constants/whitelist'
import { fetchWhitelist } from '@/services/whitelist'
import type { WhitelistItem } from '@/types/whitelist'

/**
 * 白名单分页列表（feature 筛选 + 翻页 + 竞态守卫，技术方案 §7.2）
 * - 竞态守卫：请求带自增序号，响应落地前校验仍是最后一次请求，慢响应后到直接丢弃
 * - 加载态：loading=首屏/整体加载；pending=翻页/筛选刷新（事件处理器内同步置位）
 * - setState 均发生在异步续体或事件处理器中，effect 体内无同步 setState
 */
interface WhitelistListParams {
  page: number
  pageSize: number
  feature?: WhitelistFeature
}

export function useWhitelistList(): {
  params: WhitelistListParams
  items: WhitelistItem[]
  total: number
  loading: boolean
  error: string | null
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  setFeature: (feature?: WhitelistFeature) => void
  refetch: () => void
} {
  const [params, setParams] = useState<WhitelistListParams>({ page: 1, pageSize: 100 })
  const [items, setItems] = useState<WhitelistItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seqRef = useRef(0)

  useEffect(() => {
    // 竞态守卫：仅最后一次发起的请求可落地结果
    const seq = ++seqRef.current
    let cancelled = false
    fetchWhitelist({
      page: params.page,
      pageSize: params.pageSize,
      feature: params.feature,
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
        setError(e instanceof Error ? e.message : '白名单加载失败')
        setLoading(false)
        setPending(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [params])

  const setPage = useCallback((page: number) => {
    setPending(true)
    setParams((p) => ({ ...p, page }))
  }, [])
  const setPageSize = useCallback((pageSize: number) => {
    setPending(true)
    setParams((p) => ({ ...p, pageSize, page: 1 }))
  }, [])
  const setFeature = useCallback((feature?: WhitelistFeature) => {
    setPending(true)
    setParams((p) => ({ ...p, feature, page: 1 }))
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
    setPage,
    setPageSize,
    setFeature,
    refetch,
  }
}
