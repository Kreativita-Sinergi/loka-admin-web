import api from '../lib/axios'

export interface ProspectLead {
  id: number
  name: string
  address: string
  phone: string
  phone_clean: string
  email: string
  category: string
  rating: number | null
  rating_count: number | null
  website: string
  google_place_id: string
  status: 'new' | 'contacted' | 'interested' | 'not_interested'
  notes: string
  contacted_at: string | null
  created_at: string
  updated_at: string
}

export interface ProspectLeadItem {
  name: string
  address: string
  phone: string
  phone_clean: string
  category: string
  rating?: number
  rating_count?: number
  website?: string
  google_place_id: string
}

export interface ProspectsListResponse {
  status: boolean
  message: string
  data: ProspectLead[]
  pagination: { page: number; limit: number; total: number }
}

export function bulkSaveProspects(leads: ProspectLeadItem[]) {
  return api.post<{ status: boolean; message: string; data: { saved: number } }>(
    '/admin/prospects/bulk',
    { leads }
  ).then((r) => r.data)
}

export function getProspects(params: { page?: number; limit?: number; status?: string; search?: string }) {
  return api.get<ProspectsListResponse>('/admin/prospects', { params }).then((r) => r.data)
}

export function updateProspect(id: number, body: { status?: string; notes?: string; contacted_at?: string }) {
  return api.patch(`/admin/prospects/${id}`, body).then((r) => r.data)
}

export function deleteProspect(id: number) {
  return api.delete(`/admin/prospects/${id}`).then((r) => r.data)
}

export interface OutreachMessage {
  id: number
  prospect_id: number
  channel: 'whatsapp' | 'email'
  sender_id: string | null
  message: string
  status: 'sent' | 'failed'
  error_msg: string | null
  sent_at: string
  created_at: string
}

export function directSend(body: { channel: 'whatsapp' | 'email'; target: string; message: string }) {
  return api
    .post<{ status: boolean; message: string }>('/admin/prospects/direct-send', body)
    .then((r) => r.data)
}

export function sendProspectMessage(id: number, body: { channel: 'whatsapp' | 'email'; message: string }) {
  return api
    .post<{ status: boolean; message: string }>(`/admin/prospects/${id}/send`, body)
    .then((r) => r.data)
}

export interface BulkSendJob {
  total: number
  sent: number
  failed: number
  current: string
  done: boolean
}

export function startBulkSend(body: {
  channel: 'whatsapp' | 'email'
  message: string
  delay_ms: number
  only_new: boolean
  prospect_ids?: number[]
}) {
  return api
    .post<{ status: boolean; message: string; data: { job_id: string; total: number } }>(
      '/admin/prospects/blast',
      body
    )
    .then((r) => r.data.data)
}

export function getBulkSendProgress(jobId: string) {
  return api
    .get<{ status: boolean; message: string; data: BulkSendJob }>(`/admin/prospects/blast/${jobId}`)
    .then((r) => r.data.data)
}

export function getProspectMessages(id: number) {
  return api
    .get<{ status: boolean; message: string; data: OutreachMessage[] }>(`/admin/prospects/${id}/messages`)
    .then((r) => r.data)
}
