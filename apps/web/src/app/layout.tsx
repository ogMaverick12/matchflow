import { Metadata, Viewport } from 'next';
import { SessionProvider } from '@/context/SessionContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Matchflow — FIFA 2026 Smart Stadium Concierge',
  description: 'Dual-surface crowd intelligence platform for FIFA World Cup 2026 stadium operations.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Matchflow',
  },
};

export const viewport: Viewport = {
  themeColor: '#fbbf24',
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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#fbbf24" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
