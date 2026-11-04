import Select from '../components/ui/Select'
import { FilterBar, SearchField, filterControl } from '../components/ui/FilterBar'
import { ArrowRight, RefreshCw } from 'lucide-react'
import ButtonIcon from '../components/ui/ButtonIcon'
import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getDirectoryUsers } from '../api/adminData'
import { useAdminData } from '../hooks/useAdminData'
import { formatDate } from '../lib/analytics'
import BusinessFilter from '../components/ui/BusinessFilter'
import Pagination from '../components/ui/Pagination'
import Badge from '../components/ui/Badge'

export default function UsersPage() {
  const [params, setParams] = useSearchParams()
  const businessId = params.get('business_id') ?? ''
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [kind, setKind] = useState('')
  const [paging, setPaging] = useState({ businessId, page: 1 })
  const page = paging.businessId === businessId ? paging.page : 1
  const fetcher = useCallback(async () => {
    const r = await getDirectoryUsers({ page, limit: 20, search, status, kind, business_id: businessId })
    if (!r.status) throw new Error(r.message)
    return r
  }, [page, search, status, kind, businessId])
  const { data, loading, error, refresh } = useAdminData(fetcher)
  const resetPage = () => setPaging({ businessId, page: 1 })
  return <div className="space-y-4">
    <div className="flex flex-wrap justify-between items-start gap-3"><div><h2 className="text-2xl font-bold text-slate-900">Pengguna</h2><p className="mt-1 text-sm text-slate-500">Akun pemilik dan staf seluruh bisnis. Akun demo serta staf yang dihapus tidak ditampilkan.</p></div><button disabled={loading} onClick={refresh} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50"><ButtonIcon icon={RefreshCw} />Perbarui</button></div>
    <FilterBar
      search={<SearchField label="Cari pengguna" placeholder="Cari nama, email, telepon, atau nama masuk…" value={search} onSearch={next => { setSearch(next); resetPage() }} />}
      controls={<>
        <Select aria-label="Jenis pengguna" value={kind} onChange={e => { setKind(e.target.value); resetPage() }} className={filterControl}><option value="">Semua jenis</option><option value="account">Akun bisnis</option><option value="employee">Staf</option></Select>
        <Select aria-label="Status pengguna" value={status} onChange={e => { setStatus(e.target.value); resetPage() }} className={filterControl}><option value="">Semua status</option><option value="active">Diaktifkan</option><option value="inactive">Dinonaktifkan</option></Select>
      </>}
    >
      <BusinessFilter className="lg:w-64" value={businessId} onChange={id => setParams(id ? { business_id: id } : {})} />
    </FilterBar>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} <button onClick={refresh} className="underline">Coba lagi</button></div>}
    <div className="overflow-hidden card"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Pengguna', 'Kontak', 'Bisnis', 'Peran', 'Status akun', 'Terakhir aktif', 'Terdaftar'].map(h => <th key={h} className="whitespace-nowrap px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">
      {loading || !data?.data.length ? <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">{loading ? 'Memuat data…' : error ? 'Data belum berhasil dimuat.' : 'Tidak ada pengguna sesuai filter.'}</td></tr> : data.data.map(u => <tr key={`${u.kind}-${u.id}`} className="hover:bg-slate-50">
        <td className="px-4 py-3"><p className="font-medium text-slate-800">{u.name || 'Tanpa nama'}</p><p className="text-xs text-slate-500">{u.username || (u.kind === 'employee' ? 'Staf' : 'Akun bisnis')}</p><p title={u.id} className="mt-1 text-xs text-slate-400">{u.id.slice(0, 8)}</p></td>
        <td className="px-4 py-3"><p className="break-all">{u.email || '—'}</p><p className="text-xs text-slate-500">{u.phone_number || '—'}</p>{u.email && u.is_email_verified !== null && <p className={`text-xs ${u.is_email_verified ? 'text-emerald-600' : 'text-amber-600'}`}>{u.is_email_verified ? 'Email terverifikasi' : 'Email belum terverifikasi'}</p>}</td>
        <td className="px-4 py-3"><Link className="text-indigo-600 hover:underline" to={`/businesses/${u.business_id}`}>{u.business_name}</Link><Link className="mt-1 block text-xs text-slate-500 hover:text-indigo-600" to={`/sales?business_id=${u.business_id}`}>Lihat penjualan<ButtonIcon icon={ArrowRight} side="end" size={13} /></Link></td>
        <td className="px-4 py-3"><Badge variant="info">{u.role || 'Belum diatur'}</Badge></td><td className="px-4 py-3"><Badge variant={u.is_active ? 'success' : 'danger'}>{u.is_active ? 'Diaktifkan' : 'Dinonaktifkan'}</Badge></td><td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(u.last_seen_at, true)}</td><td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(u.created_at)}</td>
      </tr>)}
    </tbody></table></div>{data && !loading && <div className="px-4 pb-4"><Pagination page={page} limit={20} total={data.pagination.total} onChange={page => setPaging({ businessId, page })} /></div>}</div>
  </div>
}
