/** POST /assets/import-knowledge 的 data 载荷（Node ImportAssetsResultVo） */
export interface ImportKnowledgeResult {
  /** 本次涉及的数据集别名列表（product-* 前缀） */
  datasets: string[]
  /** 实际 upsert 写入的文档数 */
  imported: number
  /** 解析失败（sku/view 为空）但仍已写入的文档数 */
  parseFailed: number
  /** 知识库中不存在（上游 404）而跳过的数据集别名，出现即提示排查服务端 HIAGENT_DATASETS 配置 */
  skippedDatasets: string[]
}

/** POST /assets/clear-knowledge 的 data 载荷（Node ClearAssetsResultVo） */
export interface ClearKnowledgeResult {
  /** 清空涉及的数据集别名列表（product-* 前缀） */
  datasets: string[]
  /** 实际物理删除的资产条数 */
  deleted: number
}

/** POST /assets/import-table 的 data 载荷（Node ImportTableResultVo） */
export interface ImportTableResult {
  /** 从 HiAgent 数据库表拉取的总行数 */
  totalPulled: number
  /** 匹配到至少一个资产的 material 行数 */
  matchedMaterials: number
  /** 被回填 gender/des 的资产行数 */
  updatedAssets: number
  /** 未匹配任何资产的 material 行数 */
  unmatchedMaterials: number
  /** 命中多个 material 的资产行数（已取第一个命中，其余仅计数） */
  multiMatched: number
  /** 未匹配 material 原始值样例（前 10 个，便于排查） */
  unmatchedSamples: string[]
}

/** GET /assets 的 data 载荷（Node ListAssetsResultVo，admin 仅消费 total） */
export interface AssetsListResult {
  items: unknown[]
  total: number
}
