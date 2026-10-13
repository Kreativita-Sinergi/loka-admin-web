import assert from 'node:assert/strict'
import test from 'node:test'
import { quickMembershipPlans, membershipLabel, membershipVariant, membershipDefaultDays, membershipUpdate } from '../src/lib/membership.ts'

test('annual and three-year actions store their plan codes and periods', () => {
  assert.equal(quickMembershipPlans.find(plan => plan.days === 365)?.type, 'pro-yearly')
  assert.equal(quickMembershipPlans.find(plan => plan.days === 1095)?.type, 'pro-3year')
  assert.equal(membershipDefaultDays('pro-yearly'), 365)
  assert.equal(membershipDefaultDays('pro-3year'), 1095)
  assert.equal(membershipLabel('pro-yearly'), 'Pro Tahunan')
  assert.equal(membershipLabel('pro-3year'), 'Pro 3 Tahun')
  assert.equal(membershipVariant('pro-yearly'), 'success')
  assert.equal(membershipVariant('pro-3year'), 'success')
})

test('correcting the plan sends no date or extension and preserves exact expiry', () => {
  const current = { type: 'pro', end_date: '2027-09-12' }
  assert.deepEqual(membershipUpdate({ type: 'pro-yearly', extend_days: 0, end_date: current.end_date }, current), { type: 'pro-yearly' })
  assert.deepEqual(membershipUpdate({ type: 'pro-yearly', extend_days: 365, end_date: current.end_date }, current), { type: 'pro-yearly', extend_days: 365 })
  assert.deepEqual(membershipUpdate({ type: 'pro', extend_days: 0, end_date: '2027-10-12' }, current), { end_date: '2027-10-12' })
})
