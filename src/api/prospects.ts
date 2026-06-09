import axios from '../lib/axios'
import type { PaginatedResponse, SingleResponse } from '../types'

export type ProspectStatus = 'new' | 'contacted' | 'converted' | 'rejected'

export interface Prospect {
  id: string
  name: string
  email: string
  company: string | null
  phone: string | null
  source: string | null
  status: ProspectStatus
  notes: string | null
  unsubscribed: boolean
  last_contacted_at: string | null
  created_at: string
  updated_at: string
}

export interface OutreachResult {
  prospect_id: string
  email: string
  name: string
  success: boolean
  error?: string
}

export interface OutreachSummary {
  total: number
  sent: number
  failed: number
  skipped: number
  results: OutreachResult[]
}

export interface ProspectParams {
  page?: number
  limit?: number
  search?: string
  status?: string
}

export interface CreateProspectPayload {
  name: string
  email: string
  company?: string | null
  phone?: string | null
  source?: string | null
  notes?: string | null
}

export interface UpdateProspectPayload {
  name?: string
  email?: string
  company?: string | null
  phone?: string | null
  source?: string | null
  status?: ProspectStatus
  notes?: string | null
}

export interface SendOutreachPayload {
  prospect_ids?: string[]
  all?: boolean
  subject: string
  body_html: string
}

export const getProspects = (params: ProspectParams = {}): Promise<PaginatedResponse<Prospect>> =>
  axios.get('/admin/prospects', { params }).then((r) => r.data)

export const createProspect = (data: CreateProspectPayload): Promise<SingleResponse<Prospect>> =>
  axios.post('/admin/prospects', data).then((r) => r.data)

export const updateProspect = (id: string, data: UpdateProspectPayload): Promise<SingleResponse<Prospect>> =>
  axios.patch(`/admin/prospects/${id}`, data).then((r) => r.data)

export const deleteProspect = (id: string): Promise<SingleResponse<null>> =>
  axios.delete(`/admin/prospects/${id}`).then((r) => r.data)

export const sendOutreach = (data: SendOutreachPayload): Promise<SingleResponse<OutreachSummary>> =>
  axios.post('/admin/prospects/send', data).then((r) => r.data)

export const getEmailTemplate = (): Promise<SingleResponse<{ subject: string; body_html: string }>> =>
  axios.get('/admin/prospects/email-template').then((r) => r.data)
