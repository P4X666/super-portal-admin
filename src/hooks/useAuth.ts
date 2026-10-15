import { useCallback, useSyncExternalStore } from 'react'
import { getMe, validateLoginUser } from '@/services/auth'
import { clearSession, getAdminUser, saveSession } from '@/services/session'
import { ApiError } from '@/types/api'
import type { AdminUser } from '@/types/auth'

/**
 * 登录态（模块级单例 + useSyncExternalStore）
 * - 刷新页面从 sessionStorage 恢复（凭证存在性检查，有效性由请求 401 兜底，技术方案 §6.3）
 * - login() 抛出的错误由 LoginPage 就地展示；logout() 清凭证回登录页由调用方跳转
 */

let currentUser: AdminUser | null = getAdminUser()
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function emit(): void {
  for (const listener of listeners) listener()
}

export function useAuth(): {
  user: AdminUser | null
  login: (sessionId: string) => Promise<void>
  logout: () => void
} {
  const user = useSyncExternalStore(subscribe, () => currentUser)

  const login = useCallback(async (sessionId: string) => {
    const me = await getMe(sessionId)
    const validated = validateLoginUser(me)
    // PRD §10.1：unionId 与 name 任一缺失登录不作数（HTTP 401 场景由请求层抛 ApiError）
    if (!validated) {
      throw new ApiError('会话信息不完整（缺少 unionId/name），请重新获取 sessionId', 'java')
    }
    saveSession(sessionId, validated)
    currentUser = validated
    emit()
  }, [])

  const logout = useCallback(() => {
    clearSession()
    currentUser = null
    emit()
  }, [])

  return { user, login, logout }
}
