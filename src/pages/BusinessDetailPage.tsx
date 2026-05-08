import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getBusinessById, toggleBusinessActive, createMembership, deleteBusiness } from '../api/admin'
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
  const [deleteModal, setDeleteModal] = useState(false)
  const [fetchTick, setFetchTick] = useState(0)

  const refetch = () => setFetchTick((n) => n + 1)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getBusinessById(id)
      .then((res) => setBusiness(res.data))
      .catch(() => navigate('/businesses'))
      .finally(() => setLoading(false))
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
          <button
            onClick={() => setMembershipModal(true)}
            className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            + Buat Membership
          </button>
        </div>

        {membership ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs">Paket</p>
              <div className="mt-0.5">
                {isExpired ? (
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
    </div>
  )
}
