# 超级入口 Admin 后台（super-portal-admin）PRD

| 项目 | 内容 |
| --- | --- |
| 文档版本 | v1.5 |
| 发布日期 | 2026-10-16 |
| 文档状态 | 待评审 |
| 需求方 | 超级入口项目组 |
| 关联项目 | super-portal（用户端前端）、UA-HiAgent-Plugin（Node API 服务）、UA-HiAgent-Plugin（Java API 服务，登录验证） |

> 变更记录：v1.5 **模块一扩展「资产查询与删除」**（/migration 页新增第三张卡片：`GET /assets` 按 DatasetId（别名/UUID）+ Keywords 分页查询、`DELETE /assets/:id` 单条物理删除，用于下架不合规商品并在删除后复查；同时补录已实现未归档的「清空现有数据」`POST /assets/clear-knowledge`；无新增路由，无章节顺延）。v1.4 **补录模块四 用户查询**（`/user-query`，功能已上线、规格后补；依赖 Java 新增的 `GET /api/auth/lark/user` 用户档案查询；原 §9～§12 顺延为 §10～§13）。v1.3 新增**模块三 Skill 管理**（`/skill-mapping`，HiAgent skill 中文名映射表的查询/批量新增/编辑/删除；后端 `GET/POST/PATCH/DELETE /skill-mapping` 均已存在，零改动；原 §8～§11 顺延为 §9～§12）。v1.2 模块一拆分为两个同步操作——后端 import 接口更新为 `POST /assets/import-knowledge`（知识库资产同步，原 `/assets/import`）与新增 `POST /assets/import-table`（商品属性同步，HiAgent 数据库表按 SKU 回填 gender/des）。v1.1 确定登录方案（sessionId + `/me` 验证 unionId+name）。

---

## 1. 背景与问题

超级入口（super-portal）通过**用户白名单**控制侧边栏底部功能入口（智能体配置 / 资产库管理 / 数据看板）的可见性。白名单数据存储在 Node 服务的 PostgreSQL `whitelist` 表中，当前存在两个纯手工操作痛点：

1. **白名单变更靠手动 SQL**：目前没有任何管理界面，PM 需要给某用户开权限时，只能提需求由开发/DBA 手工执行 INSERT/DELETE，链路长、易出错、无操作记录。
2. **资产数据同步靠手动调接口**：资产库（`assets` 表）的数据来自 HiAgent 知识库 `product-*` 数据集的导入，目前只能通过手动 curl 调用 `POST /assets/import` 触发，且需要自行拼接鉴权头。

> 关键结论（已核实代码）：上述两个操作对应的后端接口在 UA-HiAgent-Plugin（NestJS）中**均已实现并在 UAT 环境运行**，本项目为纯前端消费端，**V1 后端零改动**。

## 2. 目标与非目标

### 2.1 目标

| # | 目标 | 衡量方式 |
| --- | --- | --- |
| G1 | 白名单增删改查从"手动 SQL"变为"页面自助操作" | 单次权限变更耗时从小时级降到分钟级，无需开发介入 |
| G2 | 资产数据同步从"手动 curl"变为"一键迁移" | 管理员在页面点击一次按钮即可完成同步，并看到结果反馈 |
| G3 | 操作可视化、可确认 | 关键操作（删除）有确认；结果（成功/失败/数量）即时反馈 |

### 2.2 非目标（本期不做）

- 不改变用户端（super-portal）的权限判断逻辑与 `GET /whitelist/check` 接口
- 不做资产本身的编辑/隐藏管理（该能力已在 super-portal `/config?tab=asset` 提供；不合规商品的**删除**已由 v1.5 在资产同步页补录，见 6.7）
- 不做数据看板（data_dashboard）业务功能，仅维护其权限点
- 不做操作审计日志落库（后端无此接口，列入开放问题）

## 3. 名词解释

| 名词 | 解释 |
| --- | --- |
| sessionId | 超级入口登录会话凭证（32 位 UUID 无连字符），由 `POST /api/auth/lark/login` 签发、存于 Java 服务数据库会话表，有过期时间（expiresAt）。用户可在自己浏览器的开发者控制台中获取。admin 以其作为登录凭证 |
| unionId | 飞书用户跨应用唯一标识，`/me` 接口返回；与 name 共同作为登录有效的判定字段，并用于操作追溯 |
| 白名单（whitelist） | 用户 × 权限点的授权关系表；表中即有权限，无启停状态 |
| 权限点（feature） | 白名单控制的按钮/入口，当前枚举：`agent_config`（智能体配置）、`asset_manage`（资产库管理）、`data_dashboard`（数据看板） |
| openId | 用户唯一标识（飞书 openId），白名单的业务主键之一；`/me` 接口同时返回操作人自己的 openId |
| 知识库数据集 | HiAgent 侧的数据集，别名形如 `product-shoes`、`product-hat`，配置于服务的 `HIAGENT_DATASETS` |
| 资产库（assets 表） | Node 服务 PG 中的资产表，按 `doc_id` 去重，字段含 sku/view/year/season/active 等 |
| 一键迁移 | 调用 `POST /assets/import`，把知识库 `product-*` 数据集的全部文档同步（upsert）到 UAT 环境的 `assets` 表 |

## 4. 用户与角色

| 角色 | 说明 | 使用模块 |
| --- | --- | --- |
| 管理员（PM / 运营 / 开发） | 超级入口项目的内部人员，拥有 admin 后台访问权 | 模块一 + 模块二 + 模块三 + 模块四 |

## 5. 总体方案

### 5.1 项目定位

新建独立前端项目 `super-portal-admin`（本仓库），技术栈与 super-portal 完全对齐：

- React 19 + TypeScript + Vite
- react-router-dom 7
- Tailwind CSS v4（CSS-first 配置，无 tailwind.config）
- shadcn 风格组件（`src/components/ui/`，@base-ui/react 底座）+ lucide-react 图标 + sonner Toast
- axios 请求层（复用 super-portal 的请求封装范式）

### 5.2 信息架构与路由

```
/login          → 登录页（粘贴 sessionId 验证，未登录访问其他页面重定向至此）
/               → 重定向到 /migration
/migration      → 资产同步：三张同步卡片 + 资产查询与删除（模块一，v1.5 扩展）
/whitelist      → 白名单管理（模块二）
/skill-mapping  → Skill 管理（模块三）
/user-query     → 用户查询（模块四，v1.4 补录规格）
```

布局：顶部导航栏（项目名「超级入口 Admin」+ 各模块 Tab + 操作人信息「姓名 + 退出」），内容区单栏。管理场景无需侧边栏，保持简洁。

### 5.3 依赖的后端接口（均已存在）

**Node 服务**（UA-HiAgent-Plugin/NestJS，路径相对服务根）：

