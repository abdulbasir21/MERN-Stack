'use client';

import React from 'react';

export interface WaveformProps {
  bars: number[];
  isRecording?: boolean;
  isMuted?: boolean;
  className?: string;
}

export function Waveform({
  bars,
  isRecording = false,
  isMuted = false,
  className = '',
}: WaveformProps): React.JSX.Element {
  // If muted or not recording, render flat 4px bars (VOI-8)
  const displayBars = isMuted || !isRecording ? new Array(bars.length || 24).fill(4) : bars;

  return (
    <div
      className={`flex items-center justify-center gap-1.5 h-16 px-4 py-2 bg-slate-900/60 rounded-xl border border-slate-800 ${className}`}
      role="region"
      aria-label="Microphone Audio Waveform"
    >
      {displayBars.map((height, idx) => {
        const isActive = isRecording && !isMuted && height > 4;
        return (
          <div
            key={idx}
            className="w-1.5 rounded-full transition-all duration-75 ease-out"
            style={{
              height: `${Math.max(4, Math.min(48, height))}px`,
              backgroundColor: isMuted
                ? '#64748b' // Slate 500 when muted
                : isActive
                ? '#6366f1' // Indigo 500 when speaking
                : '#334155', // Slate 700 in silence/idle
              boxShadow: isActive
                ? '0 0 8px rgba(99, 102, 241, 0.4)'
                : 'none',
            }}
          />
        );
      })}
    </div>
  );
}
