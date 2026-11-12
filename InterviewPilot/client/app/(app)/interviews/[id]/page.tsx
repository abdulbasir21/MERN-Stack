'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function InterviewDetailPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (params?.id) {
      router.replace(`/interviews/${params.id}/device-check`);
    }
  }, [params, router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <span className="text-sm text-slate-400">Loading interview rehearsal...</span>
    </div>
  );
}
