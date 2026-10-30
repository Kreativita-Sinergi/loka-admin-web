import type { HealthRisk, HealthStage, MerchantHealthRow } from '../api/merchantHealth.ts'

type Variant = 'success' | 'danger' | 'warning' | 'info' | 'neutral'

export const RISK_LABEL: Record<HealthRisk, string> = {
  high: 'Risiko tinggi',
  medium: 'Perlu dipantau',
  low: 'Sehat',
}

export const RISK_VARIANT: Record<HealthRisk, Variant> = {
  high: 'danger',
  medium: 'warning',
  low: 'success',
}

export const STAGE_LABEL: Record<HealthStage, string> = {
  trial: 'Trial',
  paid: 'Pro',
  // Data lama (paket Gratis sudah dihapus): usaha tanpa langganan berlaku.
  free: 'Tanpa langganan',
  expired: 'Kedaluwarsa',
}

const REASONS: Record<string, string> = {
  no_transaction: 'Belum pernah jualan',
  no_products: 'Katalog < 5 produk',
  inactive_7d: 'Tidak ada nota 7 hari',
  declining: 'Nota turun > 50%',
  trial_ending: 'Trial habis ≤ 5 hari',
  shallow: 'Hanya kasir dasar',
  not_seen: 'Tidak dibuka 7 hari',
  ready_to_convert: 'Siap ditawari Pro',
}

export const reasonLabel = (code: string) => REASONS[code] ?? code

export const MODULE_LABEL: Record<string, string> = {
  customers: 'Pelanggan',
  tables: 'Meja',
  kasbon: 'Kasbon',
  stock: 'Stok',
  purchase: 'PO',
  loyalty: 'Loyalti',
}

/**
 * Pesan pembuka CS — disesuaikan dengan alasan PALING mendesak, supaya sapaan
 * pertama langsung menolong, bukan "ada yang bisa dibantu?".
 */
export function csMessage(row: MerchantHealthRow): string {
  const name = (row.owner_name || 'Kak').trim().split(' ')[0]
  const store = row.business_name
  const has = (c: string) => row.reasons.includes(c)
  let body: string
  if (has('ready_to_convert')) {
    body = `toko ${store} lagi rame banget di Loka Kasir 🎉 Masa trial-nya tinggal sebentar lagi — mau saya bantu pindah ke paket Pro biar nggak keputus?`
  } else if (has('no_products') || has('no_transaction')) {
    body = `saya dari tim Loka Kasir. Kalau ribet masukin menu satu-satu, cukup foto papan menu/daftar harga ${store} lewat menu Produk › Impor › Foto Daftar Menu, nanti terisi otomatis. Mau saya bantu langsung?`
  } else if (has('inactive_7d') || has('declining')) {
    body = `saya dari tim Loka Kasir, lihat ${store} beberapa hari ini jarang mencatat penjualan. Ada kendala di aplikasinya? Saya siap bantu.`
  } else if (has('trial_ending')) {
    body = `masa trial ${store} di Loka Kasir hampir habis. Ada yang masih bikin ragu? Saya bantu jelaskan sebelum pilih paket.`
  } else {
    body = `saya dari tim Loka Kasir, mau tanya kabar ${store} — ada fitur yang mau dibantu setting?`
  }
  return `Halo ${name}, ${body}`
}

/** Nomor dalam bentuk wa.me (62…), atau null bila tak terpakai. */
export function waNumber(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '')
  if (!digits) return null
  const n = digits.startsWith('0') ? `62${digits.slice(1)}` : digits.startsWith('62') ? digits : `62${digits}`
  return n.length >= 11 && n.length <= 15 ? n : null
}

export const waUrl = (phone: string, text: string) => {
  const n = waNumber(phone)
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null
}

export const daysAgo = (iso: string | null, now = new Date()) =>
  iso ? Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000)) : null
