import assert from 'node:assert/strict'
import test from 'node:test'
import {
  checkImageDims, countHashtags, monthGrid, monthRange, nextSlot, pollDelay, validateSocialDraft, wibDateKey, wibToISO,
} from '../src/lib/social.ts'

const now = new Date('2026-11-04T03:02:00Z') // 10:02 WIB
const base = { caption: 'Halo', mediaCount: 1, schedule: true, date: '2026-11-04', time: '11:00', threadsEnabled: false, threadsText: '' }

test('next slot keeps the 5-minute lead time, in WIB', () => {
  assert.deepEqual(nextSlot(now), { date: '2026-11-04', time: '10:07' }) // 10:02 → 10:07
  assert.deepEqual(nextSlot(new Date('2026-11-04T03:12:30Z')), { date: '2026-11-04', time: '10:18' }) // 10:12:30 → 10:18
  assert.deepEqual(nextSlot(new Date('2026-11-04T16:58:00Z')), { date: '2026-11-05', time: '00:03' }) // 23:58 WIB
})

test('WIB conversion survives UTC midnight', () => {
  assert.equal(wibToISO('2026-11-05', '06:00'), '2026-11-05T06:00:00+07:00')
  assert.equal(wibDateKey('2026-11-04T18:30:00Z'), '2026-11-05') // 01:30 WIB
})

test('draft validation mirrors the server limits', () => {
  assert.equal(validateSocialDraft(base, now), null)
  assert.match(validateSocialDraft({ ...base, mediaCount: 0 }, now) ?? '', /minimal 1 gambar/)
  assert.match(validateSocialDraft({ ...base, time: '10:00' }, now) ?? '', /5 menit/)
  assert.match(validateSocialDraft({ ...base, caption: '#a #b #c #d #e #f' }, now) ?? '', /hashtag/)
  assert.match(validateSocialDraft({ ...base, threadsEnabled: true, caption: 'x'.repeat(501) }, now) ?? '', /teks Threads yang lebih pendek/)
  assert.equal(validateSocialDraft({ ...base, threadsEnabled: true, caption: 'x'.repeat(501), threadsText: 'pendek' }, now), null)
  // Draf (tidak dijadwalkan) boleh tanpa gambar dan tanpa jadwal.
  assert.equal(validateSocialDraft({ ...base, schedule: false, mediaCount: 0, date: '', time: '' }, now), null)
  assert.equal(countHashtags('#kasir #UMKM_jaya #2026'), 3)
})

test('image dimension check', () => {
  assert.equal(checkImageDims(1080, 1350), null)
  assert.equal(checkImageDims(1080, 1080), null)
  assert.match(checkImageDims(1080, 1920) ?? '', /Rasio/)
  assert.match(checkImageDims(300, 300) ?? '', /Lebar/)
})

test('poll faster while publishing, stop when done', () => {
  assert.equal(pollDelay({ status: 'publishing', threads_status: 'waiting' }), 5000)
  assert.equal(pollDelay({ status: 'published', threads_status: 'waiting' }), 30000)
  assert.equal(pollDelay({ status: 'published', threads_status: 'published' }), null)
})

test('month grid starts on Monday and covers six weeks', () => {
  const grid = monthGrid(2026, 11) // 1 Nov 2026 = Minggu
  assert.equal(grid.length, 42)
  assert.equal(grid[0].key, '2026-10-26')
  assert.equal(grid[6].key, '2026-11-01')
  const r = monthRange(2026, 11)
  assert.equal(r.from, '2026-10-25T17:00:00.000Z')
  assert.equal(r.to, '2026-12-06T17:00:00.000Z')
})
