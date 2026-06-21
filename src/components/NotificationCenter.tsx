import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle, Clock, AlertTriangle, Info, Check } from 'lucide-react';
import { api } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (err) { console.error('Failed to load notifications', err); }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      loadNotifications();
    } catch (err) { console.error(err); }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllRead();
      loadNotifications();
      setIsOpen(false);
    } catch (err) { console.error(err); }
  };

  const getIcon = (type: string) => {
    if (type === 'approval') return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    if (type === 'reminder' || type === 'broadcast') return <Clock className="h-4 w-4 text-blue-500" />;
    if (type === 'overdue') return <AlertTriangle className="h-4 w-4 text-red-500" />;
    return <Info className="h-4 w-4 text-text_secondary" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 text-text_secondary hover:text-text_primary hover:bg-surface rounded-lg transition-colors">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 border-2 border-background" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.1 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface border border-border rounded-2xl shadow-xl overflow-hidden z-50">
            <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between">
              <h3 className="font-bold text-text_primary">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                  <Check className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-text_secondary">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {notifications.map((n) => (
                    <div key={n.id} className={`p-4 hover:bg-background/30 transition-colors flex gap-3 ${!n.is_read ? 'bg-primary/5' : ''}`}>
                      <div className="mt-0.5">{getIcon(n.type)}</div>
                      <div className="flex-1">
                        <p className={`text-sm ${!n.is_read ? 'font-bold text-text_primary' : 'font-medium text-text_secondary'}`}>{n.title}</p>
                        <p className="text-xs text-text_secondary mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-text_secondary/70 mt-2 uppercase font-semibold">
                          {new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {!n.is_read && (
                        <button onClick={() => handleMarkRead(n.id)} className="h-6 w-6 rounded-full hover:bg-background flex items-center justify-center text-text_secondary hover:text-primary transition-colors flex-shrink-0">
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
