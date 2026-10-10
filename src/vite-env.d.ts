/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 当前环境标识：dev / uat / prd */
  readonly VITE_APP_ENV?: string
  /** 部署子路径（如 /portal/admin/），与 vite base、BrowserRouter basename 三处一致 */
  readonly VITE_BASE?: string
  /** Node 服务网关前缀（assets/whitelist），dev 缺省 '/api' 走代理 */
  readonly VITE_NODE_API_BASE_URL?: string
  /** Java 服务网关前缀（auth/lark/me），dev 缺省 '/api' 走代理 */
  readonly VITE_SUPERENTRY_API_BASE_URL?: string
}
