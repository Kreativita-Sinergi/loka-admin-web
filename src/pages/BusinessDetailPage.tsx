import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getBusinessById, toggleBusinessActive, createMembership, updateMembership, deactivateMembership, deleteBusiness } from '../api/admin'
import type { AdminBusiness } from '../types'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import DeleteConfirmModal from '../components/ui/DeleteConfirmModal'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [business, setBusiness] = useState<AdminBusiness | null>(null)
  const [loading, setLoading] = useState(true)
  const [membershipModal, setMembershipModal] = useState(false)
  const [form, setForm] = useState({ type: 'lite', days: 30 })
  const [submitting, setSubmitting] = useState(false)
  const [editMembershipModal, setEditMembershipModal] = useState(false)
  const [editForm, setEditForm] = useState({ type: '', extend_days: 0, end_date: '' })
  const [deleteModal, setDeleteModal] = useState(false)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [fetchTick, setFetchTick] = useState(0)

  const refetch = () => {
    setLoading(true)
    setFetchTick((n) => n + 1)
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    getBusinessById(id)
      .then((res) => { if (!cancelled) setBusiness(res.data) })
      .catch(() => { if (!cancelled) navigate('/businesses') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id, navigate, fetchTick])

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

  const handleChangePlan = async (type: string) => {
    if (!business?.membership) return
    const label = type === 'pro' ? 'Pro' : type === 'lite' ? 'Lite' : 'Gratis'
    if (!confirm(`Ubah paket bisnis ini ke ${label}?`)) return
    setUpgrading(type)
    try {
      await updateMembership(business.membership.id, { type })
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

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/businesses')} className="text-slate-400 hover:text-slate-600">←</button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{business.business_name}</h2>
            <p className="text-sm text-slate-500">{business.id}</p>
          </div>
        </div>
        <button onClick={() => setDeleteModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
          🗑️ Hapus Bisnis
        </button>
      </div>

      {/* Business info */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {business.image ? (
              <img src={business.image} alt="" className="w-16 h-16 rounded-xl object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl">
                {business.business_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-slate-800">{business.business_name}</h3>
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

        <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-slate-100 text-sm">
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
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Pemilik Akun</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
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
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
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
          <div className="grid grid-cols-2 gap-4 text-sm">
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
                  { type: 'pro', label: 'Pro', cls: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
                  { type: 'lite', label: 'Lite', cls: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
                  { type: 'free', label: 'Gratis', cls: 'bg-slate-200 hover:bg-slate-300 text-slate-700' },
                ].map((p) => (
                  <button
                    key={p.type}
                    onClick={() => handleChangePlan(p.type)}
                    disabled={membership.type === p.type || upgrading !== null}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${p.cls}`}
                  >
                    {upgrading === p.type
                      ? 'Memproses...'
                      : membership.type === p.type
                        ? `${p.label} (aktif)`
                        : `Naikkan ke ${p.label}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Tidak ada membership aktif</p>
        )}
      </div>

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