| 接口 | 方法 | 用途 |
| --- | --- | --- |
| `/assets/import-knowledge` | POST | 模块一：知识库资产同步 |
| `/assets/clear-knowledge` | POST | 模块一：清空知识库导入的资产（v1.5 补录，接口已存在） |
| `/assets/import-table` | POST | 模块一：商品属性同步 |
| `/assets` | GET | 模块一：分页查询资产（DatasetId/Keywords 筛选，v1.5）；另以 PageSize=1 取 total 展示总数 |
| `/assets/:id` | DELETE | 模块一（v1.5）：删除单条资产（物理删除，返回被删快照） |
| `/whitelist` | GET | 模块二：白名单分页列表 |
| `/whitelist` | POST | 模块二：新增 |
| `/whitelist` | PATCH | 模块二：修改备注 |
| `/whitelist` | DELETE | 模块二：删除（query 传参） |
| `/skill-mapping` | GET | 模块三：skill 分页列表（status/module 过滤，id ASC） |
| `/skill-mapping` | POST | 模块三：单条新增（无批量接口，多条由前端分组循环提交） |
| `/skill-mapping/:id` | PATCH | 模块三：部分更新（仅人工字段） |
| `/skill-mapping/:id` | DELETE | 模块三：物理删除（路径参数） |

**Java 服务**（super-portal-backend/UA-HiAgent-Plugin/Spring Boot）：

| 接口 | 方法 | 用途 |
| --- | --- | --- |
| `/api/auth/lark/me` | GET | 登录验证：`Authorization: Bearer <sessionId>` 换取用户信息 |
| `/api/auth/lark/user` | GET | 模块四：用户档案查询（openId/用户名/邮箱三选一，读登录落库档案） |

鉴权要求：Node 接口需全局 `x-api-key` 头（fail-secure 校验，缺失/错误 401）；Java 接口（`/me` 与用户查询）需 `Authorization: Bearer <sessionId>` 头（缺失/会话失效返回 HTTP 401）。

---

## 6. 模块一：资产同步

资产同步页提供**两个同步操作与一个清空操作**（后端接口，v1.2 拆分；清空已实现、随 v1.5 一并补录），另有**资产查询与删除**工具卡片（v1.5 新增，见 6.7）：

- **知识库资产同步**（`POST /assets/import-knowledge`）：将知识库 `product-*` 数据集（鞋/帽/上装等全部品类，不含 model）中的资产图片数据同步（按 `doc_id` upsert）到 UAT `assets` 表；
- **商品属性同步**（`POST /assets/import-table`）：从 HiAgent 数据库表全量拉取行数据，按 `material ↔ assets.sku` 匹配（大小写/连接符 `_``-` 自动归一）回填**性别线 gender**（如 Mens）与**款名 des**（style_name 列）。
- **清空现有数据**（`POST /assets/clear-knowledge`）：物理删除库中全部来自知识库 product-* 数据集的资产，先清空再同步可全量重置（人工修改的年份/季节/可见性与属性回填值会一并清除）；幂等，独立确认弹窗，与同步互斥。

**同步语义（来自后端实现，产品需知悉）：**

- 两个接口均**幂等可重复执行**，重复点击不会产生脏数据；
- 知识库同步**不覆盖** `year / season / active` 的人工修改值；属性同步为**匹配即覆盖**（HiAgent 表为事实源），不影响图片数据；
- 知识库同步中文件名解析 sku/view 失败的记录仍写入（NULL），计入 `parseFailed`；属性同步中未匹配任何资产的 material 行计入 `unmatchedMaterials`（附前 10 条样例便于排查）；
- 两者均为**同步长耗时接口**（逐数据集/逐页拉全量后写入），数据量大时响应可能达数十秒以上。

### 6.2 用户故事

> 作为管理员，我想在页面上分别一键完成「知识库资产同步」和「商品属性同步」，并立即看到各自写入/匹配/失败的统计，这样我就不需要记住 curl 命令、找鉴权 key、再手动确认结果。

### 6.3 页面元素与交互（每张同步卡片各自独立）

| 元素 | 说明 | 优先级 |
| --- | --- | --- |
| 功能说明卡片 | 标题 + 说明列表（数据来源、同步方式、幂等语义）；两张卡片上下排列 | P0 |
| 同步按钮 | 各卡片「开始同步」，点击弹出确认弹窗（文案说明影响范围与覆盖策略） | P0 |
| 进行中状态 | 按钮转 loading + 禁用（仅禁用本卡片，另一卡片可独立操作），显示「同步进行中，请勿关闭页面」 | P0 |
| 知识库同步结果 | 涉及数据集列表（datasets）、写入条数（imported）、解析失败条数（parseFailed，警示色） | P0 |
| 属性同步结果 | 拉取行数（totalPulled）、回填资产行数（updatedAssets）、未匹配 material（unmatchedMaterials，警示色 + 前 10 条样例）、多命中计数（multiMatched） | P0 |
| 失败提示 | 请求失败时展示错误信息 + 重试入口，按钮恢复可点击 | P0 |
| 清空现有数据 | 知识库同步卡片内的红色「清空现有数据」按钮（与同步互斥）：独立确认弹窗 → 物理删除 product-* 资产 → 结果展示删除条数与涉及数据集（v1.5 补录，已实现） | P0 |
| 资产总数（可选） | 页面标题区常驻「当前资产库共 N 条可见资产」，初始加载与任一同步成功后调 `GET /assets`（PageSize=1）刷新 | P1 |

### 6.4 接口契约

**POST /assets/import-knowledge**（知识库资产同步）

- 请求：无参数（数据源由服务端 `HIAGENT_DATASETS` 配置决定）
- 响应信封：`{ success: boolean; data: T; timestamp: string }`

```ts
// data 结构（ImportAssetsResultVo）
{
  datasets: string[];   // 本次涉及的数据集别名，如 ['product-shoes', 'product-hat', ...]
  imported: number;     // 实际 upsert 写入的文档数
  parseFailed: number;  // 解析失败（sku/view 为空）但仍已写入的文档数
}
```

- 失败：HTTP 500，errorCode `ASSETS_IMPORT_FAILED`（单数据集事务失败会整体抛错回滚该数据集）。

**POST /assets/clear-knowledge**（清空知识库导入的资产，v1.5 补录）

- 请求：无参数；data 结构（ClearAssetsResultVo）：

```ts
{
  datasets: string[];   // 清空涉及的数据集别名（product-* 前缀）
  deleted: number;      // 实际物理删除的资产条数
}
```

**POST /assets/import-table**（商品属性同步）

- 请求：无参数（数据源由服务端 `HIAGENT_TABLE_SOURCE` 配置 `{"databaseId","tableId"}` 决定）
- data 结构（ImportTableResultVo）：

```ts
{
  totalPulled: number;        // 从 HiAgent 数据库表拉取的总行数
  matchedMaterials: number;   // 匹配到至少一个资产的 material 行数
  updatedAssets: number;      // 被回填 gender/des 的资产行数
  unmatchedMaterials: number; // 未匹配任何资产的 material 行数
  multiMatched: number;       // 命中多个 material 的资产行数（取第一个命中）
  unmatchedSamples: string[]; // 未匹配 material 原始值样例（前 10 个）
}
```

- 失败：HTTP 500，errorCode `HIAGENT_TABLE_SOURCE_INVALID`（服务端数据源配置缺失/非法，需联系开发处理）。

### 6.5 验收标准（BDD）

