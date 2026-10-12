import type { WhitelistFeature } from '@/constants/whitelist'

/** 白名单列表项（对齐 Node WhitelistItemVo：id 归一化为字符串，时间为 ISO） */
export interface WhitelistItem {
  id: string
  openId: string
  feature: WhitelistFeature
  remark: string | null
  createdAt: string
  updatedAt: string
}

/** GET /whitelist 的 data 载荷 */
export interface WhitelistListResult {
  items: WhitelistItem[]
  total: number
}

/** GET /whitelist 查询参数（后端 ListWhitelistDto：page 默认 1，pageSize 默认 100 ≤1000） */
export interface WhitelistListParams {
  page?: number
  pageSize?: number
  feature?: WhitelistFeature
}

/** POST /whitelist 入参（openId+feature 联合唯一，重复 409） */
export interface CreateWhitelistPayload {
  openId: string
  feature: WhitelistFeature
  remark?: string
}

/** 批量新增的逐项结果分类（后端无批量接口，前端循环调用单条 POST 归集） */
export interface CreateWhitelistBatchResult {
  /** 创建成功 */
  succeeded: WhitelistFeature[]
  /** 已存在（409 WHITELIST_DUPLICATE），未重复创建 */
  duplicates: WhitelistFeature[]
  /** 其他失败及原因 */
  failed: Array<{ feature: WhitelistFeature; message: string }>
}

/** PATCH /whitelist 入参（仅 remark 可改；openId/feature 为定位键；空串=清空备注） */
export interface UpdateWhitelistPayload {
  openId: string
  feature: WhitelistFeature
  remark: string
}

/** DELETE /whitelist 入参（query 传参！） */
export interface DeleteWhitelistPayload {
  openId: string
  feature: WhitelistFeature
}

/** DELETE /whitelist 的 data 载荷 */
export interface DeleteWhitelistResult {
  openId: string
  feature: string
}
