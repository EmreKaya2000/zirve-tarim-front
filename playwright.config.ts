import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright yapılandırması — vitrin testleri.
 *
 * Panel (admin) testleri BU DEPODA DEĞİL: zirve-tarim-admin deposunda.
 *
 * ÖN KOŞUL: API'nin ayakta ve veritabanının SEED EDİLMİŞ olması gerekir.
 * Testler seed verisine dayanır (10 ürün, kategoriler, markalar); bu
 * bilinçli bir tercihtir — gerçek veriyle çalışan bir vitrin, sahte
 * fixture'larla test edilenden daha çok şey doğrular.
 *
 * Web sunucusu Playwright tarafından başlatılır. `next start` yerine
 * standalone çıktı kullanılır: üretimde de çalışan sunucu odur
 * (next.config.ts -> output: 'standalone').
 */

const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 3100);
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;

export default defineConfig({
  testDir: './e2e',
  // Vitrin salt okunur: testler birbirinin verisini bozmaz, paralel çalışabilir.
  fullyParallel: true,
  // CI'da yanlışlıkla bırakılmış test.only derlemeyi kırsın.
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI === undefined ? 0 : 1,
  workers: process.env.CI === undefined ? undefined : 2,
  reporter: process.env.CI === undefined ? 'list' : [['list'], ['html', { open: 'never' }]],

  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
  },

  // Katalog testleri masaüstünde, mobil duman testleri mobil cihazda çalışır.
  // Aynı dosyayı iki projede birden koşturmak süreyi ikiye katlar ve mobilde
  // hiç render edilmeyen masaüstü öğeleri yüzünden sahte hata üretir.
  projects: [
    {
      name: 'masaustu',
      testIgnore: /mobile\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobil',
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices['Pixel 7'] },
    },
  ],

  webServer: {
    // Derlenmiş standalone sunucu; `pnpm build` önce çalışmış olmalı.
    command: 'node .next/standalone/server.js',
    url: BASE_URL,
    reuseExistingServer: process.env.CI === undefined,
    timeout: 60_000,
    env: {
      PORT: String(WEB_PORT),
      NEXT_PUBLIC_API_URL: API_URL,
      INTERNAL_API_URL: process.env.INTERNAL_API_URL ?? API_URL,
      NEXT_PUBLIC_SITE_URL: BASE_URL,
    },
  },
});
