import { SearchIcon } from 'lucide-react'
import { useCallback, useState, type FormEvent, type ReactNode } from 'react'
import { CopyableText } from '@/components/common/CopyableText'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchUsers, type UserQueryKey } from '@/services/user'
import { ApiError } from '@/types/api'
import type { LarkUserItem } from '@/types/auth'

/** Java USER_NOT_FOUND 业务码：查询条件未命中属正常业务结果，按「未找到」而非异常呈现 */
const USER_NOT_FOUND_ERROR_CODE = 'B0100'

/** 查询状态：idle 未查询 / loading 查询中 / success 命中 / notFound 查无档案 / error 异常 */
type QueryStatus = 'idle' | 'loading' | 'success' | 'notFound' | 'error'

/** 查询方式选项：label 下拉展示，placeholder 随方式切换（后端三选一强约束） */
const QUERY_OPTIONS: { value: UserQueryKey; label: string; placeholder: string }[] = [
  { value: 'openId', label: 'openId', placeholder: '输入飞书 openId（ou_ 开头）' },
  { value: 'userName', label: '用户名', placeholder: '输入用户姓名（精确匹配，可能重名）' },
  { value: 'email', label: '邮箱', placeholder: '输入登录邮箱（忽略大小写）' },
]

/** 查询方式中文标签（输入框 aria-label / 重名提示等处复用） */
function keyLabel(key: UserQueryKey): string {
  return QUERY_OPTIONS.find((option) => option.value === key)?.label ?? key
}

/** 未找到提示语：按查询方式区分措辞 */
const NOT_FOUND_HINTS: Record<UserQueryKey, (value: string) => string> = {
  openId: (value) => `openId ${value} 未落库：该用户尚未在超级入口登录过，或 openId 有误`,
  userName: (value) =>
    `用户名 ${value} 未匹配：该用户尚未在超级入口登录过，或姓名有误（姓名精确匹配）`,
  email: (value) => `邮箱 ${value} 未匹配：该用户尚未在超级入口登录过，或邮箱有误`,
}

/** 单条信息行：label 固定宽度 + 值（长 ID 支持复制，缺失展示 —） */
function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-4 px-6 py-3">
      <span className="w-20 shrink-0 pt-0.5 text-caption text-text-tertiary">{label}</span>
      <div className="min-w-0 flex-1 break-all text-body text-text-secondary">{children}</div>
    </div>
  )
}

/** 值兜底：空串 / null 统一展示 — */
function orDash(value: string | null | undefined): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : '—'
}

/** 单个用户档案卡：头像 + 姓名 + openId / unionId / userId / 邮箱 */
function UserCard({ user }: { user: LarkUserItem }) {
  return (
    <div>
      <div className="flex items-center gap-3 border-b border-border-weak px-6 py-5">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="size-10 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex size-10 items-center justify-center rounded-full bg-accent text-body font-medium text-text-secondary">
            {orDash(user.name).slice(0, 1)}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-body font-medium text-text-primary">{orDash(user.name)}</p>
          <p className="mt-0.5 text-caption text-text-tertiary">
            档案来自登录时落库，邮箱未落库时为空
          </p>
        </div>
      </div>
      <div className="divide-y divide-border-weak">
        <InfoRow label="openId">
          {user.openId ? <CopyableText text={user.openId} /> : '—'}
        </InfoRow>
        <InfoRow label="unionId">
          {user.unionId ? <CopyableText text={user.unionId} /> : '—'}
        </InfoRow>
        <InfoRow label="userId">
          {user.userId ? <CopyableText text={user.userId} /> : '—'}
        </InfoRow>
        <InfoRow label="邮箱">
          {user.email ? <CopyableText text={user.email} /> : '—'}
        </InfoRow>
      </div>
    </div>
  )
}

