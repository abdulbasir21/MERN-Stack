import React, { useEffect, useState } from 'react';
import { Folder, Users, Wallet, Building2 } from 'lucide-react';
import { useReducedMotion } from 'motion/react';

const STATUS_PHASES = [
  'Checking your session',
  'Loading your workspace',
  'Syncing projects and tasks',
];

interface LoadingScreenProps {
  message?: string;
  isFadingOut?: boolean;
  className?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message,
  isFadingOut = false,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [phaseIndex, setPhaseIndex] = useState(0);

  // Cycle status line on a ~1.6s timer, stopping at the last message
  useEffect(() => {
    if (message || shouldReduceMotion) return;

    const timer = setInterval(() => {
      setPhaseIndex((prev) => {
        if (prev < STATUS_PHASES.length - 1) {
          return prev + 1;
        }
        clearInterval(timer);
        return prev;
      });
    }, 1600);

    return () => clearInterval(timer);
  }, [message, shouldReduceMotion]);

  const activeStatus = message
    ? message
    : shouldReduceMotion
      ? 'Loading your workspace'
      : STATUS_PHASES[phaseIndex];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-50 bg-[#F6F5F0] flex flex-col items-center justify-center p-4 select-none transition-opacity duration-300 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      } ${className}`}
    >
      <span className="sr-only">Loading CrewDesk</span>

      <div className="flex flex-col items-center text-center" aria-hidden="true">
        {/* 2x2 Module Tiles Grid */}
        <div className="grid grid-cols-2 gap-[6px]">
          {/* Top-Left: Projects */}
          <div
            className="w-[40px] h-[40px] rounded-[10px] flex items-center justify-center animate-module-tile shadow-xs"
            style={{ animationDelay: '0s' }}
          >
            <Folder className="w-5 h-5 text-white" strokeWidth={2} />
          </div>

          {/* Top-Right: Team */}
          <div
            className="w-[40px] h-[40px] rounded-[10px] flex items-center justify-center animate-module-tile shadow-xs"
            style={{ animationDelay: '0.5s' }}
          >
            <Users className="w-5 h-5 text-white" strokeWidth={2} />
          </div>

          {/* Bottom-Left: Finance */}
          <div
            className="w-[40px] h-[40px] rounded-[10px] flex items-center justify-center animate-module-tile shadow-xs"
            style={{ animationDelay: '1.5s' }}
          >
            <Wallet className="w-5 h-5 text-white" strokeWidth={2} />
          </div>

          {/* Bottom-Right: Clients */}
          <div
            className="w-[40px] h-[40px] rounded-[10px] flex items-center justify-center animate-module-tile shadow-xs"
            style={{ animationDelay: '1.0s' }}
          >
            <Building2 className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
        </div>

        {/* Brand Name */}
        <span className="text-[15px] font-medium text-[#04342C] tracking-tight mt-5">
          CrewDesk
        </span>
      </div>

      {/* Dynamic or Static Status Line */}
      <p className="text-[12px] text-[#6B7280] font-normal mt-1.5 min-h-[18px]">
        {activeStatus}
      </p>
    </div>
  );
};
