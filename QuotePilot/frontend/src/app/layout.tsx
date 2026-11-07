import type { Metadata } from 'next';
import './globals.css';
import { FirstVisitLoader } from '@/components/loader/FirstVisitLoader';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'QuotePilot — Service Marketplace & Quotations',
  description: 'Discover verified service providers, request custom quotes with AI intake validation, and manage proposals seamlessly.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var v = sessionStorage.getItem('quotepilot_visited_session');
                  var m = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                  if (v || m) {
                    document.documentElement.classList.add('first-visit-complete');
                  } else {
                    document.documentElement.classList.add('first-visit-active');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-paper-canvas text-ink-primary font-sans antialiased selection:bg-brand-teal-tint selection:text-brand-teal">
        <AuthProvider>
          <FirstVisitLoader />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
