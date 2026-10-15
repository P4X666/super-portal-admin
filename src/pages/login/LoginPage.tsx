import { ChevronDownIcon, ShieldAlertIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'

/**
 * 登录页（PRD §10.1）：粘贴 sessionId + /me 验证（unionId + name 齐全才作数）
 * - sessionId 获取引导：super-portal 已登录浏览器 → F12 控制台读取
 * - 会话中途失效由请求层整页跳转至此（?expired=1），据此展示失效提示
 */
export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [sessionId, setSessionId] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(
    searchParams.get('expired') ? '登录已失效，请重新登录' : null,
  )

  // 已登录访问登录页 → 回默认页
  if (user) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = sessionId.trim()
    if (!trimmed) {
      setError('请输入 sessionId')
      return
    }
    setPending(true)
    setError(null)
    try {
      await login(trimmed)
      toast.success('登录成功')
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : '/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请重试')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border-weak bg-card p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <h1 className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-2xl font-bold text-transparent">
            超级入口 Admin
          </h1>
          <p className="text-caption text-text-tertiary">白名单管理 · 资产一键迁移</p>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sessionId" className="text-caption text-text-secondary">
              sessionId
            </label>
            <Input
              id="sessionId"
              type="password"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="粘贴你的登录 sessionId"
              autoComplete="off"
              autoFocus
              aria-invalid={error ? true : undefined}
              disabled={pending}
            />
            {error && (
              <p className="flex items-start gap-1 text-caption text-destructive" role="alert">
                <ShieldAlertIcon className="mt-px size-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>
          <Button type="submit" disabled={pending} className="h-9 w-full">
            {pending ? '验证中…' : '验证登录'}
          </Button>
        </form>

        <details className="group mt-6 rounded-lg border border-border-weak px-3 py-2">
          <summary className="flex cursor-pointer list-none items-center justify-between text-caption text-text-tertiary select-none [&::-webkit-details-marker]:hidden">
            如何获取 sessionId？
            <ChevronDownIcon className="size-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-4 text-caption text-text-tertiary">
            <li>在浏览器打开超级入口（super-portal）并确认已登录；</li>
            <li>按 F12 打开开发者工具，切到 Console（控制台）；</li>
            <li>
              输入并回车：
              <code className="mx-1 rounded bg-background px-1.5 py-0.5 text-[11px] text-badge-blue">
                sessionStorage.getItem('super-portal:super-entry-session')
              </code>
            </li>
            <li>复制输出引号内的字符串，粘贴到上方输入框。</li>
          </ol>
        </details>

        <p className="mt-4 text-center text-caption text-text-placeholder">
          sessionId 等同登录凭证，仅粘贴到公司内部 admin 域名，勿提交到任何第三方页面
        </p>
      </div>
    </div>
  )
}
