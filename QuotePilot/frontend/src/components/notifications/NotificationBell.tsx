'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { api, getAuthToken } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { io, Socket } from 'socket.io-client';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  readAt?: string;
  createdAt: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadUnreadCount = async () => {
    if (!user) return;
    try {
      const res = await api.get<{ count: number }>('/notifications/unread-count');
      setUnreadCount(res.data.count);
    } catch {
      // Ignore network errors on background poll
    }
  };

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get<NotificationItem[]>('/notifications?limit=5');
      setNotifications(res.data || []);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  // Socket.io live listener for notification:new
  useEffect(() => {
    if (!user) return;
    loadUnreadCount();

    const token = getAuthToken();
    if (!token) return;

    const apiOrigin = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';
    let socket: Socket | null = null;

    try {
      socket = io(apiOrigin, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      socket.on('notification:new', (newNotif: NotificationItem) => {
        setUnreadCount((prev) => prev + 1);
        setNotifications((prev) => [newNotif, ...prev.slice(0, 4)]);
      });
    } catch (err) {
      console.warn('[Socket] Notification bell listener connection skipped:', err);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [user]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      loadNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
    } catch {
      // Ignore
    }
  };

  if (!user) return null;

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        onClick={handleToggle}
        className="relative p-2 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-paper-100 transition-colors focus:outline-none"
        title="Notifications"
        aria-label="Notifications"
      >
        {/* Bell Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.7}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-teal-800 text-[9px] font-mono font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white shadow-xl border border-paper-300 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-4 py-2 border-b border-paper-200 flex items-center justify-between">
            <span className="font-serif font-bold text-xs text-stone-900">
              Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-mono text-teal-800 hover:text-teal-950 font-semibold"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-paper-100">
            {loading ? (
              <div className="py-6 text-center text-xs font-mono text-stone-400">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-500">
                No notifications right now
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.link}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-3 hover:bg-paper-50 transition-colors ${
                    !n.readAt ? 'bg-teal-50/40' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-xs text-stone-900 line-clamp-1">
                      {n.title}
                    </span>
                    <span className="text-[10px] font-mono text-stone-400 shrink-0">
                      {new Date(n.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 line-clamp-2 mt-0.5">{n.body}</p>
                </Link>
              ))
            )}
          </div>

          <div className="px-4 py-2 border-t border-paper-200 text-center bg-paper-50/50">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-mono text-stone-600 hover:text-teal-900 font-medium"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
