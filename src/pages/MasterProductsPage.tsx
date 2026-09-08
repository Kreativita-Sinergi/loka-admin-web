import { useCallback, useEffect, useRef, useState } from 'react'
import Modal from '../components/ui/Modal'
import Pagination from '../components/ui/Pagination'
import { getBusinesses } from '../api/admin'
import type { AdminBusiness } from '../types'
import {
  createMasterProduct,
  downloadBusinessCatalogCandidates,
  importMasterProducts,
  getPendingMasterProductCount,
  publishMasterProducts,
  deleteMasterProduct,
  getMasterProducts,
  harvestMasterProducts,
  updateMasterProduct,
  type MasterProduct,
  type MasterProductPayload,
  type MasterProductParams,
} from '../api/masterProducts'

/** Sub-jenis usaha, sesuai seeder/business_vertical_seeder.go di backend.
 *
 *  Kode kosong berarti "berlaku di semua jenis usaha" — dipakai barang lintas
 *  jenis seperti air mineral, dan barang itu ikut muncul di pencarian toko mana
 *  pun. */
const VERTICALS = [
  { value: '', label: 'Semua jenis usaha' },
  { value: 'MINIMARKET', label: 'Minimarket / Toko Kelontong' },
  { value: 'RESTORAN', label: 'Restoran / Rumah Makan' },
  { value: 'KAFE', label: 'Kafe / Kedai Kopi' },
  { value: 'KATERING', label: 'Katering' },
  { value: 'FNB_LAINNYA', label: 'Kuliner Lainnya' },
  { value: 'FASHION', label: 'Fashion / Pakaian' },
  { value: 'APOTEK', label: 'Apotek / Toko Obat' },
  { value: 'KONTER_PULSA', label: 'Konter Pulsa & Kuota' },
  { value: 'RETAIL_LAINNYA', label: 'Ritel Lainnya' },
  { value: 'BENGKEL', label: 'Bengkel Kendaraan' },
  { value: 'KONTER_HP', label: 'Konter & Servis HP' },
  { value: 'LAUNDRY', label: 'Laundry' },
  { value: 'SALON', label: 'Salon & Barbershop' },
  { value: 'PERCETAKAN', label: 'Percetakan & Fotokopi' },
]

/** Golongan obat menurut Permenkes — kembaran entity.DrugClass di server;
 *  keduanya harus berubah bersamaan. Kosong berarti "bukan obat", dan itulah
 *  mayoritas isi rak apotek: popok, susu, alat kesehatan. */
const DRUG_CLASSES = [
  { value: '', label: 'Bukan obat' },
  { value: 'BEBAS', label: 'Obat Bebas' },
  { value: 'BEBAS_TERBATAS', label: 'Obat Bebas Terbatas' },
  { value: 'KERAS', label: 'Obat Keras' },
  { value: 'PSIKOTROPIKA', label: 'Psikotropika' },
  { value: 'NARKOTIKA', label: 'Narkotika' },
]

const drugClassLabel = (code: string | null) =>
  DRUG_CLASSES.find((d) => d.value === (code ?? ''))?.label ?? code

const verticalLabel = (code: string) =>
  VERTICALS.find((v) => v.value === code)?.label ?? code

const EMPTY_FORM: MasterProductPayload = {
  barcode: '',
  name: '',
  category_name: '',
  brand_name: '',
  unit_name: '',
  suggested_sell_price: null,
  vertical_code: 'MINIMARKET',
  is_weight_based: false,
  drug_class: '',
  active_ingredient: '',
  bpom_registration: '',
  is_active: true,
}

const rupiah = (v: number | null) =>
  v === null ? '—' : 'Rp ' + v.toLocaleString('id-ID')

function errorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: string; error?: { details?: string } } } })
    .response?.data
  if (!data?.message) return fallback
  return data.error?.details ? `${data.message} — ${data.error.details}` : data.message
}

