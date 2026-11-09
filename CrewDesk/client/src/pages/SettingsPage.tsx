import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/useAuth';
import { CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { API_BASE } from '../lib/api';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = user?.role === 'OWNER';

  const [companyName, setCompanyName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('UTC');
  const [officeStartTime, setOfficeStartTime] = useState('09:00');
  const [lateGraceMinutes, setLateGraceMinutes] = useState(15);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/settings`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load settings');
      return res.json();
    },
  });

  useEffect(() => {
    if (data?.data) {
      setCompanyName(data.data.companyName || '');
      setCurrency(data.data.currency || 'USD');
      setTimezone(data.data.timezone || 'UTC');
      setOfficeStartTime(data.data.officeStartTime || '09:00');
      setLateGraceMinutes(data.data.lateGraceMinutes ?? 15);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      setSuccessMsg(false);
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          companyName,
          currency,
          timezone,
          officeStartTime,
          lateGraceMinutes: Number(lateGraceMinutes),
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error?.message || 'Failed to update settings');
      return resData;
    },
    onSuccess: () => {
      setSuccessMsg(true);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setTimeout(() => setSuccessMsg(false), 4000);
    },
    onError: (err: any) => setErrorMsg(err.message),
  });

  if (!isOwner) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        Access restricted. System settings can only be modified by the Agency Owner.
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Organization Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure agency corporate parameters, official timezone for attendance calculations and operational grace periods.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Company settings successfully updated and logged in the immutable audit trail.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading settings...</div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Company Legal Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Operating Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="AED">AED (د.إ) - UAE Dirham</option>
                  <option value="CAD">CAD ($) - Canadian Dollar</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Office Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="America/New_York">America/New_York (Eastern)</option>
                  <option value="America/Chicago">America/Chicago (Central)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (Pacific)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Europe/Paris">Europe/Paris (CET)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Daily Office Start Time (24h)
                </label>
                <input
                  type="time"
                  value={officeStartTime}
                  onChange={(e) => setOfficeStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Late Grace Period (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={lateGraceMinutes}
                  onChange={(e) => setLateGraceMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Punch-ins after {officeStartTime} + {lateGraceMinutes}m are automatically flagged as late.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={updateMutation.isPending || Boolean(user?.isDemo)}
                title={user?.isDemo ? 'Not available in demo' : 'Save organization settings'}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-3.5 h-3.5" />
                {updateMutation.isPending ? 'Saving Settings...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
