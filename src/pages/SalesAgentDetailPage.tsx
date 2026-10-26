import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import SalesAgentForm from '../components/sales/SalesAgentForm'
import {
  correctSalesCommissionFee,
  getSalesAgent,
  getSalesCommissions,
  getSalesCustomers,
  resetSalesPassword,
  revokeSalesCommission,
  type SalesAgent,
  type SalesCommission,
  type SalesCustomer,
} from '../api/salesReferral'
import {
  COMMISSION_KIND,
  COMMISSION_STATUS,
  CUSTOMER_STATUS,
  SALES_STATUS,
  apiErrorText,
  commissionAmount,
  generatePassword,
  kycComplete,
  labelOf,
} from '../lib/salesReferral'
import { formatMoney } from '../lib/sales'
import { membershipLabel } from '../lib/membership'

const PAGE = 50
const fmtDate = (iso: string | null | undefined, pattern = 'dd MMM yyyy') =>
  iso ? format(new Date(iso), pattern, { locale: localeId }) : '—'
const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function Metric({ label, value, hint, tone = 'text-slate-800' }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${tone}`}>{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
    </div>
  )
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-slate-400 text-xs">{label}</p>
      <p className={`text-slate-700 mt-0.5 break-all ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  )
}

export default function SalesAgentDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [agent, setAgent] = useState<SalesAgent | null>(null)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  const [tab, setTab] = useState<'customers' | 'commissions'>('commissions')
  const [editOpen, setEditOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)

  useEffect(() => {
    let active = true
    getSalesAgent(id)
      .then((res) => { if (active) { setAgent(res.data); setError('') } })
      .catch((err) => { if (active) setError(apiErrorText(err, 'Gagal memuat data sales.')) })
    return () => { active = false }
  }, [id, tick])

  // Saldo di kartu ikut berubah setelah komisi dibatalkan/dikoreksi.
  const refreshAgent = useCallback(() => setTick((n) => n + 1), [])

  if (!agent) {
    return error ? (
      <div className="space-y-4">
        <button onClick={() => navigate('/sales-agents')} className="text-sm text-slate-500 hover:text-slate-700">← Daftar sales</button>
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => { setError(''); refreshAgent() }} className="font-semibold underline">Coba lagi</button>
        </div>
      </div>
    ) : (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  const st = SALES_STATUS[agent.status] ?? { label: agent.status, variant: 'neutral' as const, hint: '' }
  const kyc = kycComplete(agent)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <button onClick={() => navigate('/sales-agents')} className="text-slate-400 hover:text-slate-600" aria-label="Kembali">←</button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800 break-words">{agent.name}</h2>
              <Badge variant={st.variant}>{st.label}</Badge>
            </div>
            <p className="text-sm text-slate-500">Kode <span className="font-mono font-semibold text-slate-700">{agent.code}</span></p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          <button onClick={() => setEditOpen(true)}
            className="justify-center flex items-center gap-1.5 px-3 py-2 text-sm text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">
            ✏️ Ubah data & status
          </button>
          <button onClick={() => setPasswordOpen(true)}
            className="justify-center flex items-center gap-1.5 px-3 py-2 text-sm text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg">
            🔑 Atur ulang kata sandi
          </button>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Pelanggan" value={`${agent.active_customers} / ${agent.customers}`} hint="aktif / total terhubung" />
        <Metric label="Siap cair" value={formatMoney(agent.available)} hint="belum masuk pencairan" tone={agent.available < 0 ? 'text-red-600' : 'text-slate-800'} />
        <Metric label="Total dibayar" value={formatMoney(agent.total_paid)} />
        <Metric label="S&K program" value={agent.terms_accepted_at ? `Versi ${agent.terms_version}` : 'Belum disetujui'}
          hint={agent.terms_accepted_at ? `disetujui ${fmtDate(agent.terms_accepted_at)}` : 'disetujui sales dari portal'} />
      </div>

      <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-semibold text-slate-700">Data & KYC</h3>
            <p className="text-xs text-slate-400 mt-0.5">{st.hint}</p>
          </div>
          <Badge variant={kyc ? 'success' : 'warning'}>{kyc ? 'KYC lengkap' : 'KYC belum lengkap'}</Badge>
        </div>
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <Info label="Email" value={agent.email} />
          <Info label="No. HP" value={agent.phone} />
          <Info label="NIK" value={agent.nik} mono />
          <Info label="NPWP" value={agent.npwp} mono />
          <Info label="Bank" value={agent.bank_name} />
          <Info label="No. rekening" value={agent.bank_account_no} mono />
          <Info label="Nama rekening" value={agent.bank_account_name} />
          <Info label="Terdaftar" value={fmtDate(agent.created_at, 'dd MMMM yyyy')} />
        </div>
      </section>

      <div className="flex gap-1.5">
        {([['commissions', 'Komisi'], ['customers', `Pelanggan (${agent.customers})`]] as const).map(([value, label]) => (
          <button key={value} onClick={() => setTab(value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border ${tab === value ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'customers' ? <CustomersTab salesId={agent.id} /> : <CommissionsTab salesId={agent.id} onChanged={refreshAgent} />}

      <Modal title="Ubah data sales" open={editOpen} onClose={() => setEditOpen(false)}>
        {editOpen && (
          <SalesAgentForm agent={agent} onCancel={() => setEditOpen(false)}
            onSaved={(updated) => { setAgent(updated); setEditOpen(false) }} />
        )}
      </Modal>

      <Modal title="Atur ulang kata sandi" open={passwordOpen} onClose={() => setPasswordOpen(false)}>
        {passwordOpen && <PasswordForm agent={agent} onClose={() => setPasswordOpen(false)} />}
      </Modal>
    </div>
  )
}

function PasswordForm({ agent, onClose }: { agent: SalesAgent; onClose: () => void }) {
  const [password, setPassword] = useState(() => generatePassword())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError('Kata sandi minimal 8 karakter.'); return }
    setSaving(true)
    setError('')
    try {
      await resetSalesPassword(agent.id, password)
      setDone(true)
    } catch (err) {
      setError(apiErrorText(err, 'Gagal mengatur ulang kata sandi.'))
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
          <p className="text-sm font-semibold text-emerald-800">Kata sandi baru untuk {agent.name}</p>
          <p className="font-mono text-lg text-slate-800 break-all select-all">{password}</p>
          <p className="text-xs text-emerald-700">Sampaikan lewat jalur pribadi. Sesi lama di perangkat sales otomatis tidak berlaku.</p>
        </div>
        <button onClick={onClose} className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm">Selesai</button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-slate-500">Dipakai saat sales lupa kata sandi. Sales langsung keluar dari semua perangkat dan harus masuk dengan kata sandi baru.</p>
      <label className="block">
        <span className="block text-sm font-medium text-slate-700 mb-1">Kata sandi baru</span>
        <div className="flex gap-2">
          <input type="text" autoComplete="new-password" value={password} disabled={saving}
            onChange={(e) => { setPassword(e.target.value); setError('') }} className={`${inputCls} font-mono`} />
          <button type="button" disabled={saving} onClick={() => setPassword(generatePassword())}
            className="shrink-0 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">Buat acak</button>
        </div>
        <span className="block text-xs text-slate-500 mt-1">Minimal 8 karakter.</span>
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={onClose} disabled={saving} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50">Batal</button>
        <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-50">
          {saving ? 'Menyimpan…' : 'Atur ulang'}
        </button>
      </div>
    </form>
  )
}

function CustomersTab({ salesId }: { salesId: string }) {
  const [rows, setRows] = useState<SalesCustomer[] | null>(null)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let active = true
    getSalesCustomers(salesId)
      .then((res) => { if (active) { setRows(res.data ?? []); setError('') } })
      .catch((err) => { if (active) setError(apiErrorText(err, 'Gagal memuat pelanggan.')) })
    return () => { active = false }
  }, [salesId, tick])

  const phase = (c: SalesCustomer) => {
    if (!c.commission_start_at || !c.rate_change_at) return 'Mulai saat pembayaran pertama'
    return new Date(c.rate_change_at) > new Date()
      ? `${c.current_rate_percent}% sampai ${fmtDate(c.rate_change_at)}, lalu 20%`
      : `${c.current_rate_percent}% (sejak ${fmtDate(c.rate_change_at)})`
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => { setError(''); setTick((n) => n + 1) }} className="font-semibold underline">Coba lagi</button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Usaha', 'Paket', 'Status', 'Terhubung', 'Fase komisi', 'Total komisi'].map((h, i) => (
                <th key={h} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide ${i === 5 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!rows && !error ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Memuat…</td></tr>
            ) : !rows?.length ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">{error ? '' : 'Belum ada pelanggan yang memakai kode ini.'}</td></tr>
            ) : rows.map((c) => {
              const s = labelOf(CUSTOMER_STATUS, c.status)
              return (
                <tr key={c.business_id} className="border-b border-slate-100 last:border-0 align-top">
                  <td className="px-4 py-3">
                    <Link to={`/businesses/${c.business_id}`} className="font-medium text-slate-800 hover:text-indigo-600">{c.name || '—'}</Link>
                    <p className="text-xs text-slate-500">{[c.city, c.owner_phone_masked].filter(Boolean).join(' · ') || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{c.plan ? membershipLabel(c.plan) : '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={s.variant}>{s.label}</Badge>
                    {c.end_date && <p className="text-xs text-slate-500 mt-1">s.d. {fmtDate(c.end_date)}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(c.joined_at)}</td>
                  <td className="px-4 py-3 text-slate-600">{phase(c)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatMoney(c.total_commission)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type CommissionAction = { kind: 'revoke' | 'fee'; row: SalesCommission }

function CommissionsTab({ salesId, onChanged }: { salesId: string; onChanged: () => void }) {
  const [rows, setRows] = useState<SalesCommission[] | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  const [action, setAction] = useState<CommissionAction | null>(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    getSalesCommissions(salesId, { limit: PAGE })
      .then((res) => {
        if (!active) return
        const data = res.data ?? []
        setRows(data); setHasMore(data.length === PAGE); setError('')
      })
      .catch((err) => { if (active) setError(apiErrorText(err, 'Gagal memuat komisi.')) })
    return () => { active = false }
  }, [salesId, tick])

  const loadMore = async () => {
    if (!rows?.length) return
    setLoadingMore(true)
    try {
      const res = await getSalesCommissions(salesId, { before: rows[rows.length - 1].created_at, limit: PAGE })
      const data = res.data ?? []
      setRows([...rows, ...data]); setHasMore(data.length === PAGE)
    } catch (err) {
      setError(apiErrorText(err, 'Gagal memuat komisi berikutnya.'))
    } finally {
      setLoadingMore(false)
    }
  }

  const done = (message: string) => {
    setAction(null)
    setNotice(message)
    setTick((n) => n + 1)
    onChanged()
  }

  const estimated = rows?.filter((r) => r.kind === 'commission' && r.fee_estimated && r.status !== 'cancelled').length ?? 0

  return (
    <div className="space-y-3">
      {estimated > 0 && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          {estimated} komisi memakai <strong>biaya estimasi</strong> (lunas lewat cek status Duitku, kanal tidak diketahui — dihitung dengan tarif tertinggi). Cocokkan dengan transaksi di dashboard Duitku lalu pakai “Koreksi biaya”.
        </p>
      )}
      {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {error && (
          <div role="alert" className="flex items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button type="button" onClick={() => { setError(''); setTick((n) => n + 1) }} className="font-semibold underline">Muat ulang</button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Tanggal', 'Pelanggan', 'Jenis', 'Dibayar', 'Biaya', 'Bersih', 'Tarif', 'Komisi', 'Status', ''].map((h, i) => (
                  <th key={h || i} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide ${i >= 3 && i <= 7 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!rows && !error ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-400">Memuat…</td></tr>
              ) : !rows?.length ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-400">{error ? '' : 'Belum ada komisi.'}</td></tr>
              ) : rows.map((r) => {
                const s = labelOf(COMMISSION_STATUS, r.status)
                const actionable = r.kind === 'commission' && r.status !== 'cancelled'
                const flagged = actionable && r.fee_estimated
                return (
                  <tr key={r.id} className={`border-b border-slate-100 last:border-0 align-top ${flagged ? 'bg-amber-50/60' : ''}`}>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDate(r.created_at, 'dd MMM yyyy HH:mm')}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800">{r.business_name || '—'}</p>
                      <p className="text-xs text-slate-500">{r.plan ? membershipLabel(r.plan) : '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className={r.kind === 'commission' ? 'text-slate-700' : 'text-slate-500'}>{COMMISSION_KIND[r.kind] ?? r.kind}</p>
                      {r.reason && <p className="text-xs text-slate-500 max-w-56 break-words">{r.reason}</p>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatMoney(r.paid_amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <p className="tabular-nums text-slate-700">{formatMoney(r.gateway_fee)}</p>
                      <p className="text-xs text-slate-400">{r.payment_code || 'kanal ?'}</p>
                      {flagged && <Badge variant="warning">Estimasi</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatMoney(r.net_amount)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{r.rate_percent}%</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${r.amount < 0 ? 'text-red-600' : 'text-slate-800'}`}>{formatMoney(r.amount)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.variant}>{s.label}</Badge>
                      {r.status === 'held' && <p className="text-xs text-slate-500 mt-1 whitespace-nowrap">cair {fmtDate(r.available_at)}</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {actionable && (
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => { setNotice(''); setAction({ kind: 'fee', row: r }) }}
                            className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap">Koreksi biaya</button>
                          <button onClick={() => { setNotice(''); setAction({ kind: 'revoke', row: r }) }}
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
        {hasMore && (
          <div className="px-4 py-3 border-t border-slate-100 text-center">
            <button onClick={loadMore} disabled={loadingMore} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">
              {loadingMore ? 'Memuat…' : 'Muat lebih banyak'}
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-400">
        Komisi ditahan 30 hari sejak pembayaran. Pembatalan dan koreksi dicatat sebagai baris baru; baris lama tidak diubah.
      </p>

      <Modal title={action?.kind === 'revoke' ? 'Batalkan komisi' : 'Koreksi biaya pembayaran'} open={!!action} onClose={() => setAction(null)}>
        {action?.kind === 'revoke' && <RevokeForm row={action.row} onCancel={() => setAction(null)} onDone={() => done('Komisi dibatalkan.')} />}
        {action?.kind === 'fee' && <FeeForm row={action.row} onCancel={() => setAction(null)} onDone={() => done('Biaya pembayaran dikoreksi.')} />}
      </Modal>
    </div>
  )
}

function OrderSummary({ row }: { row: SalesCommission }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm bg-slate-50 rounded-lg p-3">
      <span className="text-slate-500">Pelanggan</span><span className="text-right text-slate-800">{row.business_name}</span>
      <span className="text-slate-500">Dibayar</span><span className="text-right tabular-nums">{formatMoney(row.paid_amount)}</span>
      <span className="text-slate-500">Biaya ({row.payment_code || 'kanal ?'})</span>
      <span className="text-right tabular-nums">{formatMoney(row.gateway_fee)}{row.fee_estimated ? ' · estimasi' : ''}</span>
      <span className="text-slate-500">Komisi {row.rate_percent}%</span><span className="text-right tabular-nums font-semibold">{formatMoney(row.amount)}</span>
      <span className="text-slate-500">Order</span><code className="text-right text-xs text-slate-500 break-all">{row.order_id}</code>
    </div>
  )
}

function FormButtons({ saving, label, danger, onCancel }: { saving: boolean; label: string; danger?: boolean; onCancel: () => void }) {
  return (
    <div className="flex gap-3">
      <button type="button" onClick={onCancel} disabled={saving} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50">Batal</button>
      <button type="submit" disabled={saving}
        className={`flex-1 px-4 py-2 text-white rounded-lg text-sm disabled:opacity-50 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
        {saving ? 'Menyimpan…' : label}
      </button>
    </div>
  )
}

function RevokeForm({ row, onCancel, onDone }: { row: SalesCommission; onCancel: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) { setError('Alasan pembatalan wajib diisi.'); return }
    setSaving(true); setError('')
    try {
      await revokeSalesCommission(row.order_id, reason.trim())
      onDone()
    } catch (err) {
      setError(apiErrorText(err, 'Gagal membatalkan komisi.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <OrderSummary row={row} />
      <p className="text-sm text-slate-600">
        Dipakai untuk refund atau penyalahgunaan. Seluruh komisi pembayaran ini (termasuk koreksi) dibalik dengan baris negatif.
        {row.status === 'paid' && ' Komisi ini sudah dicairkan, jadi nilainya memotong pencairan berikutnya.'}
        {row.status === 'processing' && ' Komisi ini ada di draf pencairan yang belum dibayar: batalkan draf itu lalu buat ulang supaya tidak ikut ditransfer. Bila tidak, nilainya memotong pencairan berikutnya.'}
        {' '}Tidak bisa diurungkan.
      </p>
      <label className="block">
        <span className="block text-sm font-medium text-slate-700 mb-1">Alasan *</span>
        <textarea rows={3} maxLength={500} value={reason} disabled={saving} autoFocus
          onChange={(e) => { setReason(e.target.value); setError('') }}
          placeholder="mis. Refund pelanggan via Duitku tgl 20 Okt, ref …" className={`${inputCls} resize-y`} />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <FormButtons saving={saving} label="Batalkan komisi" danger onCancel={onCancel} />
    </form>
  )
}

function FeeForm({ row, onCancel, onDone }: { row: SalesCommission; onCancel: () => void; onDone: () => void }) {
  const [fee, setFee] = useState(String(row.gateway_fee))
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const value = fee === '' ? NaN : Number(fee)
  const valid = Number.isInteger(value) && value >= 0 && value <= row.paid_amount

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) { setError(`Isi biaya antara Rp0 dan ${formatMoney(row.paid_amount)}.`); return }
    if (!reason.trim()) { setError('Alasan koreksi wajib diisi.'); return }
    setSaving(true); setError('')
    try {
      await correctSalesCommissionFee(row.order_id, value, reason.trim())
      onDone()
    } catch (err) {
      setError(apiErrorText(err, 'Gagal mengoreksi biaya.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <OrderSummary row={row} />
      <p className="text-sm text-slate-600">
        Isi biaya Duitku yang sebenarnya untuk transaksi ini (lihat dashboard Duitku). Selisih komisi dicatat sebagai baris koreksi.
      </p>
      <label className="block">
        <span className="block text-sm font-medium text-slate-700 mb-1">Biaya gateway sebenarnya *</span>
        <div className="flex rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500">
          <span className="pl-3 py-2 text-sm text-slate-500">Rp</span>
          <input inputMode="numeric" value={fee} disabled={saving} autoFocus
            onChange={(e) => { setFee(e.target.value.replace(/\D/g, '').slice(0, 10)); setError('') }}
            className="w-full min-w-0 rounded-lg px-2 py-2 text-sm outline-none" />
        </div>
        {valid && (
          <span className="block text-xs text-slate-500 mt-1">
            Bersih {formatMoney(row.paid_amount - value)} → komisi {formatMoney(commissionAmount(row.paid_amount, value, row.rate_percent))}
          </span>
        )}
      </label>
      <label className="block">
        <span className="block text-sm font-medium text-slate-700 mb-1">Alasan *</span>
        <textarea rows={2} maxLength={500} value={reason} disabled={saving}
          onChange={(e) => { setReason(e.target.value); setError('') }}
          placeholder="mis. Kanal QRIS sesuai dashboard Duitku" className={`${inputCls} resize-y`} />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <FormButtons saving={saving} label="Simpan koreksi" onCancel={onCancel} />
    </form>
  )
}
