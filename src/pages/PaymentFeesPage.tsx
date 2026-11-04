import { AlertTriangle } from 'lucide-react'
import ButtonIcon from '../components/ui/ButtonIcon'
import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { getPaymentFees, savePaymentFee, type GatewayFeeRate } from '../api/salesReferral'
import { apiErrorText, formatBp, gatewayFee, groupFeeRates, parsePercentToBp, type FeeRateState } from '../lib/salesReferral'
import { formatMoney, wibDate } from '../lib/sales'

/** Harga Pro bulanan, dipakai sebagai contoh biaya per tagihan. */
const SAMPLE_AMOUNT = 59000
const STATE_BADGE: Record<FeeRateState, { label: string; variant: 'success' | 'info' | 'neutral' }> = {
  current: { label: 'Berlaku', variant: 'success' },
  scheduled: { label: 'Terjadwal', variant: 'info' },
  past: { label: 'Riwayat', variant: 'neutral' },
}
const fmtDate = (ymd: string) => format(new Date(`${ymd}T00:00:00`), 'dd MMM yyyy', { locale: localeId })
const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

const describe = (r: Pick<GatewayFeeRate, 'flat_fee' | 'percent_bp'>) =>
  [r.flat_fee > 0 ? formatMoney(r.flat_fee) : '', r.percent_bp > 0 ? formatBp(r.percent_bp) : ''].filter(Boolean).join(' + ') || 'Gratis'

/**
 * Tarif biaya Duitku per kanal. Dipakai saat pembayaran lunas untuk menghitung
 * nilai bersih, dasar komisi sales. Komisi yang sudah tercatat tidak dihitung
 * ulang ketika tarif diubah.
 */
export default function PaymentFeesPage() {
  const [rates, setRates] = useState<GatewayFeeRate[] | null>(null)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  const [editing, setEditing] = useState<GatewayFeeRate | 'new' | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [notice, setNotice] = useState('')
  const today = wibDate()

  useEffect(() => {
    let active = true
    getPaymentFees()
      .then((res) => { if (active) { setRates(res.data ?? []); setError('') } })
      .catch((err) => { if (active) setError(apiErrorText(err, 'Gagal memuat tarif.')) })
    return () => { active = false }
  }, [tick])

  const groups = useMemo(() => groupFeeRates(rates ?? [], today), [rates, today])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Tarif Pembayaran Duitku</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Biaya per kanal untuk menghitung nilai bersih tagihan langganan — dasar komisi sales.
          </p>
        </div>
        <button onClick={() => { setNotice(''); setEditing('new') }}
          className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg">
          + Tarif kanal baru
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 space-y-1">
        <p className="font-semibold"><ButtonIcon icon={AlertTriangle} />Cocokkan dengan dashboard Duitku</p>
        <p>
          Tarif awal diambil dari halaman harga <strong>publik</strong> Duitku, belum tentu sama dengan kontrak akun Loka.
          Bandingkan dengan biaya yang tercatat per transaksi di dashboard Duitku, lalu perbarui di sini.
        </p>
        <p className="text-amber-800">
          Perubahan hanya berlaku untuk pembayaran sejak tanggal berlaku. Komisi yang sudah tercatat tidak dihitung ulang — gunakan “Koreksi biaya” di halaman sales bila perlu.
        </p>
      </div>

      {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => { setError(''); setTick((n) => n + 1) }} className="font-semibold underline">Coba lagi</button>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-slate-600 w-fit">
        <input type="checkbox" checked={showHistory} onChange={(e) => setShowHistory(e.target.checked)} className="rounded border-slate-300" />
        Tampilkan riwayat & tarif terjadwal
      </label>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Kode', 'Kanal', 'Tarif', `Contoh di ${formatMoney(SAMPLE_AMOUNT)}`, 'Berlaku sejak', ''].map((h, i) => (
                  <th key={h || i} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide ${i === 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!rates && !error ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Memuat…</td></tr>
              ) : groups.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">{error ? '' : 'Belum ada tarif.'}</td></tr>
              ) : groups.flatMap((g) =>
                g.rows
                  .filter((r) => showHistory || r.state === 'current')
                  .map(({ rate, state }) => {
                    const badge = STATE_BADGE[state]
                    const muted = state === 'past'
                    return (
                      <tr key={`${rate.payment_code}-${rate.valid_from}`}
                        className={`border-b border-slate-100 last:border-0 ${muted ? 'text-slate-400' : 'text-slate-700'}`}>
                        <td className="px-4 py-3 font-mono font-semibold">{rate.payment_code}</td>
                        <td className="px-4 py-3">{rate.label || '—'}</td>
                        <td className="px-4 py-3 tabular-nums whitespace-nowrap">{describe(rate)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatMoney(gatewayFee(SAMPLE_AMOUNT, rate))}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {fmtDate(rate.valid_from)} {showHistory && <Badge variant={badge.variant}>{badge.label}</Badge>}
                          {state === 'current' && rate.valid_from > today && <p className="text-xs text-slate-400">dipakai karena belum ada tarif lebih awal</p>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {state !== 'past' && (
                            <button onClick={() => { setNotice(''); setEditing(rate) }}
                              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap">Ubah tarif</button>
                          )}
                        </td>
                      </tr>
                    )
                  }))}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">
          Biaya = biaya tetap + persen × nominal dibayar (dibulatkan ke rupiah terdekat). Kanal tak dikenal atau pelunasan lewat cek status memakai tarif tertinggi dan ditandai estimasi.
        </p>
      </div>

      <Modal title={editing === 'new' ? 'Tarif kanal baru' : 'Ubah tarif'} open={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <FeeForm
            rate={editing === 'new' ? null : editing}
            existing={rates ?? []}
            today={today}
            onCancel={() => setEditing(null)}
            onSaved={(r) => { setEditing(null); setNotice(`Tarif ${r.payment_code} berlaku ${fmtDate(r.valid_from)} disimpan.`); setTick((n) => n + 1) }}
          />
        )}
      </Modal>
    </div>
  )
}

