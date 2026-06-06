import api from '../lib/axios'

export interface WhatsAppSender {
  id: string
  label: string
  phone_number: string
  jid: string           // kosong sebelum dipasangkan
  is_active: boolean
  daily_count: number
  last_used_at: string | null
  created_at: string
  updated_at: string
}

export interface WhatsAppSenderPayload {
  label: string
  phone_number: string
  is_active?: boolean
}

export function getWhatsAppSenders(params?: { page?: number; limit?: number }) {
  return api
    .get<{
      status: boolean
      message: string
      data: WhatsAppSender[]
      pagination: { page: number; limit: number; total: number }
    }>('/admin/whatsapp-senders', { params })
    .then((r) => r.data)
}

export function createWhatsAppSender(body: WhatsAppSenderPayload) {
  return api
    .post<{ status: boolean; message: string; data: WhatsAppSender }>('/admin/whatsapp-senders', body)
    .then((r) => r.data)
}

export function updateWhatsAppSender(id: string, body: Partial<WhatsAppSenderPayload> & { is_active?: boolean }) {
  return api
    .put<{ status: boolean; message: string; data: WhatsAppSender }>(`/admin/whatsapp-senders/${id}`, body)
    .then((r) => r.data)
}

export function deleteWhatsAppSender(id: string) {
  return api
    .delete<{ status: boolean; message: string }>(`/admin/whatsapp-senders/${id}`)
    .then((r) => r.data)
}

export interface SenderStatus {
  connected: boolean
  phone?: string
  name?: string
  reason?: string
}

export function checkSenderStatus(id: string) {
  return api
    .get<{ status: boolean; message: string; data: SenderStatus }>(`/admin/whatsapp-senders/${id}/check`)
    .then((r) => r.data.data)
}

export function checkAllSendersStatus() {
  return api
    .get<{ status: boolean; message: string; data: Record<string, SenderStatus> }>('/admin/whatsapp-senders/check-all')
    .then((r) => r.data.data)
}

export function reconnectSender(id: string) {
  return api
    .post<{ status: boolean; message: string }>(`/admin/whatsapp-senders/${id}/reconnect`)
    .then((r) => r.data)
}

export function reloadPool() {
  return api
    .post<{ status: boolean; message: string }>('/admin/whatsapp-senders/reload-pool')
    .then((r) => r.data)
}

export function startPairing(id: string) {
  return api
    .post<{ status: boolean; message: string; data: { qr: string } }>(`/admin/whatsapp-senders/${id}/pair`)
    .then((r) => r.data.data.qr)
}

export interface PairingStatus {
  qr: string
  done: boolean
  jid: string
}

export function getPairingStatus(id: string) {
  return api
    .get<{ status: boolean; message: string; data: PairingStatus }>(`/admin/whatsapp-senders/${id}/pair-status`)
    .then((r) => r.data.data)
}
