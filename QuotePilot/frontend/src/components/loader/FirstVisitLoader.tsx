'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Sparkles, Scale, FileCheck } from 'lucide-react';

const STORAGE_KEY = 'quotepilot_visited_session';

const PHASES = [
  { text: 'Auditing SECP Commercial Arbitration Standards...', icon: Scale },
  { text: 'Verifying Meezan Bank Escrow Covenants...', icon: ShieldCheck },
  { text: 'Calibrating Gemini AI Intake Engine...', icon: Sparkles },
  { text: 'QuotePilot Marketplace Ready.', icon: FileCheck },
];

export const FirstVisitLoader: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    // 1. Check if already visited in this session or prefers reduced motion
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasVisited = sessionStorage.getItem(STORAGE_KEY);

    if (hasVisited || prefersReducedMotion) {
      setIsVisible(false);
      document.documentElement.classList.remove('first-visit-active');
      document.documentElement.classList.add('first-visit-complete');
      return;
    }

    // 2. Active first-visit loader: lock scroll and launch brand sequence
    document.documentElement.classList.add('first-visit-active');

    // Progress bar ticker (reaching 100% over ~2.6s)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 98) {
          clearInterval(interval);
          return 98;
        }
        return Math.min(98, prev + Math.floor(Math.random() * 18) + 12);
      });
    }, 380);

    // Dynamic phase transitions
    const p1 = setTimeout(() => setPhaseIndex(1), 650);
    const p2 = setTimeout(() => setPhaseIndex(2), 1400);
    const p3 = setTimeout(() => setPhaseIndex(3), 2100);

    // Auto complete & smooth exit at 2.8s
    const dismiss = setTimeout(() => {
      setProgress(100);
      setIsVisible(false);
      try {
        sessionStorage.setItem(STORAGE_KEY, 'true');
      } catch {
        // Safe fallback if storage quota or access blocked
      }
    }, 2850);

    // Clean up class after exit animation finishes
    const cleanup = setTimeout(() => {
      document.documentElement.classList.remove('first-visit-active');
      document.documentElement.classList.add('first-visit-complete');
    }, 3400);

    return () => {
      clearInterval(interval);
      clearTimeout(p1);
      clearTimeout(p2);
      clearTimeout(p3);
      clearTimeout(dismiss);
      clearTimeout(cleanup);
    };
  }, []);

  const ActiveIcon = PHASES[phaseIndex].icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="first-visit-loader"
          key="first-visit-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#FAF8F4] overflow-hidden"
          aria-live="polite"
          aria-busy="true"
        >
          {/* Subtle Background Radial Aura */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,92,92,0.06)_0%,transparent_70%)] pointer-events-none" />

          {/* Luxury Floating Paper Card */}
          <motion.div
            initial={{ scale: 0.92, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: -10, opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md mx-4 p-8 sm:p-10 bg-white border border-[#E7E2D9] rounded-2xl shadow-2xl shadow-stone-900/5 flex flex-col items-center text-center"
          >
            {/* Top Ornamental Seal */}
            <div className="relative mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                className="w-20 h-20 rounded-full border border-dashed border-[#0F5C5C]/30 flex items-center justify-center"
              />
              <motion.div
                initial={{ scale: 0.7 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-2 rounded-full bg-[#0F5C5C] text-white flex items-center justify-center shadow-lg shadow-[#0F5C5C]/20"
              >
                <ActiveIcon className="w-8 h-8 transition-transform duration-300" strokeWidth={1.75} />
              </motion.div>
            </div>

            {/* Masthead */}
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="font-serif text-3xl sm:text-4xl font-bold text-[#1B2430] tracking-tight mb-1.5"
            >
              QuotePilot
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="text-[11px] font-mono uppercase tracking-widest text-[#0F5C5C] font-semibold mb-6"
            >
              Institutional Service Marketplace
            </motion.p>

            {/* Dynamic Step Status Ticker */}
            <div className="h-6 flex items-center justify-center mb-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={phaseIndex}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-2 text-xs font-mono text-[#4B5563]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0F5C5C] animate-ping" />
                  <span>{PHASES[phaseIndex].text}</span>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Tactile Progress Indicator Bar */}
            <div className="w-full bg-[#F3EFE7] h-1.5 rounded-full overflow-hidden mb-3 relative">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: 'easeOut', duration: 0.3 }}
                className="h-full bg-gradient-to-r from-[#0F5C5C] to-[#1F7A4D] rounded-full"
              />
            </div>

            {/* Bottom Covenants & Percentage */}
            <div className="w-full flex items-center justify-between text-[10px] font-mono text-[#6B7280]">
              <span>SECP &amp; Meezan Vault Protected</span>
              <span className="font-bold text-[#0F5C5C]">{progress}%</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
