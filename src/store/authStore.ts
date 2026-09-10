import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  /** Token sesi dari `/admin/login`. Berumur pendek — bukan kunci permanen. */
  token: string | null
  /** Kapan token berhenti berlaku, dalam ISO-8601 dari server. */
  expiresAt: string | null
  login: (token: string, expiresAt?: string | null) => void
  logout: () => void
  /** Token yang masih berlaku, atau null bila belum masuk / sudah lewat waktu. */
  activeToken: () => string | null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      expiresAt: null,
      login: (token, expiresAt = null) => set({ token, expiresAt }),
      logout: () => set({ token: null, expiresAt: null }),

      // Masa berlaku diperiksa di sini, bukan dibiarkan sampai server menolak.
      //
      // Panel ini menyimpan tokennya di localStorage, jadi sebuah token yang
      // sudah lewat waktu akan tetap terbaca sebagai "masih login" setiap kali
      // halaman dibuka — pengguna melihat kerangka dasbor lebih dulu, lalu
      // dilempar keluar begitu permintaan pertama dijawab 401. Memeriksanya
      // lebih awal membuat ia langsung mendarat di layar masuk.
      activeToken: () => {
        const { token, expiresAt } = get()
        if (!token) return null
        if (expiresAt && Date.parse(expiresAt) <= Date.now()) return null
        return token
      },
    }),
    { name: 'loka-admin-auth' }
  )
)
