import type { SkillMappingStatus } from '@/constants/skillMapping'

/**
 * skill 映射类型（对齐 Node SkillMappingItemVo：id 归一化为字符串，时间为 ISO；
 * 表列 description 出参映射为 desc）
 */
export interface SkillMappingItem {
  id: string
  skillId: string
  nameEn: string
  nameCn: string | null
  module: string | null
  status: string
  desc: string | null
  input: string | null
  output: string | null
  remark: string | null
  createdAt: string
  updatedAt: string
}

/** GET /skill-mapping 的 data 载荷 */
export interface SkillMappingListResult {
  items: SkillMappingItem[]
  total: number
}

/** GET /skill-mapping 查询参数（后端 ListSkillMappingDto：page 默认 1，pageSize 默认 100 ≤1000） */
export interface SkillMappingListParams {
  page?: number
  pageSize?: number
  status?: SkillMappingStatus
  module?: string
}

/** POST /skill-mapping 入参（skillId 唯一，重复 409 SKILL_MAPPING_DUPLICATE；status 缺省 active） */
export interface CreateSkillMappingPayload {
  skillId: string
  nameEn: string
  nameCn?: string
  module?: string
  status?: SkillMappingStatus
  desc?: string
  input?: string
  output?: string
  remark?: string
}

/**
 * PATCH /skill-mapping/:id 入参（部分更新语义，未传字段不改动）
 * skillId / nameEn 为与 hiagent 的对应键，后端锁死不可改（真改走删+增），故无此二字段
 */
export interface UpdateSkillMappingPayload {
  nameCn?: string
  module?: string
  status?: SkillMappingStatus
  desc?: string
  input?: string
  output?: string
  remark?: string
}

/** DELETE /skill-mapping/:id 的 data 载荷（物理删除） */
export interface DeleteSkillMappingResult {
  id: string
}

/** 批量新增的逐项结果分类（后端无批量接口，前端分组循环调用单条 POST 归集） */
export interface CreateSkillMappingBatchResult {
  /** 创建成功 */
  succeeded: CreateSkillMappingPayload[]
  /** 已存在（409 SKILL_MAPPING_DUPLICATE），未重复创建 */
  duplicates: CreateSkillMappingPayload[]
  /** 其他失败及原因 */
  failed: Array<{ payload: CreateSkillMappingPayload; message: string }>
}
