const COLUMNS = [
  {
    title: 'Marketplace',
    links: ['UI kits', 'Templates', 'Courses', 'Figma files', 'Bundles'],
  },
  {
    title: 'Company',
    links: ['About', 'Sell on DigitalDrop', 'Exclusive drops', 'Careers'],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-outline-variant bg-surface" id="footer">
      <div className="px-margin-mobile md:px-margin-desktop py-16 max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Brand */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary text-[22px]">
                water_drop
              </span>
              <span className="text-headline-md text-on-background font-bold">
                DigitalDrop
              </span>
            </div>
            <p className="text-body-sm text-on-surface-variant max-w-xs mb-6">
              Premium digital assets, sold once and owned forever. No
              subscriptions — just what you need, the moment you need it.
            </p>
          </div>

          {/* Link column */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="text-label-sm font-mono uppercase tracking-widest text-on-surface-variant opacity-60 mb-4">
                  {col.title}
                </p>
                <ul className="space-y-3">
                  {col.links.map((label) => (
                    <li
                      key={label}
                      className="text-body-sm text-on-surface-variant"
                    >
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-label-sm font-mono text-on-surface-variant opacity-60">
            © {year} DigitalDrop. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-label-sm font-mono text-on-surface-variant opacity-60">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}