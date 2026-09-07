import { useCallback, useEffect, useState } from 'react'
import Modal from '../components/ui/Modal'
import Pagination from '../components/ui/Pagination'
import {
  createMasterProduct,
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

  const harvest = async () => {
    setHarvesting(true)
    setError('')
    setNotice('')
    try {
      const res = await harvestMasterProducts()
      setNotice(`Panen selesai — ${res.data.affected} baris katalog diperbarui.`)
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
            barcode — beras curah, telur kiloan, gorengan — hanya bisa masuk lewat tombol Tambah
            di bawah.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
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
                      <div className="font-medium text-slate-700 capitalize">{item.name}</div>
                      <div className="flex gap-1.5 mt-0.5">
                        {item.brand_name && (
                          <span className="text-xs text-slate-400 capitalize">{item.brand_name}</span>
                        )}
                        {item.is_weight_based && (
                          <span className="text-xs text-amber-600">kiloan</span>
                        )}
                        {!item.is_active && (
                          <span className="text-xs text-rose-600">nonaktif</span>
                        )}
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
