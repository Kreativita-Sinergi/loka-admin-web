import { wibDate } from './sales.ts'

/** Perubahan terhadap periode lalu. `null` bila pembanding nol (persen tak bermakna). */
export function delta(current: number | null | undefined, previous: number | null | undefined): number | null {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous)) return null
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

/** Persen bulat; `null` bila penyebut nol supaya tampil "—", bukan "0%". */
export function rate(part: number | null | undefined, total: number | null | undefined): number | null {
  if (part == null || total == null || total <= 0) return null
  return Math.round((part / total) * 100)
}

/**
 * Rentang "bulan ini sampai hari ini" (WIB) dan rentang yang sama pada bulan
 * lalu, untuk membandingkan nilai transaksi secara adil di tengah bulan.
 * Bila bulan lalu lebih pendek (mis. 31 Mar vs Feb), dipotong ke akhir bulannya.
 */
export function monthToDateRanges(now = new Date()) {
  const today = wibDate(now)
  const [y, m, d] = today.split('-').map(Number)
  const pad = (n: number) => String(n).padStart(2, '0')
  const prevY = m === 1 ? y - 1 : y
  const prevM = m === 1 ? 12 : m - 1
  const prevLastDay = new Date(Date.UTC(prevY, prevM, 0)).getUTCDate()
  return {
    current: { start_date: `${y}-${pad(m)}-01`, end_date: today },
    previous: { start_date: `${prevY}-${pad(prevM)}-01`, end_date: `${prevY}-${pad(prevM)}-${pad(Math.min(d, prevLastDay))}` },
  }
}

/** Isi bulan kosong dengan nol untuk `months` bulan WIB terakhir (YYYY-MM). */
export function monthlySeries(
  points: { month: string; amount: number; orders: number }[] | null | undefined,
  months: number,
  now = new Date(),
) {
  const [y, m] = wibDate(now).split('-').map(Number)
  const byMonth = new Map((points ?? []).map((p) => [p.month, p]))
  return Array.from({ length: months }, (_, i) => {
    const date = new Date(Date.UTC(y, m - 1 - (months - 1 - i), 1))
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
    const point = byMonth.get(key)
    return {
      month: key,
      label: new Intl.DateTimeFormat('id-ID', { timeZone: 'UTC', month: 'short' }).format(date),
      amount: point?.amount ?? 0,
      orders: point?.orders ?? 0,
    }
  })
}

/** Rupiah ringkas untuk kartu: 1.250.000 → "Rp1,3 jt". */
export function formatMoneyShort(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  const fmt = (n: number, unit: string) =>
    `Rp${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(n)} ${unit}`
  if (abs >= 1e9) return fmt(value / 1e9, 'M')
  if (abs >= 1e6) return fmt(value / 1e6, 'jt')
  if (abs >= 1e3) return fmt(value / 1e3, 'rb')
  return `Rp${new Intl.NumberFormat('id-ID').format(value)}`
}
