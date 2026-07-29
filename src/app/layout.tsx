import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { courierPrime, manrope } from '@/fonts';
import { ToastViewport } from '@/components/toast';
import { CustomerAuthProvider } from '@/providers/customer-auth-provider';
import { QueryProvider } from '@/providers/query-provider';
import { SITE_NAME, SITE_URL } from '@/lib/env';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Ziraat ve Tarım Ürünleri`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'Zirai ilaç, gübre, tohum ve sulama ekipmanları. Ürünleri inceleyin, talebinizi mağazamıza iletin.',
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#00452d',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="tr"
      className={`${manrope.variable} ${courierPrime.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans text-on-background antialiased">
        {/*
          YALNIZ MÜŞTERİ KİMLİĞİ.
          
          Monorepo'da burada `AuthProvider` (yönetim oturumu) da vardı; vitrin
          ve panel aynı uygulamada yaşadığı için ikisi birden yükleniyordu.
          Panel ayrı bir depoya taşındı, vitrin artık yönetim oturumunu hiç
          tanımıyor — gereksiz kod da güvenlik yüzeyi de küçüldü.
        */}
        <QueryProvider>
          <CustomerAuthProvider>{children}</CustomerAuthProvider>
        </QueryProvider>

        <ToastViewport />
      </body>
    </html>
  );
}