```gherkin
Feature: 知识库资产同步

  Scenario: 同步成功（Happy Path）
    Given 管理员已登录并进入 /migration 页面
    When 管理员在「知识库资产同步」卡片点击「开始同步」并在确认弹窗中确认
    Then 按钮进入 loading 且不可再次点击
    And 接口返回 success=true 后展示结果（数据集列表 / 写入条数 / 解析失败条数）
    And 页面标题区的资产总数刷新

  Scenario: 同步中防止重复触发（Edge Case）
    Given 该卡片的同步请求仍在进行中
    When 管理员尝试再次点击「开始同步」
    Then 按钮保持禁用，不发起新的请求（另一卡片不受影响，可独立操作）

  Scenario: 接口超时或失败（Edge Case）
    When 同步请求超时或返回 5xx
    Then 卡片内展示「同步失败 + 服务端错误信息」与重试入口
    And 重试重新经过确认弹窗（接口幂等，重试安全）

  Scenario: 存在解析失败的记录（Edge Case）
    When 同步返回 parseFailed > 0
    Then 该数字以警示色展示，并附说明
    「N 条记录文件名解析失败，已以空 SKU/视角写入，可前往资产管理页人工修正」

Feature: 商品属性同步

  Scenario: 同步成功（Happy Path）
    When 管理员在「商品属性同步」卡片确认同步
    Then 展示结果（拉取行数 / 回填资产行数 / 未匹配 material 数）

  Scenario: 存在未匹配的 material（Edge Case）
    When 同步返回 unmatchedMaterials > 0
    Then 该数字以警示色展示，并列出前 10 条未匹配样例便于排查

  Scenario: 服务端数据源配置错误（Edge Case）
    When 同步返回 500 且 errorCode=HIAGENT_TABLE_SOURCE_INVALID
    Then 展示服务端错误信息（需联系开发处理配置）

  Scenario: 多命中（Edge Case）
    When 同步返回 multiMatched > 0
    Then 以说明文字提示「N 条资产命中多个 material，已取第一个命中的值」

Feature: 清空现有数据（v1.5 补录）

  Scenario: 清空成功（Happy Path）
    When 管理员在「知识库资产同步」卡片点击「清空现有数据」并确认
    Then 展示删除条数与涉及数据集，页头资产总数刷新
    And 提示「库内 product-* 资产已全部删除，请重新同步重建数据」

  Scenario: 清空与同步互斥（Edge Case）
    Given 清空请求仍在进行中
    Then 「开始同步」按钮禁用；反之同步进行中时清空按钮亦禁用

  Scenario: 取消清空（Edge Case）
    When 管理员在确认弹窗中点击「取消」
    Then 不发起请求，数据保持不变
```

### 6.6 UI/UX 要点

- 两张同步卡片上下排列、各自独立的状态机与确认弹窗，互不阻塞；
- 结果统计用三格统计卡，警示数字（parseFailed / unmatchedMaterials > 0）用 amber 警示色；
- 请求超时设置：两个同步接口的 axios timeout 单独调大至 300s（默认 15s 不够）；
- 确认弹窗文案需说明幂等性与覆盖策略差异（知识库同步保护人工值；属性同步匹配即覆盖），降低管理员顾虑。

### 6.7 资产查询与删除（v1.5 新增）

同步后如发现不合规商品（如错图、违规款），需要将其从资产库删除，并能在删除后查询确认「确实已不在库中」。/migration 页新增第三张工具卡片，复用既有 `GET /assets` 与 `DELETE /assets/:id` 接口（零后端改动）。

**产品约束（来自后端契约）：**

- 删除为**物理删除且不可恢复**；被删数据可经「清空 + 重新同步」从知识库重建（人工修改的年份/季节/可见性与属性回填值会丢失）；
- `GET /assets` **仅返回 active=1 的可见资产**——主站资产管理页被「隐藏」的商品同样不会出现在查询结果中，「查询不到」≠「已删除」，删除与否以删除接口结果为准（UI 文案需明示此口径）；
- `DatasetId` 支持数据集别名（如 `product-shoes`）或 UUID；`Keywords` 对文件名与款名模糊匹配（OR、不区分大小写）；两者均可选、可组合，均留空即查询全部数据集；
- 删除接口按 id 定位，记录不存在（含已被其他管理员删除）返回 404 `ASSETS_NOT_FOUND`。

**页面元素与交互：**

| 元素 | 说明 | 优先级 |
| --- | --- | --- |
| 筛选表单 | DatasetId 输入框（placeholder 示例 product-shoes，≤128）+ Keywords 输入框（≤128）+ 「查询」按钮；文本条件由「查询」按钮/回车**显式提交**（不逐键请求、不做防抖）；条件可留空 | P0 |
| 结果表格 | 列：ID（可复制）、文件名、SKU（可复制）、视角、性别线、款名、年份/季节、创建时间、操作（删除）；长文本截断 + hover 全文 | P0 |
| 空态 | 首次进入未查询时展示引导态（**不自动发请求**）；查询无结果提示「若条件无误，说明该商品已不在可见资产中（已删除或在主站被隐藏）」 | P0 |
| 删除 | 行内「删除」→ 确认弹窗（展示 ID/文件名/SKU/款名，hint 明确物理删除不可恢复 + 隐藏≠删除口径）→ 成功后列表与页头资产总数自动刷新，toast「已删除资产 #id」 | P0 |
| 并发 404 | 删除时记录已不存在 → toast「资产不存在（可能已被删除）」+ 列表刷新，弹窗关闭 | P0 |
| 分页 | 页码 + 总数展示；页大小切换（20/50/100，默认 50） | P0 |

**接口契约：**

统一响应信封同前。**GET /assets**（列表查询，HTTP 查询串为 PascalCase）：

```
query（均可选）: DatasetId=别名|UUID（≤128）、Keywords=关键词（≤128，对 filename/des 模糊 OR）、PageNumber（默认1）、PageSize（默认50，≤1000）
data: {
  items: [{ id, datasetId, sku, view, year, season, active, filename, url, thumbnailUrl, size, gender, des, createdAt }]
  total: number
}   // 仅含 active=1；id 为字符串（int8 归一化），时间为 ISO
```

**DELETE /assets/:id**（物理删除，路径参数）：

```
成功: data = 被删记录快照（结构同列表项，供调用方确认）
不存在: HTTP 404, errorCode=ASSETS_NOT_FOUND
```

**验收标准（BDD）：**

```gherkin
Feature: 资产查询

  Scenario: 组合筛选查询（Happy Path）
    Given 管理员已登录并进入 /migration 页面
    When 在「资产查询与删除」卡片输入数据集 product-shoes 与关键词后点击「查询」
    Then 表格仅展示该数据集下文件名/款名命中关键词的资产，展示总数与分页

  Scenario: 删除后复查（Happy Path）
    When 删除某商品后以相同条件重新查询
    Then 该商品不再出现在结果中（空态提示已删除或在主站被隐藏）

  Scenario: 首次进入不自动请求（Edge Case）
    When 刚进入页面尚未点击「查询」
    Then 展示引导空态，不发起列表请求

  Scenario: 查询失败（Edge Case）
    When 查询请求失败
    Then 展示错误态 + 重试，重试复用当前筛选条件

Feature: 资产删除

  Scenario: 删除成功（Happy Path）
    When 管理员在某行点击「删除」并在确认弹窗中确认
    Then 该行从列表移除，页头资产总数减一，toast「已删除资产 #id」

  Scenario: 并发删除冲突（Edge Case）
    When 确认删除时该资产已被删除（404 ASSETS_NOT_FOUND）
    Then toast「资产不存在（可能已被删除）」，弹窗关闭，列表刷新

  Scenario: 删除不可逆提示（约束）
    Then 确认弹窗展示目标资产 ID/文件名/SKU/款名，hint 明确「物理删除不可恢复；可用清空+重新同步重建（人工修改会丢失）」
```

