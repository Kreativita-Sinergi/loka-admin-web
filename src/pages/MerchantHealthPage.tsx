import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from '../components/ui/Badge'
import { getMerchantHealth, type MerchantHealthResponse, type MerchantHealthRow } from '../api/merchantHealth'
import {
  MODULE_LABEL,
  RISK_LABEL,
  RISK_VARIANT,
  STAGE_LABEL,
  csMessage,
  daysAgo,
  reasonLabel,
  waUrl,
} from '../lib/merchantHealth'

const RISK_OPTIONS = [
  { value: '', label: 'Semua risiko' },
  { value: 'high', label: RISK_LABEL.high },
  { value: 'medium', label: RISK_LABEL.medium },
  { value: 'low', label: RISK_LABEL.low },
]

const STAGE_OPTIONS = [
  { value: '', label: 'Semua tahap' },
  { value: 'trial', label: STAGE_LABEL.trial },
  { value: 'paid', label: STAGE_LABEL.paid },
  { value: 'free', label: STAGE_LABEL.free },
  { value: 'expired', label: STAGE_LABEL.expired },
]

const rupiah = (v: number) => `Rp${Math.round(v).toLocaleString('id-ID')}`

function ScoreBar({ score }: { score: number }) {
  const color = score < 35 ? 'bg-red-500' : score < 60 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 text-right font-semibold tabular-nums text-slate-800">{score}</span>
      <div className="h-1.5 w-20 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

function Row({ row }: { row: MerchantHealthRow }) {
  const navigate = useNavigate()
  const wa = waUrl(row.owner_phone, csMessage(row))
  const seen = daysAgo(row.last_seen_at)
  const trend = row.tx_prev_7d > 0 ? Math.round((row.tx_7d / row.tx_prev_7d - 1) * 100) : null
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 align-top">
      <td className="px-4 py-3">
        <button type="button" onClick={() => navigate(`/businesses/${row.business_id}`)} className="text-left">
          <p className="font-medium text-slate-800 hover:text-indigo-600">{row.business_name}</p>
          <p className="text-xs text-slate-500">{row.owner_name || '—'}{row.owner_phone ? ` · ${row.owner_phone}` : ''}</p>
        </button>
      </td>
      <td className="px-4 py-3"><ScoreBar score={row.score} /></td>
      <td className="px-4 py-3 space-y-1">
        <Badge variant={RISK_VARIANT[row.risk]}>{RISK_LABEL[row.risk]}</Badge>
        <p className="text-xs text-slate-500">
          {STAGE_LABEL[row.stage]}
          {row.plan_ends_at && (row.stage === 'trial' || row.stage === 'paid')
            ? ` · s.d. ${new Date(row.plan_ends_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`
            : ''}
        </p>
      </td>
      <td className="px-4 py-3 text-xs text-slate-600 space-y-0.5">
        <p>{row.tx_7d.toLocaleString('id-ID')} nota/7 hr{trend !== null ? ` (${trend > 0 ? '+' : ''}${trend}%)` : ''}</p>
        <p>{row.active_days_14}/14 hari aktif · {rupiah(row.revenue_30d)}/30 hr</p>
        <p>{row.products} produk · {row.employees} karyawan{seen !== null ? ` · dibuka ${seen} hr lalu` : ''}</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {row.reasons.map((r) => (
            <Badge key={r} variant={r === 'ready_to_convert' ? 'success' : 'neutral'}>{reasonLabel(r)}</Badge>
          ))}
        </div>
        {row.modules.length > 0 && (
          <p className="mt-1 text-xs text-slate-500">Memakai: {row.modules.map((m) => MODULE_LABEL[m] ?? m).join(', ')}</p>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {wa ? (
          <a href={wa} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
            Sapa via WA
          </a>
        ) : (
          <span className="text-xs text-slate-400">Tanpa nomor</span>
        )}
      </td>
    </tr>
  )
}

/**
 * Kesehatan merchant — toko mana yang mulai berhenti memakai aplikasi, dan
 * mana yang siap ditawari Pro. Paling berisiko di atas; trial didahulukan di
 * antara skor yang sama karena waktunya paling sempit.
 */
export default function MerchantHealthPage() {
  const [data, setData] = useState<MerchantHealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [risk, setRisk] = useState('')
  const [stage, setStage] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    getMerchantHealth({ risk: risk || undefined, stage: stage || undefined, search: search || undefined })
      .then((res) => {
        if (!active) return
        if (!res.status) throw new Error(res.message)
        setError(null)
        setData(res.data)
      })
      .catch(() => { if (active) setError('Gagal memuat kesehatan merchant. Silakan coba lagi.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [risk, stage, search, reload])

  const s = data?.summary
  const card = (label: string, value: number | string, tone: string, hint?: string) => (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
    </div>
  )

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Kesehatan Merchant</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Skor 0–100 dari kebiasaan jualan 14 hari, tren minggu ini, aktivasi, dan kedalaman fitur. Sapa yang merah sebelum masa trial/langganannya habis.
        </p>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => { setLoading(true); setReload((n) => n + 1) }} className="font-semibold underline">Coba lagi</button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {card('Toko aktif', s?.total ?? '—', 'text-slate-800')}
        {card(RISK_LABEL.high, s?.by_risk.high ?? 0, 'text-red-600')}
        {card(RISK_LABEL.medium, s?.by_risk.medium ?? 0, 'text-amber-600')}
        {card('Trial berisiko', s?.trials_at_risk ?? 0, 'text-red-600', 'paling mendesak disapa')}
        {card('Siap ditawari Pro', s?.ready_convert ?? 0, 'text-emerald-600', 'trial sehat, hampir habis')}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row sm:flex-wrap gap-3">
        <form onSubmit={(e) => { e.preventDefault(); setLoading(true); setSearch(searchInput) }} className="flex gap-2 flex-1 min-w-0 sm:min-w-60">
          <input type="text" placeholder="Cari bisnis, pemilik, nomor, email..." value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Cari</button>
        </form>
        <select value={risk} onChange={(e) => { setLoading(true); setRisk(e.target.value) }}
          className="w-full sm:w-auto px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {RISK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={stage} onChange={(e) => { setLoading(true); setStage(e.target.value) }}
          className="w-full sm:w-auto px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {STAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Bisnis', 'Skor', 'Risiko', 'Pemakaian', 'Alasan', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Memuat…</td></tr>
              ) : !data?.rows.length ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Tidak ada toko sesuai filter</td></tr>
              ) : (
                data.rows.map((r) => <Row key={r.business_id} row={r} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