/**
 * 用户查询页
 * 按 openId / 用户名 / 邮箱查询用户档案（GET /api/auth/lark/user，Java 服务，三选一）：
 * 后端读登录时落库的本地身份档案（不实时调 Lark），邮箱未落库时为空；
 * 用户名精确匹配可能重名，命中多条时全部展示；查无档案（USER_NOT_FOUND/B0100）
 * 按「未找到」呈现，其余异常走错误态 + 重试
 */
export function UserQueryPage() {
  const [queryKey, setQueryKey] = useState<UserQueryKey>('openId')
  const [keyword, setKeyword] = useState('')
  const [submitted, setSubmitted] = useState<{ key: UserQueryKey; value: string }>({
    key: 'openId',
    value: '',
  })
  const [status, setStatus] = useState<QueryStatus>('idle')
  const [users, setUsers] = useState<LarkUserItem[]>([])
  const [errorMessage, setErrorMessage] = useState('')

  const query = useCallback(async (key: UserQueryKey, raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return
    setSubmitted({ key, value: trimmed })
    setStatus('loading')
    try {
      const result = await fetchUsers(key, trimmed)
      setUsers(result)
      setStatus('success')
    } catch (e) {
      setUsers([])
      if (e instanceof ApiError && e.errorCode === USER_NOT_FOUND_ERROR_CODE) {
        setStatus('notFound')
      } else {
        setErrorMessage(e instanceof Error ? e.message : '查询失败，请稍后重试')
        setStatus('error')
      }
    }
  }, [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void query(queryKey, keyword)
  }

  /** 切换查询方式：旧结果与新方式无关，回 idle 待重查（输入内容保留便于改写） */
  const handleKeyChange = (next: UserQueryKey) => {
    if (next === queryKey) return
    setQueryKey(next)
    setUsers([])
    setStatus('idle')
  }

  const activeOption = QUERY_OPTIONS.find((option) => option.value === queryKey)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-medium">用户查询</h1>
        <p className="mt-1 text-caption text-text-tertiary">
          按 openId / 用户名 / 邮箱查询用户姓名、邮箱、unionId
          等档案信息（数据来自用户登录时落库的身份档案，不实时调用飞书）
        </p>
      </div>

      <form className="flex items-center gap-2" onSubmit={handleSubmit}>
        <Select
          value={queryKey}
          onValueChange={(next) => {
            if (next !== null) handleKeyChange(next as UserQueryKey)
          }}
        >
          <SelectTrigger className="w-28" aria-label="查询方式">
            <SelectValue>{keyLabel(queryKey)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {QUERY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="max-w-lg"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={activeOption?.placeholder}
          aria-label={keyLabel(queryKey)}
          spellCheck={false}
          autoComplete="off"
        />
        <Button type="submit" disabled={!keyword.trim() || status === 'loading'}>
          <SearchIcon data-icon="inline-start" />
          {status === 'loading' ? '查询中…' : '查询'}
        </Button>
      </form>

      <div className="rounded-xl border border-border-weak bg-card">
        {status === 'idle' && (
          <EmptyState
            title="选择查询方式，输入 openId / 用户名 / 邮箱开始查询"
            description="仅收录通过登录落库的用户档案，未登录过的用户查询不到"
          />
        )}
        {status === 'loading' && (
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        )}
        {status === 'notFound' && (
          <EmptyState
            title="未找到匹配用户"
            description={NOT_FOUND_HINTS[submitted.key](submitted.value)}
          />
        )}
        {status === 'error' && (
          <ErrorState
            message={errorMessage}
            onRetry={() => void query(submitted.key, submitted.value)}
          />
        )}
        {status === 'success' && users.length > 0 && (
          <div>
            {users.length > 1 && (
              <p className="border-b border-border-weak px-6 py-2 text-caption text-text-tertiary">
                按{keyLabel(submitted.key)}「{submitted.value}」匹配到 {users.length} 位用户（重名）
              </p>
            )}
            <div className={users.length > 1 ? 'divide-y divide-border-weak' : undefined}>
              {users.map((user) => (
                <UserCard
                  key={user.openId ?? user.userId ?? user.email ?? user.name}
                  user={user}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
