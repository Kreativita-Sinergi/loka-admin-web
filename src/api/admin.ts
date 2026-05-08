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

export const verifyApiKey = (key: string): Promise<SingleResponse<AdminStats>> =>
  axios.get('/admin/stats', { headers: { 'X-Admin-Key': key } }).then((r) => r.data)

export interface NotifyPayload {
  phone?: string
  business_name?: string
  message?: string
  bulk?: boolean
}

export interface NotifyResult {
  phone: string
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

export const sendWhatsApp = (payload: NotifyPayload): Promise<SingleResponse<NotifyResponse>> =>
  axios.post('/admin/notify/whatsapp', payload).then((r) => r.data)
