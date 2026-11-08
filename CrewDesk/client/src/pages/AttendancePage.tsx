import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/useAuth';
import { Clock, CheckCircle2, AlertCircle, Edit3, X, CalendarCheck, Hourglass } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isHrOrOwner = user?.role === 'HR_MANAGER' || user?.role === 'OWNER';
  const isOwner = user?.role === 'OWNER';

  const [activeTab, setActiveTab] = useState<'my' | 'company'>(isOwner ? 'company' : 'my');
  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // HR Edit Modal state
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // 1. Fetch Today Status (own)
  const { data: todayData } = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/attendance/today`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load status');
      return res.json();
    },
    enabled: !isOwner,
  });

  // 2. Fetch My Attendance History
  const { data: myData, isLoading: isMyLoading } = useQuery({
    queryKey: ['attendance', 'my'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/attendance/my`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load history');
      return res.json();
    },
    enabled: !isOwner,
  });

  // 3. Fetch Company Attendance (HR/Owner)
  const { data: companyData, isLoading: isCompanyLoading } = useQuery({
    queryKey: ['attendance', 'all'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/attendance`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load company attendance');
      return res.json();
    },
    enabled: isHrOrOwner,
  });

  // Check In Mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const res = await fetch(`${API_BASE}/attendance/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes: checkInNotes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Check-in failed');
      return data;
    },
    onSuccess: () => {
      setCheckInNotes('');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message);
    },
  });

  // Check Out Mutation
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const res = await fetch(`${API_BASE}/attendance/check-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes: checkOutNotes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Check-out failed');
      return data;
    },
    onSuccess: () => {
      setCheckOutNotes('');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message);
    },
  });

  // HR Edit Mutation
  const editMutation = useMutation({
    mutationFn: async () => {
      setEditError(null);
      const res = await fetch(`${API_BASE}/attendance/${editingRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          checkIn: new Date(editCheckIn).toISOString(),
          checkOut: editCheckOut ? new Date(editCheckOut).toISOString() : null,
          notes: editNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Update failed');
      return data;
    },
    onSuccess: () => {
      setEditingRecord(null);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err: any) => {
      setEditError(err.message);
    },
  });

  const todayRecord = todayData?.data;
  const myRecords = myData?.data || [];
  const companyRecords = companyData?.data || [];

  const openEditModal = (rec: any) => {
    setEditingRecord(rec);
    setEditCheckIn(rec.checkIn ? new Date(rec.checkIn).toISOString().slice(0, 16) : '');
    setEditCheckOut(rec.checkOut ? new Date(rec.checkOut).toISOString().slice(0, 16) : '');
    setEditNotes(rec.notes || '');
    setEditError(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Attendance Tracking</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time daily punch cards, calculated working hours and compliance logs.
          </p>
        </div>

        {/* Tab switch for HR/Owner */}
        {isHrOrOwner && (
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start">
            {!isOwner && (
              <button
                onClick={() => setActiveTab('my')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'my'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                My Attendance
              </button>
            )}
            <button
              onClick={() => setActiveTab('company')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'company'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Company Log
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 text-sm bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* MY ATTENDANCE TAB */}
      {activeTab === 'my' && !isOwner && (
        <div className="space-y-6">
          {/* Daily Punch Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Today's Shift</span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </h2>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {!todayRecord ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <Clock className="w-3.5 h-3.5" /> Not Checked In
                    </span>
                  ) : todayRecord.checkOut ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Shift Completed ({todayRecord.workingHours} hrs)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 animate-pulse">
                      <Clock className="w-3.5 h-3.5" /> Checked In (Working)
                    </span>
                  )}

                  {todayRecord?.isLate && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                      Late Arrival
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {!todayRecord && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Optional notes..."
                      value={checkInNotes}
                      onChange={(e) => setCheckInNotes(e.target.value)}
                      className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                    <button
                      onClick={() => checkInMutation.mutate()}
                      disabled={checkInMutation.isPending}
                      className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 shrink-0"
                    >
                      {checkInMutation.isPending ? 'Punching...' : 'Punch In'}
                    </button>
                  </div>
                )}

                {todayRecord && !todayRecord.checkOut && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Optional end-of-day notes..."
                      value={checkOutNotes}
                      onChange={(e) => setCheckOutNotes(e.target.value)}
                      className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                    <button
                      onClick={() => checkOutMutation.mutate()}
                      disabled={checkOutMutation.isPending}
                      className="px-5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-lg shadow-sm transition-colors disabled:opacity-50 shrink-0"
                    >
                      {checkOutMutation.isPending ? 'Punching...' : 'Punch Out'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Timestamps */}
            {todayRecord && (
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Check-In Time:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Check-Out Time:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {todayRecord.checkOut
                      ? new Date(todayRecord.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : 'Pending punch out'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Calculated Hours:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {todayRecord.workingHours !== null ? `${todayRecord.workingHours} hrs` : 'Calculating on check-out'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Personal History Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Attendance (Last 30 Days)</h3>
            </div>

            {isMyLoading ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading attendance history...</div>
            ) : myRecords.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No attendance records found yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Check In</th>
                      <th className="px-4 py-3">Check Out</th>
                      <th className="px-4 py-3">Hours</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {myRecords.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{r.date}</td>
                        <td className="px-4 py-3">
                          {new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3">
                          {r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="px-4 py-3 font-mono font-medium">{r.workingHours ? `${r.workingHours}h` : '-'}</td>
                        <td className="px-4 py-3">
                          {r.isLate ? (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                              Late
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                              On Time
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{r.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMPANY ATTENDANCE TAB (HR / OWNER) */}
      {activeTab === 'company' && isHrOrOwner && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">Total Shifts</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/40 text-blue-600 dark:text-blue-400">
                  <CalendarCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-2">
                {companyRecords.length}
              </div>
              <span className="text-[11px] text-slate-400 block mt-2">Historical shift entries</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400">Completed</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
                {companyRecords.filter((r: any) => r.checkOut).length}
              </div>
              <span className="text-[11px] text-slate-400 block mt-2">Checked-out shifts</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-rose-500">Late Arrivals</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800/40 text-rose-600 dark:text-rose-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-rose-500 mt-2">
                {companyRecords.filter((r: any) => r.isLate).length}
              </div>
              <span className="text-[11px] text-slate-400 block mt-2">Past grace threshold</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">Total Hours</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-800/40 text-teal-600 dark:text-teal-400">
                  <Hourglass className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-2">
                {companyRecords.reduce((acc: number, r: any) => acc + (parseFloat(r.workingHours) || 0), 0).toFixed(1)}h
              </div>
              <span className="text-[11px] text-slate-400 block mt-2">Logged working hours</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Organization Attendance Records</h3>
              <p className="text-xs text-slate-500 mt-0.5">Calculated working hours and late arrivals with full audit tracking.</p>
            </div>
          </div>

          {isCompanyLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading organization records...</div>
          ) : companyRecords.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No attendance records logged across company.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Check In</th>
                    <th className="px-4 py-3">Check Out</th>
                    <th className="px-4 py-3">Hours</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {companyRecords.map((rec: any) => (
                    <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {rec.user?.name || 'Unknown'}
                        <div className="text-xs text-slate-400 font-normal">{rec.user?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{rec.user?.department?.name || 'None'}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{rec.date}</td>
                      <td className="px-4 py-3">
                        {new Date(rec.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        {rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium">{rec.workingHours ? `${rec.workingHours}h` : '-'}</td>
                      <td className="px-4 py-3">
                        {rec.isLate ? (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                            Late
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            On Time
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{rec.notes || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEditModal(rec)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded transition-colors"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      )}

      {/* HR Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Adjust Attendance Record</h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg">
                {editError}
              </div>
            )}

            <div className="text-xs text-slate-500">
              Editing record for <span className="font-semibold text-slate-900 dark:text-white">{editingRecord.user?.name}</span> on{' '}
              <span className="font-semibold text-slate-900 dark:text-white">{editingRecord.date}</span>. All modifications are logged
              in the immutable audit trail.
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Check-In DateTime</label>
                <input
                  type="datetime-local"
                  value={editCheckIn}
                  onChange={(e) => setEditCheckIn(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Check-Out DateTime (optional)
                </label>
                <input
                  type="datetime-local"
                  value={editCheckOut}
                  onChange={(e) => setEditCheckOut(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Adjustment Reason / Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Employee forgot to punch out due to offsite client meeting"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => editMutation.mutate()}
                disabled={editMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {editMutation.isPending ? 'Saving...' : 'Save Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
