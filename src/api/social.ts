import axios from '../lib/axios'
import type { SingleResponse } from '../types'

// Posting otomatis Instagram + Threads — lihat loka-kasir-service docs/social-posting.md.

export type SocialPostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'canceled'
export type ThreadsStatus = 'none' | 'waiting' | 'publishing' | 'published' | 'failed'
export type SocialAction = 'edit' | 'delete' | 'cancel' | 'retry' | 'retry_threads'

export type SocialMediaKind = 'image' | 'video'

export interface SocialMedia {
  id: string
  post_id: string | null
  position: number
  kind: SocialMediaKind
  url: string
  width: number
  height: number
  size_bytes: number
  /** Durasi video (detik); null untuk gambar. */
  duration_seconds: number | null
  /** Gambar sudah diganti salinan arsip. Video tidak diarsip (tetap null). */
  archived_at: string | null
}

export interface SocialPost {
  id: string
  status: SocialPostStatus
  caption: string
  scheduled_at: string | null
  ig_media_id: string | null
  ig_permalink: string | null
  ig_error: string | null
  ig_attempts: number
  ig_published_at: string | null
  threads_enabled: boolean
  threads_text: string
  threads_status: ThreadsStatus
  threads_permalink: string | null
  threads_error: string | null
  threads_published_at: string | null
  created_by: string
  created_at: string
  updated_at: string
  /** Gambar sudah diganti salinan arsip WebP < 100 KB (video dibiarkan). */
  archived_at: string | null
  media: SocialMedia[]
  allowed_actions: SocialAction[]
}

export interface SocialAccountStatus {
  connected: boolean
  username?: string
  token_kind?: string
  expires_at?: string
  expires_in_days?: number
  connected_at?: string
}

export interface SocialStatus {
  configured: boolean
  instagram: SocialAccountStatus
  threads: SocialAccountStatus
}

export interface SocialPostInput {
  caption: string
  scheduled_at: string | null
  media_ids: string[]
  schedule: boolean
  threads_enabled: boolean
  threads_text: string
}

const base = '/admin/social'

export const getSocialStatus = (): Promise<SingleResponse<SocialStatus>> =>
  axios.get(`${base}/status`).then((r) => r.data)

export const connectInstagram = (token: string, igUserId: string): Promise<SingleResponse<SocialStatus>> =>
  axios.post(`${base}/instagram/token`, { token, ig_user_id: igUserId }).then((r) => r.data)

export const connectThreads = (token: string): Promise<SingleResponse<SocialStatus>> =>
  axios.post(`${base}/threads/token`, { token }).then((r) => r.data)

export const disconnectSocial = (platform: 'instagram' | 'threads'): Promise<SingleResponse<SocialStatus>> =>
  axios.post(`${base}/${platform}/disconnect`).then((r) => r.data)

export const uploadSocialMedia = (file: File): Promise<SingleResponse<SocialMedia>> => {
  const form = new FormData()
  form.append('file', file)
  return axios.post(`${base}/media`, form).then((r) => r.data)
}

export const getSocialPosts = (params: { from?: string; to?: string; status?: string } = {}): Promise<SingleResponse<SocialPost[]>> =>
  axios.get(`${base}/posts`, { params }).then((r) => r.data)

export const getSocialPost = (id: string): Promise<SingleResponse<SocialPost>> =>
  axios.get(`${base}/posts/${id}`).then((r) => r.data)

export const createSocialPost = (input: SocialPostInput): Promise<SingleResponse<SocialPost>> =>
  axios.post(`${base}/posts`, input).then((r) => r.data)

export const updateSocialPost = (id: string, input: SocialPostInput): Promise<SingleResponse<SocialPost>> =>
  axios.put(`${base}/posts/${id}`, input).then((r) => r.data)

export const deleteSocialPost = (id: string): Promise<SingleResponse<null>> =>
  axios.delete(`${base}/posts/${id}`).then((r) => r.data)

export const socialPostAction = (id: string, action: 'cancel' | 'retry' | 'retry-threads'): Promise<SingleResponse<SocialPost>> =>
  axios.post(`${base}/posts/${id}/${action}`).then((r) => r.data)
