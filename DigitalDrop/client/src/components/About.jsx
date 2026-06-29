import { useEffect, useRef, useState } from 'react';

const STATS = [
  { value: '12,400+', label: 'Assets delivered', icon: 'download' },
  { value: '3,800+', label: 'Creators selling', icon: 'storefront' },
  { value: '0', label: 'Subscriptions required', icon: 'block' },
  { value: '<10s', label: 'Avg. checkout to download', icon: 'bolt' },
];

const FORMATS = [
  { ext: '.fig', label: 'Figma files', icon: 'design_services' },
  { ext: '.zip', label: 'UI kits', icon: 'widgets' },
  { ext: '.mp4', label: 'Courses', icon: 'play_circle' },
  { ext: '.psd', label: 'Templates', icon: 'layers' },
];

export default function About() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.2 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="about"
      ref={sectionRef}
      className="relative px-margin-mobile md:px-margin-desktop py-24 max-w-[1440px] mx-auto"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
        {/* Left: narrative */}
        <div className="lg:col-span-5">
          <p className="text-label-md font-mono text-secondary uppercase tracking-widest mb-4">
            // about digitaldrop
          </p>
          <h2 className="text-headline-md text-on-background mb-6">
            One purchase.
            <br />
            <span className="text-gradient">One file. Yours.</span>
          </h2>
          <p className="text-body-md text-on-surface-variant mb-6">
            DigitalDrop exists because creators got tired of renting their own
            tools. Every kit, template, and course on the marketplace is sold
            once, owned forever, and unlocked the second your payment clears —
            no recurring billing, no locked tiers, no surprise renewal.
          </p>
          <p className="text-body-md text-on-surface-variant mb-8">
            Independent designers and educators list their work directly.
            We handle delivery, licensing, and payouts so they can focus on
            making things worth downloading.
          </p>

          <div className="flex flex-wrap gap-3">
            {FORMATS.map((f) => (
              <div
                key={f.ext}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-outline-variant bg-surface-container"
              >
                <span className="material-symbols-outlined text-secondary text-[18px]">
                  {f.icon}
                </span>
                <span className="text-label-sm font-mono text-on-surface-variant">
                  {f.ext}
                </span>
                <span className="text-label-sm text-on-surface-variant opacity-60">
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: stats grid */}
        <div className="lg:col-span-7 lg:pl-8">
          <div className="grid grid-cols-2 gap-px rounded-2xl overflow-hidden border border-outline-variant bg-outline-variant">
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                className={`bg-surface-container p-8 flex flex-col gap-3 transition-all duration-700 ${
                  visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <span className="material-symbols-outlined text-primary text-[22px]">
                  {stat.icon}
                </span>
                <span className="text-headline-md text-on-background font-mono">
                  {stat.value}
                </span>
                <span className="text-label-sm text-on-surface-variant">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          {/* Terminal-style "how it works" strip */}
          <div className="mt-6 rounded-xl border border-outline-variant bg-surface-container font-mono text-label-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-outline-variant">
              <span className="w-2.5 h-2.5 rounded-full bg-error/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-secondary/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-primary/70" />
              <span className="ml-2 text-on-surface-variant opacity-60">
                how-it-works.sh
              </span>
            </div>
            <div className="px-4 py-4 space-y-2 text-on-surface-variant">
              <p>
                <span className="text-secondary">$</span> browse marketplace
                <span className="text-on-surface-variant opacity-50"> # filter by category</span>
              </p>
              <p>
                <span className="text-secondary">$</span> checkout --once
                <span className="text-on-surface-variant opacity-50"> # no subscription</span>
              </p>
              <p>
                <span className="text-secondary">$</span> download --instant
                <span className="text-primary"> ✓ unlocked in dashboard</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}