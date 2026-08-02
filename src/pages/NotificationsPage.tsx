import { useEffect, useState } from 'react'
import {
  sendEmail, sendPush, getNotificationLogs, getNotificationStats,
  type NotifyResult, type NotificationLog, type NotificationStats,
} from '../api/admin'
import RecipientPicker from '../components/ui/RecipientPicker'
import { formatDistanceToNow, format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

const APP_LINK = 'https://play.google.com/store/apps/details?id=id.lokakasir.app'

const TEMPLATES = [
  {
    id: 'app_download',
    label: 'Undangan Download App',
    icon: '📱',
    color: 'bg-indigo-50 border-indigo-300 text-indigo-700',
    activeColor: 'bg-indigo-600 text-white border-indigo-600',
    message: (name: string) =>
      `Halo ${name || 'Pengguna'},\n\nKami mengundang Anda untuk mencoba aplikasi Loka Kasir di smartphone.\n\nDownload sekarang:\n${APP_LINK}\n\nDengan aplikasi Loka Kasir Anda bisa:\n- Transaksi POS langsung dari HP\n- Pantau stok & produk kapan saja\n- Lihat laporan penjualan real-time\n- Kelola karyawan & shift\n\nLogin menggunakan email dan password yang sama seperti di web.\n\nAda pertanyaan? Balas email ini, kami siap membantu!\n\nSalam,\nTim Loka Kasir`,
  },
  {
    id: 'promo',
    label: 'Promosi & Update',
    icon: '🎉',
    color: 'bg-orange-50 border-orange-300 text-orange-700',
    activeColor: 'bg-orange-500 text-white border-orange-500',
    message: (name: string) =>
      `Halo ${name || 'Pengguna'},\n\nAda kabar baik dari Loka Kasir!\n\nKami terus mengembangkan fitur-fitur baru untuk membantu bisnis Anda tumbuh lebih cepat.\n\nCek update terbaru di aplikasi:\n${APP_LINK}\n\nSalam,\nTim Loka Kasir`,
  },
  {
    id: 'custom',
    label: 'Pesan Kustom',
    icon: '✏️',
    color: 'bg-slate-50 border-slate-300 text-slate-700',
    activeColor: 'bg-slate-700 text-white border-slate-700',
    message: () => '',
  },
]

/**
 * Template push notification. Berbeda dari email: judul tampil di layar kunci
 * perangkat dan isi harus pendek — notifikasi Android/iOS memotong teks panjang.
 */
const PUSH_TEMPLATES = [
  {
    id: 'feedback_push',
    label: 'Minta Feedback',
    icon: '💬',
    activeColor: 'bg-emerald-600 text-white border-emerald-600',
    title: 'Bagaimana pengalaman Anda dengan Loka Kasir?',
    message: (name: string) =>
      `Halo ${name || 'Pengguna'}, kami ingin mendengar masukan Anda tentang Loka Kasir — apa yang sudah membantu dan apa yang perlu kami perbaiki. Terima kasih!`,
  },
  {
    id: 'promo_push',
    label: 'Promosi & Update',
    icon: '🎉',
    activeColor: 'bg-orange-500 text-white border-orange-500',
    title: 'Ada yang baru di Loka Kasir',
    message: (name: string) =>
      `Halo ${name || 'Pengguna'}, ada fitur & perbaikan terbaru di Loka Kasir. Buka aplikasi untuk melihatnya.`,
  },
  {
    id: 'custom_push',
    label: 'Pesan Kustom',
    icon: '✏️',
    activeColor: 'bg-slate-700 text-white border-slate-700',
    title: '',
    message: () => '',
  },
]

type Channel = 'email' | 'push'
type Tab = 'single' | 'bulk'
type SendState = 'idle' | 'sending' | 'done'

const TEMPLATE_LABELS: Record<string, string> = {
  app_download: 'Undangan Download App',
  promo: 'Promosi & Update',
  custom: 'Pesan Kustom',
  feedback_push: 'Push · Minta Feedback',
  promo_push: 'Push · Promosi & Update',
  custom_push: 'Push · Pesan Kustom',
}

export default function NotificationsPage() {
  const [channel, setChannel] = useState<Channel>('email')
  const [tab, setTab] = useState<Tab>('single')
  const [templateId, setTemplateId] = useState('app_download')
  const [email, setEmail] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [sendState, setSendState] = useState<SendState>('idle')
  const [sendResult, setSendResult] = useState<{ total: number; sent: number; failed: number; results: NotifyResult[] } | null>(null)
  const [error, setError] = useState('')
  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [logsLoading, setLogsLoading] = useState(true)
  const [historyTick, setHistoryTick] = useState(0)

  const refreshHistory = () => setHistoryTick((n) => n + 1)

  useEffect(() => {
    Promise.all([getNotificationLogs(), getNotificationStats()])
      .then(([logsRes, statsRes]) => {
        setLogs(logsRes.data ?? [])
        setStats(statsRes.data)
        setLogsLoading(false)
      })
      .catch(() => setLogsLoading(false))
  }, [historyTick])

  const isPush = channel === 'push'
  const templates = isPush ? PUSH_TEMPLATES : TEMPLATES
  const isCustom = templateId === 'custom' || templateId === 'custom_push'

  const selectedTemplate = templates.find((t) => t.id === templateId) ?? templates[0]
  const previewName = tab === 'single' ? (businessName || 'Nama Bisnis') : 'Nama Bisnis'
  const previewMessage = isCustom ? customMessage : selectedTemplate.message(previewName)
  const previewTitle = isPush
    ? (isCustom ? customTitle : (selectedTemplate as (typeof PUSH_TEMPLATES)[number]).title)
    : ''

  // Berpindah kanal mengganti daftar template, jadi pilihan lama tidak lagi valid.
  const handleChannelChange = (next: Channel) => {
    if (next === channel) return
    setChannel(next)
    setTemplateId(next === 'push' ? 'feedback_push' : 'app_download')
    setError('')
  }

  const handleSend = async () => {
    if (tab === 'single' && !email.trim()) { setError('Email penerima wajib diisi'); return }
    if (!previewMessage.trim()) { setError('Pesan tidak boleh kosong'); return }
    if (isPush && !previewTitle.trim()) { setError('Judul notifikasi tidak boleh kosong'); return }
    setError('')
    setSendState('sending')
    try {
      const payload = {
        email: tab === 'single' ? email.trim() : undefined,
        business_name: businessName || undefined,
        template: templateId,
        message: isCustom ? customMessage : undefined,
        bulk: tab === 'bulk',
      }
      const res = isPush
        ? await sendPush({ ...payload, title: previewTitle })
        : await sendEmail(payload)
      setSendResult(res.data)
      setSendState('done')
      refreshHistory()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim notifikasi')
      setSendState('idle')
    }
  }

  const handleReset = () => { setSendState('idle'); setSendResult(null); setError('') }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Notifikasi</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isPush
              ? 'Kirim push notification ke aplikasi pengguna Loka Kasir'
              : 'Kirim email notifikasi ke pengguna Loka Kasir'}
          </p>
        </div>
        {stats && (
          <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3 w-full lg:w-auto">
            <div className="text-center px-3 sm:px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-lg font-bold text-emerald-700">{stats.total_sent.toLocaleString()}</p>
              <p className="text-xs text-emerald-600">Total Terkirim</p>
            </div>
            <div className="text-center px-3 sm:px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-xl">
              <p className="text-lg font-bold text-indigo-700">{stats.success_rate.toFixed(0)}%</p>
              <p className="text-xs text-indigo-600">Sukses Rate</p>
            </div>
            {stats.total_failed > 0 && (
              <div className="text-center px-3 sm:px-4 py-2 bg-red-50 border border-red-200 rounded-xl col-span-2 sm:col-span-1">
                <p className="text-lg font-bold text-red-700">{stats.total_failed.toLocaleString()}</p>
                <p className="text-xs text-red-600">Total Gagal</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* === Compose panel (3/5) === */}
        <div className="xl:col-span-3 space-y-4">
          {sendState === 'done' && sendResult ? (
            <SendResultCard result={sendResult} onReset={handleReset} />
          ) : (
            <>
              {/* Kanal pengiriman */}
              <div className="bg-white rounded-2xl border border-slate-200 p-1.5 flex gap-1.5">
                {([['email', '📧 Email'], ['push', '🔔 Push ke Aplikasi']] as const).map(([c, label]) => (
                  <button key={c} onClick={() => handleChannelChange(c)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      channel === c
                        ? (c === 'push' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-indigo-600 text-white shadow-sm')
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab */}
              <div className="bg-white rounded-2xl border border-slate-200 p-1.5 flex gap-1.5">
                {(['single', 'bulk'] as Tab[]).map((t) => (
                  <button key={t} onClick={() => { setTab(t); setError('') }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      tab === t
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}>
                    {t === 'single' ? '👤 Satu Pengguna' : '👥 Semua Pengguna'}
                  </button>
                ))}
              </div>

              {/* Recipient */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <h3 className="text-sm font-semibold text-slate-700">Penerima</h3>
                </div>
                {tab === 'single' ? (
                  <RecipientPicker email={email} businessName={businessName}
                    onChange={(e, b) => { setEmail(e); setBusinessName(b) }} />
                ) : (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Kirim ke semua owner aktif</p>
                      <p className="text-xs text-amber-600 mt-1 leading-relaxed">
                        {isPush
                          ? 'Push akan dikirim ke seluruh perangkat pemilik bisnis yang akun-nya aktif. Owner yang belum pernah login di aplikasi tidak punya perangkat terdaftar — notifikasinya hanya muncul di daftar in-app.'
                          : 'Email akan dikirim ke seluruh pemilik bisnis yang akun-nya aktif.'}{' '}
                        Nama bisnis masing-masing akan otomatis digunakan di template pesan.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Template */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <h3 className="text-sm font-semibold text-slate-700">Template Pesan</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  {templates.map((t) => (
                    <button key={t.id} onClick={() => setTemplateId(t.id)}
                      className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-medium transition-all ${
                        templateId === t.id ? t.activeColor + ' shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}>
                      <span className="text-xl">{t.icon}</span>
                      <span className="text-xs text-center leading-tight">{t.label}</span>
                    </button>
                  ))}
                </div>
                {isCustom && (
                  <div className="space-y-2">
                    {isPush && (
                      <input type="text" placeholder="Judul notifikasi (tampil di layar perangkat)"
                        value={customTitle} onChange={(e) => setCustomTitle(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    )}
                    <textarea rows={isPush ? 4 : 6} placeholder="Tulis pesan kustom di sini..." value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <span>❌</span>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Preview + Send */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <h3 className="text-sm font-semibold text-slate-700">Preview & Kirim</h3>
                </div>
                {isPush ? (
                  /* Push preview — meniru kartu notifikasi di perangkat */
                  <div className="bg-slate-800 rounded-xl p-4 mb-4">
                    <p className="text-xs text-slate-400 mb-2">
                      Ke: {tab === 'bulk' ? 'semua owner aktif' : (email || 'penerima')}
                    </p>
                    <div className="bg-white rounded-xl px-4 py-3 shadow-lg">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-4 h-4 rounded bg-indigo-600 text-white text-[9px] flex items-center justify-center font-bold">L</span>
                        <span className="text-[11px] text-slate-400">Loka Kasir · sekarang</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 leading-snug">
                        {previewTitle || <span className="text-slate-400 italic font-normal">Judul notifikasi...</span>}
                      </p>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-3">
                        {previewMessage || <span className="text-slate-400 italic">Isi notifikasi...</span>}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                      Notifikasi juga tersimpan di daftar Notifikasi in-app, sehingga tetap terbaca meski push terlewat.
                    </p>
                  </div>
                ) : (
                  /* Email preview */
                  <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-8">Dari:</span>
                      <span className="text-xs text-slate-600">noreply@lokakasir.id</span>
                    </div>
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-8">Ke:</span>
                      <span className="text-xs text-slate-600 italic">
                        {tab === 'bulk' ? 'semua owner aktif' : (email || 'email penerima')}
                      </span>
                    </div>
                    <div className="px-4 py-4 min-h-28 bg-white">
                      <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {previewMessage || <span className="text-slate-400 italic text-xs">Pilih template untuk melihat preview...</span>}
                      </p>
                    </div>
                  </div>
                )}
                <button onClick={handleSend} disabled={sendState === 'sending'}
                  className={`w-full py-3.5 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm ${
                    isPush
                      ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                      : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
                  }`}>
                  {sendState === 'sending' ? (
                    <><span className="animate-spin inline-block">⏳</span> Mengirim...</>
                  ) : (
                    <>
                      <span>{isPush ? '🔔' : '📧'}</span>
                      {tab === 'bulk'
                        ? 'Kirim ke Semua Pengguna'
                        : (isPush ? 'Kirim Push Notification' : 'Kirim Email')}
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* === History panel (2/5) === */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden xl:sticky xl:top-6">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Riwayat Pengiriman</h3>
              <button onClick={refreshHistory}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                Refresh
              </button>
            </div>

            <div className="max-h-none xl:max-h-[calc(100vh-220px)] overflow-y-auto">
              {logsLoading ? (
                <div className="py-12 text-center text-slate-400 text-sm">Memuat riwayat...</div>
              ) : logs.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-3xl mb-2">📭</p>
                  <p className="text-sm text-slate-400">Belum ada notifikasi yang terkirim</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <LogItem key={log.id} log={log} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LogItem({ log }: { log: NotificationLog }) {
  const [expanded, setExpanded] = useState(false)
  const allSuccess = log.failed === 0
  const allFailed = log.sent === 0

  return (
    <div className="px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setExpanded(v => !v)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base ${
            log.is_bulk ? 'bg-purple-100' : 'bg-indigo-100'
          }`}>
            {log.is_bulk ? '👥' : '👤'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-700">
                {TEMPLATE_LABELS[log.template] ?? log.template}
              </span>
              {log.is_bulk && (
                <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">Bulk</span>
              )}
            </div>
            {!log.is_bulk && log.recipient_name && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">{log.recipient_name}
                {log.phone && <span className="text-slate-400"> · {log.phone}</span>}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-1 truncate">{log.message_preview}</p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            allSuccess ? 'bg-emerald-100 text-emerald-700'
            : allFailed ? 'bg-red-100 text-red-700'
            : 'bg-amber-100 text-amber-700'
          }`}>
            {allSuccess ? '✓' : allFailed ? '✗' : '~'}
            {log.is_bulk ? ` ${log.sent}/${log.total}` : (allSuccess ? ' Terkirim' : ' Gagal')}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: localeId })}
          </p>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 ml-11 space-y-2">
          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Waktu</span>
              <span className="font-medium">{format(new Date(log.created_at), 'dd MMM yyyy, HH:mm', { locale: localeId })}</span>
            </div>
            {log.is_bulk && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total penerima</span>
                  <span className="font-medium">{log.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Berhasil</span>
                  <span className="font-medium text-emerald-600">{log.sent}</span>
                </div>
                {log.failed > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Gagal</span>
                    <span className="font-medium text-red-600">{log.failed}</span>
                  </div>
                )}
              </>
            )}
            <div className="pt-1.5 border-t border-slate-200">
              <p className="text-slate-400 mb-1">Preview pesan:</p>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{log.message_preview}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SendResultCard({
  result, onReset,
}: {
  result: { total: number; sent: number; failed: number; results: NotifyResult[] }
  onReset: () => void
}) {
  const [showAll, setShowAll] = useState(false)
  const displayed = showAll ? result.results : result.results.slice(0, 8)
  const allSuccess = result.failed === 0

  return (
    <div className="space-y-4">
      {/* Result banner */}
      <div className={`rounded-2xl p-5 border ${allSuccess ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{allSuccess ? '🎉' : '⚠️'}</span>
          <div>
            <p className={`font-semibold text-base ${allSuccess ? 'text-emerald-800' : 'text-amber-800'}`}>
              {allSuccess ? 'Semua notifikasi terkirim!' : 'Sebagian tidak terkirim'}
            </p>
            <p className={`text-sm mt-0.5 ${allSuccess ? 'text-emerald-600' : 'text-amber-600'}`}>
              {result.sent} berhasil · {result.failed} gagal dari {result.total} total
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          <span>Sukses</span>
          <span>{result.total > 0 ? Math.round(result.sent / result.total * 100) : 0}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${result.total > 0 ? (result.sent / result.total) * 100 : 0}%` }} />
        </div>
        <div className="flex gap-4 mt-3">
          {[
            { label: 'Total', value: result.total, color: 'text-slate-700' },
            { label: 'Terkirim', value: result.sent, color: 'text-emerald-600' },
            { label: 'Gagal', value: result.failed, color: 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="flex-1 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Detail list */}
      {result.results.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Detail Pengiriman</p>
          </div>
          <div className="divide-y divide-slate-100">
            {displayed.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                    r.success ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {r.success ? '✓' : '✗'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{r.name}</p>
                    <p className="text-xs text-slate-400">{r.phone}</p>
                    {r.error && <p className="text-xs text-red-500 mt-0.5">{r.error}</p>}
                  </div>
                </div>
                <span className={`text-xs font-medium ${r.success ? 'text-emerald-600' : 'text-red-600'}`}>
                  {r.success ? 'Terkirim' : 'Gagal'}
                </span>
              </div>
            ))}
          </div>
          {result.results.length > 8 && (
            <div className="px-4 py-3 border-t border-slate-100 text-center">
              <button onClick={() => setShowAll(v => !v)} className="text-xs text-indigo-600 hover:underline font-medium">
                {showAll ? 'Sembunyikan' : `Lihat semua ${result.results.length} hasil`}
              </button>
            </div>
          )}
        </div>
      )}

      <button onClick={onReset}
        className="w-full py-3 border-2 border-indigo-200 hover:border-indigo-400 text-indigo-600 font-medium rounded-xl text-sm transition-colors">
        ← Kirim Notifikasi Baru
      </button>
    </div>
  )
}
