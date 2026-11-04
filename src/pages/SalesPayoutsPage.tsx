import { Download, X } from 'lucide-react'
import ButtonIcon from '../components/ui/ButtonIcon'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import {
  cancelSalesPayout,
  createSalesPayoutBatch,
  downloadSalesPayoutExport,
  getSalesPayouts,
  markSalesPayoutPaid,
  type PayoutStatus,
  type SalesPayout,
  type SalesPayoutSkip,
} from '../api/salesReferral'
import { PAYOUT_STATUS, apiErrorText, labelOf, safeUrl } from '../lib/salesReferral'
import { formatMoney, wibDate } from '../lib/sales'

const FILTERS: { value: PayoutStatus | ''; label: string }[] = [
  { value: 'draft', label: 'Draf' },
  { value: 'paid', label: 'Dibayar' },
  { value: 'cancelled', label: 'Dibatalkan' },
  { value: '', label: 'Semua' },
]
const fmt = (iso: string | null, pattern = 'dd MMM yyyy HH:mm') => (iso ? format(new Date(iso), pattern, { locale: localeId }) : '—')
const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button type="button" title={`Salin ${label}`}
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }).catch(() => {})
      }}
      className="ml-1.5 px-1.5 py-0.5 text-[11px] text-slate-500 border border-slate-200 rounded hover:bg-slate-50">
      {copied ? 'Tersalin' : 'Salin'}
    </button>
  )
}

type Action = { kind: 'paid' | 'cancel'; payout: SalesPayout } | { kind: 'batch' }

/**
 * Pencairan komisi sales. Transfer bank dilakukan manual: buat draf, transfer
 * sesuai rekening yang tercantum, lalu tandai dibayar dengan nomor referensi.
 */
