import type { Metadata } from 'next';
import './globals.css';
import { NavigationLoader } from '@/components/navigation/NavigationLoader';
import { StartupLoader } from '@/components/splash/StartupLoader';

export const metadata: Metadata = {
  title: 'InterviewPilot — AI Voice Mock Interviews for Every Career Stage',
  description:
    'Practice realistic, voice-first technical, behavioral, and HR interviews with an adaptive AI Recruiter avatar, CV-grounded questions, STAR rubric scoring, and zero audio storage.',
  openGraph: {
    title: 'InterviewPilot — AI Voice Mock Interviews for Every Career Stage',
    description:
      'Practice realistic, voice-first technical, behavioral, and HR interviews with an adaptive AI Recruiter avatar, CV-grounded questions, STAR rubric scoring, and zero audio storage.',
    type: 'website',
    siteName: 'InterviewPilot',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'InterviewPilot — AI Voice Mock Interviews for Every Career Stage',
    description:
      'Rehearse aloud with an adaptive AI Recruiter avatar, CV-grounded questions, and structured STAR scoring—zero voice storage.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-canvas text-text-primary antialiased">
        <StartupLoader />
        <NavigationLoader />
        {children}
      </body>
    </html>
  );
}
