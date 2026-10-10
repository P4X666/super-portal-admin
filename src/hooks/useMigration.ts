import { useCallback, useEffect, useState } from 'react'
import { fetchAssetsTotal, importKnowledge, importTable } from '@/services/assets'
import type { ImportKnowledgeResult, ImportTableResult } from '@/types/assets'

/**
 * 迁移模块 hooks（PRD 模块一，后端两个同步接口各自独立）
 * - useKnowledgeImport：知识库资产同步（import-knowledge）状态机
 * - useTableImport：商品属性同步（import-table）状态机
 * - useAssetsTotal：资产总数（初始加载 + 任一同步成功后刷新；失败静默为 null）
 * 两个同步均为幂等接口，failed 可直接重试；同一时刻只允许各自一个请求在途
 */

export type MigrationPhase = 'idle' | 'importing' | 'success' | 'failed'

/** 同步状态机（idle → importing → success/failed），result 形状由调用方注入 */
function useMigrationPhase<T>(run: () => Promise<T>): {
  phase: MigrationPhase
  result: T | null
  error: string | null
  start: () => Promise<void>
  reset: () => void
} {
  const [phase, setPhase] = useState<MigrationPhase>('idle')
  const [result, setResult] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)

  const start = useCallback(async () => {
    setPhase('importing')
    setError(null)
    try {
      setResult(await run())
      setPhase('success')
    } catch (e) {
      setError(e instanceof Error ? e.message : '同步失败')
      setPhase('failed')
    }
  }, [run])

  const reset = useCallback(() => {
    setPhase('idle')
    setResult(null)
    setError(null)
  }, [])

  return { phase, result, error, start, reset }
}

export function useKnowledgeImport(onSuccess?: () => void): {
  phase: MigrationPhase
  result: ImportKnowledgeResult | null
  error: string | null
  start: () => Promise<void>
  reset: () => void
} {
  const run = useCallback(async () => {
    const result = await importKnowledge()
    onSuccess?.()
    return result
  }, [onSuccess])
  return useMigrationPhase<ImportKnowledgeResult>(run)
}

export function useTableImport(onSuccess?: () => void): {
  phase: MigrationPhase
  result: ImportTableResult | null
  error: string | null
  start: () => Promise<void>
  reset: () => void
} {
  const run = useCallback(async () => {
    const result = await importTable()
    onSuccess?.()
    return result
  }, [onSuccess])
  return useMigrationPhase<ImportTableResult>(run)
}

export function useAssetsTotal(): {
  total: number | null
  refresh: () => void
} {
  const [total, setTotal] = useState<number | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchAssetsTotal().then(
      (value) => {
        if (!cancelled) setTotal(value)
      },
      () => {
        // 总数查询失败仅静默隐藏（P1 展示用，不影响同步主流程）
      },
    )
    return () => {
      cancelled = true
    }
  }, [tick])

  const refresh = useCallback(() => setTick((t) => t + 1), [])
  return { total, refresh }
}
