import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleAlert, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck, User } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { loginAdmin } from '../api/admin'
import { ThemeIconButton } from '../components/layout/ThemeToggle'
import LokaLogo from '../components/ui/LokaLogo'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return
    setLoading(true)
    setError('')
    try {
      const { token, expires_at: expiresAt } = await loginAdmin(
        username.trim(),
        password.trim(),
      )
      login(token, expiresAt ?? null)
      navigate('/')
    } catch {
      setError('Username atau password salah.')
    } finally {
      setLoading(false)
    }
  }

  const fieldClass =
    'w-full h-11 pl-10 pr-3 border border-slate-200 rounded-lg text-sm text-slate-900 transition-colors hover:border-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15'

  return (
    <div className="relative min-h-screen bg-slate-50 flex items-center justify-center p-4 overflow-hidden">
      {/* Pola titik halus, memudar ke tepi agar tidak ramai. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(var(--color-slate-300)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,#000_30%,transparent_100%)]"
      />

      <div className="absolute top-4 right-4">
        <ThemeIconButton />
      </div>

      <div className="relative w-full max-w-[400px]">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_1px_2px_rgb(15_23_42/0.04),0_12px_32px_-12px_rgb(15_23_42/0.12)] dark:shadow-none p-6 sm:p-8">
          <div className="flex items-center gap-2.5 mb-8">
            <LokaLogo className="h-8 w-auto text-slate-900" />
            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Admin
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Masuk</h1>
          <p className="text-sm text-slate-500 mt-1.5 mb-7">Gunakan akun super admin untuk mengelola Loka Kasir.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <span id="login-username-label" className="block text-sm font-medium text-slate-700 mb-1.5">
                Username
              </span>
              <div className="relative">
                <User size={17} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-username"
                  aria-labelledby="login-username-label"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className={fieldClass}
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <span id="login-password-label" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </span>
              <div className="relative">
                <LockKeyhole size={17} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-password"
                  aria-labelledby="login-password-label"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className={`${fieldClass} pr-11`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  {showPassword ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg">
                <CircleAlert size={16} className="shrink-0" aria-hidden />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !username.trim() || !password.trim()}
              className="w-full h-11 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
            >
              {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
              {loading ? 'Memverifikasi...' : 'Masuk'}
            </button>
          </form>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck size={14} aria-hidden />
          Akses terbatas untuk super admin Loka.
        </p>
      </div>
    </div>
  )
}
