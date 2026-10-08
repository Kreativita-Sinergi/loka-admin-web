import assert from 'node:assert/strict'
import test from 'node:test'
import { formatMoney, saleStatus, wibDate } from '../src/lib/sales.ts'

test('sale status prioritizes voids over stored payment status', () => {
  assert.equal(saleStatus({ payment_status: 'paid', is_canceled: true, is_refunded: false }).label, 'Dibatalkan')
  assert.equal(saleStatus({ payment_status: 'paid', is_canceled: false, is_refunded: true }).label, 'Refund')
  assert.equal(saleStatus({ payment_status: 'partial_paid', is_canceled: false, is_refunded: false }).label, 'Kasbon / sebagian')
})
test('default reporting period uses WIB across UTC midnight', () => {
  assert.equal(wibDate(new Date('2026-09-30T17:00:00Z')), '2026-10-01')
  assert.equal(wibDate(new Date('2026-09-30T16:59:59Z')), '2026-09-30')
  assert.equal(formatMoney(null), '—')
  assert.match(formatMoney(0), /0/)
})
