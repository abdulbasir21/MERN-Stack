import React from 'react';
import { Terminal } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Initializing secure agency workspace...',
}) => {
  return (
    <div className="min-h-screen bg-[#F6F5F0] flex flex-col items-center justify-center p-4 select-none">
      <div className="flex flex-col items-center max-w-xs w-full text-center">
        {/* Animated Brand Emblem */}
        <div className="relative mb-5">
          {/* Subtle Ambient Glow */}
          <div className="absolute -inset-2 bg-teal-500/20 rounded-2xl blur-md animate-pulse" />
          
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0f766e] to-[#004d47] flex items-center justify-center text-white shadow-xl shadow-teal-950/20 border border-teal-400/20">
            <Terminal className="w-7 h-7" />
          </div>

          {/* Active Ping Dot */}
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-teal-500 border-2 border-[#F6F5F0]" />
          </span>
        </div>

        {/* Brand Titles */}
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">CrewDesk</h1>
        <p className="text-[10px] font-mono tracking-widest uppercase text-teal-800 font-semibold mt-0.5">
          Enterprise Agency ERP
        </p>

        {/* Elegant Animated Progress Track */}
        <div className="w-48 h-1 bg-slate-200/80 rounded-full overflow-hidden mt-6 mb-3 relative">
          <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-teal-600 to-emerald-400 w-1/2 rounded-full animate-[progress_1.4s_ease-in-out_infinite]" />
        </div>

        {/* Live Status Message */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse" />
          <span>{message}</span>
        </div>
      </div>

      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
};
