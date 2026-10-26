import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import SalesAgentForm from '../components/sales/SalesAgentForm'
import { getSalesAgents, type SalesAgent, type SalesAgentStatus } from '../api/salesReferral'
import { SALES_STATUS, apiErrorText, kycComplete } from '../lib/salesReferral'
import { formatMoney } from '../lib/sales'

const STATUS_FILTERS: { value: '' | SalesAgentStatus; label: string }[] = [
  { value: '', label: 'Semua' },
  ...(Object.keys(SALES_STATUS) as SalesAgentStatus[]).map((s) => ({ value: s, label: SALES_STATUS[s].label })),
]

/**
 * Program referral sales — daftar sales lapangan, kodenya, dan saldo
 * komisinya. Aturan bisnis: docs/sales-referral.md di loka-kasir-service.
 */
export default function SalesAgentsPage() {
  const navigate = useNavigate()
  const [agents, setAgents] = useState<SalesAgent[] | null>(null)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [status, setStatus] = useState<'' | SalesAgentStatus>('')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    let active = true
    getSalesAgents()
      .then((res) => { if (active) { setAgents(res.data ?? []); setError('') } })
      .catch((err) => { if (active) setError(apiErrorText(err, 'Gagal memuat daftar sales.')) })
    return () => { active = false }
  }, [reload])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (agents ?? []).filter((a) =>
      (!status || a.status === status) &&
      (!q || [a.name, a.code, a.email, a.phone].some((v) => v.toLowerCase().includes(q))))
  }, [agents, status, search])

  const totals = useMemo(() => (agents ?? []).reduce((t, a) => ({
    active: t.active + (a.status === 'active' ? 1 : 0),
    customers: t.customers + a.active_customers,
    available: t.available + a.available,
    paid: t.paid + a.total_paid,
  }), { active: 0, customers: 0, available: 0, paid: 0 }), [agents])

  const card = (label: string, value: string, hint?: string) => (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-800">{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Program Referral Sales</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Pelanggan baru dengan kode sales dapat diskon 20% tagihan pertama. Sales mendapat 50% nilai bersih selama 12 bulan, lalu 20%.
          </p>
        </div>
        <button onClick={() => setCreateOpen(true)}
          className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg">
          + Tambah sales
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => { setError(''); setReload((n) => n + 1) }} className="font-semibold underline">Coba lagi</button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {card('Sales aktif', agents ? `${totals.active}` : '—', agents ? `dari ${agents.length} terdaftar` : undefined)}
        {card('Pelanggan aktif', agents ? totals.customers.toLocaleString('id-ID') : '—', 'berlangganan Pro saat ini')}
        {card('Saldo siap cair', agents ? formatMoney(totals.available) : '—', 'lewat masa tahan 30 hari')}
        {card('Total dibayar', agents ? formatMoney(totals.paid) : '—')}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row sm:flex-wrap gap-3">
        <input type="search" placeholder="Cari nama, kode, email, HP…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-0 sm:min-w-60 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <select value={status} onChange={(e) => setStatus(e.target.value as '' | SalesAgentStatus)}
          className="w-full sm:w-auto px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {STATUS_FILTERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Sales', 'Kode', 'Status', 'Pelanggan', 'Siap cair', 'Total dibayar', 'Bergabung'].map((h, i) => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide ${i >= 3 && i <= 5 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!agents && !error ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Memuat…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  {agents?.length ? 'Tidak ada sales sesuai filter' : 'Belum ada sales. Tambahkan sales pertama.'}
                </td></tr>
              ) : rows.map((a) => {
                const st = SALES_STATUS[a.status] ?? { label: a.status, variant: 'neutral' as const }
                return (
                  <tr key={a.id} onClick={() => navigate(`/sales-agents/${a.id}`)}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 cursor-pointer">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{a.name}</p>
                      <p className="text-xs text-slate-500">{a.email} · {a.phone}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">{a.code}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={st.variant}>{st.label}</Badge>
                        {!kycComplete(a) && <Badge variant="neutral">KYC belum lengkap</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {a.active_customers.toLocaleString('id-ID')} <span className="text-slate-400">/ {a.customers.toLocaleString('id-ID')}</span>
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${a.available < 0 ? 'text-red-600' : 'text-slate-700'}`}>{formatMoney(a.available)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatMoney(a.total_paid)}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{format(new Date(a.created_at), 'dd MMM yyyy', { locale: localeId })}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">Pelanggan: aktif berlangganan / total terhubung.</p>
      </div>

      <Modal title="Tambah sales" open={createOpen} onClose={() => setCreateOpen(false)}>
        {createOpen && (
          <SalesAgentForm
            onCancel={() => setCreateOpen(false)}
            onSaved={(agent) => { setCreateOpen(false); navigate(`/sales-agents/${agent.id}`) }}
          />
        )}
      </Modal>
    </div>
  )
}
