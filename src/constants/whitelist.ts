/**
 * 白名单权限点枚举与展示映射
 * 枚举值与后端 whitelist 表 CHECK 约束（ck_whitelist_feature）及 DTO 校验一致，
 * 后端新增枚举时此处同步（ListWhitelistDto @IsIn 会拒绝未知值）
 */
export const WHITELIST_FEATURES = ['agent_config', 'asset_manage', 'data_dashboard'] as const

export type WhitelistFeature = (typeof WHITELIST_FEATURES)[number]

/** feature → 中文名（列表 Badge / 弹窗下拉 / 删除确认共用） */
export const FEATURE_LABELS: Record<WhitelistFeature, string> = {
  agent_config: '智能体配置',
  asset_manage: '资产库管理',
  data_dashboard: '数据看板',
}

/** feature → Badge 色（三类各一色，表格快速区分） */
export const FEATURE_BADGE_VARIANTS: Record<WhitelistFeature, 'blue' | 'green' | 'purple'> = {
  agent_config: 'blue',
  asset_manage: 'green',
  data_dashboard: 'purple',
}

/** 表单长度约束（与后端 DTO 的 class-validator 规则一一对应，前端第一道校验） */
export const OPEN_ID_MAX_LENGTH = 128
export const REMARK_MAX_LENGTH = 512
