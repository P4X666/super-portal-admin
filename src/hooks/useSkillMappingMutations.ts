import { useCallback, useState } from 'react'
import { CREATE_CHUNK_SIZE } from '@/constants/skillMapping'
import { createSkillMapping, deleteSkillMapping, updateSkillMapping } from '@/services/skillMapping'
import { ApiError } from '@/types/api'
import type {
  CreateSkillMappingBatchResult,
  CreateSkillMappingPayload,
  UpdateSkillMappingPayload,
} from '@/types/skillMapping'

/** 批量新增提交进度（分组循环逐条推进，弹窗展示「提交中 done/total」） */
export interface CreateProgress {
  done: number
  total: number
}

/**
 * skill 写操作（批量新增 / 编辑 / 删除）
 * - 批量新增：后端无批量接口，按 CREATE_CHUNK_SIZE 分组循环调单条 POST——组内并发、组间串行，
 *   瞬时并发压在常数级，避免大批量提交对后端形成请求风暴；结果逐项归集为
 *   succeeded/duplicates(409)/failed，不抛出，由弹窗分层提示；progress 供弹窗展示提交进度
 * - 编辑/删除：独立 pending 态，业务异常向上抛出由调用方区分处理（404 → toast + 列表刷新）
 */
export function useSkillMappingMutations(options: {
  onChanged: () => void
  onNotFound: () => void
}): {
  creating: boolean
  progress: CreateProgress | null
  updating: boolean
  removingId: string | null
  createMany: (payloads: CreateSkillMappingPayload[]) => Promise<CreateSkillMappingBatchResult>
  update: (id: string, payload: UpdateSkillMappingPayload) => Promise<void>
  remove: (id: string) => Promise<void>
} {
  const { onChanged, onNotFound } = options
  const [creating, setCreating] = useState(false)
  const [progress, setProgress] = useState<CreateProgress | null>(null)
  const [updating, setUpdating] = useState(false)
  // 删除中的行主键，行级 loading 用
  const [removingId, setRemovingId] = useState<string | null>(null)

  const createMany = useCallback(
    async (payloads: CreateSkillMappingPayload[]): Promise<CreateSkillMappingBatchResult> => {
      setCreating(true)
      try {
        const result: CreateSkillMappingBatchResult = { succeeded: [], duplicates: [], failed: [] }
        // 切组：每 CREATE_CHUNK_SIZE 条一组，组间 await 串行，组内 Promise.all 并发
        const chunks: CreateSkillMappingPayload[][] = []
        for (let i = 0; i < payloads.length; i += CREATE_CHUNK_SIZE) {
          chunks.push(payloads.slice(i, i + CREATE_CHUNK_SIZE))
        }
        let done = 0
        for (const chunk of chunks) {
          await Promise.all(
            chunk.map(async (payload) => {
              try {
                await createSkillMapping(payload)
                result.succeeded.push(payload)
              } catch (e) {
                if (e instanceof ApiError && e.status === 409) {
                  result.duplicates.push(payload)
                } else {
                  result.failed.push({
                    payload,
                    message: e instanceof Error ? e.message : '新增失败',
                  })
                }
              } finally {
                done += 1
                setProgress({ done, total: payloads.length })
              }
            }),
          )
        }
        if (result.succeeded.length > 0) onChanged()
        return result
      } finally {
        setCreating(false)
        setProgress(null)
      }
    },
    [onChanged],
  )

  const update = useCallback(
    async (id: string, payload: UpdateSkillMappingPayload) => {
      setUpdating(true)
      try {
        await updateSkillMapping(id, payload)
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
    async (id: string) => {
      setRemovingId(id)
      try {
        await deleteSkillMapping(id)
        onChanged()
      } catch (e) {
        // 并发删除冲突（404）：提示后刷新列表为最新状态
        if (isNotFound(e)) onNotFound()
        throw e
      } finally {
        setRemovingId(null)
      }
    },
    [onChanged, onNotFound],
  )

  return { creating, progress, updating, removingId, createMany, update, remove }
}

/** 记录不存在（SKILL_MAPPING_NOT_FOUND）：并发编辑/删除冲突的统一判定 */
function isNotFound(e: unknown): boolean {
  return e instanceof ApiError && e.status === 404
}
