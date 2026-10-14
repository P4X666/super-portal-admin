import { API_PATH_SKILL_MAPPING } from '@/constants/api'
import type {
  CreateSkillMappingPayload,
  DeleteSkillMappingResult,
  SkillMappingItem,
  SkillMappingListParams,
  SkillMappingListResult,
  UpdateSkillMappingPayload,
} from '@/types/skillMapping'
import { http } from './request'

/**
 * skill 映射 CRUD（Node 服务 /skill-mapping，响应信封已由请求层解包）
 * 后端契约要点：skillId 唯一（重复 409）；PATCH 仅允许 nameCn/module/status/desc/input/output/remark；
 * DELETE 为路径参数、物理删除；列表固定 id ASC，可选 status/module 过滤。
 * 无批量新增接口：多条新增由 mutations 层分组循环调本模块单条 POST
 */

/** 分页列表：page 默认 1，pageSize 默认 100（后端默认值，最大 1000） */
export async function fetchSkillMappings(
  params: SkillMappingListParams,
): Promise<SkillMappingListResult> {
  return (await http.get<SkillMappingListResult>(API_PATH_SKILL_MAPPING, {
    params,
  })) as unknown as SkillMappingListResult
}

/** 新增单条：返回创建后的完整记录；skillId 重复抛 ApiError(409, SKILL_MAPPING_DUPLICATE) */
export async function createSkillMapping(
  payload: CreateSkillMappingPayload,
): Promise<SkillMappingItem> {
  return (await http.post<SkillMappingItem>(API_PATH_SKILL_MAPPING, payload)) as unknown as SkillMappingItem
}

/** 部分更新（PATCH 语义）：skillId/nameEn 不可改；不存在 404 */
export async function updateSkillMapping(
  id: string,
  payload: UpdateSkillMappingPayload,
): Promise<SkillMappingItem> {
  return (await http.patch<SkillMappingItem>(`${API_PATH_SKILL_MAPPING}/${encodeURIComponent(id)}`, payload)) as unknown as SkillMappingItem
}

/** 物理删除（路径参数）；不存在 404。「hiagent 已下线」场景应改 status=retired 而非删除 */
export async function deleteSkillMapping(id: string): Promise<DeleteSkillMappingResult> {
  return (await http.delete<DeleteSkillMappingResult>(
    `${API_PATH_SKILL_MAPPING}/${encodeURIComponent(id)}`,
  )) as unknown as DeleteSkillMappingResult
}
