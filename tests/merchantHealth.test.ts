import assert from 'node:assert/strict'
import test from 'node:test'
import { csMessage, daysAgo, reasonLabel, waNumber, waUrl } from '../src/lib/merchantHealth.ts'
import type { MerchantHealthRow } from '../src/api/merchantHealth.ts'

const row = (reasons: string[]): MerchantHealthRow => ({
  business_id: 'b', business_name: 'Seblak Teh Ocha', owner_name: 'Ocha Lestari', owner_phone: '0812-3456-7890',
  owner_email: '', created_at: '2026-10-01', stage: 'trial', plan_type: 'trial', plan_ends_at: null, score: 20,
  risk: 'high', reasons, tx_7d: 0, tx_prev_7d: 0, active_days_14: 0, revenue_30d: 0, products: 0, employees: 0,
  modules: [], first_tx_at: null, last_tx_at: null, last_seen_at: null,
})

test('pesan CS menyapa nama depan dan mengikuti alasan paling mendesak', () => {
  assert.match(csMessage(row(['no_products', 'not_seen'])), /^Halo Ocha, .*Foto Daftar Menu/)
  assert.match(csMessage(row(['trial_ending', 'ready_to_convert'])), /paket Pro/)
  assert.match(csMessage(row(['inactive_7d'])), /jarang mencatat penjualan/)
})

test('nomor WhatsApp dan tautannya', () => {
  assert.equal(waNumber('0812-3456-7890'), '6281234567890')
  assert.equal(waNumber('-'), null)
  assert.equal(waUrl('', 'x'), null)
  assert.equal(waUrl('081234567890', 'a b'), 'https://wa.me/6281234567890?text=a%20b')
})

test('label alasan dan hari sejak', () => {
  assert.equal(reasonLabel('declining'), 'Nota turun > 50%')
  assert.equal(reasonLabel('kode_baru'), 'kode_baru')
  assert.equal(daysAgo('2026-10-20T00:00:00Z', new Date('2026-10-24T12:00:00Z')), 4)
  assert.equal(daysAgo(null), null)
})
