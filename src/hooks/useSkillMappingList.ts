import { useCallback, useEffect, useRef, useState } from 'react'
import type { SkillMappingStatus } from '@/constants/skillMapping'
import { fetchSkillMappings } from '@/services/skillMapping'
import type { SkillMappingItem } from '@/types/skillMapping'

/**
 * skill 分页列表（status/module 服务端筛选 + 翻页 + 竞态守卫，机制对齐 useWhitelistList）
 * - 竞态守卫：请求带自增序号，响应落地前校验仍是最后一次请求，慢响应后到直接丢弃
 * - 加载态：loading=首屏/整体加载；pending=翻页/筛选刷新（事件处理器内同步置位）
 */
interface SkillMappingListParams {
  page: number
  pageSize: number
  status?: SkillMappingStatus
  module?: string
}

export function useSkillMappingList(): {
  params: SkillMappingListParams
  items: SkillMappingItem[]
  total: number
  loading: boolean
  error: string | null
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  setStatus: (status?: SkillMappingStatus) => void
  setModule: (module?: string) => void
  refetch: () => void
} {
  const [params, setParams] = useState<SkillMappingListParams>({ page: 1, pageSize: 100 })
  const [items, setItems] = useState<SkillMappingItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seqRef = useRef(0)

  useEffect(() => {
    // 竞态守卫：仅最后一次发起的请求可落地结果
    const seq = ++seqRef.current
    let cancelled = false
    fetchSkillMappings({
      page: params.page,
      pageSize: params.pageSize,
      status: params.status,
      module: params.module,
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
        setError(e instanceof Error ? e.message : 'skill 列表加载失败')
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
  const setStatus = useCallback((status?: SkillMappingStatus) => {
    setPending(true)
    setParams((p) => ({ ...p, status, page: 1 }))
  }, [])
  const setModule = useCallback((module?: string) => {
    setPending(true)
    setParams((p) => ({ ...p, module, page: 1 }))
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
    setStatus,
    setModule,
    refetch,
  }
}
