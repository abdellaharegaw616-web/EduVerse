import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { QueryProvider } from '@/components/providers/query-provider';
import { AuthProvider } from '@/context/auth-context';
import { ThemeProvider } from '@/components/providers/theme-provider';

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
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'EduVerse Logo' }],
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('eduverse-theme');
                  var isDark = stored === 'dark' || (!stored && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.setAttribute('data-theme', 'light');
                    document.documentElement.style.colorScheme = 'light';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-brand-page font-sans text-brand-navy antialiased transition-colors duration-150">
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
