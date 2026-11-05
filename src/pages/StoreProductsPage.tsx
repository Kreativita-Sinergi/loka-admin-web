import Select from '../components/ui/Select'
import { FilterBar, SearchField, filterControl } from '../components/ui/FilterBar'
import { Package, RefreshCw } from 'lucide-react'
import ButtonIcon from '../components/ui/ButtonIcon'
import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getStoreProducts, type StoreProduct } from '../api/adminData'
import { useAdminData } from '../hooks/useAdminData'
import { formatDate, formatNumber } from '../lib/analytics'
import { formatMoney } from '../lib/sales'
import BusinessFilter from '../components/ui/BusinessFilter'
import Pagination from '../components/ui/Pagination'
import Badge from '../components/ui/Badge'

const LIMIT = 25

/** Harga jual, atau rentang harga varian ("Rp10.000 – Rp25.000"). */
function priceLabel(p: StoreProduct) {
  if (p.variant_count > 0) {
    if (p.min_variant_price == null) return '—'
    return p.min_variant_price === p.max_variant_price ? formatMoney(p.min_variant_price) : `${formatMoney(p.min_variant_price)} – ${formatMoney(p.max_variant_price)}`
  }
  return formatMoney(p.sell_price)
}

// Isi katalog sebuah toko (atau semua toko), hanya baca. Jumlahnya sama dengan
// kolom "Produk" di Aktivitas & Pemakaian: produk yang belum dihapus.
export default function StoreProductsPage() {
  const [params, setParams] = useSearchParams()
  const businessId = params.get('business_id') ?? ''
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [paging, setPaging] = useState({ businessId, page: 1 })
  const page = paging.businessId === businessId ? paging.page : 1
  const fetcher = useCallback(async () => {
    const r = await getStoreProducts({ page, limit: LIMIT, search, status, business_id: businessId })
    if (!r.status) throw new Error(r.message)
    return r
  }, [page, search, status, businessId])
  const { data, loading, error, refresh } = useAdminData(fetcher)
  const resetPage = () => setPaging({ businessId, page: 1 })
  const showStore = !businessId
  const headers = ['Produk', ...(showStore ? ['Toko'] : []), 'Kategori', 'Harga jual', 'Stok', 'Status', 'Ditambahkan']
  return <div className="space-y-4">
    <div className="flex flex-wrap justify-between items-start gap-3"><div><h2 className="text-2xl font-bold text-slate-900">Produk Toko</h2><p className="mt-1 text-sm text-slate-500">Isi katalog setiap toko, hanya baca. Produk yang dihapus dan toko demo tidak ditampilkan.</p></div><button disabled={loading} onClick={refresh} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50"><ButtonIcon icon={RefreshCw} />Perbarui</button></div>
    <FilterBar
      search={<SearchField label="Cari produk" placeholder="Cari nama, SKU, barcode, kategori, atau toko…" value={search} onSearch={next => { setSearch(next); resetPage() }} />}
      controls={<Select aria-label="Status produk" value={status} onChange={e => { setStatus(e.target.value); resetPage() }} className={filterControl}><option value="">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></Select>}
    >
      <BusinessFilter className="lg:w-64" value={businessId} onChange={id => setParams(id ? { business_id: id } : {})} />
    </FilterBar>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} <button onClick={refresh} className="underline">Coba lagi</button></div>}
    {data && !loading && <p className="text-sm text-slate-500">{formatNumber(data.pagination.total)} produk{search || status ? ' sesuai filter' : ''}</p>}
    <div className="overflow-hidden card"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{headers.map(h => <th key={h} className={`whitespace-nowrap px-4 py-3 ${h === 'Harga jual' || h === 'Stok' ? 'text-right' : ''}`}>{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">
      {loading || !data?.data.length ? <tr><td colSpan={headers.length} className="px-4 py-12 text-center text-slate-400">{loading ? 'Memuat data…' : error ? 'Data belum berhasil dimuat.' : 'Tidak ada produk sesuai filter.'}</td></tr> : data.data.map(p => <tr key={p.id} className="hover:bg-slate-50">
        <td className="px-4 py-3"><div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100 text-slate-300 flex items-center justify-center">{p.image ? <img src={p.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package size={18} aria-hidden />}</div>
          <div className="min-w-0"><p className="font-medium text-slate-800">{p.name}</p><p className="text-xs text-slate-500">{[p.sku, p.variant_count > 0 ? `${formatNumber(p.variant_count)} varian` : null].filter(Boolean).join(' · ') || '—'}</p></div>
        </div></td>
        {showStore && <td className="px-4 py-3"><Link className="text-indigo-600 hover:underline" to={`/businesses/${p.business_id}`}>{p.business_name}</Link></td>}
        <td className="px-4 py-3 text-slate-600">{p.category_name || <span className="text-slate-400">Tanpa kategori</span>}</td>
        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">{priceLabel(p)}</td>
        <td className={`whitespace-nowrap px-4 py-3 text-right tabular-nums ${p.stock != null && p.stock <= 0 ? 'font-semibold text-red-600' : 'text-slate-600'}`}>{p.stock == null ? <span className="text-xs text-slate-400">Tidak dilacak</span> : formatNumber(p.stock)}</td>
        <td className="px-4 py-3"><Badge variant={p.is_active ? 'success' : 'neutral'}>{p.is_active ? 'Aktif' : 'Nonaktif'}</Badge></td>
        <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(p.created_at)}</td>
      </tr>)}
    </tbody></table></div>{data && !loading && <div className="px-4 pb-4"><Pagination page={page} limit={LIMIT} total={data.pagination.total} onChange={page => setPaging({ businessId, page })} /></div>}</div>
  </div>
}
