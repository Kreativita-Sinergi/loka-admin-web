import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { getBusinessById, getActiveUsers, toggleBusinessActive, createMembership, updateMembership, deactivateMembership, deleteBusiness, updateBusiness, getBusinessTypes, getBusinessVerticals } from '../api/admin'
import type { BusinessActiveUsers } from '../api/admin'
import type { AdminBusiness, AdminBusinessType, AdminBusinessVertical } from '../types'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import DeleteConfirmModal from '../components/ui/DeleteConfirmModal'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [business, setBusiness] = useState<AdminBusiness | null>(null)
  const [usage, setUsage] = useState<BusinessActiveUsers | null>(null)
  const [loading, setLoading] = useState(true)
  const [membershipModal, setMembershipModal] = useState(false)
  const [form, setForm] = useState({ type: 'lite', days: 30 })
  const [submitting, setSubmitting] = useState(false)
  const [editMembershipModal, setEditMembershipModal] = useState(false)
  const [editForm, setEditForm] = useState({ type: '', extend_days: 0, end_date: '' })
  const [deleteModal, setDeleteModal] = useState(false)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [fetchTick, setFetchTick] = useState(0)
  const [editBusinessModal, setEditBusinessModal] = useState(false)
  const [businessForm, setBusinessForm] = useState({ business_name: '', owner_name: '', business_type_id: 0, business_vertical_id: 0 })
  const [businessTypes, setBusinessTypes] = useState<AdminBusinessType[]>([])
  // Bidang usaha selalu dimuat ulang per pilar: daftarnya berbeda tiap jenis
  // bisnis, dan menyisakan daftar lama membuat admin bisa memilih pasangan yang
  // langsung ditolak server.
  const [verticals, setVerticals] = useState<AdminBusinessVertical[]>([])
  const [savingBusiness, setSavingBusiness] = useState(false)

  const refetch = () => {
    setLoading(true)
    setFetchTick((n) => n + 1)
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([getBusinessById(id), getActiveUsers()])
      .then(([businessRes, usageRes]) => {
        if (cancelled) return
        setBusiness(businessRes.data)
        setUsage((usageRes.data.businesses ?? []).find((row) => row.business_id === id) ?? null)
      })
      .catch(() => { if (!cancelled) navigate('/businesses') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id, navigate, fetchTick])

  const openEditBusiness = () => {
    if (!business) return
    setBusinessForm({
      business_name: business.business_name,
      owner_name: business.owner_name,
      business_type_id: business.business_type?.id ?? 0,
      business_vertical_id: business.business_vertical?.id ?? 0,
    })
    if (businessTypes.length === 0) {
      getBusinessTypes().then((res) => setBusinessTypes(res.data)).catch(() => {})
    }
    const typeId = business.business_type?.id
    if (typeId) {
      getBusinessVerticals(typeId).then((res) => setVerticals(res.data ?? [])).catch(() => setVerticals([]))
    } else {
      setVerticals([])
    }
    setEditBusinessModal(true)
  }

  const handleUpdateBusiness = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!business) return
    setSavingBusiness(true)
    try {
      // 0 di form berarti "tidak dipilih" — dikirim sebagai null supaya server
      // benar-benar melepas bidang usahanya, bukan menganggapnya id nol.
      await updateBusiness(business.id, {
        ...businessForm,
        business_vertical_id: businessForm.business_vertical_id || null,
      })
      setEditBusinessModal(false)
      refetch()
    } catch (err) {
      console.error(err)
    } finally {
      setSavingBusiness(false)
    }
  }

  const handleToggle = async () => {
    if (!business) return
    if (!confirm(`${business.is_active ? 'Nonaktifkan' : 'Aktifkan'} bisnis ini?`)) return
    await toggleBusinessActive(business.id)
    refetch()
  }

  const handleCreateMembership = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!business) return
    setSubmitting(true)
    try {
      await createMembership({ business_id: business.id, ...form })
      setMembershipModal(false)
      refetch()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const openEditMembership = () => {
    if (!business?.membership) return
    setEditForm({
      type: business.membership.type,
      extend_days: 0,
      end_date: format(new Date(business.membership.end_date), 'yyyy-MM-dd'),
    })
    setEditMembershipModal(true)
  }

  const handleUpdateMembership = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!business?.membership) return
    setSubmitting(true)
    try {
      await updateMembership(business.membership.id, {
        type: editForm.type || undefined,
        extend_days: editForm.extend_days > 0 ? editForm.extend_days : undefined,
        end_date: editForm.end_date || undefined,
      })
      setEditMembershipModal(false)
      refetch()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  // days: durasi paket berbayar dari sekarang (30 = bulanan, 365 = tahunan).
  // Untuk paket Gratis pakai durasi sangat panjang agar tidak pernah expired.
  const handleChangePlan = async (type: string, days: number, actionKey: string) => {
    if (!business?.membership) return
    const typeLabel = type === 'pro' ? 'Pro' : type === 'lite' ? 'Lite' : 'Gratis'
    const durationLabel =
      type === 'free' ? '' : days === 30 ? ' bulanan' : days === 365 ? ' tahunan' : ` ${days} hari`
    if (!confirm(`Ubah paket bisnis ini ke ${typeLabel}${durationLabel}?`)) return
    setUpgrading(actionKey)
    try {
      await updateMembership(business.membership.id, { type, extend_days: days })
      refetch()
    } catch (err) {
      console.error(err)
    } finally {
      setUpgrading(null)
    }
  }

  const handleDeactivateMembership = async () => {
    if (!business?.membership) return
    if (!confirm('Nonaktifkan membership bisnis ini?')) return
    try {
      await deactivateMembership(business.membership.id)
      refetch()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Memuat...</div>
  }

  if (!business) return null

  const membership = business.membership
  const isExpired = membership && new Date(membership.end_date) < new Date()
  const backTo = (location.state as { from?: string } | null)?.from === '/usage' ? '/usage' : '/businesses'
  const usageState = !usage?.last_seen_at
    ? { label: 'Belum pernah aktif', tone: 'text-slate-500 bg-slate-100' }
    : usage.active_today > 0
      ? { label: 'Aktif hari ini', tone: 'text-emerald-700 bg-emerald-50' }
      : usage.active_this_week > 0
        ? { label: 'Aktif minggu ini', tone: 'text-amber-700 bg-amber-50' }
        : { label: 'Tidak aktif >7 hari', tone: 'text-red-700 bg-red-50' }

  return (
    <div className="space-y-6 max-w-4xl">
      <DeleteConfirmModal
        open={deleteModal}
        businessName={business.business_name}
        onClose={() => setDeleteModal(false)}
        onConfirm={async () => {
          await deleteBusiness(business.id)
          navigate('/businesses')
        }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <button onClick={() => navigate(backTo)} className="text-slate-400 hover:text-slate-600" aria-label="Kembali">←</button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-800 break-words">{business.business_name}</h2>
            <p className="text-xs sm:text-sm text-slate-500 break-all">{business.id}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          <button onClick={openEditBusiness}
            className="justify-center flex items-center gap-1.5 px-3 py-2 text-sm text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            ✏️ Edit Profil Bisnis
          </button>
          <button onClick={() => setDeleteModal(true)}
            className="justify-center flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
            🗑️ Hapus Bisnis
          </button>
        </div>
      </div>

      {/* Snapshot operasional agar super admin bisa menilai kesehatan tenant
          tanpa perlu membuka laporan milik pemilik bisnis. */}
      <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-semibold text-slate-700">Kesehatan Operasional</h3>
            <p className="text-xs text-slate-400 mt-0.5">Ringkasan aktivitas 7 hari terakhir</p>
          </div>
          <span className={`w-fit px-2.5 py-1 rounded-full text-xs font-medium ${usageState.tone}`}>{usageState.label}</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Metric label="Transaksi" value={(usage?.trx_this_week ?? 0).toLocaleString('id-ID')} hint="7 hari terakhir" positive={(usage?.trx_this_week ?? 0) > 0} />
          <Metric label="Jam pakai" value={formatUsageHours(usage?.hours_this_week ?? 0)} hint="7 hari terakhir" />
          <Metric label="Pengguna aktif" value={`${usage?.active_this_week ?? 0}/${usage?.total_users ?? 0}`} hint="aktif / terdaftar" />
          <Metric label="API calls" value={(usage?.api_calls_this_week ?? 0).toLocaleString('id-ID')} hint="7 hari terakhir" />
          <Metric label="Terakhir aktif" value={lastSeenLabel(usage?.last_seen_at ?? null)} hint="aktivitas pengguna" />
          <Metric label="Data tersimpan" value={(usage?.record_count ?? 0).toLocaleString('id-ID')} hint="transaksi + produk" />
          <Metric label="Aktif hari ini" value={(usage?.active_today ?? 0).toLocaleString('id-ID')} hint="dari pengguna terdaftar" />
          <Metric label="API hari ini" value={(usage?.api_calls_today ?? 0).toLocaleString('id-ID')} hint="permintaan aplikasi" />
        </div>
      </section>

      {/* Business info */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {business.image ? (
              <img src={business.image} alt="" className="w-16 h-16 rounded-xl object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl">
                {business.business_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-800 break-words">{business.business_name}</h3>
              <p className="text-sm text-slate-500">{business.owner_name}</p>
              <p className="text-xs text-slate-400 mt-1">{business.business_type?.name ?? 'Tidak diketahui'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant={business.is_active ? 'success' : 'danger'}>
              {business.is_active ? 'Aktif' : 'Nonaktif'}
            </Badge>
            <button
              onClick={handleToggle}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                business.is_active
                  ? 'bg-red-100 hover:bg-red-200 text-red-700'
                  : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
              }`}
            >
              {business.is_active ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-4 mt-5 pt-5 border-t border-slate-100 text-sm">
          <div>
            <p className="text-slate-400 text-xs">Tipe Bisnis</p>
            <p className="text-slate-700 mt-0.5">{business.business_type?.name ?? '-'}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Tanggal Daftar</p>
            <p className="text-slate-700 mt-0.5">
              {format(new Date(business.created_at), 'dd MMMM yyyy', { locale: localeId })}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Terakhir Diperbarui</p>
            <p className="text-slate-700 mt-0.5">
              {format(new Date(business.updated_at), 'dd MMMM yyyy', { locale: localeId })}
            </p>
          </div>
        </div>
      </div>

      {/* Owner info */}
      {business.owner && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Pemilik Akun</h3>
          <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs">Nama</p>
              <p className="text-slate-700 mt-0.5">{business.owner.name ?? '-'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Email</p>
              <p className="text-slate-700 mt-0.5">{business.owner.email ?? '-'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Nomor HP</p>
              <p className="text-slate-700 mt-0.5">{business.owner.phone_number}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Status Akun</p>
              <div className="flex gap-1 mt-0.5 flex-wrap">
                <Badge variant={business.owner.is_verified ? 'success' : 'warning'}>
                  {business.owner.is_verified ? 'Terverifikasi' : 'Belum verifikasi'}
                </Badge>
                <Badge variant={business.owner.is_active ? 'success' : 'danger'}>
                  {business.owner.is_active ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Bergabung</p>
              <p className="text-slate-700 mt-0.5">
                {format(new Date(business.owner.created_at), 'dd MMM yyyy', { locale: localeId })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Membership info */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-slate-700">Membership</h3>
          <div className="flex gap-2">
            {membership && (
              <>
                <button
                  onClick={openEditMembership}
                  className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                >
                  Edit
                </button>
                {membership.is_active && (
                  <button
                    onClick={handleDeactivateMembership}
                    className="px-3 py-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                  >
                    Nonaktifkan
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => setMembershipModal(true)}
              className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              + Buat Baru
            </button>
          </div>
        </div>

        {membership ? (
          <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs">Paket</p>
              <div className="mt-0.5">
                {membership.type === 'free' ? (
                  <Badge variant="neutral">GRATIS</Badge>
                ) : isExpired ? (
                  <Badge variant="danger">Expired</Badge>
                ) : (
                  <Badge variant={membership.type === 'pro' ? 'success' : membership.type === 'lite' ? 'info' : 'warning'}>
                    {membership.type.toUpperCase()}
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Sisa Hari</p>
              <p className="text-slate-700 mt-0.5 font-semibold">
                {membership.days_remaining > 0 ? `${membership.days_remaining} hari` : 'Sudah berakhir'}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Mulai</p>
              <p className="text-slate-700 mt-0.5">
                {format(new Date(membership.start_date), 'dd MMM yyyy', { locale: localeId })}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Berakhir</p>
              <p className={`mt-0.5 font-medium ${isExpired ? 'text-red-600' : 'text-slate-700'}`}>
                {format(new Date(membership.end_date), 'dd MMM yyyy', { locale: localeId })}
              </p>
            </div>
            {membership.scheduled_downgrade_to && (
              <div className="col-span-2">
                <p className="text-slate-400 text-xs">Jadwal Downgrade</p>
                <p className="text-amber-600 mt-0.5">→ {membership.scheduled_downgrade_to.toUpperCase()}</p>
              </div>
            )}
            <div className="col-span-2 pt-3 mt-1 border-t border-slate-100">
              <p className="text-slate-400 text-xs mb-2">Ubah Paket Cepat</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'pro-30', type: 'pro', days: 30, label: 'Pro Bulanan', cls: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
                  { key: 'pro-365', type: 'pro', days: 365, label: 'Pro Tahunan', cls: 'bg-emerald-700 hover:bg-emerald-800 text-white' },
                  { key: 'lite-30', type: 'lite', days: 30, label: 'Lite Bulanan', cls: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
                  { key: 'lite-365', type: 'lite', days: 365, label: 'Lite Tahunan', cls: 'bg-indigo-700 hover:bg-indigo-800 text-white' },
                  // Gratis: durasi sangat panjang (≈100 tahun) agar tidak pernah expired.
                  { key: 'free', type: 'free', days: 36500, label: 'Gratis', cls: 'bg-slate-200 hover:bg-slate-300 text-slate-700' },
                ].map((p) => (
                  <button
                    key={p.key}
                    onClick={() => handleChangePlan(p.type, p.days, p.key)}
                    // Hanya Gratis yang dinonaktifkan saat sudah aktif. Pro/Lite tetap bisa
                    // diklik untuk ganti durasi (bulanan↔tahunan) atau perpanjang.
                    disabled={(p.type === 'free' && membership.type === 'free') || upgrading !== null}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${p.cls}`}
                  >
                    {upgrading === p.key
                      ? 'Memproses...'
                      : membership.type === p.type && p.type === 'free'
                        ? 'Gratis (aktif)'
                        : p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Tidak ada membership aktif</p>
        )}
      </div>

      {/* Edit Business Profile Modal */}
      <Modal title="Edit Profil Bisnis" open={editBusinessModal} onClose={() => setEditBusinessModal(false)}>
        <form onSubmit={handleUpdateBusiness} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Bisnis</label>
            <input
              type="text"
              required
              value={businessForm.business_name}
              onChange={(e) => setBusinessForm((f) => ({ ...f, business_name: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Pemilik</label>
            <input
              type="text"
              required
              value={businessForm.owner_name}
              onChange={(e) => setBusinessForm((f) => ({ ...f, owner_name: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Bisnis</label>
            <select
              required
              value={businessForm.business_type_id || ''}
              onChange={(e) => {
                const typeId = parseInt(e.target.value) || 0
                // Bidang usaha lama milik pilar sebelumnya — dikosongkan agar
                // admin memilih ulang, bukan mengirim pasangan yang tidak sepadan.
                setBusinessForm((f) => ({ ...f, business_type_id: typeId, business_vertical_id: 0 }))
                setVerticals([])
                if (typeId) {
                  getBusinessVerticals(typeId).then((res) => setVerticals(res.data ?? [])).catch(() => setVerticals([]))
                }
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="" disabled>Pilih jenis bisnis...</option>
              {businessTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bidang Usaha</label>
            <select
              value={businessForm.business_vertical_id || ''}
              onChange={(e) => setBusinessForm((f) => ({ ...f, business_vertical_id: parseInt(e.target.value) || 0 }))}
              disabled={!businessForm.business_type_id}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
            >
              <option value="">Tidak dipilih</option>
              {verticals.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Menentukan kolom isian tiap transaksi dan istilah di aplikasi kasir.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setEditBusinessModal(false)}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
              Batal
            </button>
            <button type="submit" disabled={savingBusiness}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-50">
              {savingBusiness ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Membership Modal */}
      <Modal title="Buat Membership Baru" open={membershipModal} onClose={() => setMembershipModal(false)}>
        <form onSubmit={handleCreateMembership} className="space-y-4">
          <p className="text-sm text-slate-500">
            Membership aktif yang ada akan dinonaktifkan dan diganti dengan yang baru.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Paket</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="free">Gratis</option>
              <option value="trial">Trial</option>
              <option value="lite">Lite</option>
              <option value="pro">Pro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Durasi (hari)</label>
            <input
              type="number"
              min={1}
              value={form.days}
              onChange={(e) => setForm((f) => ({ ...f, days: parseInt(e.target.value) || 30 }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setMembershipModal(false)}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
              Batal
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-50">
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Membership Modal */}
      <Modal title="Edit Membership" open={editMembershipModal} onClose={() => setEditMembershipModal(false)}>
        <form onSubmit={handleUpdateMembership} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Paket</label>
            <select
              value={editForm.type}
              onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="free">Gratis</option>
              <option value="trial">Trial</option>
              <option value="lite">Lite</option>
              <option value="pro">Pro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Berakhir</label>
            <input
              type="date"
              value={editForm.end_date}
              onChange={(e) => setEditForm((f) => ({ ...f, end_date: e.target.value, extend_days: 0 }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Atau Perpanjang (hari)</label>
            <input
              type="number"
              min={0}
              value={editForm.extend_days}
              onChange={(e) => setEditForm((f) => ({ ...f, extend_days: parseInt(e.target.value) || 0, end_date: '' }))}
              placeholder="0 = tidak perpanjang"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setEditMembershipModal(false)}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
              Batal
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-50">
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function Metric({ label, value, hint, positive }: { label: string; value: string; hint: string; positive?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-3 min-w-0">
      <p className="text-xs text-slate-500 truncate">{label}</p>
      <p className={`mt-1 text-lg font-bold truncate ${positive ? 'text-emerald-600' : 'text-slate-800'}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-400 truncate">{hint}</p>
    </div>
  )
}

function formatUsageHours(hours: number): string {
  const minutes = Math.round(hours * 60)
  const wholeHours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (wholeHours === 0) return `${remainingMinutes}m`
  return remainingMinutes === 0 ? `${wholeHours}j` : `${wholeHours}j ${remainingMinutes}m`
}

function lastSeenLabel(iso: string | null): string {
  if (!iso) return 'Belum pernah'
  const diffMinutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (diffMinutes < 60) return `${diffMinutes}m lalu`
  const hours = Math.floor(diffMinutes / 60)
  if (hours < 24) return `${hours}j lalu`
  return `${Math.floor(hours / 24)} hari lalu`
}
