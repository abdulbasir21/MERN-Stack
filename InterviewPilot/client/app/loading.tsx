import React from 'react';
import { Loader2 } from 'lucide-react';

export default function AppLoading() {
  return (
    <div className="min-h-screen bg-[#0B0F17] text-[#F8FAFC] flex flex-col items-center justify-center gap-3 p-6">
      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      <p className="text-sm font-medium text-[#94A3B8]">Loading...</p>
    </div>
  );
}
