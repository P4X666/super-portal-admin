import { useCallback, useState } from 'react'
import { createWhitelist, deleteWhitelist, updateWhitelistRemark } from '@/services/whitelist'
import { ApiError } from '@/types/api'
import type {
  CreateWhitelistPayload,
  DeleteWhitelistPayload,
  UpdateWhitelistPayload,
} from '@/types/whitelist'

/**
 * 白名单写操作（新增 / 改备注 / 删除）
 * 三个操作各自独立 pending 态（新增/编辑弹窗与表格行删除按钮分别消费）；
 * 业务异常向上抛出由调用方区分处理（409 → 表单字段提示，404 → toast + 列表刷新）
 */
export function useWhitelistMutations(options: {
  onChanged: () => void
  onNotFound: () => void
}): {
  creating: boolean
  updating: boolean
  removingKey: string | null
  create: (payload: CreateWhitelistPayload) => Promise<void>
  updateRemark: (payload: UpdateWhitelistPayload) => Promise<void>
  remove: (payload: DeleteWhitelistPayload) => Promise<void>
} {
  const { onChanged, onNotFound } = options
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  // 删除中的行键（openId:feature），行级 loading 用
  const [removingKey, setRemovingKey] = useState<string | null>(null)

  const create = useCallback(
    async (payload: CreateWhitelistPayload) => {
      setCreating(true)
      try {
        await createWhitelist(payload)
        onChanged()
      } finally {
        setCreating(false)
      }
    },
    [onChanged],
  )

  const updateRemark = useCallback(
    async (payload: UpdateWhitelistPayload) => {
      setUpdating(true)
      try {
        await updateWhitelistRemark(payload)
        onChanged()
      } catch (e) {
        // 编辑时记录已被其他管理员删除（404）：提示后刷新列表
        if (isNotFound(e)) onNotFound()
        throw e
      } finally {
        setUpdating(false)
      }
    },
    [onChanged, onNotFound],
  )

  const remove = useCallback(
    async (payload: DeleteWhitelistPayload) => {
      const key = `${payload.openId}:${payload.feature}`
      setRemovingKey(key)
      try {
        await deleteWhitelist(payload)
        onChanged()
      } catch (e) {
        // 并发删除冲突（404）：提示后刷新列表为最新状态
        if (isNotFound(e)) onNotFound()
        throw e
      } finally {
        setRemovingKey(null)
      }
    },
    [onChanged, onNotFound],
  )

  return { creating, updating, removingKey, create, updateRemark, remove }
}

/** 记录不存在（WHITELIST_NOT_FOUND）：并发编辑/删除冲突的统一判定 */
function isNotFound(e: unknown): boolean {
  return e instanceof ApiError && e.status === 404
}
