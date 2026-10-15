import { API_PATH_LARK_ME, HEADER_AUTHORIZATION } from '@/constants/api'
import type { AdminUser, LarkMeUser } from '@/types/auth'
import { http } from './request'

/**
 * 登录验证：GET /api/auth/lark/me（Java 服务）
 * 显式携带 sessionId——调用时凭证尚未落 storage，不能依赖请求拦截器注入
 */
export async function getMe(sessionId: string): Promise<LarkMeUser> {
  return (await http.get<LarkMeUser>(API_PATH_LARK_ME, {
    headers: { [HEADER_AUTHORIZATION]: `Bearer ${sessionId}` },
  })) as unknown as LarkMeUser
}

/**
 * 登录有效口径（PRD §9.1）：success=true 由请求层保证，此处校验
 * unionId 与 name 均为非空字符串——任一缺失登录不作数（保证操作可追溯）
 * 不满足返回 null，由调用方（useAuth.login）转为业务错误
 */
export function validateLoginUser(user: LarkMeUser): AdminUser | null {
  const unionId = user.unionId?.trim()
  const name = user.name?.trim()
  if (!unionId || !name) return null
  return {
    openId: user.openId?.trim() || null,
    unionId,
    name,
    avatarUrl: user.avatarUrl ?? null,
  }
}
