import { useEffect, useState } from 'react'
import { getBusinessSubscriptionPrices, saveBusinessSubscriptionPrices } from '../api/admin'
import type { BusinessSubscriptionPrice } from '../api/admin'

const periods = [
  { plan: 'pro', label: 'Bulanan', duration: '30 hari' },
  { plan: 'pro-yearly', label: 'Tahunan', duration: '365 hari' },
  { plan: 'pro-3year', label: '3 tahun', duration: '1.095 hari' },
] as const
const money = (amount: number) => `Rp${amount.toLocaleString('id-ID')}`
const blank = { pro: '', 'pro-yearly': '', 'pro-3year': '' }
function errorText(error: unknown): string {
  const e = error as { response?: { data?: { errors?: unknown; message?: string } } }
  return e.response?.data?.message ?? 'Gagal menyimpan harga. Coba lagi.'
}
export default function BusinessSubscriptionPrices({ businessId, businessName }: { businessId: string; businessName: string }) {
  const [rows, setRows] = useState<BusinessSubscriptionPrice[] | null>(null)
  const [values, setValues] = useState(blank)
  const [initial, setInitial] = useState(blank)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    getBusinessSubscriptionPrices(businessId).then(({ data }) => {
      if (!active) return
      if (periods.some(({ plan }) => !data.some((r) => r.plan === plan))) throw new Error('Katalog harga belum lengkap')
      const next = { ...blank }
      for (const row of data) next[row.plan] = row.custom_price === null ? '' : row.custom_price.toLocaleString('id-ID')
      setRows(data); setValues(next); setInitial(next)
    }).catch(() => { if (active) setError('Harga gagal dimuat. Muat ulang sebelum mengubah harga.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [businessId, retry])
  const changed = periods.some(({ plan }) => values[plan] !== initial[plan])
  const invalid = periods.some(({ plan }) => values[plan] !== '' && (Number(values[plan].replaceAll('.', '')) < 1 || Number(values[plan].replaceAll('.', '')) > 100_000_000))
  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (saving || loading || !rows || invalid || !changed) return
    setSaving(true); setError(''); setSuccess('')
    const prices = Object.fromEntries(periods.map(({ plan }) => [plan, values[plan] === '' ? null : Number(values[plan].replaceAll('.', ''))])) as Record<BusinessSubscriptionPrice['plan'], number | null>
    try {
      await saveBusinessSubscriptionPrices(businessId, prices)
      setInitial({ ...values }); setSuccess('Harga khusus tersimpan. Berlaku untuk tagihan baru akun ini.')
    } catch (e) { setError(errorText(e)) } finally { setSaving(false) }
  }
  return <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
    <h2 className="text-base font-semibold text-slate-800">Harga langganan khusus</h2>
    <p className="text-sm text-slate-500 mt-1">Khusus akun pemilik bisnis <strong className="text-slate-700">{businessName}</strong>. Kosongkan harga untuk memakai harga normal.</p>
    {loading ? <p className="text-sm text-slate-400 mt-4">Memuat harga…</p> : !rows ? <div className="mt-4"><p role="alert" className="text-sm text-red-600">{error}</p><button className="text-sm text-blue-600 mt-2" onClick={() => { setLoading(true); setError(''); setRetry((n) => n + 1) }}>Muat ulang harga</button></div> :
      <form onSubmit={save} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">{periods.map(({ plan, label, duration }) => {
          const row = rows.find((r) => r.plan === plan)!
          return <div key={plan} className="rounded-lg border border-slate-200 p-3">
            <label htmlFor={`custom-${plan}`} className="block text-sm font-semibold text-slate-700">{label}</label>
            <p className="text-xs text-slate-400 mt-0.5">{duration} · Pro</p>
            <p className="text-xs text-slate-500 my-3">Harga normal {money(row.normal_price)}</p>
            <div className="flex rounded-lg border border-slate-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <span className="pl-3 py-2 text-sm text-slate-500">Rp</span>
              <input id={`custom-${plan}`} type="text" inputMode="numeric" autoComplete="off" disabled={saving} value={values[plan]} placeholder={row.normal_price.toLocaleString('id-ID')}
                aria-describedby={`hint-${plan}`} className="w-full min-w-0 rounded-lg px-2 py-2 text-sm outline-none disabled:opacity-60"
                onChange={(e) => { const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 9); setValues((v) => ({ ...v, [plan]: digits === '' ? '' : Number(digits).toLocaleString('id-ID') })); setSuccess('') }} />
            </div>
            <p id={`hint-${plan}`} className="text-xs text-slate-500 mt-2">{values[plan] === '' ? 'Mengikuti harga normal' : 'Harga khusus per periode'}</p>
            {values[plan] !== '' && <button type="button" disabled={saving} className="text-xs text-blue-600 mt-2 disabled:opacity-50" onClick={() => { setValues((v) => ({ ...v, [plan]: '' })); setSuccess('') }}>Gunakan harga normal</button>}
          </div>
        })}</div>
        <p className="text-xs text-slate-500">Harga disimpan dalam rupiah dan berlaku pada pembelian atau perpanjangan berikutnya. Tagihan yang sudah dibuat tetap memakai nominal sebelumnya. Potongan referral mengikuti ketentuan yang berlaku.</p>
        {invalid && <p role="alert" className="text-sm text-red-600">Isi harga Rp1–Rp100.000.000, atau kosongkan untuk memakai harga normal.</p>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {success && <p role="status" className="text-sm text-emerald-700">{success}</p>}
        <button type="submit" disabled={saving || invalid || !changed} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">{saving ? 'Menyimpan…' : 'Simpan harga khusus'}</button>
      </form>}
  </section>
}
