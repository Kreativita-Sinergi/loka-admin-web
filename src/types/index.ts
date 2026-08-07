export interface AdminBusinessType {
  id: number
  code: string
  name: string
  description: string
  order_archetype: string
}

// Bidang usaha (sub-jenis di bawah satu pilar). Menentukan kolom isian tiap
// transaksi dan istilah yang dipakai aplikasi kasir.
export interface AdminBusinessVertical {
  id: number
  code: string
  name: string
  description: string
  business_type_id: number
}

export interface AdminMembership {
  id: string
  type: 'free' | 'trial' | 'lite' | 'pro'
  start_date: string
  end_date: string
  is_active: boolean
  days_remaining: number
  scheduled_downgrade_to: string | null
  // when loaded as part of memberships list, includes business
  business?: {
    id: string
    business_name: string
    owner_name: string
  }
}

export interface AdminOwner {
  id: string
  name: string | null
  email: string | null
  phone_number: string
  is_verified: boolean
  is_email_verified: boolean
  is_active: boolean
  created_at: string
}

export interface AdminBusiness {
  id: string
  business_name: string
  owner_name: string
  business_type: AdminBusinessType | null
  business_vertical: AdminBusinessVertical | null
  image: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  owner: AdminOwner | null
  membership: AdminMembership | null
}

export interface MembershipCount {
  type: string
  count: number
}

export interface RegistrationTrend {
  date: string
  count: number
}

export interface AdminStats {
  total_businesses: number
  active_businesses: number
  total_users: number
  verified_users: number
  membership_breakdown: MembershipCount[]
  registrations_trend: RegistrationTrend[]
}

export interface Pagination {
  page: number
  limit: number
  total: number
  order_by?: string
  sort_by?: string
}

export interface PaginatedResponse<T> {
  status: boolean
  message: string
  data: T[]
  pagination: Pagination
}

export interface SingleResponse<T> {
  status: boolean
  message: string
  data: T
}
