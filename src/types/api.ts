/**
 * 双后端响应信封（类型层）
 * - Node：{ success, data, timestamp }（WhitelistResultVo / AssetsResultVo 约定）
 * - Java：{ timeStamp: number, data, success, errorCode, errorMessage }（CommonResponse）
 * 两套信封均以 success 字段判定业务成败，由 services/request.ts 统一解包，
 * services 层函数直接返回 data 载荷，调用方不再判 success
 */

export interface NodeEnvelope<T> {
  success: boolean
  data: T
  timestamp: string
}

export interface JavaEnvelope<T> {
  timeStamp: number
  data: T
  success: boolean
  /** "0"=成功；"402"=会话失效；其余见 PRD 附录 A */
  errorCode: string
  errorMessage: string | null
}

/** 请求层统一业务错误：两后端 HTTP 错误与 success=false 均收敛为此类型 */
export class ApiError extends Error {
  /** 错误来源后端，401 处理策略不同：java=清会话回登录页；node=提示联系开发 */
  source: 'java' | 'node'
  /** HTTP 状态码（网络层错误时缺省） */
  status?: number
  /** 业务错误码：Node 如 WHITELIST_DUPLICATE / ASSETS_IMPORT_FAILED；Java 如 "402" */
  errorCode?: string

  constructor(
    message: string,
    source: 'java' | 'node',
    status?: number,
    errorCode?: string,
  ) {
    super(message)
    this.name = 'ApiError'
    this.source = source
    this.status = status
    this.errorCode = errorCode
  }
}
