import assert from 'node:assert/strict'
import test from 'node:test'
import {
  apiErrorText,
  commissionAmount,
  formatBp,
  gatewayFee,
  groupFeeRates,
  parsePercentToBp,
  safeUrl,
  validateSalesInput,
} from '../src/lib/salesReferral.ts'

test('server error details win over the generic message', () => {
  const err = { response: { data: { message: 'Permintaan gagal', error: { details: 'kode sales sudah dipakai' } } } }
  assert.equal(apiErrorText(err), 'kode sales sudah dipakai')
  assert.equal(apiErrorText({ response: { data: { message: 'Ditolak' } } }), 'Ditolak')
  assert.equal(apiErrorText(new Error('x'), 'gagal'), 'gagal')
})

test('sales code follows the server rule', () => {
  const ok = { code: 'budi01', name: 'Budi', email: 'b@x.id', phone: '0812 3456 789' }
  assert.equal(validateSalesInput(ok), null)
  assert.match(validateSalesInput({ ...ok, code: 'LK1234' }) ?? '', /LK/)
  assert.match(validateSalesInput({ ...ok, code: 'ABC' }) ?? '', /4–12/)
  assert.match(validateSalesInput(ok, 'pendek') ?? '', /8 karakter/)
})

test('percent ↔ basis points', () => {
  assert.equal(parsePercentToBp('0,7'), 70)
  assert.equal(parsePercentToBp('2.9'), 290)
  assert.equal(parsePercentToBp('1,675'), null)
  assert.equal(parsePercentToBp('101'), null)
  assert.equal(formatBp(78), '0,78%')
})

test('fee and commission match the server formulas', () => {
  // Contoh di docs/sales-referral.md: 47.200 via QRIS 0,7% → fee 330, komisi 23.435.
  assert.equal(gatewayFee(47200, { flat_fee: 0, percent_bp: 70 }), 330)
  assert.equal(commissionAmount(47200, 330, 50), 23435)
  assert.equal(gatewayFee(59000, { flat_fee: 2000, percent_bp: 290 }), 3711)
  assert.equal(commissionAmount(1000, 2000, 50), 0)
})

test('fee rates are grouped per channel with the rate in force today', () => {
  const groups = groupFeeRates([
    { payment_code: 'SP', label: 'QRIS', flat_fee: 0, percent_bp: 70, valid_from: '2026-01-01' },
    { payment_code: 'SP', label: 'QRIS', flat_fee: 0, percent_bp: 65, valid_from: '2026-12-01' },
    { payment_code: 'SP', label: 'QRIS', flat_fee: 0, percent_bp: 80, valid_from: '2025-06-01' },
    { payment_code: 'BC', label: 'VA BCA', flat_fee: 5000, percent_bp: 0, valid_from: '2027-01-01' },
  ], '2026-10-26')
  assert.deepEqual(groups.map((g) => g.code), ['BC', 'SP'])
  const sp = groups[1]
  assert.equal(sp.current.percent_bp, 70)
  assert.deepEqual(sp.rows.map((r) => r.state), ['scheduled', 'current', 'past'])
  // Belum ada yang berlaku: server memakai tarif paling awal.
  assert.equal(groups[0].current.valid_from, '2027-01-01')
})

test('only http(s) proof links are rendered', () => {
  assert.equal(safeUrl(' https://drive.google.com/x '), 'https://drive.google.com/x')
  assert.equal(safeUrl('javascript:alert(1)'), null)
})
