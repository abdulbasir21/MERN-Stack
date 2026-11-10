import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'InterviewPilot — Practice smarter. Interview with confidence.',
  description:
    'Voice-first AI job interview rehearsal platform with adaptive questioning, 3D recruiter avatar, and comprehensive performance reports.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-canvas text-text-primary antialiased">{children}</body>
    </html>
  );
}
