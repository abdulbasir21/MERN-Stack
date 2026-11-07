'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Bell, CheckCheck, Clock, FileText, ArrowRight, ShieldCheck, Star } from 'lucide-react';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  readAt?: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterUnread, setFilterUnread] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = filterUnread
        ? '/notifications?unread=true'
        : '/notifications';
      const res = await api.get<NotificationItem[]>(endpoint);
      setNotifications(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [filterUnread]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    } catch {
      // Ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
    } catch {
      // Ignore
    }
  };

  return (
    <RoleGuard allowedRoles={['customer', 'company_admin', 'platform_admin']}>
      <div className="min-h-screen bg-paper-50 font-sans pb-16 selection:bg-teal-900 selection:text-white">
        {/* Header */}
        <header className="bg-white border-b border-paper-200 py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-stone-500 mb-1">
                <Link href="/" className="hover:text-stone-900">
                  Home
                </Link>
                <span>›</span>
                <span className="text-stone-900 font-semibold">Notifications</span>
              </div>
              <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight flex items-center gap-2">
                <Bell className="w-5 h-5 text-teal-800" />
                <span>Activity &amp; Alert Center</span>
              </h1>
              <p className="text-xs text-stone-600">
                Audited notifications for inquiries, official quotation slips, and bilateral messages
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={filterUnread ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilterUnread(!filterUnread)}
                className="font-mono text-xs"
              >
                {filterUnread ? 'Showing Unread' : 'Filter Unread'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="font-mono text-xs text-teal-800"
              >
                Mark All Read
              </Button>
            </div>
          </div>
        </header>

        {/* List Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {loading ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-mono text-stone-500">Loading notifications...</p>
            </div>
          ) : error ? (
            <Card className="p-8 text-center text-rose-700 text-xs font-mono">{error}</Card>
          ) : notifications.length === 0 ? (
            <Card className="p-12 text-center space-y-2">
              <h3 className="font-serif font-bold text-base text-stone-900">
                {filterUnread ? 'No unread notifications' : 'Your notification log is clear'}
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Real-time updates regarding your commercial inquiries and quotations will appear here.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <Card
                  key={n.id}
                  className={`p-4 transition-colors hover:border-teal-800 ${
                    !n.readAt ? 'bg-teal-50/40 border-teal-200' : 'bg-white'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            n.type.includes('accepted')
                              ? 'success'
                              : n.type.includes('rejected')
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="text-[10px] font-mono uppercase"
                        >
                          {n.type.replace('_', ' ')}
                        </Badge>
                        <h3 className="font-serif font-bold text-sm text-stone-900">{n.title}</h3>
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed">{n.body}</p>
                      <div className="text-[10px] font-mono text-stone-400">
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {!n.readAt && (
                        <button
                          onClick={() => handleMarkAsRead(n.id)}
                          className="text-xs font-mono text-stone-500 hover:text-stone-900 underline"
                        >
                          Mark read
                        </button>
                      )}
                      <Link href={n.link}>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="font-mono text-xs"
                          onClick={() => handleMarkAsRead(n.id)}
                        >
                          Open Docket →
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </RoleGuard>
  );
}
