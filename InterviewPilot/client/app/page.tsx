'use client';

import React, { useEffect, useState } from 'react';
import { Activity, ShieldCheck, RefreshCw } from 'lucide-react';
import { fetchHealth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function HomePage() {
  const [status, setStatus] = useState<'loading' | 'online' | 'error'>('loading');
  const [timestamp, setTimestamp] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const checkBackendHealth = async () => {
    setStatus('loading');
    setErrorMsg(null);
    try {
      const result = await fetchHealth();
      setStatus('online');
      setTimestamp(result.data.timestamp);
      setRequestId(result.meta?.requestId || null);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reach backend API');
    }
  };

  useEffect(() => {
    void checkBackendHealth();
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <div className="mb-8 flex items-center justify-between border-b border-border pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
            InterviewPilot AI Platform
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-text-primary">
            Practice smarter. Interview with confidence.
          </h1>
        </div>
        <Badge variant={status === 'online' ? 'success' : status === 'error' ? 'danger' : 'default'}>
          <Activity className="h-3.5 w-3.5" />
          {status === 'online'
            ? 'API Connected'
            : status === 'error'
              ? 'API Unreachable'
              : 'Checking API...'}
        </Badge>
      </div>

      <Card className="border-border bg-surface">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>System Telemetry &amp; Health Check</CardTitle>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void checkBackendHealth()}
            disabled={status === 'loading'}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Status
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-text-secondary">
          {status === 'loading' && <p>Contacting InterviewPilot API via /api/health...</p>}
          {status === 'online' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border bg-canvas p-4">
                <span className="text-xs uppercase tracking-wider text-text-muted">
                  Last Verified (UTC)
                </span>
                <p className="mt-1 font-mono text-text-primary tabular-nums">{timestamp}</p>
              </div>
              <div className="rounded-md border border-border bg-canvas p-4">
                <span className="text-xs uppercase tracking-wider text-text-muted">
                  Request ID
                </span>
                <p className="mt-1 font-mono text-text-primary tabular-nums">
                  {requestId || 'verified'}
                </p>
              </div>
            </div>
          )}
          {status === 'error' && (
            <div className="rounded-md border border-rose-500/40 bg-rose-950/30 p-4 text-rose-300">
              {errorMsg}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
