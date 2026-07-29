import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/env';

/**
 * robots.txt
 *
 * `/admin` ve `/api` taranmaya kapalı. `/talep-sepeti` de kapalı: sepet
 * kişiye özel ve içeriksiz bir sayfadır, indekslenmesi anlamsızdır.
 *
 * SPRINT 11 — MÜŞTERİ HESABI SAYFALARI DA KAPALI:
 *   /hesabim/*        kişisel veri (profil, talep geçmişi)
 *   /giris, /kayit    içerikleri yok; arama sonucunda görünmeleri anlamsız
 *   /sifre-sifirla/*  jeton taşır; tarayıcı adres yolu indekslenmemeli
 *   /eposta-dogrula/* aynı gerekçe — üstelik bir tarayıcının bağlantıyı
 *                     ziyaret etmesi TEK KULLANIMLIK jetonu tüketebilir
 *
 * Sayfalar ayrıca kendi `metadata.robots` alanlarında da `index: false`
 * taşır: robots.txt yalnız bir RİCADIR, meta etiketi ise sayfanın kendi
 * beyanıdır. İkisi birlikte gerekir.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/talep-sepeti',
          '/talep-basarili',
          '/hesabim',
          '/hesabim/',
          '/giris',
          '/kayit',
          '/sifremi-unuttum',
          '/sifre-sifirla/',
          '/eposta-dogrula/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
