/**
 * Credex Bank - API Client
 * Centralised axios instance with auth token injection and error handling
 */
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store'   // <-- import the store

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

// ── REQUEST INTERCEPTOR: attach JWT token ──────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('credex_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// ── RESPONSE INTERCEPTOR: handle errors globally ──────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear localStorage
      localStorage.removeItem('credex_token')
      localStorage.removeItem('credex_user')
      // Clear Zustand store state (kills the redirect loop)
      useAuthStore.getState().logout?.() || useAuthStore.setState({ isAuthenticated: false, user: null })
      // Redirect to login if not already there (avoid loops)
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    } else if (error.response?.status === 403) {
      toast.error('Access denied. Insufficient permissions.')
    } else if (error.response?.status === 422) {
      const detail = error.response.data?.detail
      if (Array.isArray(detail)) {
        toast.error(detail[0]?.msg || 'Validation error')
      } else {
        toast.error(detail || 'Validation error')
      }
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again.')
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timed out. Check your connection.')
    }
    return Promise.reject(error)
  }
)

export default api