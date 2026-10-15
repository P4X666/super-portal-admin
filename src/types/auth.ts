/**
 * 登录用户类型（GET /api/auth/lark/me 的 data 载荷，Java LarkUserItem 子集）
 * 登录有效口径（PRD §10.1）：success=true 且 unionId 与 name 均非空字符串才作数；
 * openId 后端保证非空（缺失时服务端 401），仍防御性标为可选
 */
export interface LarkMeUser {
  openId?: string
  userId?: string
  unionId?: string
  name?: string
  avatarUrl?: string | null
}

/** 验证通过后落 sessionStorage 的操作人信息（顶栏展示 + 追溯） */
export interface AdminUser {
  openId: string | null
  unionId: string
  name: string
  avatarUrl: string | null
}

/**
 * 用户查询结果条目（GET /api/auth/lark/user 的 data 数组元素，Java LarkUserItem 子集）
 * 后端读登录时落库的本地身份档案：userId/unionId 理论非空，email 未落库时为 null/缺省，
 * 字段整体防御性可选
 */
export interface LarkUserItem {
  openId?: string
  userId?: string
  unionId?: string
  name?: string
  avatarUrl?: string | null
  email?: string | null
}
