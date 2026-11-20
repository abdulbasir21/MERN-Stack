'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDemoSessionApi } from '@/lib/api';
import { HomeNavbar } from '@/components/home/HomeNavbar';
import { HeroSection } from '@/components/home/HeroSection';
import { WhoItIsForSection } from '@/components/home/WhoItIsForSection';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { FeaturesGridSection } from '@/components/home/FeaturesGridSection';
import { InterviewTypesSection } from '@/components/home/InterviewTypesSection';
import { FaqSection } from '@/components/home/FaqSection';
import { FinalCtaSection } from '@/components/home/FinalCtaSection';
import { HomeFooter } from '@/components/home/HomeFooter';

const OBSERVED_SECTIONS = [
  'who-its-for',
  'how-it-works',
  'features',
  'types',
  'faq',
];

export default function LandingPage() {
  const router = useRouter();
  const [startingDemo, setStartingDemo] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    const elements = OBSERVED_SECTIONS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null
    );
    if (elements.length === 0 || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        rootMargin: '-25% 0px -55% 0px',
        threshold: [0.1, 0.35, 0.6],
      }
    );

    for (const el of elements) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  const handleStartDemo = async () => {
    try {
      setStartingDemo(true);
      setDemoError(null);
      await createDemoSessionApi();
      window.dispatchEvent(
        new CustomEvent('interviewpilot:navigate', {
          detail: { label: 'Loading Demo Dashboard...' },
        })
      );
      router.push('/dashboard');
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to start instant demo. Please try registering instead.';
      setDemoError(errorMessage);
      setStartingDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] antialiased overflow-x-hidden">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <HomeNavbar activeSection={activeSection} />

      <main id="main-content" tabIndex={-1}>
        <HeroSection
          startingDemo={startingDemo}
          demoError={demoError}
          onStartDemo={() => void handleStartDemo()}
        />

        <WhoItIsForSection />

        <HowItWorksSection />

        <FeaturesGridSection />

        <InterviewTypesSection />

        <FaqSection />

        <FinalCtaSection
          startingDemo={startingDemo}
          onStartDemo={() => void handleStartDemo()}
        />
      </main>

      <HomeFooter />
    </div>
  );
}
