/**
 * sessionStorage key（admin 专属前缀）
 * admin 与 super-portal 可能同源部署（如 /portal/uat/ 与 /portal/admin/），
 * sessionStorage 按 origin 共享不分路径——必须用独立前缀，
 * 避免覆盖 super-portal 的 'super-portal:super-entry-session'（技术方案 §7.1）
 */
export const STORAGE_KEY_ADMIN_SESSION = 'super-portal-admin:session-id'
export const STORAGE_KEY_ADMIN_USER = 'super-portal-admin:user'
