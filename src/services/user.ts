import type { LarkUserItem } from '@/types/auth'
import { http } from './request'

/**
 * Java：用户档案查询（读登录时落库的本地身份档案，不实时调 Lark；需登录态）
 * 注：路径常量未入 constants/api.ts——该文件含既有凭据字面量，被写入守卫整体拦截
 */
const API_PATH_LARK_USER = '/api/auth/lark/user'

/** 查询条件：openId / userName / email，后端强约束三选一（全空或多个均 PARAM_ERROR 400） */
export type UserQueryKey = 'openId' | 'userName' | 'email'

/**
 * 按 openId / 用户名 / 邮箱查询用户档案（Java 服务 /api/auth/lark/user，响应信封已由请求层解包）
 * 后端契约要点：读登录时落库的本地身份档案，不实时调用 Lark，邮箱未落库时为空；
 * 返回匹配用户数组——openId / email 至多 1 条，用户名精确匹配可能重名多条；
 * 条件全空或传多个 → PARAM_ERROR(400)；查无档案 → USER_NOT_FOUND("B0100", 400)；
 * 会话失效 → 401（请求层清会话回登录页，本服务无需处理）
 */
export async function fetchUsers(key: UserQueryKey, value: string): Promise<LarkUserItem[]> {
  return (await http.get<LarkUserItem[]>(API_PATH_LARK_USER, {
    params: { [key]: value },
  })) as unknown as LarkUserItem[]
}
