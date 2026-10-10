import { STORAGE_KEY_ADMIN_SESSION, STORAGE_KEY_ADMIN_USER } from '@/constants/storage'
import type { AdminUser } from '@/types/auth'

/**
 * 登录凭证与操作人信息的 sessionStorage 读写（独立模块，无 axios 依赖）
 * 单独于 services/auth.ts 抽出的原因：request.ts 请求拦截器要读 sessionId、
 * Java 401 时要清会话，而 auth.ts 的 getMe 依赖 request.ts——
 * 三方共用的纯存储逻辑下沉至此，避免循环导入
 */

export function getSessionId(): string | null {
  return sessionStorage.getItem(STORAGE_KEY_ADMIN_SESSION)
}

export function getAdminUser(): AdminUser | null {
  const raw = sessionStorage.getItem(STORAGE_KEY_ADMIN_USER)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AdminUser
    // 基本形状防御：storage 被手动篡改时按未登录处理
    if (typeof parsed === 'object' && typeof parsed.unionId === 'string' && typeof parsed.name === 'string') {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export function saveSession(sessionId: string, user: AdminUser): void {
  sessionStorage.setItem(STORAGE_KEY_ADMIN_SESSION, sessionId)
  sessionStorage.setItem(STORAGE_KEY_ADMIN_USER, JSON.stringify(user))
}

export function clearSession(): void {
  sessionStorage.removeItem(STORAGE_KEY_ADMIN_SESSION)
  sessionStorage.removeItem(STORAGE_KEY_ADMIN_USER)
}
