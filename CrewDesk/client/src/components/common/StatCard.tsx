import React from 'react';
import { Link } from 'react-router-dom';
import { AnimatedCard } from './MotionWrapper';

export type StatTone = 'default' | 'attention' | 'danger';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: StatTone;
  ringPercentage?: number | null;
  action?: {
    label: string;
    href: string;
  };
  index?: number;
  className?: string;
}

const TONE_STYLES: Record<
  StatTone,
  {
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    ringStroke: string;
    ringText: string;
    valueText?: string;
  }
> = {
  default: {
    badgeBg: 'bg-teal-50 dark:bg-teal-950/40',
    badgeBorder: 'border-teal-100 dark:border-teal-800/40',
    badgeText: 'text-teal-700 dark:text-teal-400',
    ringStroke: 'stroke-teal-600 dark:stroke-teal-400',
    ringText: 'text-teal-700 dark:text-teal-400',
  },
  attention: {
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
    badgeBorder: 'border-amber-100 dark:border-amber-800/40',
    badgeText: 'text-amber-600 dark:text-amber-400',
    ringStroke: 'stroke-amber-500 dark:stroke-amber-400',
    ringText: 'text-amber-600 dark:text-amber-400',
    valueText: 'text-amber-600 dark:text-amber-400',
  },
  danger: {
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
    badgeBorder: 'border-rose-100 dark:border-rose-800/40',
    badgeText: 'text-rose-600 dark:text-rose-400',
    ringStroke: 'stroke-rose-500 dark:stroke-rose-400',
    ringText: 'text-rose-600 dark:text-rose-400',
    valueText: 'text-rose-600 dark:text-rose-400',
  },
};

/**
 * Clean, flat SVG circular progress ring (no glow or shadows)
 */
interface FlatRingProps {
  value: number;
  tone: StatTone;
  size?: number;
  strokeWidth?: number;
}

const FlatRing: React.FC<FlatRingProps> = ({
  value,
  tone,
  size = 40,
  strokeWidth = 3,
}) => {
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * clampedValue) / 100;
  const styles = TONE_STYLES[tone];

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      aria-label={`${Math.round(clampedValue)}%`}
    >
      <svg
        className="-rotate-90 transform"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Light track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-slate-100 dark:stroke-slate-800"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Flat active progress stroke */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`${styles.ringStroke} transition-all duration-700 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums tracking-tight ${styles.ringText}`}
      >
        {Math.round(clampedValue)}%
      </span>
    </div>
  );
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  tone = 'default',
  ringPercentage,
  action,
  index = 0,
  className = '',
}) => {
  const styles = TONE_STYLES[tone];
  const hasRing = typeof ringPercentage === 'number' && !Number.isNaN(ringPercentage);

  return (
    <AnimatedCard
      index={index}
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Header: Label (left) and Ring/Icon Badge (right) */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-600 dark:text-slate-300 truncate">
            {label}
          </span>

          {hasRing ? (
            <FlatRing value={ringPercentage} tone={tone} />
          ) : (
            <div
              className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${styles.badgeBg} ${styles.badgeBorder} ${styles.badgeText}`}
            >
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Large Value */}
        <div
          className={`text-2xl font-bold tracking-tight mt-3 tabular-nums truncate ${
            styles.valueText || 'text-slate-900 dark:text-white'
          }`}
        >
          {value}
        </div>
      </div>

      {/* Footer: Subtext or Clickable Action */}
      <div className="mt-2 pt-1">
        {action ? (
          <Link
            to={action.href}
            className="text-xs font-medium text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 hover:underline transition-colors inline-flex items-center gap-1"
          >
            {action.label}
          </Link>
        ) : subtext ? (
          <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">
            {subtext}
          </span>
        ) : null}
      </div>
    </AnimatedCard>
  );
};
