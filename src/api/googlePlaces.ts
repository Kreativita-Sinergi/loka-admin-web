const PLACES_API_BASE = 'https://places.googleapis.com/v1'

export interface PlaceResult {
  id: string
  displayName: { text: string }
  formattedAddress: string
  internationalPhoneNumber?: string
  nationalPhoneNumber?: string
  primaryTypeDisplayName?: { text: string }
  rating?: number
  userRatingCount?: number
  websiteUri?: string
}

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.internationalPhoneNumber',
  'places.nationalPhoneNumber',
  'places.primaryTypeDisplayName',
  'places.rating',
  'places.userRatingCount',
  'places.websiteUri',
].join(',')

export async function searchPlaces(query: string, location: string): Promise<PlaceResult[]> {
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY
  if (!apiKey) throw new Error('Google Places API key belum dikonfigurasi (VITE_GOOGLE_PLACES_API_KEY)')

  const textQuery = location.trim() ? `${query} di ${location}` : query

  const response = await fetch(`${PLACES_API_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery,
      languageCode: 'id',
      regionCode: 'ID',
      maxResultCount: 20,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Gagal mengambil data (${response.status})`)
  }

  const data = await response.json()
  return (data.places as PlaceResult[]) || []
}

export function cleanPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1)
  if (!cleaned.startsWith('62')) cleaned = '62' + cleaned
  return cleaned
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${cleanPhoneNumber(phone)}?text=${encodeURIComponent(message)}`
}