**UI/UX 要点：**

- 卡片排在两张同步卡片之后；两个筛选输入框 `maxLength=128` 与后端 DTO 对齐（前端第一道校验）；
- ID 与 SKU 列复用 CopyableText（截断 + hover 全文 + 一键复制），便于与删除接口结果/日志比对；
- 文案显式区分「隐藏」与「删除」两个口径（active=0 的记录不进列表），避免把主站隐藏误判为已删除；
- 查询/分页请求带竞态守卫（仅采纳最后一次请求结果），删除按钮行级 loading。

---

## 7. 模块二：白名单管理

### 7.1 功能描述

提供白名单的分页列表与增删改查。数据模型为**用户（openId）× 权限点（feature）**的授权记录，一条记录代表「某用户拥有某权限点」；同一用户可分别拥有多个权限点（各占一条记录）。

**产品约束（来自后端契约）：**

- 新增以 `openId + feature` 为联合唯一键，重复新增返回 409；
- **编辑仅允许修改备注（remark）**，openId/feature 是定位键不可修改；授权错了只能删除后重新新增；
- 删除为物理删除，删除后该用户立即失去对应权限点（用户端 `check` 接口实时生效，因用户端为模块级缓存，用户刷新页面后生效）；
- 备注为内部维护字段（最长 512 字符），不对外展示。

### 7.2 用户故事

> 作为管理员，我想在列表里看到当前所有白名单授权，并能按权限点筛选，这样我能快速回答"谁有数据看板权限"这类问题。

> 作为管理员，我想输入一个 openId、勾选权限点就完成授权，并在误授权时一键删除，这样开权限不用再找开发执行 SQL。

### 7.3 功能清单

| 功能 | 规格 | 优先级 |
| --- | --- | --- |
| 列表展示 | 分页表格，默认每页 100 条（后端默认值），固定 id 升序（加入顺序）；列：openId、权限点（Tag 标签）、备注、创建时间、更新时间、操作 | P0 |
| 权限点筛选 | 顶部 Select 筛选 feature（全部 / 智能体配置 / 资产库管理 / 数据看板），切换即重新请求 | P0 |
| openId 搜索 | V1 仅对**当前页**数据做前端过滤（后端列表接口暂不支持 openId 参数，见开放问题 Q2）；输入框 + 防抖 | P1 |
| 新增 | Dialog 表单：openId（必填，≤128 字符）、权限点（**必选，三项下拉多选**，可一次勾选多个批量授权——后端无批量接口，前端循环调用单条新增，部分成功时弹窗保留并逐项提示）、备注（选填，≤512 字符，默认预填「操作人：{登录姓名}」便于追溯，可编辑）；前端校验 + 后端校验双保险 | P0 |
| 修改备注 | 行内「编辑」→ Dialog，仅 remark 可编辑；清空输入即清空备注（后端把空串归一化为 NULL） | P0 |
| 删除 | 行内「删除」→ 确认弹窗（展示 openId + 权限点名，明确"删除后该用户立即失去该权限"）→ 物理删除 | P0 |
| 分页 | 页码 + 总数展示；页大小切换（20/50/100） | P0 |

### 7.4 权限点枚举（与后端 CHECK 约束一致）

| feature 值 | 展示名 | 说明 |
| --- | --- | --- |
| `agent_config` | 智能体配置 | super-portal 侧边栏「智能体配置」入口 |
| `asset_manage` | 资产库管理 | super-portal 侧边栏「资产库管理」入口 |
| `data_dashboard` | 数据看板 | 预留权限点（用户端消费端建设中） |

### 7.5 接口契约

统一响应信封：`{ success: boolean; data: T; timestamp: string }`。

**GET /whitelist**（列表）

```
query: page（默认1）、pageSize（默认100，≤1000）、feature（可选）
data:  {
  items: [{
    id: string;          // 主键（后端归一化为字符串）
    openId: string;
    feature: string;     // agent_config | asset_manage | data_dashboard
    remark: string | null;
    createdAt: string;   // ISO
    updatedAt: string;   // ISO（表触发器维护）
  }];
  total: number;         // 过滤后总数
}
```

**POST /whitelist**（新增）

```
body: { openId: string（必填≤128）; feature: string（枚举）; remark?: string（≤512） }
成功: data = 创建后的完整记录
重复: HTTP 409, errorCode=WHITELIST_DUPLICATE，提示「该用户已拥有此权限点」
```

**PATCH /whitelist**（仅改备注）

```
body: { openId: string; feature: string; remark: string（必填，空串=清空） }
成功: data = 更新后的完整记录
不存在: HTTP 404, errorCode=WHITELIST_NOT_FOUND
```

**DELETE /whitelist**（物理删除，**query 传参**）

```
query: ?openId=xxx&feature=yyy
成功: data = { openId, feature }
不存在: HTTP 404, errorCode=WHITELIST_NOT_FOUND
```

### 7.6 验收标准（BDD）

```gherkin
Feature: 白名单列表

  Scenario: 加载列表（Happy Path）
    Given 管理员已登录并进入 /whitelist 页面
    When 页面首次渲染
    Then 展示第一页白名单数据（默认 100 条）与总数
    And 权限点列展示中文 Tag，备注为空时展示占位符「-」

  Scenario: 按权限点筛选（Happy Path）
    When 管理员将筛选切换为「数据看板」
    Then 列表仅展示 feature=data_dashboard 的记录，总数同步更新

  Scenario: 列表接口失败（Edge Case）
    When GET /whitelist 请求失败或返回 success=false
    Then 表格展示错误态（含「重试」按钮），不展示空数据误导管理员

Feature: 新增白名单

  Scenario: 新增成功（Happy Path）
    Given 管理员点击「新增授权」
    When 填写 openId、选择权限点「智能体配置」、填写备注并提交
    Then 请求成功后 toast「授权成功」，列表刷新且新记录可见

  Scenario: 批量新增部分重复（Edge Case）
    When 提交的 openId + 某些已勾选 feature 组合已存在
    Then 已存在的权限点跳过不重复创建，表单不关闭，权限点下方提示
    「已存在（未重复创建）：{权限点名}」，其余权限点正常创建成功

  Scenario: 参数校验失败（Edge Case）
    When openId 为空或超过 128 字符、备注超过 512 字符、feature 非法
    Then 前端拦截并就地展示字段级错误信息，不发起请求

Feature: 修改备注

  Scenario: 修改成功（Happy Path）
    When 管理员在某行点击「编辑」，修改备注后保存
    Then 该行备注与更新时间刷新，toast「已保存」

  Scenario: 记录已被他人删除（Edge Case）
    When 保存时该 openId+feature 记录已被其他管理员删除
    Then 服务端返回 404，toast「记录不存在（可能已被其他管理员删除）」，列表自动刷新

Feature: 删除白名单

  Scenario: 删除成功（Happy Path）
    When 管理员在某行点击「删除」并在确认弹窗中确认
    Then 该记录从列表移除，总数减一，toast「已移除授权」

  Scenario: 取消删除（Edge Case）
    When 管理员在确认弹窗中点击「取消」
    Then 不发起请求，记录保持不变

  Scenario: 并发删除冲突（Edge Case）
    When 确认删除时该记录已被其他管理员删除
    Then 服务端返回 404，toast「记录不存在（可能已被删除）」，列表自动刷新为最新状态
```

