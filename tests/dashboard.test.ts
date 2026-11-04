import assert from 'node:assert/strict'
import test from 'node:test'
import { delta, formatMoneyShort, monthToDateRanges, monthlySeries, rate } from '../src/lib/dashboard.ts'

test('delta is null when there is nothing to compare against', () => {
  assert.equal(delta(10, 0), null)
  assert.equal(delta(undefined, 5), null)
  assert.equal(delta(12, 10), 20)
  assert.equal(delta(5, 10), -50)
  assert.equal(delta(0, 4), -100)
})

test('rate hides empty denominators instead of showing 0%', () => {
  assert.equal(rate(0, 0), null)
  assert.equal(rate(1, 3), 33)
  assert.equal(rate(undefined, 3), null)
})

test('month-to-date compares the same days of last month, in WIB', () => {
  // 18:00 UTC tanggal 31 Mar = 01:00 WIB 1 Apr.
  assert.deepEqual(monthToDateRanges(new Date('2026-03-31T18:00:00Z')), {
    current: { start_date: '2026-04-01', end_date: '2026-04-01' },
    previous: { start_date: '2026-03-01', end_date: '2026-03-01' },
  })
  // 31 Mar vs Februari yang hanya 28 hari.
  assert.deepEqual(monthToDateRanges(new Date('2026-03-31T05:00:00Z')).previous, { start_date: '2026-02-01', end_date: '2026-02-28' })
  // Januari membandingkan Desember tahun lalu.
  assert.deepEqual(monthToDateRanges(new Date('2026-01-15T05:00:00Z')).previous, { start_date: '2025-12-01', end_date: '2025-12-15' })
})

test('monthly series fills missing months with zero, oldest first', () => {
  const series = monthlySeries([{ month: '2026-10', amount: 500, orders: 2 }], 3, new Date('2026-11-04T05:00:00Z'))
  assert.deepEqual(series.map((p) => [p.month, p.amount, p.orders]), [['2026-09', 0, 0], ['2026-10', 500, 2], ['2026-11', 0, 0]])
  assert.equal(monthlySeries(null, 6).length, 6)
})

test('short money keeps small values exact', () => {
  assert.equal(formatMoneyShort(undefined), '—')
  assert.equal(formatMoneyShort(99000), 'Rp99 rb')
  assert.equal(formatMoneyShort(1250000), 'Rp1,3 jt')
  assert.equal(formatMoneyShort(500), 'Rp500')
})