function FeeForm({ rate, existing, today, onCancel, onSaved }: {
  rate: GatewayFeeRate | null
  existing: GatewayFeeRate[]
  today: string
  onCancel: () => void
  onSaved: (r: GatewayFeeRate) => void
}) {
  const [code, setCode] = useState(rate?.payment_code ?? '')
  const [label, setLabel] = useState(rate?.label ?? '')
  const [flat, setFlat] = useState(String(rate?.flat_fee ?? 0))
  const [percent, setPercent] = useState(rate ? (rate.percent_bp / 100).toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '0')
  // Tarif baru mulai hari ini; tarif lama tetap disimpan sebagai riwayat.
  const [validFrom, setValidFrom] = useState(rate && rate.valid_from > today ? rate.valid_from : today)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const bp = parsePercentToBp(percent)
  const flatFee = flat === '' ? NaN : Number(flat)
  const normalizedCode = code.trim().toUpperCase()
  const replaces = existing.find((r) => r.payment_code === normalizedCode && r.valid_from === validFrom)
  const preview = bp !== null && Number.isInteger(flatFee) ? gatewayFee(SAMPLE_AMOUNT, { flat_fee: flatFee, percent_bp: bp }) : null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!normalizedCode || normalizedCode.length > 8) { setError('Kode kanal (paymentMethod Duitku) wajib diisi, maksimal 8 karakter.'); return }
    if (!Number.isInteger(flatFee) || flatFee < 0) { setError('Biaya tetap harus angka rupiah ≥ 0.'); return }
    if (bp === null) { setError('Persen tidak valid. Contoh: 0,7 untuk 0,7%. Maksimal 2 desimal.'); return }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(validFrom)) { setError('Tanggal berlaku wajib diisi.'); return }
    const payload: GatewayFeeRate = { payment_code: normalizedCode, label: label.trim(), flat_fee: flatFee, percent_bp: bp, valid_from: validFrom }
    setSaving(true); setError('')
    try {
      await savePaymentFee(payload)
      onSaved(payload)
    } catch (err) {
      setError(apiErrorText(err, 'Gagal menyimpan tarif.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">Kode kanal *</span>
          <input value={code} disabled={saving || !!rate} maxLength={8} autoFocus={!rate} placeholder="mis. SP"
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError('') }} className={`${inputCls} font-mono disabled:bg-slate-50`} />
          <span className="block text-xs text-slate-500 mt-1">paymentMethod Duitku (SP, BC, OV, …).</span>
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">Nama kanal</span>
          <input value={label} disabled={saving} placeholder="mis. QRIS ShopeePay" onChange={(e) => { setLabel(e.target.value); setError('') }} className={inputCls} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">Biaya tetap</span>
          <div className="flex rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500">
            <span className="pl-3 py-2 text-sm text-slate-500">Rp</span>
            <input inputMode="numeric" value={flat} disabled={saving} autoFocus={!!rate}
              onChange={(e) => { setFlat(e.target.value.replace(/\D/g, '').slice(0, 9)); setError('') }}
              className="w-full min-w-0 rounded-lg px-2 py-2 text-sm outline-none" />
          </div>
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">Persen</span>
          <div className="flex rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500">
            <input inputMode="decimal" value={percent} disabled={saving}
              onChange={(e) => { setPercent(e.target.value.replace(/[^0-9.,]/g, '').slice(0, 6)); setError('') }}
              className="w-full min-w-0 rounded-lg px-3 py-2 text-sm outline-none" />
            <span className="pr-3 py-2 text-sm text-slate-500">%</span>
          </div>
          <span className="block text-xs text-slate-500 mt-1">{bp !== null ? `${bp} basis poin` : 'Contoh: 0,7'}</span>
        </label>
      </div>
      <label className="block">
        <span className="block text-sm font-medium text-slate-700 mb-1">Berlaku sejak *</span>
        <input type="date" value={validFrom} disabled={saving} onChange={(e) => { setValidFrom(e.target.value); setError('') }} className={inputCls} />
        <span className="block text-xs text-slate-500 mt-1">
          {replaces
            ? `Menimpa tarif ${normalizedCode} yang berlaku ${fmtDate(validFrom)} (${describe(replaces)}).`
            : 'Tarif sebelumnya tetap tersimpan sebagai riwayat. Tanggal mengikuti WIB.'}
        </span>
      </label>
      {preview !== null && (
        <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
          Contoh: tagihan {formatMoney(SAMPLE_AMOUNT)} → biaya <strong>{formatMoney(preview)}</strong>, bersih {formatMoney(SAMPLE_AMOUNT - preview)}.
        </p>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} disabled={saving} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50">Batal</button>
        <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-50">
          {saving ? 'Menyimpan…' : 'Simpan tarif'}
        </button>
      </div>
    </form>
  )
}
