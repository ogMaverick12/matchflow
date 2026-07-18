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
      {/* §6 Observability: Firebase Performance Monitoring — zero extra provisioning,
          same Firebase project as Firestore. Script loads after page paint (defer).
          Requires NEXT_PUBLIC_FIREBASE_* env vars to be set in production. */}
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#fbbf24" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* Firebase Performance Monitoring SDK — async to never block first paint */}
        {process.env.NEXT_PUBLIC_FIREBASE_API_KEY && (
          <>
            <script
              defer
              src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"
            />
            <script
              defer
              src="https://www.gstatic.com/firebasejs/10.12.0/firebase-performance-compat.js"
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.addEventListener('load', function() {
                    try {
                      if (typeof firebase !== 'undefined' && !firebase.apps.length) {
                        firebase.initializeApp({
                          apiKey: "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}",
                          projectId: "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'matchflow-demo'}",
                          appId: "${process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''}",
                        });
                        firebase.performance();
                        console.info('[MatchflowPerf] Firebase Performance Monitoring active');
                      }
                    } catch(e) { console.warn('[MatchflowPerf] Init failed:', e.message); }
                  });
                `
              }}
            />
          </>
        )}
      </head>
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
