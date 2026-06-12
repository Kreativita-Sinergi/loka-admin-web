// Pencarian bisnis langsung dari browser memakai Google Places API (New),
// yang mendukung CORS. Key dibaca dari VITE_GOOGLE_PLACES_API_KEY.
//
// PENTING: karena dipanggil dari browser, key TEREKSPOS di bundle publik.
// Wajib dibatasi per-domain (HTTP referrer) di Google Cloud Console, dan
// aktifkan "Places API (New)".

export interface GooglePlaceResult {
  place_id: string
  name: string
  address: string
  phone: string // dinormalkan ke format 62xxxx (siap wa.me), kosong bila tak ada
  website: string
  rating: number | null
}

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText'
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.rating',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'nextPageToken',
].join(',')

// Normalkan nomor telepon ke format internasional Indonesia tanpa simbol (62xxxx).
function normalizePhone(raw?: string): string {
  if (!raw) return ''
  let p = raw.replace(/[^\d+]/g, '').replace(/^\+/, '')
  if (p.startsWith('0')) p = '62' + p.slice(1)
  return p
}

interface PlacesApiResponse {
  places?: Array<{
    id?: string
    displayName?: { text?: string }
    formattedAddress?: string
    rating?: number
    internationalPhoneNumber?: string
    websiteUri?: string
  }>
  nextPageToken?: string
  error?: { message?: string; status?: string }
}

/**
 * Cari bisnis di Google Maps. `query` mis. "kafe di Surabaya".
 * `maxResults` dibatasi 1..60 (per halaman maks 20, di-page otomatis).
 */
export async function searchGooglePlaces(query: string, maxResults: number): Promise<GooglePlaceResult[]> {
  const key = import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string | undefined
  if (!key) {
    throw new Error('VITE_GOOGLE_PLACES_API_KEY belum diset di admin web.')
  }

  const cap = Math.min(Math.max(maxResults, 1), 60)
  const out: GooglePlaceResult[] = []
  let pageToken: string | undefined

  while (out.length < cap) {
    const body: Record<string, unknown> = {
      textQuery: query,
      languageCode: 'id',
      regionCode: 'ID',
      maxResultCount: Math.min(20, cap - out.length),
    }
    if (pageToken) body.pageToken = pageToken

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
    })

    const data: PlacesApiResponse = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data?.error?.message || `Google Places error (${res.status})`)
    }

    for (const p of data.places ?? []) {
      out.push({
        place_id: p.id ?? '',
        name: p.displayName?.text ?? '',
        address: p.formattedAddress ?? '',
        phone: normalizePhone(p.internationalPhoneNumber),
        website: p.websiteUri ?? '',
        rating: typeof p.rating === 'number' ? p.rating : null,
      })
    }

    pageToken = data.nextPageToken
    if (!pageToken) break
  }

  return out
}
