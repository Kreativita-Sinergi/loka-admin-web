import assert from 'node:assert/strict'
import test from 'node:test'
import { dailySeries, formatDate, formatHours, formatNumber, percentage } from '../src/lib/analytics.ts'

test('missing metrics differ from measured zero', () => {
  assert.equal(formatNumber(undefined), '—')
  assert.equal(formatNumber(null), '—')
  assert.equal(formatNumber(0), '0')
  assert.equal(formatHours(undefined), '—')
  assert.equal(formatHours(0), '0 menit')
  assert.equal(formatHours(.001), '<1 menit')
  assert.equal(formatHours(1.5), '1 jam 30 mnt')
  assert.equal(formatHours(-1), '—')
})
test('chart fills zero days and preserves fractional hours', () => {
  const series = dailySeries([{ date: '2026-09-30', hours: .004 }, { date: '2026-09-01', hours: 99 }], 3, point => point.hours, new Date('2026-10-01T00:10:00Z'))
  assert.deepEqual(series.map(point => [point.date, point.value]), [['2026-09-29', 0], ['2026-09-30', .004], ['2026-10-01', 0]])
  assert.equal(dailySeries(null, 14, () => 0).length, 14)
})
test('UTC calendar windows stay consistent near WIB midnight', () => {
  const series = dailySeries([], 2, () => 0, new Date('2026-10-01T00:30:00+07:00'))
  assert.equal(series[1].date, '2026-09-30')
  assert.equal(formatDate('not-a-date'), '—')
  assert.match(formatDate('2026-09-30T18:00:00Z', true), /1 Okt 2026/)
})
test('rates handle empty populations without masking inconsistent counts', () => {
  assert.equal(percentage(0, 0), 0)
  assert.equal(percentage(1, 3), 33)
  assert.equal(percentage(4, 3), 133)
})
