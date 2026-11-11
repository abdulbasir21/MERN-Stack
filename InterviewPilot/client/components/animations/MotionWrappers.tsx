'use client';

import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export function FadeIn({
  children,
  delay = 0,
  duration = 0.4,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function CardHover({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.99 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedProgressBar({
  value,
  max = 100,
  colorClass = 'bg-cyan-500',
  className = '',
}: {
  value: number;
  max?: number;
  colorClass?: string;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`w-full h-2 rounded-full bg-[#1E293B] overflow-hidden ${className}`}>
      <motion.div
        initial={shouldReduceMotion ? { width: `${percentage}%` } : { width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`h-full rounded-full ${colorClass}`}
      />
    </div>
  );
}

export function ToastNotification({
  message,
  onClose,
  type = 'info',
}: {
  message: string | null;
  onClose?: () => void;
  type?: 'info' | 'success' | 'error';
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: shouldReduceMotion ? 0.05 : 0.2 }}
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-3 text-xs ${
            type === 'success'
              ? 'bg-emerald-950/90 border-emerald-700/60 text-emerald-200'
              : type === 'error'
              ? 'bg-red-950/90 border-red-700/60 text-red-200'
              : 'bg-[#111827]/90 border-[#1E293B] text-[#F8FAFC]'
          }`}
        >
          <span>{message}</span>
          {onClose && (
            <button
              onClick={onClose}
              className="text-[#94A3B8] hover:text-[#F8FAFC] transition ml-2 font-bold"
            >
              ×
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