export default function SalesPayoutsPage() {
  const [status, setStatus] = useState<PayoutStatus | ''>('draft')
  const [rows, setRows] = useState<SalesPayout[] | null>(null)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  const [action, setAction] = useState<Action | null>(null)
  const [batchResult, setBatchResult] = useState<{ created: SalesPayout[]; skipped: SalesPayoutSkip[] } | null>(null)
  const [notice, setNotice] = useState('')
  const [period, setPeriod] = useState(() => wibDate().slice(0, 7))
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  useEffect(() => {
    let active = true
    getSalesPayouts(status)
      .then((res) => { if (active) { setRows(res.data ?? []); setError('') } })
      .catch((err) => { if (active) setError(apiErrorText(err, 'Gagal memuat pencairan.')) })
    return () => { active = false }
  }, [status, tick])

  const changeStatus = (value: PayoutStatus | '') => { setRows(null); setStatus(value) }
  const reload = () => { setTick((n) => n + 1) }

  const exportCsv = async () => {
    if (!/^\d{4}-\d{2}$/.test(period)) { setExportError('Pilih bulan terlebih dahulu.'); return }
    setExporting(true); setExportError('')
    try {
      const { blob, filename } = await downloadSalesPayoutExport(period)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setExportError(apiErrorText(err, 'Gagal mengekspor CSV.'))
    } finally {
      setExporting(false)
    }
  }

  const draftTotal = status === 'draft' && rows ? rows.reduce((t, p) => t + p.amount, 0) : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Pencairan Komisi Sales</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Draf dibuat untuk setiap sales aktif dengan saldo siap cair minimal Rp100.000 dan rekening lengkap. Transfer manual, lalu tandai dibayar.
          </p>
        </div>
        <button onClick={() => setAction({ kind: 'batch' })}
          className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg">
          Buat draf pencairan
        </button>
      </div>

      {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}

      {batchResult && (
        <section className="card p-4 sm:p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-700">Hasil pembuatan draf</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {batchResult.created.length} draf dibuat
                {batchResult.created.length > 0 && ` · total ${formatMoney(batchResult.created.reduce((t, p) => t + p.amount, 0))}`}
                {' · '}{batchResult.skipped.length} sales dilewati
              </p>
            </div>
            <button onClick={() => setBatchResult(null)} className="text-slate-400 hover:text-slate-600 " aria-label="Tutup hasil"><X size={18} aria-hidden /></button>
          </div>
          {batchResult.skipped.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Dilewati</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Saldo</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Alasan</th>
                  </tr>
                </thead>
                <tbody>
                  {batchResult.skipped.map((s) => (
                    <tr key={s.sales_id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2"><Link to={`/sales-agents/${s.sales_id}`} className="text-slate-800 hover:text-indigo-600">{s.sales_name}</Link></td>
                      <td className={`px-3 py-2 text-right tabular-nums ${s.amount < 0 ? 'text-red-600' : 'text-slate-700'}`}>{formatMoney(s.amount)}</td>
                      <td className="px-3 py-2 text-slate-600">{s.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-slate-400">Saldo yang dilewati tetap tersimpan dan ikut di pencairan berikutnya.</p>
        </section>
      )}

      <div className="card p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button key={f.value || 'all'} onClick={() => changeStatus(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border ${status === f.value ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="lg:ml-auto flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="text-sm text-slate-500" htmlFor="payout-period">Ekspor pajak (dibayar pada bulan)</label>
          <div className="flex gap-2">
            <input id="payout-period" type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button onClick={exportCsv} disabled={exporting}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap">
              {exporting ? 'Mengunduh…' : <><ButtonIcon icon={Download} />Ekspor CSV</>}
            </button>
          </div>
        </div>
      </div>
      {exportError && <p role="alert" className="text-sm text-red-600">{exportError}</p>}

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => { setError(''); reload() }} className="font-semibold underline">Coba lagi</button>
        </div>
      )}

      {status === 'draft' && rows && rows.length > 0 && (
        <p className="text-sm text-slate-600">
          <strong>{rows.length}</strong> draf menunggu transfer · total <strong>{formatMoney(draftTotal)}</strong>
        </p>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Sales', 'Nominal', 'Rekening tujuan', 'Status', 'Transfer', ''].map((h, i) => (
                  <th key={h || i} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide ${i === 1 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!rows && !error ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Memuat…</td></tr>
              ) : !rows?.length ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  {error ? '' : status === 'draft' ? 'Tidak ada draf. Tekan “Buat draf pencairan” pada jadwal pencairan.' : 'Tidak ada pencairan.'}
                </td></tr>
              ) : rows.map((p) => {
                const s = labelOf(PAYOUT_STATUS, p.status)
                const proof = safeUrl(p.proof_url)
                return (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 align-top">
                    <td className="px-4 py-3">
                      <Link to={`/sales-agents/${p.sales_id}`} className="font-medium text-slate-800 hover:text-indigo-600">{p.sales_name}</Link>
                      <p className="text-xs text-slate-500"><span className="font-mono">{p.sales_code}</span> · dibuat {fmt(p.created_at, 'dd MMM yyyy')}</p>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className="font-semibold tabular-nums text-slate-800">{formatMoney(p.amount)}</span>
                      {p.status === 'draft' && <CopyButton value={String(p.amount)} label="nominal" />}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800">{p.bank_name || '—'}</p>
                      <p className="font-mono text-slate-700 whitespace-nowrap">
                        {p.bank_account_no || '—'}
                        {p.status === 'draft' && p.bank_account_no && <CopyButton value={p.bank_account_no} label="nomor rekening" />}
                      </p>
                      <p className="text-xs text-slate-500">a.n. {p.bank_account_name || '—'}</p>
                    </td>
                    <td className="px-4 py-3"><Badge variant={s.variant}>{s.label}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.status === 'paid' ? (
                        <>
                          <p className="whitespace-nowrap">{fmt(p.paid_at)}</p>
                          <p className="text-xs font-mono break-all">{p.transfer_ref}</p>
                          {proof ? <a href={proof} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline">Lihat bukti</a>
                            : p.proof_url ? <p className="text-xs text-slate-400 break-all">{p.proof_url}</p> : null}
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.status === 'draft' && (
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => { setNotice(''); setAction({ kind: 'paid', payout: p }) }}
                            className="px-2.5 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg whitespace-nowrap">Tandai dibayar</button>
                          <button onClick={() => { setNotice(''); setAction({ kind: 'cancel', payout: p }) }}
                            className="px-2.5 py-1 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 whitespace-nowrap">Batalkan</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        title={action?.kind === 'batch' ? 'Buat draf pencairan' : action?.kind === 'paid' ? 'Tandai pencairan dibayar' : 'Batalkan draf pencairan'}
        open={!!action}
        onClose={() => setAction(null)}
      >
        {action?.kind === 'batch' && (
          <BatchForm onCancel={() => setAction(null)} onDone={(result) => {
            setAction(null); setBatchResult(result); setNotice('')
            if (status === 'draft') reload(); else changeStatus('draft')
          }} />
        )}
        {action?.kind === 'paid' && (
          <PaidForm payout={action.payout} onCancel={() => setAction(null)}
            onDone={() => { setAction(null); setNotice(`Pencairan ${action.payout.sales_name} ditandai dibayar.`); reload() }} />
        )}
        {action?.kind === 'cancel' && (
          <CancelForm payout={action.payout} onCancel={() => setAction(null)}
            onDone={() => { setAction(null); setNotice(`Draf ${action.payout.sales_name} dibatalkan; komisinya kembali ke saldo siap cair.`); reload() }} />
        )}
      </Modal>
    </div>
  )
}

function Buttons({ saving, label, tone, onCancel }: { saving: boolean; label: string; tone: 'primary' | 'danger' | 'success'; onCancel: () => void }) {
  const cls = { primary: 'bg-indigo-600 hover:bg-indigo-700', danger: 'bg-red-600 hover:bg-red-700', success: 'bg-emerald-600 hover:bg-emerald-700' }[tone]
  return (
    <div className="flex gap-3">
      <button type="button" onClick={onCancel} disabled={saving} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50">Batal</button>
      <button type="submit" disabled={saving} className={`flex-1 px-4 py-2 text-white rounded-lg text-sm disabled:opacity-50 ${cls}`}>{saving ? 'Memproses…' : label}</button>
    </div>
  )
}

function PayoutSummary({ payout }: { payout: SalesPayout }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm bg-slate-50 rounded-lg p-3">
      <span className="text-slate-500">Sales</span><span className="text-right text-slate-800">{payout.sales_name} ({payout.sales_code})</span>
      <span className="text-slate-500">Nominal</span><span className="text-right font-semibold tabular-nums">{formatMoney(payout.amount)}</span>
      <span className="text-slate-500">Rekening</span>
      <span className="text-right text-slate-800 break-all">{payout.bank_name} · <span className="font-mono">{payout.bank_account_no}</span></span>
      <span className="text-slate-500">Atas nama</span><span className="text-right text-slate-800">{payout.bank_account_name}</span>
    </div>
  )
}

function BatchForm({ onCancel, onDone }: { onCancel: () => void; onDone: (r: { created: SalesPayout[]; skipped: SalesPayoutSkip[] }) => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const res = await createSalesPayoutBatch()
      onDone({ created: res.data?.created ?? [], skipped: res.data?.skipped ?? [] })
    } catch (err) {
      setError(apiErrorText(err, 'Gagal membuat draf pencairan.'))
    } finally {
      setSaving(false)
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
        <li>Hanya sales berstatus <strong>aktif</strong>; sales yang ditangguhkan tercantum sebagai dilewati.</li>
        <li>Menjumlahkan komisi yang sudah lewat masa tahan 30 hari dan belum dicairkan, termasuk pembatalan (nilai negatif).</li>
        <li>Saldo di bawah Rp100.000 atau rekening yang belum lengkap dilewati — alasannya ditampilkan setelah ini.</li>
        <li>Rekening disalin ke draf saat ini juga. Bila rekening sales berubah, batalkan draf lalu buat ulang.</li>
      </ul>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Buttons saving={saving} label="Buat draf" tone="primary" onCancel={onCancel} />
    </form>
  )
}

function PaidForm({ payout, onCancel, onDone }: { payout: SalesPayout; onCancel: () => void; onDone: () => void }) {
  const [ref, setRef] = useState('')
  const [proof, setProof] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ref.trim()) { setError('Nomor referensi transfer wajib diisi.'); return }
    if (proof.trim() && !safeUrl(proof)) { setError('Link bukti harus diawali http:// atau https://'); return }
    setSaving(true); setError('')
    try {
      await markSalesPayoutPaid(payout.id, ref.trim(), proof.trim())
      onDone()
    } catch (err) {
      setError(apiErrorText(err, 'Gagal menandai dibayar.'))
    } finally {
      setSaving(false)
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <PayoutSummary payout={payout} />
      <p className="text-sm text-slate-600">Tandai setelah transfer berhasil. Sales melihat nomor referensi dan bukti ini di portalnya.</p>
      <label className="block">
        <span className="block text-sm font-medium text-slate-700 mb-1">No. referensi transfer *</span>
        <input value={ref} maxLength={200} autoFocus disabled={saving} onChange={(e) => { setRef(e.target.value); setError('') }} className={`${inputCls} font-mono`} />
      </label>
      <label className="block">
        <span className="block text-sm font-medium text-slate-700 mb-1">Link bukti transfer (opsional)</span>
        <input type="url" value={proof} maxLength={1000} disabled={saving} placeholder="https://…" onChange={(e) => { setProof(e.target.value); setError('') }} className={inputCls} />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Buttons saving={saving} label="Tandai dibayar" tone="success" onCancel={onCancel} />
    </form>
  )
}

function CancelForm({ payout, onCancel, onDone }: { payout: SalesPayout; onCancel: () => void; onDone: () => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await cancelSalesPayout(payout.id)
      onDone()
    } catch (err) {
      setError(apiErrorText(err, 'Gagal membatalkan draf.'))
    } finally {
      setSaving(false)
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <PayoutSummary payout={payout} />
      <p className="text-sm text-slate-600">Komisi di draf ini kembali ke saldo siap cair dan ikut di draf berikutnya. Jangan batalkan bila uangnya sudah ditransfer — tandai dibayar.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Buttons saving={saving} label="Batalkan draf" tone="danger" onCancel={onCancel} />
    </form>
  )
}
