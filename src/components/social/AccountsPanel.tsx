import { useState } from 'react'
import { AlertTriangle, CircleCheck, Link2Off, KeyRound } from 'lucide-react'
import { InstagramIcon, ThreadsIcon } from '../ui/BrandIcons'
import type { AxiosError } from 'axios'
import Modal from '../ui/Modal'
import { connectInstagram, connectThreads, disconnectSocial, type SocialAccountStatus, type SocialStatus } from '../../api/social'

type Platform = 'instagram' | 'threads'

const LABEL: Record<Platform, string> = { instagram: 'Instagram', threads: 'Threads' }

function apiMessage(err: unknown, fallback: string) {
  const e = err as AxiosError<{ message?: string }>
  return e.response?.data?.message || fallback
}

function AccountCard({ platform, account, configured, onConnect, onDisconnect }: {
  platform: Platform
  account: SocialAccountStatus
  configured: boolean
  onConnect: () => void
  onDisconnect: () => void
}) {
  const Icon = platform === 'instagram' ? InstagramIcon : ThreadsIcon
  const expiring = account.expires_in_days != null && account.expires_in_days < 10
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${account.connected ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
        <Icon size={20} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800">{LABEL[platform]}</p>
        {account.connected ? (
          <>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-600 truncate">
              <CircleCheck size={14} className="shrink-0 text-emerald-600" aria-hidden />@{account.username || '—'}
            </p>
            <p className={`mt-1 text-xs ${expiring ? 'text-amber-700' : 'text-slate-500'}`}>
              {account.expires_in_days == null
                ? 'Token tidak kedaluwarsa'
                : expiring
                  ? `Token habis ${account.expires_in_days} hari lagi; diperbarui otomatis bila memungkinkan`
                  : `Token berlaku ${account.expires_in_days} hari lagi · diperbarui otomatis`}
            </p>
          </>
        ) : (
          <p className="mt-0.5 text-sm text-slate-500">Belum terhubung</p>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          disabled={!configured}
          onClick={onConnect}
          className="h-9 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          <KeyRound size={15} aria-hidden />{account.connected ? 'Ganti token' : 'Hubungkan'}
        </button>
        {account.connected && (
          <button type="button" onClick={onDisconnect} title="Putuskan" aria-label={`Putuskan ${LABEL[platform]}`} className="h-9 w-9 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 inline-flex items-center justify-center">
            <Link2Off size={16} aria-hidden />
          </button>
        )}
      </div>
    </div>
  )
}

export default function AccountsPanel({ status, onChange }: { status: SocialStatus; onChange: (s: SocialStatus) => void }) {
  const [dialog, setDialog] = useState<Platform | null>(null)
  const [confirmOff, setConfirmOff] = useState<Platform | null>(null)
  const [token, setToken] = useState('')
  const [igUserId, setIgUserId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const open = (p: Platform) => { setDialog(p); setToken(''); setIgUserId(''); setError('') }
  const close = () => { if (!busy) { setDialog(null); setToken(''); setIgUserId('') } }
  const isEAA = token.trim().startsWith('EAA')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dialog || !token.trim()) return
    setBusy(true)
    setError('')
    try {
      const r = dialog === 'instagram' ? await connectInstagram(token.trim(), igUserId.trim()) : await connectThreads(token.trim())
      onChange(r.data)
      setDialog(null)
      setToken('')
    } catch (err) {
      setError(apiMessage(err, 'Token ditolak. Periksa lalu coba lagi.'))
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async () => {
    if (!confirmOff) return
    setBusy(true)
    try {
      const r = await disconnectSocial(confirmOff)
      onChange(r.data)
      setConfirmOff(null)
    } catch (err) {
      setError(apiMessage(err, 'Gagal memutuskan akun.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      {!status.configured && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <p>Fitur belum aktif di server: <code className="font-mono">SOCIAL_TOKEN_KEY</code> belum diset. Akun belum bisa dihubungkan.</p>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AccountCard platform="instagram" account={status.instagram} configured={status.configured} onConnect={() => open('instagram')} onDisconnect={() => setConfirmOff('instagram')} />
        <AccountCard platform="threads" account={status.threads} configured={status.configured} onConnect={() => open('threads')} onDisconnect={() => setConfirmOff('threads')} />
      </div>

      <Modal title={`Hubungkan ${dialog ? LABEL[dialog] : ''}`} open={dialog != null} onClose={close}>
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-slate-600">
            {dialog === 'instagram'
              ? 'Tempel token akun Instagram Business/Creator: IGAA… (Instagram Login) atau EAA… (system user Facebook).'
              : 'Tempel token Threads long-lived (berlaku 60 hari).'}{' '}
            Token disimpan terenkripsi dan tidak ditampilkan lagi.
          </p>
          <div>
            <span id="social-token-label" className="block text-sm font-medium text-slate-700 mb-1.5">Token akses</span>
            <textarea
              aria-labelledby="social-token-label"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              rows={3}
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {dialog === 'instagram' && isEAA && (
            <div>
              <span id="social-iguid-label" className="block text-sm font-medium text-slate-700 mb-1.5">Instagram user ID</span>
              <input aria-labelledby="social-iguid-label" value={igUserId} onChange={(e) => setIgUserId(e.target.value)} inputMode="numeric" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
              <p className="mt-1 text-xs text-slate-500">Wajib untuk token EAA…: ID akun Instagram Business, bukan ID halaman Facebook.</p>
            </div>
          )}
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className="h-9 px-4 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">Batal</button>
            <button type="submit" disabled={busy || !token.trim() || (dialog === 'instagram' && isEAA && !igUserId.trim())} className="h-9 px-4 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {busy ? 'Memeriksa…' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal title={`Putuskan ${confirmOff ? LABEL[confirmOff] : ''}?`} open={confirmOff != null} onClose={() => !busy && setConfirmOff(null)}>
        <p className="text-sm text-slate-600">Token dihapus dari server. Posting terjadwal ke platform ini akan gagal sampai akun dihubungkan lagi.</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setConfirmOff(null)} className="h-9 px-4 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">Batal</button>
          <button type="button" onClick={disconnect} disabled={busy} className="h-9 px-4 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">Putuskan</button>
        </div>
      </Modal>
    </div>
  )
}
