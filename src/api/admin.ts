import axios from '../lib/axios'
import type { AdminBusiness, AdminMembership, AdminStats, PaginatedResponse, SingleResponse } from '../types'

export interface BusinessParams {
  page?: number
  limit?: number
  search?: string
  status?: string
}

export const getStats = (): Promise<SingleResponse<AdminStats>> =>
  axios.get('/admin/stats').then((r) => r.data)

export const getBusinesses = (params: BusinessParams = {}): Promise<PaginatedResponse<AdminBusiness>> =>
  axios.get('/admin/businesses', { params }).then((r) => r.data)

export const getBusinessById = (id: string): Promise<SingleResponse<AdminBusiness>> =>
  axios.get(`/admin/businesses/${id}`).then((r) => r.data)

export const toggleBusinessActive = (id: string): Promise<SingleResponse<AdminBusiness>> =>
  axios.patch(`/admin/businesses/${id}/toggle`).then((r) => r.data)

export const deleteBusiness = (id: string): Promise<SingleResponse<null>> =>
  axios.delete(`/admin/businesses/${id}`).then((r) => r.data)

export const getMemberships = (params: BusinessParams = {}): Promise<PaginatedResponse<AdminMembership>> =>
  axios.get('/admin/memberships', { params }).then((r) => r.data)

export const createMembership = (data: {
  business_id: string
  type: string
  days: number
}): Promise<SingleResponse<AdminMembership>> =>
  axios.post('/admin/memberships', data).then((r) => r.data)

export const updateMembership = (
  id: string,
  data: { type?: string; extend_days?: number; end_date?: string }
): Promise<SingleResponse<AdminMembership>> =>
  axios.patch(`/admin/memberships/${id}`, data).then((r) => r.data)

export const deactivateMembership = (id: string): Promise<SingleResponse<null>> =>
  axios.delete(`/admin/memberships/${id}`).then((r) => r.data)

export const processDowngrades = (): Promise<SingleResponse<null>> =>
  axios.post('/admin/memberships/process-downgrades').then((r) => r.data)

export const verifyApiKey = (key: string): Promise<SingleResponse<AdminStats>> =>
  axios.get('/admin/stats', { headers: { 'X-Admin-Key': key } }).then((r) => r.data)

export interface NotifyPayload {
  email?: string
  business_name?: string
  template?: string
  message?: string
  bulk?: boolean
}

export interface NotifyResult {
  email: string
  name: string
  success: boolean
  error?: string
}

export interface NotifyResponse {
  total: number
  sent: number
  failed: number
  results: NotifyResult[]
}

export const sendEmail = (payload: NotifyPayload): Promise<SingleResponse<NotifyResponse>> =>
  axios.post('/admin/notify/email', payload).then((r) => r.data)

export interface NotificationLog {
  id: string
  template: string
  is_bulk: boolean
  email: string
  recipient_name: string
  business_name: string
  message_preview: string
  total: number
  sent: number
  failed: number
  created_at: string
}

export interface NotificationStats {
  total_sent: number
  total_failed: number
  success_rate: number
}

export const getNotificationLogs = (): Promise<SingleResponse<NotificationLog[]>> =>
  axios.get('/admin/notify/logs').then((r) => r.data)

export const getNotificationStats = (): Promise<SingleResponse<NotificationStats>> =>
  axios.get('/admin/notify/stats').then((r) => r.data)

// ── Registration requests ─────────────────────────────────────────────────────

export interface RegistrationRequest {
  id: number
  name: string
  phone: string
  business_name: string
  city: string
  email: string
  status: 'pending' | 'contacted' | 'registered' | 'rejected'
  notes: string
  created_at: string
  updated_at: string
}

export interface RegistrationRequestsParams {
  page?: number
  limit?: number
  status?: string
}

export const getRegistrationRequests = (
  params: RegistrationRequestsParams = {}
): Promise<{ data: RegistrationRequest[]; pagination: { total: number; page: number; limit: number } }> =>
  axios.get('/admin/registration-requests', { params }).then((r) => r.data)

export const updateRegistrationRequestStatus = (
  id: number,
  status: string,
  notes?: string
): Promise<SingleResponse<null>> =>
  axios.patch(`/admin/registration-requests/${id}/status`, { status, notes }).then((r) => r.data)
