import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { QueryProvider } from '@/components/providers/query-provider';
import { AuthProvider } from '@/context/auth-context';

export const metadata: Metadata = {
  title: 'EduVerse — Learn Beyond Boundaries',
  description:
    'The premier educational SaaS platform for Ethiopian students, teachers, and institutions. High-quality coursework, verifiable certificates, and low-bandwidth delivery.',
  keywords: [
    'EduVerse',
    'Ethiopian Education',
    'Online Learning',
    'Addis Ababa University',
    'Software Engineering',
    'Low bandwidth learning',
  ],
  authors: [{ name: 'EduVerse Engineering Team' }],
  openGraph: {
    title: 'EduVerse — Learn Beyond Boundaries',
    description:
      'Democratizing structured higher and vocational education with reliable, low-bandwidth, and verifiable learning workflows.',
    url: 'https://eduverse.et',
    siteName: 'EduVerse',
    locale: 'en_US',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#14213D',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-brand-page font-sans text-brand-navy antialiased">
        <QueryProvider>
          <AuthProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
