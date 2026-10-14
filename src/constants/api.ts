/**
 * 双后端请求前缀与接口路径
 * - Node 服务（NestJS）：assets / whitelist 业务接口，x-api-key 鉴权
 * - Java 服务（Spring Boot）：/api/auth/lark/me 登录验证，Bearer sessionId 鉴权
 * dev 下两前缀均缺省 '/api'，经 vite 代理分发（'/api/api/**' → Java，其余 → Node）；
 * uat/prd 由 .env.<mode> 的 VITE_NODE_API_BASE_URL / VITE_SUPERENTRY_API_BASE_URL 覆盖
 */

/** Node 服务前缀 */
export const API_BASE_URL = (import.meta.env.VITE_NODE_API_BASE_URL as string | undefined) || '/api'

/** Java 服务前缀 */
export const SUPERENTRY_API_BASE_URL =
  (import.meta.env.VITE_SUPERENTRY_API_BASE_URL as string | undefined) || '/api'

/** Java 接口路由前缀：命中即切换 baseURL 并注入 Bearer 头（请求拦截器判断依据） */
export const SUPERENTRY_API_PREFIX = '/api/'

/** 鉴权头 */
export const HEADER_X_API_KEY = 'x-api-key'
export const HEADER_AUTHORIZATION = 'Authorization'
/** x-api-key 值与 super-portal 同源（Node 服务全局 ApiKeyGuard 校验，fail-secure） */
export const X_API_KEY = '9318778f-1cbd-4b7d-801b-cf2330907e65'

/** Java：读取当前登录用户（登录验证唯一依赖接口） */
export const API_PATH_LARK_ME = '/api/auth/lark/me'

/** Node：白名单 CRUD（GET/POST/PATCH/DELETE 同路径，DELETE 为 query 传参） */
export const API_PATH_WHITELIST = '/whitelist'
/** Node：知识库资产同步（product-* 数据集 → assets upsert，同步长耗时，前端单独放宽超时） */
export const API_PATH_ASSETS_IMPORT_KNOWLEDGE = '/assets/import-knowledge'
/** Node：商品属性同步（HiAgent 数据库表 → assets 按 sku 回填 gender/des，同放宽超时） */
export const API_PATH_ASSETS_IMPORT_TABLE = '/assets/import-table'
/** Node：资产列表（V1 仅取 total 展示「当前可见资产数」） */
export const API_PATH_ASSETS = '/assets'
/** Node：skill 映射 CRUD（GET/POST 同路径，PATCH/DELETE 为路径参数） */
export const API_PATH_SKILL_MAPPING = '/skill-mapping'

/** 迁移接口专用超时：同步接口逐数据集拉全量文档后 upsert，默认 15s 必超时（技术方案 §5.3） */
export const ASSETS_IMPORT_TIMEOUT_MS = 300_000
