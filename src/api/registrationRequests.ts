import api from '../lib/axios'

export type RegistrationRequestStatus =
  | 'pending'
  | 'contacted'
  | 'approved'
  | 'registered'
  | 'rejected'

export interface RegistrationRequest {
  id: number
  name: string
  phone: string
  business_name: string
  city: string
  email: string
  status: RegistrationRequestStatus
  notes: string
  contacted_at: string | null
  created_at: string
  updated_at: string
}

export interface RegistrationRequestsListResponse {
  status: boolean
  message: string
  data: RegistrationRequest[]
  pagination: { page: number; limit: number; total: number }
}

export function getRegistrationRequests(params: {
  page?: number
  limit?: number
  status?: string
  search?: string
}) {
  return api
    .get<RegistrationRequestsListResponse>('/admin/registration-requests', { params })
    .then((r) => r.data)
}

export function updateRegistrationRequest(
  id: number,
  body: { status?: string; notes?: string }
) {
  return api.patch(`/admin/registration-requests/${id}`, body).then((r) => r.data)
}

export function deleteRegistrationRequest(id: number) {
  return api.delete(`/admin/registration-requests/${id}`).then((r) => r.data)
}
