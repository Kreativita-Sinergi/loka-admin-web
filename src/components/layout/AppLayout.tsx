import { Outlet, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuthStore } from '../../store/authStore'

export default function AppLayout() {
  const apiKey = useAuthStore((s) => s.apiKey)
  if (!apiKey) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-60 p-6 bg-slate-50 min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
