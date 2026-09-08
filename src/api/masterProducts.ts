import axios from '../lib/axios'
import type { PaginatedResponse, SingleResponse } from '../types'

/** Satu baris katalog produk bersama.
 *
 *  Tidak ada harga modal di sini, dan itu disengaja: katalog dibagikan lintas
 *  toko, dan harga modal adalah margin usaha orang lain. `suggested_sell_price`
 *  adalah median dari sekian toko — `null` berarti penyumbangnya belum cukup
 *  untuk menyarankan angka apa pun, bukan gratis. */
export interface MasterProduct {
  id: string
  barcode: string | null
  name: string
  category_name: string | null
  brand_name: string | null
  unit_name: string | null
  image: string | null
  suggested_sell_price: number | null
  /** Jumlah toko berbeda yang menyumbang baris ini. Baris dari 300 toko lebih
   *  bisa dipercaya daripada baris dari 3 — angkanya ditampilkan apa adanya. */
  source_business_count: number
  vertical_code: string
  is_weight_based: boolean
  /** Kolom apotek. Panen hanya mengisinya bila SELURUH toko penyumbang yang
   *  mengisinya sepakat: golongan obat memutuskan boleh-tidaknya sebuah obat
   *  diserahkan tanpa resep, jadi satu salah ketik tidak boleh cukup untuk
   *  menurunkan obat keras menjadi obat bebas di rak apotek lain. Yang
   *  diperselisihkan dibiarkan kosong dan diisi lewat kurasi di sini. */
  drug_class: string | null
  active_ingredient: string | null
  bpom_registration: string | null
  /** Baris terverifikasi tidak pernah ditimpa oleh panen berikutnya. */
  is_verified: boolean
  is_active: boolean
  source: 'harvest' | 'curated'
  created_at: string
  updated_at: string
}

export interface MasterProductParams {
  page?: number
  limit?: number
  search?: string
  vertical?: string
  /** "pending" menyaring baris yang belum diterbitkan. Dikirim lewat `sort_by`
   *  karena Pagination di server dipakai belasan layar lain — lihat catatan di
   *  FindWithPagination. */
  sort_by?: string
}

export interface MasterProductPayload {
  barcode?: string | null
  name: string
  category_name?: string | null
  brand_name?: string | null
  unit_name?: string | null
  image?: string | null
  suggested_sell_price?: number | null
  vertical_code: string
  is_weight_based: boolean
  drug_class?: string | null
  active_ingredient?: string | null
  bpom_registration?: string | null
  is_active?: boolean
}

export const getMasterProducts = (
  params: MasterProductParams = {}
): Promise<PaginatedResponse<MasterProduct>> =>
  axios.get('/admin/master-products', { params }).then((r) => r.data)

/** Menerbitkan baris hasil panen.
 *
 *  Panen sengaja melahirkan baris dalam keadaan PADAM: sejak ia ikut membawa
 *  foto, satu gambar yang salah dari sebuah toko akan terbit ke seluruh toko
 *  sekaligus. Inilah satu-satunya pintu yang membuatnya terlihat. */
export const publishMasterProducts = (
  ids: string[]
): Promise<SingleResponse<{ published: number }>> =>
  axios.post('/admin/master-products/publish', { ids }).then((r) => r.data)

export const getPendingMasterProductCount = (
  vertical?: string
): Promise<SingleResponse<{ pending: number }>> =>
  axios
    .get('/admin/master-products/pending', { params: { vertical } })
    .then((r) => r.data)

/** Mengunggah berkas katalog kurasi.
 *
 *  Jalur kedua di samping panen: panen hanya menyatukan barang yang dieja SAMA
 *  PERSIS oleh tiga toko, dan pada data nyata barang sembako hampir tidak pernah
 *  dieja sama — gula tercatat di 11 toko dengan sembilan ejaan berbeda. */
export const importMasterProducts = (
  file: File
): Promise<SingleResponse<{ total: number; success: number; failed: number; errors: { row: number; product: string; message: string }[] }>> => {
  const form = new FormData()
  form.append('file', file)
  return axios
    .post('/admin/master-products/import', form)
    .then((r) => r.data)
}

/** Mengunduh daftar barang satu toko sebagai kandidat katalog (tanpa harga,
 *  tanpa foto). Untuk DIBACA dan dirapikan dulu, lalu diunggah lewat impor:
 *  nama barang di sebuah toko sering singkatan internalnya sendiri. */
export const downloadBusinessCatalogCandidates = (businessId: string) =>
  axios
    .get(`/admin/master-products/from-business/${businessId}`, { responseType: 'blob' })
    .then((r) => r.data as Blob)

export const masterProductTemplateUrl = '/admin/master-products/import/template'

export const createMasterProduct = (
  data: MasterProductPayload
): Promise<SingleResponse<MasterProduct>> =>
  axios.post('/admin/master-products', data).then((r) => r.data)

export const updateMasterProduct = (
  id: string,
  data: MasterProductPayload
): Promise<SingleResponse<MasterProduct>> =>
  axios.patch(`/admin/master-products/${id}`, data).then((r) => r.data)

export const deleteMasterProduct = (id: string): Promise<SingleResponse<null>> =>
  axios.delete(`/admin/master-products/${id}`).then((r) => r.data)

/** Membangun ulang katalog dari produk seluruh toko. Berjalan sinkron —
 *  satu pernyataan SQL agregat, bukan perulangan per produk. */
export const harvestMasterProducts = (): Promise<SingleResponse<{ affected: number }>> =>
  axios.post('/admin/master-products/harvest', {}).then((r) => r.data)
