import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  // Firefox treats TLS client certificates as cross-origin credentials.
  // Without this, direct API navigation uses the device certificate while
  // XHR requests from the admin portal silently omit it and hit the IP block.
  withCredentials: true,
})

instance.interceptors.request.use((config) => {
  const key = useAuthStore.getState().apiKey
  if (key) {
    config.headers['X-Admin-Key'] = key
  }
  return config
})

instance.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  }
)

export default instance
