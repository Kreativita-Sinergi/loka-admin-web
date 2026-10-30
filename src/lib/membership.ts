// Tidak ada paket Gratis: trial habis → usaha terkunci (lihat saja) sampai
// berlangganan. Admin hanya bisa memberi Pro atau memperpanjang trial.
export const quickMembershipPlans = [
  { key: 'pro-30', type: 'pro', days: 30, label: 'Pro Bulanan', cls: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  { key: 'pro-365', type: 'pro-yearly', days: 365, label: 'Pro Tahunan', cls: 'bg-emerald-700 hover:bg-emerald-800 text-white' },
  { key: 'pro-1095', type: 'pro-3year', days: 1095, label: 'Pro 3 Tahun', cls: 'bg-emerald-800 hover:bg-emerald-900 text-white' },
]

/** Perpanjang trial cepat (PATCH type=trial + extend_days). */
export const trialExtensionDays = [7, 14] as const

/** Lama trial bawaan saat membuat membership trial baru. */
export const TRIAL_DEFAULT_DAYS = 14

/** Label paket. `free` adalah data lama dari sebelum paket Gratis dihapus;
 * statistik server juga memakai `free` untuk usaha tanpa langganan berlaku. */
export function membershipLabel(type: string) {
  const labels: Record<string, string> = { free: 'Tanpa langganan', expired: 'Berakhir', trial: 'Trial', pro: 'Pro', 'pro-yearly': 'Pro Tahunan', 'pro-3year': 'Pro 3 Tahun', monthly: 'Pro Bulanan', yearly: 'Pro Tahunan' }
  return labels[type.toLowerCase()] ?? type
}

export function membershipVariant(type: string): 'success' | 'warning' | 'neutral' {
  if (type === 'trial') return 'warning'
  return ['pro', 'pro-yearly', 'pro-3year', 'monthly', 'yearly'].includes(type) ? 'success' : 'neutral'
}

/** Ember statistik paket (dasbor/penggunaan): `free`/`expired`/kosong berarti
 * usaha tanpa langganan berlaku — trial atau Pro-nya sudah berakhir. */
export function planBucketLabel(type: string | null | undefined) {
  const key = (type ?? '').toLowerCase()
  if (!key || key === 'free' || key === 'expired') return 'Berakhir / tanpa langganan'
  return membershipLabel(key)
}

export function membershipDefaultDays(type: string) {
  if (type === 'trial') return TRIAL_DEFAULT_DAYS
  return quickMembershipPlans.find(plan => plan.type === type)?.days ?? 30
}

export function membershipUpdate(form: { type: string; extend_days: number; end_date: string }, current: { type: string; end_date: string }) {
  // An unchanged date must not be sent: the API accepts calendar dates, which
  // would truncate the existing timestamp and also override a day extension.
  return {
    ...(form.type && form.type !== current.type ? { type: form.type } : {}),
    ...(form.extend_days > 0 ? { extend_days: form.extend_days } : {}),
    ...(form.end_date && form.end_date !== current.end_date ? { end_date: form.end_date } : {}),
  }
}