### 7.7 UI/UX 要点

- 表格使用 shadcn Table，权限点用不同颜色 Badge 区分（三类各一色）；
- openId 较长（飞书 openId 通常 30+ 字符），列宽固定 + `truncate` + hover 展示全文 + 一键复制按钮（新增/排查时高频复制 openId）；
- 删除确认弹窗必须展示「用户 openId + 权限点中文名」，防误删；
- 所有写操作（新增/编辑/删除）成功后统一 sonner toast 反馈，失败 toast 展示服务端 `errorMessage`；
- 空数据态：区分「无任何白名单数据」与「当前筛选条件下无结果」（后者提示调整筛选）。

---

## 8. 模块三：Skill 管理

### 8.1 功能描述

维护 **HiAgent skill 中文名映射表**（Node 服务 `skill_mapping` 表）。用户端 Skill 下拉框按本表的**中文名/状态/说明**对外展示：skill 的 skillId/nameEn 同步自 hiagent（人工不可改），中文名经 PM 确认后由管理员在本模块录入与维护。

**产品约束（来自后端契约）：**

- 新增以 `skillId` 为唯一键，重复返回 409；**后端无批量新增接口**，多条新增由前端循环调单条 POST（按 5 条一组分组提交，见 8.3）；
- **编辑仅允许修改人工字段**：nameCn / module / status / desc / input / output / remark；skillId / nameEn 是与 hiagent 的对应键，创建后锁死（真改走删+增）；
- status 三态：`active`（展示中）/ `pending_translation`（翻译中，中文名未确认暂不展示）/ `retired`（已下线，hiagent 已下线不再展示）——**skill 下线应改状态而非删除**，保留映射记录；
- 删除为**物理删除且不可恢复**，删除确认弹窗需明确提示；
- module 为自由文本（≤64 字符，无后端枚举约束），前端预设五大模块下拉（见 8.4）。

### 8.2 用户故事

> 作为管理员，我想分页浏览全部 skill 映射并按状态/模块筛选，这样我能快速发现「哪些 skill 还没有中文名」并跟进补录。

> 作为 PM，我想一次把 hiagent 新上线的多个 skill 录入系统（填一份多行表单即可），这样不用一条条重复操作；已存在的 skillId 自动跳过不报错中断。

### 8.3 功能清单

| 功能 | 规格 | 优先级 |
| --- | --- | --- |
| 列表展示 | 分页表格，默认每页 100 条（后端默认值），固定 id 升序；列：skillId（可复制）、英文名、中文名、所属模块、状态（Badge）、用途说明、更新时间、操作；未填字段展示「-」 | P0 |
| 状态筛选 | 顶部 Select 筛选 status（全部 / 展示中 / 翻译中 / 已下线），服务端过滤，切换即重新请求 | P0 |
| 模块筛选 | 顶部 Select 筛选 module（全部 + 五大预设模块），服务端过滤，切换即重新请求 | P0 |
| 关键词搜索 | 对当前页数据按 skillId / 英文名 / 中文名 前端过滤（后端无关键词参数），明示「仅当前页」 | P1 |
| 批量新增 | Dialog 多行表单（上限 20 行），每行 skillId*/英文名*必填 + 中文名/所属模块选填；状态与备注为整批公共字段（状态默认展示中，备注默认预填「操作人：{登录姓名}」）；提交按 5 条一组分组循环调单条 POST（组内并发、组间串行，避免请求风暴），提交中展示进度「done/total」；表单内 skillId 重复前端就地拦截；部分成功时弹窗不关、仅保留未成功行便于重试，409 提示「已存在（未重复创建）」 | P0 |
| 编辑 | 行内「编辑」→ Dialog：中文名 / 所属模块 / 状态 / 用途说明 / 输入说明 / 输出说明 / 备注 全部可改，文本留空提交即清空；skillId/nameEn 只读展示 | P0 |
| 删除 | 行内「删除」→ 确认弹窗（展示 skillId + 名称），hint 明确「物理删除不可恢复；hiagent 已下线建议改状态为已下线」→ 物理删除 | P0 |
| 分页 | 页码 + 总数展示；页大小切换（20/50/100） | P0 |

### 8.4 枚举与文案

| status 值 | 展示名 | Badge 色 | 说明 |
| --- | --- | --- | --- |
| `active` | 展示中 | green | 用户端 Skill 下拉框可见 |
| `pending_translation` | 翻译中 | warning | 中文名翻译/确认窗口期，暂不展示 |
| `retired` | 已下线 | outline | hiagent 已下线，不再展示（保留记录） |

所属模块预设（module 为自由文本，预设仅约束前端下拉；新增模块值后端可扩展，列表照常展示）：
`联网搜索` / `文档解析` / `文档导出` / `图片能力` / `垂直场景`

### 8.5 接口契约

统一响应信封：`{ success: boolean; data: T; timestamp: string }`。出参中表列 `description` 映射为 `desc`（DESC 为 PG 保留字）。

**GET /skill-mapping**（列表）

```
query: page（默认1）、pageSize（默认100，≤1000）、status（可选枚举）、module（可选，精确匹配）
排序固定 id ASC（导入顺序，下拉展示稳定），无客户端排序参数
data:  {
  items: [{
    id: string;        // 主键（后端归一化为字符串）
    skillId: string;   // hiagent skill 唯一标识
    nameEn: string;    // 英文名，同步自 hiagent
    nameCn: string | null;
    module: string | null;
    status: string;    // active | pending_translation | retired
    desc: string | null;    // 用途说明（表列 description）
    input: string | null;   // 输入说明
    output: string | null;  // 输出说明
    remark: string | null;  // 内部备注
    createdAt: string;      // ISO
    updatedAt: string;      // ISO（表触发器维护）
  }];
  total: number;
}
```

**POST /skill-mapping**（单条新增）

```
body: {
  skillId: string（必填≤128）; nameEn: string（必填≤128）;
  nameCn?: string（≤128）; module?: string（≤64）;
  status?: string（枚举，缺省 active）;       // API 层缺省 active（覆盖列默认 pending_translation）
  desc?/input?/output?: string（各≤512）; remark?: string（≤512）
}
成功: data = 创建后的完整记录
重复: HTTP 409, errorCode=SKILL_MAPPING_DUPLICATE
```

**PATCH /skill-mapping/:id**（部分更新，仅人工字段）

```
body: { nameCn?; module?; status?; desc?; input?; output?; remark? }   // 未传字段不改动；更新内容为空 400
成功: data = 更新后的完整记录
不存在: HTTP 404, errorCode=SKILL_MAPPING_NOT_FOUND
```

**DELETE /skill-mapping/:id**（物理删除，路径参数）

```
成功: data = { id }
不存在: HTTP 404, errorCode=SKILL_MAPPING_NOT_FOUND
```

### 8.6 验收标准（BDD）

