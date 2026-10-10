import { ArrowRightLeftIcon, InfoIcon, Loader2Icon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { StatCard } from '@/components/common/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAssetsTotal, useKnowledgeImport, useTableImport } from '@/hooks/useMigration'
import type { MigrationPhase } from '@/hooks/useMigration'

/**
 * 资产同步页（PRD 模块一，后端两个同步接口）：
 * - 知识库资产同步（POST /assets/import-knowledge）：product-* 数据集 → assets 按文档 docId 幂等 upsert
 * - 商品属性同步（POST /assets/import-table）：HiAgent 数据库表按 SKU 匹配回填性别线/款名，匹配即覆盖
 * 两卡片各自独立确认 → 调用（300s 超时）→ 结果展示；接口幂等，失败可直接重试
 */
export function MigrationPage() {
  const { total, refresh } = useAssetsTotal()

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-medium">资产同步</h1>
        <p className="mt-1 text-caption text-text-tertiary">
          知识库资产图片数据与 HiAgent 商品属性数据同步至 UAT 环境资产库
          {total !== null && (
            <>
              ；当前资产库共 <span className="text-text-primary">{total}</span> 条可见资产
            </>
          )}
        </p>
      </div>

      <KnowledgeSyncCard onSynced={refresh} />
      <TableSyncCard onSynced={refresh} />
    </div>
  )
}

/** 单张同步卡片的通用外壳（标题 + 说明列表 + 操作区插槽；children 渲染确认弹窗等门户内容） */
function SyncCard({
  icon,
  title,
  description,
  action,
  result,
  children,
}: {
  icon: ReactNode
  title: string
  description: ReactNode
  action: ReactNode
  result?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border-weak bg-card p-5">
      <div className="flex items-center gap-2 text-body font-medium text-text-primary">
        {icon}
        {title}
      </div>
      <div className="text-caption text-text-tertiary">{description}</div>
      {action}
      {result}
      {children}
    </div>
  )
}

/** 同步按钮 + 进行中/失败态（两张卡片共用交互） */
function SyncAction({
  phase,
  error,
  onConfirmOpen,
  onRetry,
}: {
  phase: MigrationPhase
  error: string | null
  onConfirmOpen: () => void
  onRetry: () => void
}) {
  const importing = phase === 'importing'
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-border-weak bg-background/40 p-5">
      <Button size="lg" disabled={importing} onClick={onConfirmOpen} className="min-w-44">
        {importing ? (
          <>
            <Loader2Icon data-icon="inline-start" className="animate-spin" />
            同步进行中…
          </>
        ) : (
          <>
            <ArrowRightLeftIcon data-icon="inline-start" />
            开始同步
          </>
        )}
      </Button>
      {importing && (
        <p className="text-caption text-text-tertiary" role="status">
          正在同步，耗时视数据量而定，请勿关闭或刷新页面…
        </p>
      )}
      {phase === 'failed' && (
        <p className="text-caption text-destructive" role="alert">
          {error || '同步失败'}
          <button
            type="button"
            className="ml-2 underline underline-offset-2 hover:text-text-secondary"
            onClick={onRetry}
          >
            重试
          </button>
        </p>
      )}
    </div>
  )
}

