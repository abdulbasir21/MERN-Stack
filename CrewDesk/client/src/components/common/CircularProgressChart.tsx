import React from 'react';

export type CircularColor = 'emerald' | 'blue' | 'indigo' | 'amber' | 'rose' | 'teal' | 'purple';

interface CircularProgressChartProps {
  value: number; // 0 to 100
  size?: number; // default 48
  strokeWidth?: number; // default 4
  color?: CircularColor;
  label?: string; // override center text (e.g. "70%", "1/3")
  icon?: React.ComponentType<{ className?: string }>;
  showIcon?: boolean;
}

const COLOR_MAP: Record<
  CircularColor,
  {
    track: string;
    stroke: string;
    text: string;
    glow: string;
    iconBg: string;
  }
> = {
  emerald: {
    track: 'stroke-emerald-100 dark:stroke-emerald-950/50',
    stroke: 'stroke-emerald-500 dark:stroke-emerald-400',
    text: 'text-emerald-700 dark:text-emerald-400',
    glow: 'drop-shadow-[0_0_4px_rgba(16,185,129,0.25)]',
    iconBg: 'text-emerald-600 dark:text-emerald-400',
  },
  blue: {
    track: 'stroke-blue-100 dark:stroke-blue-950/50',
    stroke: 'stroke-blue-500 dark:stroke-blue-400',
    text: 'text-blue-700 dark:text-blue-400',
    glow: 'drop-shadow-[0_0_4px_rgba(59,130,246,0.25)]',
    iconBg: 'text-blue-600 dark:text-blue-400',
  },
  indigo: {
    track: 'stroke-indigo-100 dark:stroke-indigo-950/50',
    stroke: 'stroke-indigo-500 dark:stroke-indigo-400',
    text: 'text-indigo-700 dark:text-indigo-400',
    glow: 'drop-shadow-[0_0_4px_rgba(99,102,241,0.25)]',
    iconBg: 'text-indigo-600 dark:text-indigo-400',
  },
  amber: {
    track: 'stroke-amber-100 dark:stroke-amber-950/50',
    stroke: 'stroke-amber-500 dark:stroke-amber-400',
    text: 'text-amber-700 dark:text-amber-400',
    glow: 'drop-shadow-[0_0_4px_rgba(245,158,11,0.25)]',
    iconBg: 'text-amber-600 dark:text-amber-400',
  },
  rose: {
    track: 'stroke-rose-100 dark:stroke-rose-950/50',
    stroke: 'stroke-rose-500 dark:stroke-rose-400',
    text: 'text-rose-700 dark:text-rose-400',
    glow: 'drop-shadow-[0_0_4px_rgba(244,63,94,0.25)]',
    iconBg: 'text-rose-600 dark:text-rose-400',
  },
  teal: {
    track: 'stroke-teal-100 dark:stroke-teal-950/50',
    stroke: 'stroke-teal-500 dark:stroke-teal-400',
    text: 'text-teal-700 dark:text-teal-400',
    glow: 'drop-shadow-[0_0_4px_rgba(20,184,166,0.25)]',
    iconBg: 'text-teal-600 dark:text-teal-400',
  },
  purple: {
    track: 'stroke-purple-100 dark:stroke-purple-950/50',
    stroke: 'stroke-purple-500 dark:stroke-purple-400',
    text: 'text-purple-700 dark:text-purple-400',
    glow: 'drop-shadow-[0_0_4px_rgba(168,85,247,0.25)]',
    iconBg: 'text-purple-600 dark:text-purple-400',
  },
};

export const CircularProgressChart: React.FC<CircularProgressChartProps> = ({
  value,
  size = 48,
  strokeWidth = 3.5,
  color = 'blue',
  label,
  icon: Icon,
  showIcon = false,
}) => {
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * clampedValue) / 100;
  const colorTheme = COLOR_MAP[color] || COLOR_MAP.blue;

  const displayLabel = label !== undefined ? label : `${Math.round(clampedValue)}%`;

  return (
    <div
      className="relative flex items-center justify-center shrink-0 group transition-transform hover:scale-105"
      style={{ width: size, height: size }}
      title={`${displayLabel} (${Math.round(clampedValue)}% complete)`}
    >
      <svg
        className={`-rotate-90 transform ${colorTheme.glow}`}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`${colorTheme.track} transition-colors`}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Active progress stroke */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`${colorTheme.stroke} transition-all duration-1000 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>

      {/* Center Label or Icon */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {showIcon && Icon ? (
          <Icon className={`w-4 h-4 ${colorTheme.iconBg}`} />
        ) : (
          <span
            className={`font-mono font-extrabold tracking-tight ${colorTheme.text}`}
            style={{ fontSize: size <= 44 ? '10px' : '11px' }}
          >
            {displayLabel}
          </span>
        )}
      </div>
    </div>
  );
};