export default function MasterProductsPage() {
  const [items, setItems] = useState<MasterProduct[]>([])
  const [total, setTotal] = useState(0)
  // Mulai dari true: render pertama SELALU sedang memuat, dan menyalakannya
  // dari dalam effect akan memicu render bertingkat yang ditolak lint.
  const [loading, setLoading] = useState(true)
  const [params, setParams] = useState<MasterProductParams>({ page: 1, limit: 25, search: '', vertical: '' })
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MasterProduct | null>(null)
  const [form, setForm] = useState<MasterProductPayload>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [harvesting, setHarvesting] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [importing, setImporting] = useState(false)
  // Daftar toko untuk mengambil kandidat katalog. Panen tidak akan pernah
  // menolong toko yang sudah mendata 350 barang sendirian — ia menuntut TIGA
  // toko mengeja barang yang sama persis, dan setiap toko mengetik dengan
  // caranya sendiri.
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([])
  const [sourceBusiness, setSourceBusiness] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  // Jumlah baris yang menunggu tinjau. Panen melahirkan baris dalam keadaan
  // PADAM — tanpa angka ini, satu-satunya cara tahu ada yang menunggu adalah
  // menyaringnya sendiri, dan yang tidak pernah dilihat tidak akan pernah
  // terbit.
  const [pending, setPending] = useState(0)

  // reloadToken memaksa pemuatan ulang setelah simpan/hapus/panen. Pemuatannya
  // ada DI DALAM effect, bukan di fungsi yang dipanggil effect: memanggil
  // setState langsung dari badan effect memicu render bertingkat, dan aturan
  // lint react-hooks menolaknya.
  const [reloadToken, setReloadToken] = useState(0)
  const reload = useCallback(() => {
    setLoading(true)
    setReloadToken((n) => n + 1)
  }, [])

  useEffect(() => {
    let active = true
    getMasterProducts(params)
      .then((res) => {
        if (!active) return
        setItems(res.data ?? [])
        setTotal(res.pagination?.total ?? 0)
      })
      .catch((err) => {
        if (active) setError(errorMessage(err, 'Gagal memuat katalog.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [params, reloadToken])

  useEffect(() => {
    let active = true
    getPendingMasterProductCount(params.vertical || undefined)
      .then((res) => {
        if (active) setPending(res.data?.pending ?? 0)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [params.vertical, reloadToken])

  useEffect(() => {
    let active = true
    getBusinesses({ page: 1, limit: 200 })
      .then((res) => {
        if (active) setBusinesses(res.data ?? [])
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  /** Mengunduh daftar barang sebuah toko sebagai berkas kandidat.
   *
   *  Sengaja lewat berkas, bukan salin langsung: nama barang di sebuah toko
   *  sering singkatan internalnya ("es er ce", "malboro hitam 16"), dan
   *  menyalinnya bulat-bulat berarti menerbitkan salah ketik satu toko sebagai
   *  nama baku bagi semua toko. */
  const downloadCandidates = async () => {
    if (!sourceBusiness) return
    try {
      const blob = await downloadBusinessCatalogCandidates(sourceBusiness)
      const nama = businesses.find((b) => b.id === sourceBusiness)?.business_name ?? 'toko'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kandidat-katalog-${nama.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setNotice(`Daftar barang "${nama}" diunduh. Rapikan namanya dulu, lalu unggah lewat Impor CSV.`)
    } catch (err) {
      setError(errorMessage(err, 'Gagal mengunduh daftar toko.'))
    }
  }

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (item: MasterProduct) => {
    setEditing(item)
    setForm({
      barcode: item.barcode ?? '',
      name: item.name,
      category_name: item.category_name ?? '',
      brand_name: item.brand_name ?? '',
      unit_name: item.unit_name ?? '',
      suggested_sell_price: item.suggested_sell_price,
      vertical_code: item.vertical_code,
      is_weight_based: item.is_weight_based,
      drug_class: item.drug_class ?? '',
      active_ingredient: item.active_ingredient ?? '',
      bpom_registration: item.bpom_registration ?? '',
      is_active: item.is_active,
    })
    setFormOpen(true)
  }

  const save = async () => {
    if (!form.name.trim()) {
      setError('Nama barang wajib diisi.')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (editing) {
        await updateMasterProduct(editing.id, form)
        setNotice(`"${form.name}" disimpan. Baris ini kini terkunci dari panen otomatis.`)
      } else {
        await createMasterProduct(form)
        setNotice(`"${form.name}" ditambahkan ke katalog.`)
      }
      setFormOpen(false)
      reload()
    } catch (err) {
      setError(errorMessage(err, 'Gagal menyimpan.'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (item: MasterProduct) => {
    if (!window.confirm(`Hapus "${item.name}" dari katalog bersama?`)) return
    try {
      await deleteMasterProduct(item.id)
      setNotice(`"${item.name}" dihapus.`)
      reload()
    } catch (err) {
      setError(errorMessage(err, 'Gagal menghapus.'))
    }
  }

  /** Menerbitkan baris yang sedang tampil.
   *
   *  Sengaja "yang tampil", bukan "semua yang menunggu": penerbitan borongan
   *  tanpa batas berarti menyetujui ribuan baris yang tidak pernah muncul di
   *  layar siapa pun — persis kebalikan dari gunanya gerbang ini. */
  const publishVisible = async () => {
    const ids = items.filter((i) => !i.is_active).map((i) => i.id)
    if (ids.length === 0) return
    if (
      !window.confirm(
        `Terbitkan ${ids.length} baris yang tampil? Setelah terbit, isinya — termasuk fotonya — terlihat oleh semua toko.`
      )
    ) {
      return
    }
    setPublishing(true)
    setError('')
    setNotice('')
    try {
      const res = await publishMasterProducts(ids)
      setNotice(`${res.data.published} baris diterbitkan.`)
      reload()
    } catch (err) {
      setError(errorMessage(err, 'Gagal menerbitkan.'))
    } finally {
      setPublishing(false)
    }
  }

  const publishOne = async (item: MasterProduct) => {
    try {
      await publishMasterProducts([item.id])
      setNotice(`"${item.name}" diterbitkan.`)
      reload()
    } catch (err) {
      setError(errorMessage(err, 'Gagal menerbitkan.'))
    }
  }

  /** Mengunggah berkas katalog.
   *
   *  Baris kurasi masuk langsung dalam keadaan aktif — gerbang tinjau melindungi
   *  dari foto dan nama milik toko lain, sedangkan berkas ini diketik admin
   *  sendiri. Menahannya di belakang gerbang hanya menyuruh orang menyetujui
   *  pekerjaannya sendiri. */
  const importFile = async (file: File) => {
    setImporting(true)
    setError('')
    setNotice('')
    try {
      const res = await importMasterProducts(file)
      const { total, success, failed, errors } = res.data
      setNotice(
        `Impor selesai — ${success} dari ${total} baris masuk${failed > 0 ? `, ${failed} gagal` : ''}.` +
          (errors?.length ? ` Baris pertama yang gagal: ${errors[0].row} — ${errors[0].message}` : '')
      )
      reload()
    } catch (err) {
      setError(errorMessage(err, 'Impor gagal.'))
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const harvest = async () => {
    setHarvesting(true)
    setError('')
    setNotice('')
    try {
      const res = await harvestMasterProducts()
      setNotice(
        `Panen selesai — ${res.data.affected} baris katalog diperbarui. Baris baru MENUNGGU TINJAU dan belum terlihat toko mana pun sampai diterbitkan.`
      )
      reload()
    } catch (err) {
      setError(errorMessage(err, 'Panen gagal.'))
    } finally {
      setHarvesting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Katalog Produk Bersama</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Isian yang dipakai toko baru agar tidak perlu mengetik ulang rak yang isinya sama dengan
            ribuan toko lain. Panen mengagregasi produk seluruh toko per barcode; barang tanpa
            barcode — beras curah, telur kiloan, gorengan — disatukan lewat namanya di dalam satu
            sub-jenis usaha — tetapi hanya bila TIGA toko mengejanya sama persis, dan barang
            sembako hampir tidak pernah dieja sama. Karena itu ada Impor CSV: daftar baku yang
            diketik sekali, masuk sebagai kurasi, dan tidak pernah ditimpa panen. Baris hasil
            panen MENUNGGU TINJAU: ia belum terlihat toko mana pun
            sampai diterbitkan dari sini, karena foto yang ikut terpanen berasal dari toko lain.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {pending > 0 && (
            <button
              onClick={publishVisible}
              disabled={publishing || items.every((i) => i.is_active)}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              title="Menerbitkan baris yang sedang tampil di layar ini"
            >
              {publishing ? 'Menerbitkan…' : `Terbitkan yang tampil (${pending} menunggu)`}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void importFile(file)
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-100 disabled:opacity-50"
            title="Unggah berkas CSV berisi daftar barang baku"
          >
            {importing ? 'Mengimpor…' : '⬆️ Impor CSV'}
          </button>
          <button
            onClick={harvest}
            disabled={harvesting}
            className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-100 disabled:opacity-50"
          >
            {harvesting ? 'Memanen…' : '🌾 Panen dari toko'}
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
          >
            + Tambah
          </button>
        </div>
      </div>

      {notice && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Ambil dari toko: jalan keluar untuk yang tidak bisa diperbaiki panen —
          toko yang sudah mendata ratusan barang sendirian tetap tidak menyumbang
          apa pun, karena panen menuntut tiga toko mengeja barang yang sama. */}
      <div className="flex flex-col sm:flex-row gap-3 items-start bg-slate-50 border border-slate-200 rounded-lg p-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-700">Ambil daftar dari satu toko</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Mengunduh nama, barcode, kategori, dan satuan milik toko itu — tanpa harga dan tanpa
            foto. Rapikan namanya di spreadsheet, lalu unggah lewat Impor CSV.
          </p>
        </div>
        <select
          value={sourceBusiness}
          onChange={(e) => setSourceBusiness(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-56"
        >
          <option value="">Pilih toko…</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>{b.business_name}</option>
          ))}
        </select>
        <button
          onClick={downloadCandidates}
          disabled={!sourceBusiness}
          className="px-4 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-100 disabled:opacity-50"
        >
          Unduh CSV
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={params.search ?? ''}
          onChange={(e) => {
            setLoading(true)
            setParams((p) => ({ ...p, search: e.target.value, page: 1 }))
          }}
          placeholder="Cari nama barang…"
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={params.sort_by ?? ''}
          onChange={(e) => {
            setLoading(true)
            setParams((p) => ({ ...p, sort_by: e.target.value, page: 1 }))
          }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Semua status</option>
          <option value="pending">Menunggu tinjau</option>
        </select>
        <select
          value={params.vertical ?? ''}
          onChange={(e) => {
            setLoading(true)
            setParams((p) => ({ ...p, vertical: e.target.value, page: 1 }))
          }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Semua sub-jenis</option>
          {VERTICALS.filter((v) => v.value).map((v) => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      </div>

      <div className="text-sm text-slate-500">
        {total > 0 ? `${total.toLocaleString('id-ID')} barang di katalog` : 'Katalog masih kosong'}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nama</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Barcode</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Kategori</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Sub-jenis</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Harga saran</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Toko</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Asal</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Memuat…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Belum ada barang</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {/* Foto ditampilkan justru supaya bisa DIKURASI: sejak panen ikut
                            membawa foto, gambar yang salah atau tidak pantas dari satu toko
                            akan terbit di katalog seluruh toko sampai ada yang melihatnya di sini. */}
                        <span className="shrink-0 w-9 h-9 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
                          {item.image ? (
                            <img src={item.image} alt="" loading="lazy" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-slate-300">foto</span>
                          )}
                        </span>
                        <div>
                          <div className="font-medium text-slate-700 capitalize">{item.name}</div>
                          <div className="flex gap-1.5 mt-0.5">
                            {item.brand_name && (
                              <span className="text-xs text-slate-400 capitalize">{item.brand_name}</span>
                            )}
                            {item.is_weight_based && (
                              <span className="text-xs text-amber-600">kiloan</span>
                            )}
                            {item.drug_class && (
                              <span className="text-xs text-rose-600">{drugClassLabel(item.drug_class)}</span>
                            )}
                            {!item.is_active && (
                              <span className="text-xs text-amber-600">menunggu tinjau</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {item.barcode ?? <span className="text-slate-300">tanpa barcode</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{item.category_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.vertical_code ? verticalLabel(item.vertical_code) : 'Semua'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 whitespace-nowrap">
                      {rupiah(item.suggested_sell_price)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {item.source_business_count || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {item.is_verified ? (
                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-indigo-50 text-indigo-700">
                          Kurasi
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                          Panen
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {!item.is_active && (
                        <button
                          onClick={() => publishOne(item)}
                          className="text-emerald-600 hover:text-emerald-800 text-sm mr-3"
                        >
                          Terbitkan
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(item)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm mr-3"
                      >
                        Ubah
                      </button>
                      <button
                        onClick={() => remove(item)}
                        className="text-rose-600 hover:text-rose-800 text-sm"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={params.page ?? 1}
        total={total}
        limit={params.limit ?? 25}
        onChange={(page) => {
          setLoading(true)
          setParams((p) => ({ ...p, page }))
        }}
      />

      <Modal
        title={editing ? 'Ubah barang katalog' : 'Tambah barang katalog'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
            Menyimpan lewat form ini menandai barangnya <strong>terkurasi</strong>: panen
            berikutnya tidak akan menimpanya lagi.
          </p>
          <Field label="Nama barang">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputClass}
              placeholder="beras premium 5 kg"
            />
          </Field>
          <Field label="Barcode" hint="Kosongkan untuk barang curah yang tidak punya kode pabrik.">
            <input
              value={form.barcode ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
              className={inputClass}
              placeholder="8991002101005"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kategori">
              <input
                value={form.category_name ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, category_name: e.target.value }))}
                className={inputClass}
                placeholder="sembako"
              />
            </Field>
            <Field label="Merek">
              <input
                value={form.brand_name ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, brand_name: e.target.value }))}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Satuan">
              <input
                value={form.unit_name ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, unit_name: e.target.value }))}
                className={inputClass}
                placeholder="pcs / kg / sak"
              />
            </Field>
            <Field label="Harga saran" hint="Kosongkan bila tidak ingin menyarankan harga.">
              <input
                type="number"
                value={form.suggested_sell_price ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    suggested_sell_price: e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
                className={inputClass}
              />
            </Field>
          </div>
          {/* Kolom apotek. Sengaja ada di panel kurasi: panen mendiamkan golongan
              obat yang diperselisihkan toko-tokonya, dan yang didiamkan itu
              hanya bisa diselesaikan manusia yang memeriksa kemasannya. */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Golongan obat" hint="Kosongkan bila barang ini bukan obat.">
              <select
                value={form.drug_class ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, drug_class: e.target.value }))}
                className={inputClass}
              >
                {DRUG_CLASSES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Zat aktif">
              <input
                value={form.active_ingredient ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, active_ingredient: e.target.value }))}
                className={inputClass}
                placeholder="paracetamol"
              />
            </Field>
          </div>
          <Field label="Nomor izin edar (BPOM)">
            <input
              value={form.bpom_registration ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, bpom_registration: e.target.value }))}
              className={inputClass}
              placeholder="DKL1234567890A1"
            />
          </Field>
          <Field label="Sub-jenis usaha">
            <select
              value={form.vertical_code}
              onChange={(e) => setForm((f) => ({ ...f, vertical_code: e.target.value }))}
              className={inputClass}
            >
              {VERTICALS.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_weight_based}
              onChange={(e) => setForm((f) => ({ ...f, is_weight_based: e.target.checked }))}
            />
            Dijual per berat (kiloan)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active ?? true}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Tampilkan di katalog toko
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setFormOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

const inputClass =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}
