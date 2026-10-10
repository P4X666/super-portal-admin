import axios, { AxiosError, type AxiosResponse } from 'axios'
import {
  API_BASE_URL,
  API_PATH_LARK_ME,
  HEADER_AUTHORIZATION,
  HEADER_X_API_KEY,
  SUPERENTRY_API_BASE_URL,
  SUPERENTRY_API_PREFIX,
  X_API_KEY,
} from '@/constants/api'
import { ApiError } from '@/types/api'
import { clearSession, getSessionId } from './session'

/**
 * 项目统一 axios 实例（双后端单实例，机制对齐 super-portal request.ts）
 * - Node 接口（/whitelist /assets 等）：baseURL = API_BASE_URL，注入 x-api-key
 * - Java 接口（/api/** 前缀）：baseURL 切至 SUPERENTRY_API_BASE_URL，注入 Bearer sessionId
 * - 成功响应统一解包信封：services 层拿到的即 data 载荷（调用方不再判 success）
 * - 失败统一收敛为 ApiError：java 401 清会话回登录页；node 401 提示联系开发
 * 与 super-portal 的差异：无 SSE、无静默重登（admin 会话失效直接踢回登录页）
 */
export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
})

http.interceptors.request.use((config) => {
  if (config.url?.startsWith(SUPERENTRY_API_PREFIX)) {
    config.baseURL = SUPERENTRY_API_BASE_URL
    const sessionId = getSessionId()
    // 登录验证请求显式携带 Bearer 头（此时凭证尚未落 storage），已设置时不覆盖
    if (sessionId && !config.headers.has(HEADER_AUTHORIZATION)) {
      config.headers.set(HEADER_AUTHORIZATION, `Bearer ${sessionId}`)
    }
  } else {
    config.headers.set(HEADER_X_API_KEY, X_API_KEY)
  }
  return config
})

/** 请求来源：Java 前缀 /api/** 之外均为 Node */
function sourceOf(url: string | undefined): 'java' | 'node' {
  return url?.startsWith(SUPERENTRY_API_PREFIX) ? 'java' : 'node'
}

/** 两后端信封共同形状判定（Node {success,data} / Java {success,data,errorCode,...}） */
function isEnvelope(body: unknown): body is { success: boolean; data: unknown } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'success' in body &&
    typeof (body as { success: unknown }).success === 'boolean' &&
    'data' in body
  )
}

/** 错误信息提取：优先 errorMessage（Node ErrorResponse / Java CommonResponse），
    兜底 message（Nest 原生 HttpException）与数组 message（class-validator） */
function extractErrorMessage(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null
  const record = body as Record<string, unknown>
  if (typeof record.errorMessage === 'string' && record.errorMessage.trim()) {
    return record.errorMessage.trim()
  }
  if (typeof record.message === 'string' && record.message.trim()) {
    return record.message.trim()
  }
  if (Array.isArray(record.message) && record.message.length > 0) {
    return record.message.filter((m) => typeof m === 'string').join('；') || null
  }
  return null
}

function extractErrorCode(body: unknown): string | undefined {
  if (typeof body === 'object' && body !== null && 'errorCode' in body) {
    const code = (body as { errorCode: unknown }).errorCode
    if (typeof code === 'string' && code && code !== '0') return code
  }
  return undefined
}

/** Java 会话失效：清凭证 + 整页跳登录页（带 expired 标记，登录页据此展示失效提示） */
function redirectToLoginExpired(): void {
  const base = (import.meta.env.VITE_BASE as string | undefined) || '/'
  clearSession()
  window.location.assign(`${base}login?expired=1`)
}

http.interceptors.response.use((response: AxiosResponse) => {
  const body: unknown = response.data
  // 防御分支：两后端业务失败实际均以非 2xx 返回，HTTP 200 + success=false 正常不会出现
  if (isEnvelope(body) && body.success !== true) {
    throw new ApiError(
      extractErrorMessage(body) || '请求失败',
      sourceOf(response.config?.url),
      response.status,
      extractErrorCode(body),
    )
  }
  // 解包信封直接返回 data 载荷；返回值形状偏离 AxiosResponse，
  // services 层统一 `as unknown as T` 消费（本文件头注释）
  return (isEnvelope(body) ? body.data : body) as unknown as AxiosResponse
}, (error: AxiosError) => {
  const url = error.config?.url
  const source = sourceOf(url)
  const status = error.response?.status
  const body: unknown = error.response?.data

  // Java 401 = sessionId 缺失/无效/过期（errorCode "402"）：
  // 登录验证请求除外（登录页就地提示，本就不存在可清的登录态）
  if (source === 'java' && status === 401 && url !== API_PATH_LARK_ME) {
    redirectToLoginExpired()
  }

  // Node 401 = x-api-key 缺失/错误（服务端 fail-secure），与 Java 会话失效区分提示
  const message =
    source === 'node' && status === 401
      ? '服务鉴权失败（x-api-key），请联系开发'
      : extractErrorMessage(body) || error.message || '请求失败'

  return Promise.reject(new ApiError(message, source, status, extractErrorCode(body)))
})
