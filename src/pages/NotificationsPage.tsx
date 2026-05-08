import { useState } from 'react'
import { sendWhatsApp, type NotifyResult } from '../api/admin'
import Badge from '../components/ui/Badge'

const APP_LINK = 'https://play.google.com/store/apps/details?id=com.loka.kasir'

const TEMPLATES = [
  {
    id: 'app_download',
    label: 'Undangan Download Aplikasi',
    icon: '📱',
    message: (name: string) =>
      `Halo *${name || 'Pengguna'}*! 👋\n\nKami mengundang kamu untuk mencoba *aplikasi Loka Kasir* di smartphone.\n\n📱 *Download sekarang di Google Play:*\n${APP_LINK}\n\nDengan aplikasi Loka Kasir kamu bisa:\n✅ Transaksi POS langsung dari HP\n✅ Pantau stok & produk kapan saja\n✅ Lihat laporan penjualan real-time\n✅ Kelola karyawan & shift\n\nLogin menggunakan nomor HP dan password yang sama seperti di web. 🔐\n\nAda pertanyaan? Balas pesan ini, kami siap membantu! 😊\n\n_Tim Loka Kasir_`,
  },
  {
    id: 'promo',
    label: 'Promosi & Update',
    icon: '🎉',
    message: (name: string) =>
      `Halo *${name || 'Pengguna'}*! 👋\n\nAda kabar baik dari Loka Kasir! 🚀\n\nKami terus mengembangkan fitur-fitur baru untuk membantu bisnis kamu tumbuh lebih cepat.\n\nCek update terbaru di aplikasi:\n${APP_LINK}\n\n_Tim Loka Kasir_`,
  },
  {
    id: 'custom',
    label: 'Pesan Kustom',
    icon: '✏️',
    message: () => '',
  },
]

type Tab = 'single' | 'bulk'
type SendState = 'idle' | 'sending' | 'done'

export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>('single')
  const [templateId, setTemplateId] = useState('app_download')
  const [phone, setPhone] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [sendState, setSendState] = useState<SendState>('idle')
  const [results, setResults] = useState<{ total: number; sent: number; failed: number; results: NotifyResult[] } | null>(null)
  const [error, setError] = useState('')

  const selectedTemplate = TEMPLATES.find((t) => t.id === templateId)!
  const previewName = tab === 'single' ? (businessName || 'Nama Bisnis') : 'Nama Bisnis'
  const previewMessage =
    templateId === 'custom' ? customMessage : selectedTemplate.message(previewName)

  const handleSend = async () => {
    if (tab === 'single' && !phone.trim()) {
      setError('Nomor WhatsApp wajib diisi')
      return
    }
    if (!previewMessage.trim()) {
      setError('Pesan tidak boleh kosong')
      return
    }

    setError('')
    setSendState('sending')
    setResults(null)

    try {
      const res = await sendWhatsApp({
        phone: tab === 'single' ? phone.trim() : undefined,
        business_name: businessName || undefined,
        message: templateId === 'custom' ? customMessage : undefined,
        bulk: tab === 'bulk',
      })
      setResults(res.data)
      setSendState('done')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim notifikasi'
      setError(msg)
      setSendState('idle')
    }
  }

  const handleReset = () => {
    setSendState('idle')
    setResults(null)
    setError('')
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Notifikasi WhatsApp</h2>
        <p className="text-sm text-slate-500 mt-0.5">Kirim pesan WhatsApp ke pengguna Loka Kasir</p>
      </div>

      {sendState === 'done' && results ? (
        <ResultView results={results} onReset={handleReset} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form panel */}
          <div className="space-y-4">
            {/* Tab */}
            <div className="bg-white rounded-xl border border-slate-200 p-1 flex gap-1">
              {(['single', 'bulk'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setResults(null); setError('') }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tab === t ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t === 'single' ? '👤 Satu Nomor' : '👥 Semua Pengguna'}
                </button>
              ))}
            </div>

            {/* Recipient */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">Penerima</h3>

              {tab === 'single' ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Nomor WhatsApp <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="628123456789"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-slate-400 mt-1">Format: 628xxx (tanpa + atau spasi)</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nama Bisnis</label>
                    <input
                      type="text"
                      placeholder="Warung Maju Jaya"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-slate-400 mt-1">Opsional — dipakai di dalam template pesan</p>
                  </div>
                </>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-amber-800">⚠️ Kirim ke semua owner aktif</p>
                  <p className="text-xs text-amber-600 mt-1">
                    Pesan akan dikirim ke seluruh pemilik bisnis yang akun-nya aktif. Nama bisnis masing-masing akan otomatis digunakan di template.
                  </p>
                </div>
              )}
            </div>

            {/* Template */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Template Pesan</h3>
              <div className="space-y-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplateId(t.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                      templateId === t.id
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="mr-2">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>

              {templateId === 'custom' && (
                <textarea
                  rows={6}
                  placeholder="Tulis pesan kustom di sini..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              onClick={handleSend}
              disabled={sendState === 'sending'}
              className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              {sendState === 'sending' ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Mengirim...
                </>
              ) : (
                <>
                  <span>📤</span>
                  {tab === 'bulk' ? 'Kirim ke Semua Pengguna' : 'Kirim WhatsApp'}
                </>
              )}
            </button>
          </div>

          {/* Preview panel */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-600">Preview Pesan</h3>
            <div className="bg-[#e5ddd5] rounded-xl p-4 min-h-64">
              <div className="bg-white rounded-xl rounded-tl-none shadow-sm px-4 py-3 max-w-xs">
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {previewMessage || (
                    <span className="text-slate-400 italic">Pesan akan muncul di sini...</span>
                  )}
                </p>
                <p className="text-xs text-slate-400 mt-2 text-right">12:00</p>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              * Teks <strong>bold</strong> menggunakan format WhatsApp (*teks*)
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function ResultView({
  results,
  onReset,
}: {
  results: { total: number; sent: number; failed: number; results: NotifyResult[] }
  onReset: () => void
}) {
  const [showAll, setShowAll] = useState(false)
  const displayed = showAll ? results.results : results.results.slice(0, 10)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{results.total}</p>
          <p className="text-xs text-slate-500 mt-1">Total</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{results.sent}</p>
          <p className="text-xs text-emerald-600 mt-1">Terkirim</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{results.failed}</p>
          <p className="text-xs text-red-600 mt-1">Gagal</p>
        </div>
      </div>

      {/* Result list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Detail Pengiriman</h3>
          <button onClick={onReset} className="text-xs text-indigo-600 hover:underline">
            ← Kirim lagi
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {displayed.map((r, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-700">{r.name}</p>
                <p className="text-xs text-slate-400">{r.phone}</p>
                {r.error && <p className="text-xs text-red-500 mt-0.5">{r.error}</p>}
              </div>
              <Badge variant={r.success ? 'success' : 'danger'}>
                {r.success ? '✓ Terkirim' : '✗ Gagal'}
              </Badge>
            </div>
          ))}
        </div>
        {results.results.length > 10 && (
          <div className="px-4 py-3 border-t border-slate-100 text-center">
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-xs text-indigo-600 hover:underline"
            >
              {showAll ? 'Sembunyikan' : `Lihat semua ${results.results.length} hasil`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
