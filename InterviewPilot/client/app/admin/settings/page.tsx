'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchAdminSettingsApi, updateAdminSettingsApi } from '@/lib/api';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAdminSettingsApi();
      setSettings(res.data.settings);
    } catch (err: any) {
      setError(err?.message || 'Failed to load system settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      await updateAdminSettingsApi(settings);
      setSuccess('Settings updated and audited successfully.');
      loadSettings();
    } catch (err: any) {
      setError(err?.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">System Settings &amp; Quotas</h1>
        <p className="text-xs text-[#94A3B8] mt-1">
          Configure global platform parameters. All modifications are range-validated and audited with before/after state diffs (ADM-7).
        </p>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-300">
          {success}
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-xs text-[#94A3B8]">Loading system settings...</div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Section: Platform AI Engine Switch */}
          <div className="p-6 rounded-2xl bg-[#111827] border border-[#1E293B] space-y-4">
            <h3 className="text-sm font-semibold text-[#F8FAFC]">Platform AI State</h3>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-[#F8FAFC] font-medium block">AI Engine Enabled (aiEnabled)</span>
                <span className="text-[11px] text-[#64748B]">
                  Global master switch. When disabled, all new AI interactions are immediately blocked.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.aiEnabled !== false}
                onChange={(e) => handleChange('aiEnabled', e.target.checked)}
                className="w-4 h-4 rounded border-gray-700 text-cyan-600 focus:ring-cyan-500 bg-[#0B0F17]"
              />
            </div>
          </div>

          {/* Section: Demo Controls (ADM-9) */}
          <div className="p-6 rounded-2xl bg-[#111827] border border-[#1E293B] space-y-4">
            <h3 className="text-sm font-semibold text-[#F8FAFC]">Demo Experience Controls (ADM-9)</h3>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-[#F8FAFC] font-medium block">Enable Demo Experience (demoEnabled)</span>
                <span className="text-[11px] text-[#64748B]">Allows visitors to explore demo sessions.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.demoEnabled !== false}
                onChange={(e) => handleChange('demoEnabled', e.target.checked)}
                className="w-4 h-4 rounded border-gray-700 text-cyan-600 focus:ring-cyan-500 bg-[#0B0F17]"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#1E293B]">
              <div>
                <span className="text-xs text-[#F8FAFC] font-medium block">Enable Live Demo Interview (liveDemoEnabled)</span>
                <span className="text-[11px] text-[#64748B]">Allows demo visitors to start live mock interviews (sample data stays readable if off).</span>
              </div>
              <input
                type="checkbox"
                checked={settings.liveDemoEnabled !== false}
                onChange={(e) => handleChange('liveDemoEnabled', e.target.checked)}
                className="w-4 h-4 rounded border-gray-700 text-cyan-600 focus:ring-cyan-500 bg-[#0B0F17]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#1E293B]">
              <div>
                <label className="text-xs text-[#F8FAFC] font-medium block mb-1">
                  Demo Interviews / IP / Day
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.demoInterviewsPerIpPerDay ?? 1}
                  onChange={(e) => handleChange('demoInterviewsPerIpPerDay', parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0F17] border border-[#1E293B] text-xs text-[#F8FAFC]"
                />
              </div>

              <div>
                <label className="text-xs text-[#F8FAFC] font-medium block mb-1">
                  Global Demo Limit / Day
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={settings.demoGlobalInterviewsPerDay ?? 20}
                  onChange={(e) => handleChange('demoGlobalInterviewsPerDay', parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0F17] border border-[#1E293B] text-xs text-[#F8FAFC]"
                />
              </div>
            </div>
          </div>

          {/* Section: Budget & Quotas */}
          <div className="p-6 rounded-2xl bg-[#111827] border border-[#1E293B] space-y-4">
            <h3 className="text-sm font-semibold text-[#F8FAFC]">Quotas &amp; Budgets (QTA-4)</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#F8FAFC] font-medium block mb-1">
                  Global Monthly Budget (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.globalMonthlyBudgetUsd ?? 50.00}
                  onChange={(e) => handleChange('globalMonthlyBudgetUsd', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0F17] border border-[#1E293B] text-xs text-[#F8FAFC]"
                />
              </div>

              <div>
                <label className="text-xs text-[#F8FAFC] font-medium block mb-1">
                  Free User Interviews / Month
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={settings.freeUserInterviewsPerMonth ?? 5}
                  onChange={(e) => handleChange('freeUserInterviewsPerMonth', parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0F17] border border-[#1E293B] text-xs text-[#F8FAFC]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition shadow-lg shadow-cyan-600/20"
            >
              {saving ? 'Saving & Auditing...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
