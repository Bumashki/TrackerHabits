import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { ready, user } = useAuth()

  if (!ready) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-inner">Загрузка…</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
