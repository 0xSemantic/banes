/**
 * Credex Bank - Global State Store (Zustand)
 * Manages auth state, accounts, notifications and real-time WS
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../utils/api'
import toast from 'react-hot-toast'

// ── AUTH STORE ────────────────────────────────────────────────────────────
export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const res = await api.post('/auth/login', { email, password })
          const { access_token, user_id, is_admin, full_name } = res.data
          localStorage.setItem('credex_token', access_token)
          // Fetch full profile
          const profile = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${access_token}` }
          })
          set({ token: access_token, user: profile.data, isAuthenticated: true, isLoading: false })
          return { success: true, is_admin }
        } catch (err) {
          set({ isLoading: false })
          const msg = err.response?.data?.detail || 'Login failed'
          return { success: false, error: msg }
        }
      },

      register: async (data) => {
        set({ isLoading: true })
        try {
          const res = await api.post('/auth/register', data)
          const { access_token } = res.data
          localStorage.setItem('credex_token', access_token)
          const profile = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${access_token}` }
          })
          set({ token: access_token, user: profile.data, isAuthenticated: true, isLoading: false })
          return { success: true }
        } catch (err) {
          set({ isLoading: false })
          const msg = err.response?.data?.detail || 'Registration failed'
          return { success: false, error: msg }
        }
      },

      logout: () => {
        localStorage.removeItem('credex_token')
        localStorage.removeItem('credex_user')
        set({ token: null, user: null, isAuthenticated: false })
      },

      // Refreshes user data from backend (used after KYC approval, etc.)
      refreshUser: async () => {
        try {
          const res = await api.get('/auth/me')
          set({ user: res.data })
          return res.data
        } catch (err) {
          console.error('Failed to refresh user', err)
        }
      },

      // Alias for backward compatibility
      refreshProfile: async () => {
        return get().refreshUser()
      },

      updateUser: (updates) => set((s) => ({ user: { ...s.user, ...updates } })),
    }),
    { name: 'credex_auth', partialize: (s) => ({ token: s.token, user: s.user, isAuthenticated: s.isAuthenticated }) }
  )
)

// ── ACCOUNTS STORE ────────────────────────────────────────────────────────
export const useAccountStore = create((set, get) => ({
  accounts: [],
  selectedAccount: null,
  isLoading: false,

  fetchAccounts: async () => {
    set({ isLoading: true })
    try {
      const res = await api.get('/accounts/')
      const accounts = res.data
      set({ accounts, isLoading: false, selectedAccount: accounts[0] || null })
    } catch { set({ isLoading: false }) }
  },

  selectAccount: (account) => set({ selectedAccount: account }),

  refreshAccounts: async () => {
    try {
      const res = await api.get('/accounts/')
      set({ accounts: res.data })
    } catch {}
  },

  getTotalBalance: () => {
    const { accounts } = get()
    return accounts.reduce((sum, a) => sum + (a.balance || 0), 0)
  }
}))

// ── NOTIFICATION STORE ────────────────────────────────────────────────────
export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true })
    try {
      const [notifRes, countRes] = await Promise.all([
        api.get('/notifications/?limit=30'),
        api.get('/notifications/unread-count')
      ])
      set({ notifications: notifRes.data, unreadCount: countRes.data.unread_count, isLoading: false })
    } catch { set({ isLoading: false }) }
  },

  markRead: async (id) => {
    await api.post(`/notifications/${id}/read`)
    set((s) => ({
      notifications: s.notifications.map((n) => n.id === id ? { ...n, is_read: true } : n),
      unreadCount: Math.max(0, s.unreadCount - 1)
    }))
  },

  markAllRead: async () => {
    await api.post('/notifications/read-all')
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0
    }))
  },

  addNotification: (notif) => set((s) => ({
    notifications: [notif, ...s.notifications],
    unreadCount: s.unreadCount + 1
  })),

  decrementUnread: () => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),
}))

// ── WEBSOCKET STORE ───────────────────────────────────────────────────────
export const useWebSocketStore = create((set, get) => ({
  ws: null,
  isConnected: false,
  reconnectTimeout: null,
  lastMessage: null,  // <-- added to track latest message

  connect: (userId, isAdmin = false) => {
    const { ws } = get()
    if (ws?.readyState === WebSocket.OPEN) return

    const clientId = isAdmin ? `admin:${userId}` : `user:${userId}`
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws/${clientId}`

    const socket = new WebSocket(wsUrl)

    socket.onopen = () => {
      set({ isConnected: true })
      console.log('🔌 WebSocket connected')
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        set({ lastMessage: data })  // store last message
        handleWsMessage(data)
      } catch {}
    }

    socket.onclose = () => {
      set({ isConnected: false })
      // Auto-reconnect after 5 seconds
      const t = setTimeout(() => get().connect(userId, isAdmin), 5000)
      set({ reconnectTimeout: t })
    }

    socket.onerror = () => { socket.close() }

    set({ ws: socket })
  },

  disconnect: () => {
    const { ws, reconnectTimeout } = get()
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    if (ws) ws.close()
    set({ ws: null, isConnected: false, lastMessage: null })
  },

  send: (data) => {
    const { ws } = get()
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  }
}))

function handleWsMessage(data) {
  const { type } = data
  if (type === 'notification') {
    const { addNotification } = useNotificationStore.getState()
    addNotification({
      id: Date.now().toString(),
      notification_type: data.data?.notification_type || 'system',
      title: data.data?.title || 'Notification',
      message: data.data?.message || '',
      is_read: false,
      status: 'resolved',
      created_at: new Date().toISOString()
    })
    toast(data.data?.title || 'New notification', {
      icon: '🔔',
      style: { background: '#1a2a44', color: '#e8f0ff', border: '1px solid #243554' }
    })
  }
  if (type === 'request_update') {
    const { refreshAccounts } = useAccountStore.getState()
    refreshAccounts()
    toast.success(data.message || 'Request updated')
  }
  // NEW: Handle KYC verification event
  if (type === 'kyc_verified' || (data.data?.notification_type === 'kyc_verified')) {
    const { refreshUser } = useAuthStore.getState()
    refreshUser()
    toast.success('Your identity has been verified!', { icon: '✅' })
  }
}