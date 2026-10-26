import { useState } from 'react'
import { createSalesAgent, updateSalesAgent, type SalesAgent, type SalesAgentInput, type SalesAgentStatus } from '../../api/salesReferral'
import { SALES_STATUS, apiErrorText, generatePassword, kycComplete, validateSalesInput } from '../../lib/salesReferral'

const input = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500 mt-1">{hint}</span>}
    </label>
  )
}

const fromAgent = (a?: SalesAgent): SalesAgentInput => ({
  code: a?.code ?? '',
  name: a?.name ?? '',
  email: a?.email ?? '',
  phone: a?.phone ?? '',
  status: a?.status ?? 'pending',
  nik: a?.nik ?? '',
  npwp: a?.npwp ?? '',
  bank_name: a?.bank_name ?? '',
  bank_account_no: a?.bank_account_no ?? '',
  bank_account_name: a?.bank_account_name ?? '',
})

/**
 * Formulir tambah/ubah sales, termasuk KYC. Dipakai di dalam `Modal`.
 *
 * Saat mengubah, PATCH mengganti seluruh data: form memuat nilai terdekripsi
 * dari GET dan mengirim semuanya kembali, sehingga kolom yang dikosongkan
 * ikut terhapus.
 */
export default function SalesAgentForm({ agent, onSaved, onCancel }: {
  agent?: SalesAgent
  onSaved: (agent: SalesAgent) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<SalesAgentInput>(() => fromAgent(agent))
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = <K extends keyof SalesAgentInput>(key: K, value: SalesAgentInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setError('')
  }
  const text = (key: keyof SalesAgentInput) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key, e.target.value as never),
    disabled: saving,
    className: input,
  })

  const willActivate = form.status === 'active' && !kycComplete(form)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    const invalid = validateSalesInput(form, agent ? undefined : password)
    if (invalid) { setError(invalid); return }
    setSaving(true)
    setError('')
    const payload = { ...form, code: form.code.trim().toUpperCase() }
    try {
      const res = agent ? await updateSalesAgent(agent.id, payload) : await createSalesAgent({ ...payload, password })
      onSaved(res.data)
    } catch (err) {
      setError(apiErrorText(err, 'Gagal menyimpan sales. Coba lagi.'))
    } finally {
      setSaving(false)
    }
  }

  const KYC_FIELDS = { nik: 'NIK', npwp: 'NPWP', bank_name: 'bank', bank_account_no: 'nomor rekening', bank_account_name: 'nama rekening' } as const
  const cleared = agent
    ? (Object.keys(KYC_FIELDS) as (keyof typeof KYC_FIELDS)[]).filter((k) => agent[k] && !form[k].trim()).map((k) => KYC_FIELDS[k])
    : []

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Identitas & akses</p>
        <Field label="Nama lengkap *"><input {...text('name')} autoFocus /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email *" hint="Dipakai untuk masuk portal sales."><input type="email" {...text('email')} /></Field>
          <Field label="No. HP *" hint="Disimpan dalam bentuk 62…"><input type="tel" inputMode="tel" {...text('phone')} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kode referral *" hint="4–12 huruf/angka, tidak diawali LK. Mudah diucapkan.">
            <input {...text('code')} onChange={(e) => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))}
              className={`${input} font-mono tracking-wide`} placeholder="mis. BUDIJKT" />
          </Field>
          <Field label="Status" hint={SALES_STATUS[form.status].hint}>
            <select value={form.status} disabled={saving} onChange={(e) => set('status', e.target.value as SalesAgentStatus)} className={input}>
              {(Object.keys(SALES_STATUS) as SalesAgentStatus[]).map((s) => <option key={s} value={s}>{SALES_STATUS[s].label}</option>)}
            </select>
          </Field>
        </div>
        {!agent && (
          <Field label="Kata sandi awal *" hint="Minimal 8 karakter. Sampaikan ke sales lewat jalur pribadi; sales bisa menggantinya di portal.">
            <div className="flex gap-2">
              <input type="text" autoComplete="new-password" value={password} disabled={saving}
                onChange={(e) => { setPassword(e.target.value); setError('') }} className={`${input} font-mono`} />
              <button type="button" disabled={saving} onClick={() => { setPassword(generatePassword()); setError('') }}
                className="shrink-0 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">
                Buat acak
              </button>
            </div>
          </Field>
        )}
      </div>

      <div className="space-y-3 pt-4 border-t border-slate-100">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">KYC & rekening pencairan</p>
          <p className="text-xs text-slate-500 mt-1">Rekening harus atas nama yang sama dengan KTP. Sales tanpa rekening lengkap dilewati saat draf pencairan dibuat.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="NIK (KTP)"><input inputMode="numeric" {...text('nik')} /></Field>
          <Field label="NPWP"><input {...text('npwp')} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Bank"><input {...text('bank_name')} placeholder="mis. BCA" /></Field>
          <Field label="No. rekening"><input inputMode="numeric" {...text('bank_account_no')} /></Field>
        </div>
        <Field label="Nama pemilik rekening"><input {...text('bank_account_name')} /></Field>
      </div>

      {cleared.length > 0 && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          Data {cleared.join(', ')} yang sebelumnya tersimpan akan dihapus saat disimpan.
        </p>
      )}
      {willActivate && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          KYC belum lengkap. Sales tetap bisa diaktifkan, tetapi pencairannya dilewati sampai NIK dan rekening lengkap.
        </p>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={onCancel} disabled={saving}
          className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50">
          Batal
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-50">
          {saving ? 'Menyimpan…' : agent ? 'Simpan perubahan' : 'Tambah sales'}
        </button>
      </div>
    </form>
  )
}
