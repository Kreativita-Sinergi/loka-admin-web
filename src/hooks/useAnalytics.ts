import { useEffect, useState } from 'react'
import type { SingleResponse } from '../types'

export function useAnalytics<T>(fetcher: () => Promise<SingleResponse<T>>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let current = true
    fetcher().then(response => {
      if (!response.status || !response.data) throw new Error('Invalid response')
      if (current) { setData(response.data); setUpdatedAt(new Date().toISOString()) }
    }).catch(() => {
      if (current) setError('Data gagal dimuat. Periksa koneksi, lalu coba lagi.')
    }).finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [fetcher, revision])
  const refresh = () => { setLoading(true); setError(null); setRevision(value => value + 1) }
  return { data, loading, error, updatedAt, refresh }
}
