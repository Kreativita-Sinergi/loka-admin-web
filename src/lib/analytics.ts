const numberFormat = new Intl.NumberFormat('id-ID')
export const formatNumber = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? '—' : numberFormat.format(value)
export const percentage = (part: number, total: number) => total > 0 ? Math.round(part / total * 100) : 0
export function formatHours(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value < 0) return '—'
  if (value === 0) return '0 menit'
  if (value * 60 < 1) return '<1 menit'
  const minutes = Math.round(value * 60)
  const hours = Math.floor(minutes / 60)
  return hours ? `${hours} jam${minutes % 60 ? ` ${minutes % 60} mnt` : ''}` : `${minutes} menit`
}
export function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value || !Number.isFinite(Date.parse(value))) return '—'
  return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(new Date(value))
}
/** API points are calendar dates; preserve their dates without local timezone shifts.
 * Missing days are zero, but missing optional metrics stay unavailable. */
export function dailySeries<T extends { date: string }>(points: T[] | null | undefined, days: number, read: (point: T) => number, now = new Date()) {
  const end = new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`)
  const values = new Map((points ?? []).filter(p => /^\d{4}-\d{2}-\d{2}$/.test(p.date)).map(p => [p.date, read(p)]))
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(end)
    day.setUTCDate(day.getUTCDate() - days + 1 + index)
    const date = day.toISOString().slice(0, 10)
    return { date, label: new Intl.DateTimeFormat('id-ID', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(day), value: values.get(date) ?? 0 }
  })
}
