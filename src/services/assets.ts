import {
  API_PATH_ASSETS,
  API_PATH_ASSETS_CLEAR_KNOWLEDGE,
  API_PATH_ASSETS_IMPORT_KNOWLEDGE,
  API_PATH_ASSETS_IMPORT_TABLE,
  ASSETS_IMPORT_TIMEOUT_MS,
} from '@/constants/api'
import type {
  AssetsListResult,
  ClearKnowledgeResult,
  ImportKnowledgeResult,
  ImportTableResult,
} from '@/types/assets'
import { http } from './request'

/**
 * 资产接口（Node 服务 /assets）
 * - import-knowledge：知识库 product-* 数据集 → assets 按文档 docId 幂等 upsert（图片资产数据）
 * - clear-knowledge：物理删除 product-* 数据集对应的 assets 行（同步管辖范围），配合 import-knowledge 全量重建
 * - import-table：HiAgent 数据库表按 material ↔ assets.sku 匹配回填 gender/des（性别线/款名），
 *   匹配即覆盖（HiAgent 表为事实源），幂等可重跑
 * - 同步/清空均为服务端逐数据集/逐页拉全量或批量删除的长耗时接口，单请求超时放宽至 300s（技术方案 §5.3）
 */

export async function importKnowledge(): Promise<ImportKnowledgeResult> {
  return (await http.post<ImportKnowledgeResult>(API_PATH_ASSETS_IMPORT_KNOWLEDGE, null, {
    timeout: ASSETS_IMPORT_TIMEOUT_MS,
  })) as unknown as ImportKnowledgeResult
}

export async function clearKnowledge(): Promise<ClearKnowledgeResult> {
  return (await http.post<ClearKnowledgeResult>(API_PATH_ASSETS_CLEAR_KNOWLEDGE, null, {
    timeout: ASSETS_IMPORT_TIMEOUT_MS,
  })) as unknown as ClearKnowledgeResult
}

export async function importTable(): Promise<ImportTableResult> {
  return (await http.post<ImportTableResult>(API_PATH_ASSETS_IMPORT_TABLE, null, {
    timeout: ASSETS_IMPORT_TIMEOUT_MS,
  })) as unknown as ImportTableResult
}

/** 同步完成后查询资产总数：PageSize=1 仅取 total，避免拉全量列表 */
export async function fetchAssetsTotal(): Promise<number> {
  const result = (await http.get<AssetsListResult>(API_PATH_ASSETS, {
    params: { PageNumber: 1, PageSize: 1 },
  })) as unknown as AssetsListResult
  return result.total
}
