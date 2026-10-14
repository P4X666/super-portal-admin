/**
 * skill 映射枚举、展示文案与表单限额
 * - status 三态与后端 skill_mapping 表 CHECK 约束（ck_skill_mapping_status）及 DTO @IsIn 一致
 * - module 为自由字符串（varchar 64，无 CHECK 约束），此处仅维护预设枚举供下拉选择与列表筛选，
 *   后端扩展新模块值时列表仍正常展示（badge 兜底展示原值）
 */

/** skill_mapping.status 三态（对齐后端 SKILL_MAPPING_STATUSES） */
export const SKILL_MAPPING_STATUSES = ['active', 'pending_translation', 'retired'] as const

export type SkillMappingStatus = (typeof SKILL_MAPPING_STATUSES)[number]

/** status → 中文名（列表 Badge / 筛选下拉 / 表单下拉共用） */
export const SKILL_STATUS_LABELS: Record<SkillMappingStatus, string> = {
  active: '展示中',
  pending_translation: '翻译中',
  retired: '已下线',
}

/** status → Badge 色（表格快速区分：展示/翻译窗口期/下线） */
export const SKILL_STATUS_BADGE_VARIANTS: Record<SkillMappingStatus, 'green' | 'warning' | 'outline'> =
  {
    active: 'green',
    pending_translation: 'warning',
    retired: 'outline',
  }

/** 所属模块预设（对齐后端实体注释的五大模块；module 为自由文本，预设仅约束下拉选项） */
export const SKILL_MODULES = ['联网搜索', '文档解析', '文档导出', '图片能力', '垂直场景'] as const

export type SkillModule = (typeof SKILL_MODULES)[number]

/** 表单长度约束（与后端 DTO 的 class-validator 规则一一对应，前端第一道校验） */
export const SKILL_ID_MAX_LENGTH = 128
export const NAME_EN_MAX_LENGTH = 128
export const NAME_CN_MAX_LENGTH = 128
export const SKILL_MODULE_MAX_LENGTH = 64
export const SKILL_TEXT_MAX_LENGTH = 512

/**
 * 批量新增限流参数：后端无批量接口，前端循环调单条 POST，
 * 按 CREATE_CHUNK_SIZE 分组——组内并发、组间串行，瞬时并发压在常数级，
 * 避免一次提交几十条时对后端形成请求风暴；行数上限 CREATE_MAX_ROWS 防误操作
 */
export const CREATE_CHUNK_SIZE = 5
export const CREATE_MAX_ROWS = 20