/** 卡片一：知识库资产同步（import-knowledge） */
function KnowledgeSyncCard({ onSynced }: { onSynced: () => void }) {
  const { phase, result, error, start, reset } = useKnowledgeImport(onSynced)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const importing = phase === 'importing'

  const handleRetry = () => {
    reset()
    setConfirmOpen(true)
  }

  return (
    <SyncCard
      icon={<InfoIcon className="size-4 text-badge-blue" />}
      title="知识库资产同步"
      description={
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>数据来源：HiAgent 知识库中全部 product-* 数据集（鞋 / 帽 / 上装等品类，不含 model）。</li>
          <li>同步方式：按文档 docId 幂等 upsert，重复执行不会产生重复数据。</li>
          <li>人工值保护：不会覆盖已在资产管理页修改的年份 / 季节 / 可见性。</li>
        </ul>
      }
      action={
        <SyncAction
          phase={phase}
          error={error}
          onConfirmOpen={() => setConfirmOpen(true)}
          onRetry={handleRetry}
        />
      }
      result={
        phase === 'success' && result && (
          <div className="flex flex-col gap-3 rounded-lg border border-border-weak bg-background/40 p-4">
            <div className="flex flex-wrap gap-3">
              <StatCard label="涉及数据集" value={result.datasets.length} suffix="个" />
              <StatCard label="成功写入" value={result.imported} suffix="条" />
              <StatCard
                label="解析失败（已写入待人工修正）"
                value={result.parseFailed}
                suffix="条"
                warning={result.parseFailed > 0}
              />
            </div>
            {result.parseFailed > 0 && (
              <p className="text-caption text-warning" role="alert">
                {result.parseFailed} 条记录文件名解析失败，已以空 SKU/视角写入，可前往资产管理页人工修正。
              </p>
            )}
            {result.datasets.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-caption text-text-tertiary">数据集：</span>
                {result.datasets.map((dataset) => (
                  <Badge key={dataset} variant="outline">
                    {dataset}
                  </Badge>
                ))}
              </div>
            )}
            <div>
              <Button variant="outline" size="sm" disabled={importing} onClick={() => setConfirmOpen(true)}>
                再次同步
              </Button>
            </div>
          </div>
        )
      }
    >
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="确认开始知识库资产同步？"
        confirmLabel="确认同步"
        onConfirm={() => {
          setConfirmOpen(false)
          void start()
        }}
        description="将从知识库 product-* 数据集同步资产图片数据到 UAT 资产库。"
        hint="按 docId 幂等 upsert，重复执行不会产生重复数据；不会覆盖已人工设置的年份/季节/可见性。"
      />
    </SyncCard>
  )
}

/** 卡片二：商品属性同步（import-table，HiAgent 数据库表 gender/des 按 SKU 回填） */
function TableSyncCard({ onSynced }: { onSynced: () => void }) {
  const { phase, result, error, start, reset } = useTableImport(onSynced)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const importing = phase === 'importing'

  const handleRetry = () => {
    reset()
    setConfirmOpen(true)
  }

  return (
    <SyncCard
      icon={<InfoIcon className="size-4 text-badge-purple" />}
      title="商品属性同步"
      description={
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>数据来源：HiAgent 数据库表（material ↔ 资产 SKU 匹配，连接符与大小写差异自动归一）。</li>
          <li>回填字段：性别线 gender（如 Mens）与款名 des（style_name 列）。</li>
          <li>覆盖策略：匹配即覆盖（HiAgent 表为事实源），幂等可重复执行；一个 SKU 命中多个 material 时取第一个。</li>
        </ul>
      }
      action={
        <SyncAction
          phase={phase}
          error={error}
          onConfirmOpen={() => setConfirmOpen(true)}
          onRetry={handleRetry}
        />
      }
      result={
        phase === 'success' && result && (
          <div className="flex flex-col gap-3 rounded-lg border border-border-weak bg-background/40 p-4">
            <div className="flex flex-wrap gap-3">
              <StatCard label="拉取表行数" value={result.totalPulled} suffix="行" />
              <StatCard label="回填资产" value={result.updatedAssets} suffix="条" />
              <StatCard
                label="未匹配 material"
                value={result.unmatchedMaterials}
                suffix="行"
                warning={result.unmatchedMaterials > 0}
              />
            </div>
            {result.multiMatched > 0 && (
              <p className="text-caption text-text-tertiary">
                {result.multiMatched} 条资产命中多个 material，已取第一个命中的值。
              </p>
            )}
            {result.unmatchedMaterials > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-caption text-warning" role="alert">
                  {result.unmatchedMaterials} 行 material 未匹配到任何资产
                  {result.unmatchedSamples.length > 0 && '，样例：'}
                </p>
                {result.unmatchedSamples.length > 0 && (
                  <ul className="flex list-disc flex-col gap-0.5 pl-5 text-caption text-text-tertiary">
                    {result.unmatchedSamples.map((sample) => (
                      <li key={sample} className="break-all">
                        {sample}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div>
              <Button variant="outline" size="sm" disabled={importing} onClick={() => setConfirmOpen(true)}>
                再次同步
              </Button>
            </div>
          </div>
        )
      }
    >
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="确认开始商品属性同步？"
        confirmLabel="确认同步"
        onConfirm={() => {
          setConfirmOpen(false)
          void start()
        }}
        description="将从 HiAgent 数据库表按 SKU 匹配回填性别线（gender）与款名（des）。"
        hint="匹配即覆盖（HiAgent 表为事实源），幂等可重复执行；不会影响资产图片数据。"
      />
    </SyncCard>
  )
}
