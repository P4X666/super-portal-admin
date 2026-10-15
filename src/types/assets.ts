/** POST /assets/import-knowledge 的 data 载荷（Node ImportAssetsResultVo） */
export interface ImportKnowledgeResult {
  /** 本次涉及的数据集别名列表（product-* 前缀） */
  datasets: string[]
  /** 实际 upsert 写入的文档数 */
  imported: number
  /** 解析失败（sku/view 为空）但仍已写入的文档数 */
  parseFailed: number
  /** 解析失败的文件名全量列表（与 parseFailed 一一对应，供人工定位修正；通常不超过 10 个） */
  parseFailedFiles: string[]
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

/** GET /assets 列表项（Node AssetItemVo：id 归一化为字符串，时间为 ISO；仅含 active=1 的可见资产） */
export interface AssetItem {
  /** 自增主键（int8 → 字符串） */
  id: string
  /** 知识库数据集 ID（旧数据可能为 null） */
  datasetId: string | null
  /** 从文件名拆出的 SKU */
  sku: string | null
  /** 归一化视角（小写，front=正面） */
  view: string | null
  /** 年份 */
  year: number
  /** 季节：SS=春夏 / FW=秋冬 */
  season: string
  /** 可见性：1=展示；0=隐藏（隐藏记录不出现在列表中） */
  active: number
  /** 知识库原始文件名 */
  filename: string | null
  /** 文件可访问 URL */
  url: string | null
  /** 缩略图 URL（url 缺失或非法时为 null） */
  thumbnailUrl: string | null
  /** 文件大小（字节） */
  size: number
  /** 性别线（HiAgent 表同步，如 Mens；未同步为 null） */
  gender: string | null
  /** 款名（HiAgent 表 style_name 同步；未同步为 null） */
  des: string | null
  /** 创建时间（ISO 字符串） */
  createdAt: string
}

/** GET /assets 的 data 载荷（Node ListAssetsResultVo） */
export interface AssetsListResult {
  items: AssetItem[]
  total: number
}

/** GET /assets 查询参数（Node ListAssetsDto：DatasetId 支持别名或 UUID，Keywords 对 filename/des 模糊匹配；
    HTTP 查询串为 PascalCase，由 services 层映射，最长均 128 字符） */
export interface AssetQueryParams {
  page?: number
  pageSize?: number
  datasetId?: string
  keywords?: string
}

/** DELETE /assets/:id 的 data 载荷：被删记录快照（物理删除；记录不存在 404 ASSETS_NOT_FOUND） */
export type DeleteAssetResult = AssetItem
