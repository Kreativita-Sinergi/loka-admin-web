import { useEffect, useState } from 'react'

/** Clear old results on filter changes and ignore superseded requests. */
export function useAdminData<T>(fetcher: () => Promise<T>) {
  const [state, setState] = useState<{ fetcher: typeof fetcher; data: T | null; error: string | null } | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let current = true
    fetcher().then(data => {
      if (current) setState({ fetcher, data, error: null })
    }).catch(() => {
      if (current) setState({ fetcher, data: null, error: 'Data gagal dimuat. Silakan coba lagi.' })
    })
    return () => { current = false }
  }, [fetcher, revision])
  const loading = state?.fetcher !== fetcher
  return {
    loading,
    data: loading ? null : state?.data ?? null,
    error: loading ? null : state?.error ?? null,
    refresh: () => { setState(null); setRevision(v => v + 1) },
  }
}
