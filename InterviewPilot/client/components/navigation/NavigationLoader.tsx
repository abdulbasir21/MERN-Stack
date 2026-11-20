'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface NavigateEventDetail {
  label?: string;
}

export function NavigationLoader() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Loading page, please wait...');

  // Clear active navigation loader when Next.js finishes committing the new pathname
  useEffect(() => {
    setIsNavigating(false);
    setLoadingLabel('Loading page, please wait...');
  }, [pathname]);

  // Safety timeout so loader cannot remain stuck indefinitely if navigation is cancelled
  useEffect(() => {
    if (!isNavigating) return;
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 25000);
    return () => clearTimeout(timer);
  }, [isNavigating]);

  // Intercept internal Next.js <Link> / <a> clicks and programmatic navigation events
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a');
      if (!anchor) return;

      const hrefAttr = anchor.getAttribute('href');
      if (!hrefAttr || !hrefAttr.startsWith('/') || hrefAttr.startsWith('//')) return;
      if (anchor.getAttribute('target') === '_blank' || anchor.hasAttribute('download')) return;

      const nextPath = hrefAttr.split('?')[0].split('#')[0];
      if (nextPath === window.location.pathname) return;

      const rawText = anchor.textContent?.trim();
      setLoadingLabel(
        rawText && rawText.length <= 40 ? `Loading ${rawText}...` : 'Loading page, please wait...'
      );
      setIsNavigating(true);
    };

    const handleProgrammaticNav = (event: Event) => {
      const custom = event as CustomEvent<NavigateEventDetail>;
      setLoadingLabel(custom.detail?.label || 'Loading page, please wait...');
      setIsNavigating(true);
    };

    document.addEventListener('click', handleClick, true);
    window.addEventListener('interviewpilot:navigate', handleProgrammaticNav);
    return () => {
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('interviewpilot:navigate', handleProgrammaticNav);
    };
  }, []);

  if (!isNavigating) {
    return null;
  }

  return (
    <>
      <div
        className="fixed top-0 inset-x-0 h-1 z-[100] bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 animate-pulse"
        aria-hidden="true"
      />
      <div
        role="status"
        aria-live="polite"
        className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 rounded-full bg-[#111827]/95 backdrop-blur-md border border-cyan-500/40 shadow-2xl shadow-cyan-500/20 flex items-center gap-3 text-xs font-semibold text-[#F8FAFC]"
      >
        <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
        <span className="whitespace-nowrap">{loadingLabel}</span>
      </div>
    </>
  );
}
