import { useState, useEffect, useCallback } from 'react'
import {
  getWhatsAppSenders,
  createWhatsAppSender,
  updateWhatsAppSender,
  deleteWhatsAppSender,
  checkSenderStatus,
  checkAllSendersStatus,
  reloadPool,
  reconnectSender,
  startPairing,
  getPairingStatus,
  type WhatsAppSender,
  type SenderStatus,
} from '../api/whatsappSenders'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

type StatusMap = Record<string, SenderStatus & { checking?: boolean }>

export default function WhatsAppSendersPage() {
  const [senders, setSenders] = useState<WhatsAppSender[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<WhatsAppSender | null>(null)
  const [pairingId, setPairingId] = useState<string | null>(null)
  const [statusMap, setStatusMap] = useState<StatusMap>({})
  const [checkingAll, setCheckingAll] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [reconnecting, setReconnecting] = useState<string | null>(null)

  const handleReconnect = async (s: WhatsAppSender) => {
    setReconnecting(s.id)
    try {
      await reconnectSender(s.id)
      // Refresh status after reconnect
      const status = await checkSenderStatus(s.id)
      setStatusMap((m) => ({ ...m, [s.id]: { ...status, checking: false } }))
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { details?: string } } } })?.response?.data?.error?.details ?? 'Gagal reconnect'
      alert(msg)
    } finally {
      setReconnecting(null)
    }
  }

  const handleReloadPool = async () => {
    setReloading(true)
    try {
      await reloadPool()
      alert('Pool berhasil di-reload. Cek status koneksi untuk memverifikasi.')
    } catch {
      alert('Gagal reload pool')
    } finally {
      setReloading(false)
    }
  }

  const load = useCallback(() => {
    setLoading(true)
    getWhatsAppSenders({ limit: 50 })
      .then((r) => { setSenders(r.data); setTotal(r.pagination.total) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const handleToggle = async (s: WhatsAppSender) => {
    try { await updateWhatsAppSender(s.id, { is_active: !s.is_active }); load() } catch {}
  }

  const handleDelete = async (s: WhatsAppSender) => {
    if (!confirm(`Hapus sender "${s.label}" (${s.phone_number})?`)) return
    try { await deleteWhatsAppSender(s.id); load() } catch {}
  }

  const handleCheckOne = async (id: string) => {
    setStatusMap((m) => ({ ...m, [id]: { ...m[id], checking: true } }))
    try {
      const status = await checkSenderStatus(id)
      setStatusMap((m) => ({ ...m, [id]: { ...status, checking: false } }))
    } catch {
      setStatusMap((m) => ({ ...m, [id]: { connected: false, reason: 'Gagal terhubung ke server', checking: false } }))
    }
  }

  const handleCheckAll = async () => {
    setCheckingAll(true)
    setStatusMap((m) => {
      const next = { ...m }
      senders.forEach((s) => { next[s.id] = { ...next[s.id], checking: true } })
      return next
    })
    try {
      const result = await checkAllSendersStatus()
      setStatusMap((prev) => {
        const next = { ...prev }
        Object.entries(result).forEach(([id, status]) => { next[id] = { ...status, checking: false } })
        return next
      })
    } catch {
      setStatusMap((m) => {
        const next = { ...m }
        senders.forEach((s) => { next[s.id] = { connected: false, reason: 'Gagal', checking: false } })
        return next
      })
    } finally {
      setCheckingAll(false)
    }
  }

  const activeSenders = senders.filter((s) => s.is_active)
  const pairedSenders = senders.filter((s) => s.jid !== '')
  const connectedCount = Object.values(statusMap).filter((s) => s.connected).length
  const checkedCount = Object.keys(statusMap).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">WhatsApp Senders</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Pool nomor WA via whatsmeow — rotasi otomatis LRU
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {checkedCount > 0 && (
            <div className="text-center px-4 py-2 bg-sky-50 border border-sky-200 rounded-xl">
              <p className="text-lg font-bold text-sky-700">{connectedCount}/{checkedCount}</p>
              <p className="text-xs text-sky-500">Terkoneksi</p>
            </div>
          )}
          <div className="text-center px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-xl">
            <p className="text-lg font-bold text-indigo-700">{pairedSenders.length}</p>
            <p className="text-xs text-indigo-500">Terpasang</p>
          </div>
          <div className="text-center px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
            <p className="text-lg font-bold text-emerald-700">{activeSenders.length}</p>
            <p className="text-xs text-emerald-600">Aktif</p>
          </div>
          <div className="text-center px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-lg font-bold text-slate-700">{total}</p>
            <p className="text-xs text-slate-500">Total</p>
          </div>
          <button
            onClick={handleReloadPool}
            disabled={reloading}
            title="Reconnect semua sesi WA dari database tanpa restart server"
            className="flex items-center gap-2 px-4 py-2 border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {reloading ? <><span className="animate-spin">⏳</span> Reloading...</> : <><span>🔄</span> Reload Pool</>}
          </button>
          <button
            onClick={handleCheckAll}
            disabled={checkingAll || senders.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-sky-300 text-sky-700 bg-sky-50 hover:bg-sky-100 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {checkingAll ? <><span className="animate-spin">⏳</span> Mengecek...</> : <><span>🔍</span> Cek Semua</>}
          </button>
          <button
            onClick={() => { setEditing(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            + Tambah Nomor
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Memuat...</div>
      ) : senders.length === 0 ? (
        <EmptyState onAdd={() => { setEditing(null); setShowModal(true) }} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Nomor / Label</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Status Pairing</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Koneksi WA</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Aktif</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Terakhir Dipakai</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Terkirim</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {senders.map((s) => {
                const st = statusMap[s.id]
                const isPaired = s.jid !== ''
                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800">{s.phone_number}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                    </td>

                    <td className="px-5 py-4">
                      {isPaired ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ✓ Terpasang
                          </span>
                          <button
                            onClick={() => setPairingId(s.id)}
                            title="Pairing ulang QR (jika sesi terputus / hilang)"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-amber-700 border border-amber-200 hover:bg-amber-50 transition-colors"
                          >
                            📱 Scan ulang
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setPairingId(s.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                        >
                          📱 Scan QR
                        </button>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {!isPaired ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : st?.checking ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-slate-100 text-slate-500">
                          <span className="animate-spin">⏳</span> Mengecek...
                        </span>
                      ) : st ? (
                        <div className="space-y-0.5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                            st.connected
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-600 border-red-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            {st.connected ? 'Terhubung' : 'Terputus'}
                          </span>
                          {!st.connected && st.reason && <p className="text-xs text-red-400 mt-0.5">{st.reason}</p>}
                        </div>
                      ) : (
                        <button onClick={() => handleCheckOne(s.id)} className="text-xs text-sky-600 hover:underline">
                          Cek status
                        </button>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleToggle(s)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          s.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {s.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>

                    <td className="px-5 py-4 text-slate-500 text-xs">
                      {s.last_used_at
                        ? format(new Date(s.last_used_at), 'dd MMM yyyy HH:mm', { locale: localeId })
                        : '—'}
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-semibold text-slate-700">{s.daily_count}</span>
                      <span className="text-slate-400 ml-1 text-xs">pesan</span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        {isPaired && st && !st.connected && (
                          <button
                            onClick={() => handleReconnect(s)}
                            disabled={reconnecting === s.id}
                            className="px-3 py-1.5 text-xs border border-amber-300 rounded-lg hover:bg-amber-50 text-amber-700 disabled:opacity-40"
                          >
                            {reconnecting === s.id ? '⏳' : '🔌'} Reconnect
                          </button>
                        )}
                        {isPaired && (
                          <button
                            onClick={() => handleCheckOne(s.id)}
                            disabled={st?.checking}
                            className="px-3 py-1.5 text-xs border border-sky-200 rounded-lg hover:bg-sky-50 text-sky-600 disabled:opacity-40"
                          >
                            🔍 Cek
                          </button>
                        )}
                        <button
                          onClick={() => { setEditing(s); setShowModal(true) }}
                          className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="px-3 py-1.5 text-xs border border-red-200 rounded-lg hover:bg-red-50 text-red-600"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <SenderModal
          existing={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}
      {pairingId && (
        <QRPairingModal
          senderId={pairingId}
          onClose={() => { setPairingId(null); load() }}
        />
      )}
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
      <p className="text-4xl mb-3">📱</p>
      <h3 className="text-slate-700 font-semibold">Belum ada sender</h3>
      <p className="text-slate-400 text-sm mt-1 mb-4">
        Tambahkan nomor WA, lalu scan QR code untuk menghubungkannya
      </p>
      <button onClick={onAdd} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700">
        + Tambah Nomor Pertama
      </button>
    </div>
  )
}

function SenderModal({ existing, onClose, onSaved }: {
  existing: WhatsAppSender | null
  onClose: () => void
  onSaved: () => void
}) {
  const [label, setLabel] = useState(existing?.label ?? '')
  const [phone, setPhone] = useState(existing?.phone_number ?? '')
  const [isActive, setIsActive] = useState(existing?.is_active ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!label || !phone) { setError('Label dan nomor HP wajib diisi'); return }
    setSaving(true)
    setError('')
    try {
      if (existing) {
        await updateWhatsAppSender(existing.id, { label, phone_number: phone, is_active: isActive })
      } else {
        await createWhatsAppSender({ label, phone_number: phone })
      }
      onSaved()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { errors?: { message: string }[] } } }
      setError(e?.response?.data?.errors?.[0]?.message ?? 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{existing ? 'Edit Sender' : 'Tambah Sender Baru'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="cth: Nomor Marketing 1"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nomor WhatsApp</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="628xxxxxxxxx"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <p className="text-xs text-slate-400 mt-1">Format internasional tanpa +, cth: 6281234567890</p>
          </div>
          {existing && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 accent-indigo-600" />
              <span className="text-sm text-slate-700">Aktifkan sender ini</span>
            </label>
          )}
          {!existing && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
              <p className="text-xs text-indigo-700 font-medium">ℹ️ Setelah disimpan, scan QR code untuk menghubungkan nomor ke WhatsApp</p>
            </div>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
              Batal
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Menyimpan...' : existing ? 'Simpan' : 'Tambah & Lanjut Scan QR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function QRPairingModal({ senderId, onClose }: { senderId: string; onClose: () => void }) {
  const [qr, setQr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  // Request QR on mount
  useEffect(() => {
    startPairing(senderId)
      .then((qrB64) => { setQr(qrB64); setLoading(false) })
      .catch((err: unknown) => {
        const e = err as { response?: { data?: { message?: string } } }
        setError(e?.response?.data?.message ?? 'Gagal generate QR')
        setLoading(false)
      })
  }, [senderId])

  // Poll pair status every 3s until done
  useEffect(() => {
    if (done || loading || error) return
    const interval = setInterval(async () => {
      try {
        const status = await getPairingStatus(senderId)
        if (status.qr && status.qr !== qr) setQr(status.qr)
        if (status.done) { setDone(true); clearInterval(interval) }
      } catch { /* silent */ }
    }, 3000)
    return () => clearInterval(interval)
  }, [senderId, done, loading, error, qr])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm text-center">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">
            {done ? '✅ WhatsApp Terhubung!' : '📱 Scan QR dengan WhatsApp'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {done ? (
            <>
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-4xl">✓</div>
              <p className="text-sm text-slate-600">Nomor berhasil dihubungkan. Sender sudah aktif dan siap digunakan.</p>
              <button onClick={onClose}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl">
                Tutup
              </button>
            </>
          ) : loading ? (
            <div className="py-10 text-slate-400">
              <div className="animate-spin text-3xl mb-3">⏳</div>
              <p className="text-sm">Menyiapkan QR code...</p>
            </div>
          ) : error ? (
            <div className="py-6">
              <p className="text-sm text-red-500 mb-4">{error}</p>
              <button onClick={onClose}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
                Tutup
              </button>
            </div>
          ) : qr ? (
            <>
              <img src={qr} alt="QR Code WhatsApp" className="w-64 h-64 mx-auto rounded-xl border border-slate-200" />
              <p className="text-xs text-slate-500 leading-relaxed">
                Buka WhatsApp → Perangkat Tertaut → Tautkan Perangkat → Scan kode di atas
              </p>
              <p className="text-xs text-amber-600">QR otomatis diperbarui setiap 20 detik</p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
