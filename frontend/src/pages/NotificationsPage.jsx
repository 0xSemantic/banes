/**
 * Credex Bank - Notifications Page
 */
import { useEffect } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useNotificationStore } from '../store'
import { getNotifMeta, timeAgo } from '../utils/helpers'
import { PageHeader, EmptyState } from '../components/ui'
import clsx from 'clsx'
import * as Icons from 'lucide-react'

export default function NotificationsPage() {
  const { notifications, fetchNotifications, markRead, markAllRead, unreadCount, isLoading } = useNotificationStore()

  useEffect(() => { fetchNotifications() }, [])

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader title="Notifications" subtitle="Your alerts and updates"
        action={unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-ghost text-xs flex items-center gap-1.5">
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      />

      {isLoading && notifications.length === 0 ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up! Notifications will appear here." />
      ) : (
        <div className="bank-card overflow-hidden">
          {notifications.map((n, idx) => {
            const meta = getNotifMeta(n.notification_type)
            const IconComp = Icons[meta.icon] || Icons.Bell
            return (
              <div key={n.id}
                className={clsx('flex gap-4 p-4 cursor-pointer transition-colors hover:bg-bank-surface',
                  !n.is_read && 'bg-blue-900/10',
                  idx !== notifications.length - 1 && 'border-b border-bank-border'
                )}
                onClick={() => !n.is_read && markRead(n.id)}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}>
                  <IconComp size={16} style={{ color: meta.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-semibold text-bank-light">{n.title}</div>
                    {!n.is_read && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: meta.color }} />}
                  </div>
                  <div className="text-xs text-bank-muted mt-0.5 leading-relaxed">{n.message}</div>
                  {n.admin_response && (
                    <div className="text-xs text-emerald-400 mt-1 p-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)' }}>
                      Admin response: {n.admin_response}
                    </div>
                  )}
                  <div className="text-[10px] text-bank-muted/70 mt-1">{timeAgo(n.created_at)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
