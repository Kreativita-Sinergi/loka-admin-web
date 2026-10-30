import assert from 'node:assert/strict'
import test from 'node:test'
import { quickMembershipPlans, trialExtensionDays, membershipLabel, membershipVariant, membershipDefaultDays, membershipUpdate, planBucketLabel } from '../src/lib/membership.ts'

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

test('there is no Free plan to grant; trial can be extended instead', () => {
  assert.ok(quickMembershipPlans.every(plan => plan.type !== 'free'))
  assert.ok(quickMembershipPlans.every(plan => plan.days < 36500))
  assert.deepEqual([...trialExtensionDays], [7, 14])
  assert.equal(membershipDefaultDays('trial'), 14)
})

test('legacy free and no-subscription buckets read as ended, not as a plan', () => {
  assert.equal(membershipLabel('free'), 'Tanpa langganan')
  assert.equal(planBucketLabel('free'), 'Berakhir / tanpa langganan')
  assert.equal(planBucketLabel('expired'), 'Berakhir / tanpa langganan')
  assert.equal(planBucketLabel(null), 'Berakhir / tanpa langganan')
  assert.equal(planBucketLabel('pro-yearly'), 'Pro Tahunan')
  assert.equal(planBucketLabel('trial'), 'Trial')
})
