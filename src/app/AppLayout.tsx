import { ChevronDownIcon, LogOutIcon } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CopyableText } from '@/components/common/CopyableText'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAuth } from '@/hooks/useAuth'

const NAV_ITEMS = [
  { to: '/migration', label: '资产同步' },
  { to: '/whitelist', label: '白名单管理' },
  { to: '/skill-mapping', label: 'Skill 管理' },
  { to: '/user-query', label: '用户查询' },
] as const

/**
 * 全局布局：顶栏（品牌 + 模块 Tab + 操作人 + 退出）+ 内容区单栏
 * 操作人身份来自登录验证（PRD §9.1 追溯要求），hover 展示 unionId/openId
 */
export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('已退出登录')
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border-weak bg-background/80 px-6 backdrop-blur">
        <div className="flex items-center gap-8">
          <span className="text-base font-bold tracking-wide">超级入口 Admin</span>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
                    isActive
                      ? 'bg-accent font-medium text-text-primary'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <Popover>
              <PopoverTrigger
                render={
                  <button className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-body text-text-secondary outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50">
                    {user.avatarUrl && (
                      <img
                        src={user.avatarUrl}
                        alt=""
                        className="size-6 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    {user.name}
                    <ChevronDownIcon className="size-3.5 text-text-tertiary" />
                  </button>
                }
              />
              <PopoverContent align="end" className="w-80">
                <div className="flex flex-col gap-2 text-caption">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-text-tertiary">姓名</span>
                    <span className="text-body text-text-primary">{user.name}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-text-tertiary">unionId</span>
                    <CopyableText text={user.unionId} className="text-text-secondary" />
                  </div>
                  {user.openId && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-text-tertiary">openId（新增授权可复制使用）</span>
                      <CopyableText text={user.openId} className="text-text-secondary" />
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOutIcon data-icon="inline-start" />
            退出
          </Button>
        </div>
      </header>
      <main className="thin-scroll min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto w-full max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
