import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, RefreshCw } from 'lucide-react'
import ButtonIcon from '../components/ui/ButtonIcon'
import Badge from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import AccountsPanel from '../components/social/AccountsPanel'
import SocialCalendar from '../components/social/SocialCalendar'
import { getSocialPosts, getSocialStatus, type SocialPost, type SocialStatus } from '../api/social'
import { POST_STATUS, THREADS_STATUS, mediaPoster, monthRange, wibDateKey, wibParts } from '../lib/social'
import { formatDate } from '../lib/analytics'

function PostRow({ p }: { p: SocialPost }) {
  const st = POST_STATUS[p.status]
  return (
    <li>
      <Link to={`/social/${p.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
        {p.media[0] ? <img src={mediaPoster(p.media[0].url)} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" /> : <span className="h-10 w-10 shrink-0 rounded-md bg-slate-100" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-slate-800">{p.caption || <span className="italic text-slate-400">Tanpa caption</span>}</p>
          <p className="text-xs text-slate-500">
            {p.scheduled_at ? `${formatDate(p.scheduled_at, true)} WIB` : `Dibuat ${formatDate(p.created_at)}`}
            {p.threads_enabled && ` · Threads: ${THREADS_STATUS[p.threads_status].label}`}
          </p>
        </div>
        <Badge variant={st.variant}>{st.label}</Badge>
      </Link>
    </li>
  )
}

export default function SocialPage() {
  const now = wibParts(new Date())
  const [ym, setYm] = useState({ y: now.y, m: now.m })
  const [status, setStatus] = useState<SocialStatus | null>(null)
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [drafts, setDrafts] = useState<SocialPost[]>([])
  const [failed, setFailed] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // setState hanya setelah await; penanda memuat dipasang oleh pemicunya.
  const load = useCallback(async () => {
    try {
      const range = monthRange(ym.y, ym.m)
      const [s, month, d, f] = await Promise.all([
        getSocialStatus(),
        getSocialPosts(range),
        getSocialPosts({ status: 'draft' }),
        getSocialPosts({ status: 'failed' }),
      ])
      setStatus(s.data)
      setPosts(month.data ?? [])
      setDrafts(d.data ?? [])
      setFailed(f.data ?? [])
      setError(null)
    } catch {
      setError('Data posting gagal dimuat. Periksa koneksi, lalu coba lagi.')
    } finally {
      setLoading(false)
    }
  }, [ym])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- setState hanya setelah await
  useEffect(() => { void load() }, [load])
  const refresh = () => { setLoading(true); void load() }

  const upcoming = posts
    .filter((p) => p.status === 'scheduled' && p.scheduled_at && new Date(p.scheduled_at) > new Date())
    .sort((a, b) => a.scheduled_at!.localeCompare(b.scheduled_at!))
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Posting Sosial</h2>
          <p className="mt-1 text-sm text-slate-500">Jadwalkan posting Instagram; bila diaktifkan, posting yang sama menyusul ke Threads setelah Instagram berhasil.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={refresh} disabled={loading} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            <ButtonIcon icon={RefreshCw} />Perbarui
          </button>
          <Link to="/social/new" className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 inline-flex items-center">
            <ButtonIcon icon={Plus} />Buat posting
          </Link>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {status && <AccountsPanel status={status} onChange={setStatus} />}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 min-w-0 overflow-x-auto">
          <div className="min-w-[640px]">
            <SocialCalendar year={ym.y} month={ym.m} posts={posts} today={wibDateKey(new Date())} onMonth={(y, m) => { setLoading(true); setYm({ y, m }) }} />
          </div>
        </div>
        <div className="space-y-4 min-w-0">
          {failed.length > 0 && (
            <Card title="Perlu perhatian" description="Gagal terbit; buka untuk melihat alasan dan mencoba lagi">
              <ul className="-mx-2">{failed.map((p) => <PostRow key={p.id} p={p} />)}</ul>
            </Card>
          )}
          <Card title="Akan tayang" description="Jadwal terdekat di bulan ini">
            {upcoming.length ? <ul className="-mx-2">{upcoming.map((p) => <PostRow key={p.id} p={p} />)}</ul> : <p className="text-sm text-slate-400">Belum ada jadwal.</p>}
          </Card>
          <Card title="Draf" description="Belum dijadwalkan">
            {drafts.length ? <ul className="-mx-2">{drafts.map((p) => <PostRow key={p.id} p={p} />)}</ul> : <p className="text-sm text-slate-400">Tidak ada draf.</p>}
          </Card>
        </div>
      </div>
    </div>
  )
}