```gherkin
Feature: skill 列表

  Scenario: 加载列表（Happy Path）
    Given 管理员已登录并进入 /skill-mapping 页面
    When 页面首次渲染
    Then 展示第一页 skill 数据（默认 100 条）与总数，id 升序
    And 中文名/模块/说明为空的字段展示「-」，skillId 带一键复制

  Scenario: 按状态筛选（Happy Path）
    When 管理员将状态筛选切换为「已下线」
    Then 列表仅展示 status=retired 的记录，总数同步更新

  Scenario: 按模块筛选（Happy Path）
    When 管理员将模块筛选切换为「文档解析」
    Then 列表仅展示 module=文档解析 的记录

  Scenario: 列表接口失败（Edge Case）
    When GET /skill-mapping 请求失败
    Then 表格展示错误态（含「重试」按钮）

Feature: 批量新增 skill

  Scenario: 多条新增成功（Happy Path）
    Given 管理员点击「新增 Skill」并在多行表单中填写 2 条记录
    When 提交
    Then 两条记录按分组提交全部创建成功，toast「已新增 2 条 skill」，列表刷新

  Scenario: 表单内 skillId 重复（Edge Case）
    When 两行填写了相同的 skillId 并提交
    Then 前端就地拦截，两行均提示「skillId 在本表单中重复」，不发起请求

  Scenario: 部分 skillId 已存在（Edge Case）
    When 提交的部分 skillId 已存在（409）
    Then 已存在的跳过不重复创建，toast 报告成功条数
    And 弹窗保留且仅剩未成功的行，提示「已存在（未重复创建）：{skillId}」便于修正后重试

  Scenario: 超过行数上限（Edge Case）
    When 已添加 20 行后点击「添加一条」
    Then 按钮禁用，展示「20/20 条」

Feature: 编辑 skill

  Scenario: 修改人工字段（Happy Path）
    When 管理员在某行点击「编辑」，修改中文名与用途说明后保存
    Then 该行内容与更新时间刷新，toast「已保存」

  Scenario: skillId/nameEn 不可改（约束）
    Then 编辑弹窗中 skillId 与英文名只读展示，表单不包含其二者的输入项

  Scenario: 记录已被他人删除（Edge Case）
    When 保存时该记录已被其他管理员删除
    Then 服务端返回 404，toast「记录不存在（可能已被其他管理员删除）」，列表自动刷新

Feature: 删除 skill

  Scenario: 删除成功（Happy Path）
    When 管理员在某行点击「删除」并在确认弹窗中确认
    Then 该记录从列表移除，总数减一

  Scenario: 下线而非删除（引导）
    Then 确认弹窗 hint 提示「hiagent 已下线的 skill 建议改状态为已下线保留映射记录」
```

### 8.7 UI/UX 要点

- 状态用三色 Badge 区分（展示中 green / 翻译中 warning / 已下线 outline），模块用 outline Badge；
- skillId 列复用 CopyableText（截断 + hover 全文 + 一键复制，排查时高频使用）；
- 新增弹窗多行区域固定最大高度内部滚动，弹窗整体 `max-h-[85vh]` 内部滚动（字段多的编辑弹窗在 720p 视口下底部按钮必须可达）；
- 删除确认弹窗展示 skillId + 名称，hint 引导「下线改状态、勿删」；
- 空数据态区分「无任何 skill 数据」与「当前筛选条件下无结果」。

---

## 9. 模块四：用户查询（v1.4 补录规格，功能已上线）

### 9.1 功能描述

按 **openId / 用户名 / 邮箱** 查询超级入口用户档案（姓名、openId、unionId、userId、邮箱），服务于「加白名单前先核对人」的排查场景。

**产品约束（来自后端契约）：**

- 数据来自**用户登录时落库的本地身份档案**（Java 服务），**不实时调用飞书**——未登录过的用户查询不到，邮箱未落库时为空；
- 查询条件**三选一强约束**（openId / userName / email，后端校验：全空或传多个均 PARAM_ERROR 400）；
- openId / 邮箱查询至多命中 1 条；**用户名为精确匹配，可能重名命中多条**（全部展示并提示重名）；
- 查无档案（errorCode `B0100` USER_NOT_FOUND）属正常业务结果，按「未找到」呈现而非异常；
- 查询需登录态（Bearer sessionId），会话失效由请求层统一踢回登录页。

### 9.2 用户故事

> 作为管理员，我想在给某位用户加白名单前，先用姓名或 openId 查一下他的档案（确认 openId 没贴错），这样能避免把权限授给错误的人。

> 作为开发，我想按 openId / 邮箱快速反查用户身份字段（unionId/userId），便于排查用户端的权限与登录问题。

### 9.3 功能清单

| 功能 | 规格 | 优先级 |
| --- | --- | --- |
| 查询表单 | 查询方式 Select（openId / 用户名 / 邮箱，切换时清空旧结果、保留输入）+ 关键词输入框（placeholder 随方式切换）+ 「查询」按钮（空输入或查询中禁用） | P0 |
| 档案卡展示 | 头像（无头像用姓名首字兜底）+ 姓名 + openId / unionId / userId / 邮箱 四行信息；长 ID 支持一键复制；缺失字段展示「—」 | P0 |
| 重名提示 | 用户名查询命中多条时，顶部提示「按用户名「xx」匹配到 N 位用户（重名）」，逐卡展示 | P0 |
| 未找到态 | 空态呈现，提示语按查询方式区分（如 openId 未落库 = 该用户尚未登录过或 openId 有误） | P0 |
| 异常态 | 查询失败展示错误信息 + 重试（重放上次查询条件）；会话失效由请求层统一处理 | P0 |
| 首次进入态 | 引导空态：「仅收录通过登录落库的用户档案，未登录过的用户查询不到」 | P1 |

### 9.4 接口契约

响应信封：`{ timeStamp: number, data, success, errorCode, errorMessage }`（Java CommonResponse，请求层统一解包）。

**GET /api/auth/lark/user**（用户档案查询，需 `Authorization: Bearer <sessionId>`）

```
query（三选一）: openId=xxx | userName=xxx | email=xxx
data: LarkUserItem[]   // 匹配用户数组；openId/email 至多 1 条，userName 精确匹配可能多条
       [{ openId, userId, unionId, name, avatarUrl, email }]   // 邮箱未落库时为空
条件全空或传多个: 400, errorCode=PARAM_ERROR
查无档案:         400, errorCode=B0100（USER_NOT_FOUND）→ 前端按「未找到」呈现
会话失效:         401 → 请求层清凭证回登录页
```

### 9.5 验收标准（BDD）

```gherkin
Feature: 用户查询

  Scenario: 按 openId 查询命中（Happy Path）
    Given 管理员已登录并进入 /user-query 页面
    When 选择查询方式 openId、输入有效 openId 并点击「查询」
    Then 展示该用户档案卡（姓名/头像/openId/unionId/userId/邮箱，均可复制）

  Scenario: 按用户名查询重名（Edge Case）
    When 按用户名查询命中多条档案
    Then 顶部提示「按用户名「xx」匹配到 N 位用户（重名）」并逐卡展示全部命中

  Scenario: 查无档案（Edge Case）
    When 查询条件未命中任何已落库用户（errorCode B0100）
    Then 按「未找到匹配用户」空态呈现（附该查询方式的措辞提示），不按异常报错

  Scenario: 切换查询方式（Edge Case）
    When 已有查询结果时切换查询方式
    Then 清空旧结果回首次进入态，输入内容保留便于改写

  Scenario: 空输入防呆（Edge Case）
    When 关键词为空或仅含空格
    Then 「查询」按钮禁用，不发起请求

  Scenario: 查询失败重试（Edge Case）
    When 查询请求失败（网络/5xx）
    Then 展示错误态 + 重试按钮，重试重放上次的查询方式与关键词
```

