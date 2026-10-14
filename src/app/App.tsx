import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppLayout } from './AppLayout'
import { useAuth } from '@/hooks/useAuth'
import { LoginPage } from '@/pages/login/LoginPage'
import { MigrationPage } from '@/pages/migration/MigrationPage'
import { UserQueryPage } from '@/pages/user/UserQueryPage'
import { WhitelistPage } from '@/pages/whitelist/WhitelistPage'
import { SkillMappingPage } from '@/pages/skill/SkillMappingPage'

/** 路由守卫：未登录访问业务页 → 重定向登录页（携带来源，登录后回跳） */
function AuthGate() {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

export default function App() {
  return (
    <>
      {/* basename 与 vite base 同源于 VITE_BASE，子路径部署（/portal/admin/）三处一致 */}
      <BrowserRouter basename={import.meta.env.VITE_BASE || '/'}>
        <Routes>
          <Route element={<AuthGate />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/migration" replace />} />
              <Route path="/migration" element={<MigrationPage />} />
              <Route path="/whitelist" element={<WhitelistPage />} />
              <Route path="/skill-mapping" element={<SkillMappingPage />} />
              <Route path="/user-query" element={<UserQueryPage />} />
            </Route>
          </Route>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-center" />
    </>
  )
}
