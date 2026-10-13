export const quickMembershipPlans = [
  { key: 'pro-30', type: 'pro', days: 30, label: 'Pro Bulanan', cls: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  { key: 'pro-365', type: 'pro-yearly', days: 365, label: 'Pro Tahunan', cls: 'bg-emerald-700 hover:bg-emerald-800 text-white' },
  { key: 'pro-1095', type: 'pro-3year', days: 1095, label: 'Pro 3 Tahun', cls: 'bg-emerald-800 hover:bg-emerald-900 text-white' },
  { key: 'free', type: 'free', days: 36500, label: 'Gratis', cls: 'bg-slate-200 hover:bg-slate-300 text-slate-700' },
]

export function membershipLabel(type: string) {
  const labels: Record<string, string> = { free: 'Gratis', trial: 'Trial', pro: 'Pro', 'pro-yearly': 'Pro Tahunan', 'pro-3year': 'Pro 3 Tahun', monthly: 'Pro Bulanan', yearly: 'Pro Tahunan' }
  return labels[type.toLowerCase()] ?? type
}

export function membershipVariant(type: string): 'success' | 'warning' | 'neutral' {
  if (type === 'trial') return 'warning'
  return ['pro', 'pro-yearly', 'pro-3year', 'monthly', 'yearly'].includes(type) ? 'success' : 'neutral'
}

export function membershipDefaultDays(type: string) {
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
