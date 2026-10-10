import { API_PATH_WHITELIST } from '@/constants/api'
import type {
  CreateWhitelistPayload,
  DeleteWhitelistPayload,
  DeleteWhitelistResult,
  UpdateWhitelistPayload,
  WhitelistItem,
  WhitelistListParams,
  WhitelistListResult,
} from '@/types/whitelist'
import { http } from './request'

/**
 * 白名单 CRUD（Node 服务 /whitelist，响应信封已由请求层解包）
 * 后端契约要点：openId+feature 联合唯一（重复 409）；PATCH 仅改 remark；
 * DELETE 为 query 传参（非路径参数）；列表固定 id ASC，可选 feature 过滤
 */

/** 分页列表：page 默认 1，pageSize 默认 100（后端默认值，最大 1000） */
export async function fetchWhitelist(params: WhitelistListParams): Promise<WhitelistListResult> {
  return (await http.get<WhitelistListResult>(API_PATH_WHITELIST, { params })) as unknown as WhitelistListResult
}

/** 新增：返回创建后的完整记录；重复授权抛 ApiError(409, WHITELIST_DUPLICATE) */
export async function createWhitelist(payload: CreateWhitelistPayload): Promise<WhitelistItem> {
  return (await http.post<WhitelistItem>(API_PATH_WHITELIST, payload)) as unknown as WhitelistItem
}

/** 仅改备注：remark 必填（空串=清空，服务端归一化为 NULL）；不存在 404 */
export async function updateWhitelistRemark(payload: UpdateWhitelistPayload): Promise<WhitelistItem> {
  return (await http.patch<WhitelistItem>(API_PATH_WHITELIST, payload)) as unknown as WhitelistItem
}

/** 物理删除（query 传参，axios 自动 URL encode）；不存在 404 */
export async function deleteWhitelist(
  payload: DeleteWhitelistPayload,
): Promise<DeleteWhitelistResult> {
  return (await http.delete<DeleteWhitelistResult>(API_PATH_WHITELIST, {
    params: payload,
  })) as unknown as DeleteWhitelistResult
}