### 9.6 UI/UX 要点

- 单卡片信息行布局（label 固定宽度 + 值区），区别于列表页的表格形态；
- 全部长 ID 字段（openId/unionId/userId/邮箱）复用 CopyableText（截断 + hover 全文 + 一键复制）——本页的核心价值就是把可复制的身份字段交付给管理员；
- 未找到 / 异常 / 首次进入三种非数据态文案都明确「数据来自登录落库」的边界，管理预期。

---

## 10. 通用与非功能需求

### 10.1 登录与访问控制（sessionId + /me 验证）

**登录流程：**

1. 管理员打开 admin，未登录态访问任意页面均重定向到 `/login`；
2. 登录页提供一个 sessionId 输入框 + 「验证登录」按钮，并附操作引导：「在 super-portal 已登录的浏览器中打开开发者控制台（F12）获取自己的 sessionId 后粘贴」；
3. 前端调用 Java 服务 `GET /api/auth/lark/me`，请求头 `Authorization: Bearer <sessionId>`；
4. **登录成立的判定条件**：HTTP 200 且 `success=true` 且 `data.unionId` 与 `data.name` 均为非空字符串——两个字段任一缺失即视为登录失败（此为需求方明确要求的有效性口径，保证后续可追溯）；
5. 验证通过后，将 `sessionId` 与用户信息（name / unionId / openId / avatarUrl）存入 sessionStorage，跳转默认页；
6. 顶栏展示操作人姓名（hover 展示 unionId），提供「退出」按钮清空 sessionStorage 回到登录页。

**会话失效处理：**

- Java 会话有过期时间（expiresAt）；后续若任意请求因会话失效收到 HTTP 401（Java errorCode "402"，message「登录已失效，请重新登录」），清空本地凭证并重定向 `/login`，toast 提示重新登录；
- 与 Node 接口的 401（x-api-key 错误）需区分提示：前者引导重新登录，后者提示联系开发。

**接口鉴权（请求层约定）：**

- Node 业务接口：统一注入 `x-api-key`（与 super-portal 相同的 key）；
- Java `/me`：注入 `Authorization: Bearer <sessionId>`；
- 两类接口走不同 baseURL（见 11.2），信封格式不同（Node：`{success, data, timestamp}`；Java：`{timeStamp, data, success, errorCode, errorMessage}`），请求层分别解包。

**操作追溯：**

- 登录即确定操作人身份（name + unionId），顶栏常驻展示；
- 白名单新增时，备注输入框默认预填「操作人：{name}」（可编辑可删），低成本留下追溯线索（后端 remark 字段 512 字符足够）。

**登录验收标准（BDD）：**

```gherkin
Feature: sessionId 登录

  Scenario: 登录成功（Happy Path）
    Given 管理员在 /login 页粘贴有效 sessionId 并点击「验证登录」
    When /me 返回 success=true 且 data.unionId 与 data.name 均非空
    Then 跳转到 /migration，顶栏展示操作人姓名，凭证写入 sessionStorage

  Scenario: unionId 或 name 缺失（Edge Case）
    When /me 返回 success=true 但 data.unionId 或 data.name 为空/缺失
    Then 登录不生效，就地提示「会话信息不完整（缺少 unionId/name），请重新获取 sessionId」

  Scenario: sessionId 无效或已过期（Edge Case）
    When /me 返回 HTTP 401（errorCode "402"）
    Then 就地提示「登录已失效，请重新登录」，不写入任何本地凭证

  Scenario: 会话中途过期（Edge Case）
    Given 管理员已登录且页面停留超过会话有效期
    When 任一请求返回 HTTP 401（errorCode "402"）
    Then 清空本地凭证并重定向 /login，toast「登录已失效，请重新登录」

  Scenario: 刷新页面保持登录（Happy Path）
    Given 管理员已登录
    When 刷新页面或新开 Tab（同浏览器会话）
    Then 凭证从 sessionStorage 恢复，无需重新粘贴 sessionId

  Scenario: 退出登录（Happy Path）
    When 管理员点击顶栏「退出」
    Then 清空 sessionStorage 并回到 /login
```

**管理员准入（V1 现状与风险）：** 任何持有有效 super-portal sessionId 的用户均可进入 admin 并操作（登录仅验证"是飞书用户"，不验证"是管理员"）。V1 靠内部地址不扩散控制，V2 建议新增 `admin_console` 权限点登录后校验（见开放问题 Q1）。

### 10.2 错误处理规范

- 两套响应信封按后端区分：
  - Node 接口：`{ success, data, timestamp }`；
  - Java 接口（/me、/api/auth/lark/user）：`{ timeStamp: number, data, success, errorCode: "0"|"402"|..., errorMessage }`；
- 业务失败以 HTTP 状态码 + errorCode 区分：
  - 400 参数错误 → 表单就地提示；
  - 401（Java，errorCode "402"）会话失效 → 清凭证重定向 /login；
  - 401（Node）x-api-key 失效/未带 → 提示「服务鉴权失败，请联系开发」；
  - 404 记录不存在 → toast 提示 + 列表自动刷新；
  - 409 重复授权 → 表单字段级提示；
  - 5xx → toast 展示服务端 errorMessage，写操作允许重试。
- 网络异常/超时：统一错误态组件 + 重试入口。

### 10.3 性能

- 一键迁移接口 axios timeout 单独设置为 300s（默认 15s）；
- 白名单列表为小数据量（当前百级），默认分页 100 条无性能压力；
- 列表翻页/筛选请求需处理竞态（仅采纳最后一次请求结果）。

### 10.4 兼容性与环境

- 目标浏览器：Chrome / Edge 最新两个大版本（内部工具）；
- 三套环境（.env.dev / .env.uat / .env.prd）对齐 super-portal：`VITE_APP_ENV`、`VITE_BASE`（部署子路径）、`VITE_NODE_API_BASE_URL`（Node 前缀，uat 为 `/superentry-node-uat`）、`VITE_SUPERENTRY_API_BASE_URL`（Java 前缀，uat 为 `/superentry-uat`，/me 接口使用）。

---

## 11. 技术方案要点（前端）

### 11.1 目录结构（建议）

```
src/
  app/            # App.tsx、路由表、布局
  components/
    ui/           # shadcn 组件（button/table/dialog/select/input/badge/...）
    common/       # 确认弹窗、结果统计卡、错误态等
  services/       # request.ts（axios 实例+x-api-key）、whitelist.ts、assets.ts、auth.ts
  constants/      # api 路径、feature 枚举与中文映射
  hooks/          # useWhitelistList、useCreateWhitelist、useImportAssets...
  pages/
    migration/    # 模块一
    whitelist/    # 模块二
  types/          # WhitelistItem、ImportResult 等接口类型
```

### 11.2 请求层约定

