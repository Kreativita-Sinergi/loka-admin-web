import axios from '../lib/axios'
import type { PaginatedResponse, SingleResponse } from '../types'

export type ThreadsDraftStatus = 'pending' | 'posted' | 'rejected' | 'failed'
export type ThreadsDraftKind = 'post' | 'reply'

export interface ThreadsDraft {
  id: string
  kind: ThreadsDraftKind
  status: ThreadsDraftStatus
  source: string // own_reply | mention | keyword | scheduled
  target_id: string | null
  target_text: string | null
  target_author: string | null
  target_permalink: string | null
  keyword: string | null
  generated_text: string
  posted_id: string | null
  error: string | null
  posted_at: string | null
  created_at: string
  updated_at: string
}

export interface ThreadsSettings {
  id: number
  enabled: boolean
  auto_reply_own: boolean
  reply_mentions: boolean
  keyword_enabled: boolean
  keywords: string
  persona: string
  posts_per_day: number
  updated_at: string
}

export interface ThreadsDraftParams {
  page?: number
  limit?: number
  status?: string
  kind?: string
}

export const getDrafts = (params: ThreadsDraftParams = {}): Promise<PaginatedResponse<ThreadsDraft>> =>
  axios.get('/admin/threads/drafts', { params }).then((r) => r.data)

export const approveDraft = (id: string, text?: string): Promise<SingleResponse<ThreadsDraft>> =>
  axios.post(`/admin/threads/drafts/${id}/approve`, { text: text ?? '' }).then((r) => r.data)

export const rejectDraft = (id: string): Promise<SingleResponse<null>> =>
  axios.post(`/admin/threads/drafts/${id}/reject`, {}).then((r) => r.data)

export const regenerateDraft = (id: string): Promise<SingleResponse<ThreadsDraft>> =>
  axios.post(`/admin/threads/drafts/${id}/regenerate`, {}).then((r) => r.data)

export const getThreadsSettings = (): Promise<SingleResponse<ThreadsSettings>> =>
  axios.get('/admin/threads/settings').then((r) => r.data)

export const updateThreadsSettings = (
  data: Partial<Omit<ThreadsSettings, 'id' | 'updated_at'>>,
): Promise<SingleResponse<ThreadsSettings>> =>
  axios.put('/admin/threads/settings', data).then((r) => r.data)

export const generatePost = (): Promise<SingleResponse<ThreadsDraft>> =>
  axios.post('/admin/threads/generate-post', {}).then((r) => r.data)

export const pollNow = (): Promise<SingleResponse<null>> =>
  axios.post('/admin/threads/poll', {}).then((r) => r.data)
