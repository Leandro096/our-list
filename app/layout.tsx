import './globals.css';

import { cookies } from 'next/headers';
import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { Newsreader, Instrument_Sans } from 'next/font/google';

import type { Locale } from '@/lib';
import { I18nProvider, DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from '@/locales';

import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';

const instrument = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  variable: '--font-newsreader',
});

export const metadata: Metadata = {
  title: 'Guests List App',
  description:
    'Elegant wedding guest management platform with QR check-in, seating assignments, and comprehensive guest tracking.',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFDFA' },
    { media: '(prefers-color-scheme: dark)', color: '#1B1612' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get(LOCALE_STORAGE_KEY)?.value as Locale) || DEFAULT_LOCALE;

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className="bg-background"
      data-scroll-behavior="smooth"
    >
      <body className={`${instrument.variable} ${newsreader.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider initialLocale={locale}>
            {children}
            <Toaster />
          </I18nProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  );
}