- 单 axios 实例 + 拦截器按 url 前缀路由（对齐 super-portal 的双后端范式）：
  - `/api/` 前缀（Java，/me）→ baseURL 取 `VITE_SUPERENTRY_API_BASE_URL`，注入 `Authorization: Bearer <sessionId>`；
  - 其余（Node 业务接口）→ baseURL 取 `VITE_NODE_API_BASE_URL`，注入 `x-api-key`；
- 响应拦截统一解包各自信封并抛业务错误（携带 errorCode/errorMessage），Java 401（errorCode "402"）触发清凭证重定向；
- 服务端数据获取用自定义 hooks（对齐 super-portal，不引入 react-query/状态库）。

### 11.3 部署

- 构建产物部署至与 super-portal 同域网关（如 `/portal/admin/`），复用网关到 `superentry-node-uat` 的转发规则，避免跨域。

---

## 12. 里程碑

| 阶段 | 内容 | 工作量估算 |
| --- | --- | --- |
| M1 | 项目脚手架（对齐 super-portal）+ 双后端请求层 + sessionId 登录（/me 验证 unionId+name）+ 布局路由 | 0.5～1 人日 |
| M2 | 白名单模块（列表/筛选/新增/编辑备注/删除） | 1～1.5 人日 |
| M3 | 一键迁移模块（确认弹窗/长超时/结果卡片） | 0.5～1 人日 |
| M4 | UAT 联调、异常场景自测、部署 | 0.5～1 人日 |
| M5（v1.3 追加） | Skill 管理模块（列表/双筛选/批量新增分组提交/编辑/删除） | 0.5 人日 |
| M6（v1.4 补录） | 用户查询模块——规格补录（功能已上线，依赖 Java /api/auth/lark/user） | —（补录不另计工期） |
| M7（v1.5 追加） | 资产查询与删除卡片（GET /assets 查询 + DELETE /assets/:id 删除）+ 清空现有数据文档补录 | 0.5 人日 |
| 合计 |  | **约 3.5～6 人日** |

---

## 13. 开放问题（需评审确认）

| # | 问题 | 建议 |
| --- | --- | --- |
| Q1 | admin 后台自身的管理员鉴权：登录方案只验证「是有效飞书会话」（sessionId 过 /me），不验证「是管理员」，任何拿到有效 sessionId 的用户均可进入并改白名单 | V2 在 whitelist 表新增 `admin_console` 权限点，登录后调 `GET /whitelist/check` 校验再放行（需后端改 CHECK 约束 + 前端路由守卫）；V1 靠内部地址不扩散 |
| Q2 | 白名单列表后端不支持按 openId 过滤，跨页搜索搜不到 | 提需求给后端在 `GET /whitelist` 增加 `openId` 模糊查询参数（约 0.5 人日）；V1 先做当前页前端过滤并在 UI 上明示 |
| Q3 | `POST /assets/import` 为同步接口，数据量增长后有超时与不可观测风险 | V2 改造为异步任务 + 进度查询接口；V1 用 300s 超时 + 幂等重试兜底 |
| Q4 | 是否需要迁移历史记录（谁在何时迁移、结果如何）；白名单变更同样无操作日志，目前追溯手段仅 remark 中的「操作人：姓名」约定；v1.5 新增的资产删除同样仅靠确认弹窗防误删、无操作日志 | 后端目前无记录表；V2 需求（操作日志表 + 页面时间线） |
| Q5 | 新增白名单时 openId 只能手工粘贴，无姓名可对照 | 2026-10 更新：Java 已提供 `GET /api/auth/lark/user`（openId/用户名/邮箱查档案，admin 模块四已使用），按姓名查 openId 的能力已具备；V2 可在白名单新增弹窗集成该查询做姓名对照（注意其数据来自登录落库，未登录过的用户查不到） |
| Q6 | admin 部署路径与环境变量（VITE_BASE、网关转发规则） | 与运维确认，建议 `/portal/admin/`；需同时打通到 `superentry-uat`（Java）与 `superentry-node-uat`（Node）两条转发 |
| Q7 | sessionId 为等同登录态的敏感凭证，登录页粘贴方式存在被诱导提交到第三方的社会工程风险 | V1 登录页明示「仅粘贴到公司内部 admin 域名」；V2 若做 admin_console 权限点可同时收敛 |
| Q8 | skill 的 module 字段为自由文本（后端无 CHECK 约束），前端仅预设五大模块下拉，管理员无法录入预设外的模块值；自由填写又会导致筛选碎片化 | V1 沿用预设枚举；V2 若需严格分组由后端加 CHECK 约束（对齐 whitelist feature 做法）；若需自定义模块由后端提供模块字典接口 |

---

## 附录 A：接口错误码对照

**Node 服务（whitelist / assets / skill-mapping）：**

| errorCode | HTTP | 场景 | 前端处理 |
| --- | --- | --- | --- |
| `WHITELIST_DUPLICATE` | 409 | 新增时 openId+feature 已存在 | 表单字段级提示 |
| `WHITELIST_NOT_FOUND` | 404 | 编辑/删除时记录不存在（多为并发删除） | toast + 列表刷新 |
| `SKILL_MAPPING_DUPLICATE` | 409 | 新增时 skillId 已存在 | 弹窗归集提示「已存在（未重复创建）」，保留该行重试 |
| `SKILL_MAPPING_NOT_FOUND` | 404 | 编辑/删除时记录不存在（多为并发删除） | toast + 列表刷新 |
| `SKILL_MAPPING_UPDATE_EMPTY` | 400 | PATCH 更新内容为空 | 前端表单恒带可改字段，正常不触发 |
| `USER_ID_MISSING` | 400 | check 接口缺 user-id 头 | 仅用户端使用，admin 不涉及 |
| `ASSETS_IMPORT_FAILED` | 500 | 知识库资产同步中途失败（单数据集事务回滚） | 卡片内展示 + 允许重试（幂等） |
| `HIAGENT_TABLE_SOURCE_INVALID` | 500 | 商品属性同步的服务端数据源配置缺失/非法 | 展示错误信息，需联系开发处理配置 |
| `ASSETS_NOT_FOUND` | 404 | 资产删除时记录不存在（多为并发删除；v1.5 起删除功能已使用） | toast「资产不存在（可能已被删除）」+ 列表刷新 |
| `ASSETS_UPDATE_EMPTY` | 400 | 资产更新内容为空 | admin V1 不涉及 |
| （无 errorCode） | 401 | x-api-key 缺失/错误 | 提示联系开发检查配置 |

**Java 服务（/api/auth/lark/me、/api/auth/lark/user）：**

| errorCode | HTTP | 场景 | 前端处理 |
| --- | --- | --- | --- |
| `0` | 200 | 会话有效，data 含 openId/userId/unionId/name/avatarUrl | 仍需校验 unionId 与 name 非空，任一为空登录不成立 |
| `402` | 401 | sessionId 缺失 / 无效 / 过期（message：「登录已失效，请重新登录」等） | 就地提示或清凭证重定向 /login |
| `B0100`（USER_NOT_FOUND） | 400 | 用户查询未命中任何已落库档案 | 按「未找到匹配用户」空态呈现（非异常） |
| `PARAM_ERROR` | 400 | 用户查询条件全空或传多个（后端三选一强约束） | 前端 Select 三选一已约束，正常不触发 |
