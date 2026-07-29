import { expect, test, type Page } from '@playwright/test';

/**
 * Public vitrin uçtan uca testleri (Sprint 5).
 *
 * Testler SEED VERİSİNE dayanır (bkz. apps/api/prisma/seed-data/products.ts).
 * Sabit slug kullanmak yerine listeden ilk ürün okunur; seed'de ad
 * değiştiğinde testler kırılmasın diye. Tek istisna, fiyatı gizli ürün:
 * o senaryonun seed'de belirli bir karşılığı var ve bilerek sabit.
 */

/** Seed'de `showPrice=false` ile yayınlanan tek ürün. */
const HIDDEN_PRICE_SLUG = 'tarimtek-sirt-pulverizatoru-16-litre';

/** Listedeki ilk ürünün slug'ını döndürür. */
async function firstProductSlug(page: Page): Promise<string> {
  await page.goto('/urunler');

  const href = await page.locator('a[href^="/urunler/"]').first().getAttribute('href');

  expect(href, 'Listede en az bir ürün olmalı — seed çalıştırıldı mı?').toBeTruthy();

  return (href as string).replace('/urunler/', '');
}

test.describe('Ana sayfa', () => {
  test('açılır ve temel bölümleri gösterir', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Tarlanıza değer katan ürünler',
    );

    // Ç-01: vitrinde "sipariş/ödeme" dili kullanılmaz.
    await expect(page.getByText('online satış ve ödeme yapılmaz').first()).toBeVisible();

    await expect(page.getByRole('link', { name: 'Ürünleri İncele' })).toBeVisible();
  });

  test('ürün kataloğuna bağlantı verir', async ({ page }) => {
    await page.goto('/');

    const link = page.getByRole('link', { name: 'Ürünleri İncele' });
    await expect(link).toHaveAttribute('href', '/urunler');

    await link.click();
    await page.waitForURL('**/urunler');
    await expect(page.getByRole('heading', { name: 'Ürünler', level: 1 })).toBeVisible();
  });
});

test.describe('Ürün listeleme', () => {
  test('ürünleri listeler ve sayaç gösterir', async ({ page }) => {
    await page.goto('/urunler');

    await expect(page.getByText(/ürün listeleniyor/)).toBeVisible();
    expect(await page.locator('a[href^="/urunler/"]').count()).toBeGreaterThan(0);
  });

  test("arama filtresi sonucu daraltır ve URL'de kalır", async ({ page }) => {
    await page.goto('/urunler');
    const total = await page.locator('a[href^="/urunler/"]').count();

    await page.goto('/urunler?q=gubre');

    // Türkçe arama aksansız çalışmalı: "gubre" -> "Gübre" (R-10).
    const filtered = await page.locator('a[href^="/urunler/"]').count();
    expect(filtered).toBeGreaterThan(0);
    expect(filtered).toBeLessThan(total);

    // Paylaşılabilir link gereksinimi: filtre URL'de yaşar.
    await expect(page).toHaveURL(/q=gubre/);
  });

  test("sıralama seçimi URL'ye yazılır", async ({ page }) => {
    await page.goto('/urunler');

    await page.getByLabel('Sırala').selectOption('price-asc');

    await page.waitForURL(/sort=price-asc/);
  });

  test('geçersiz sıralama değeri hata vermez, varsayılana düşer', async ({ page }) => {
    const response = await page.goto('/urunler?sort=rastgele');

    expect(response?.status()).toBe(200);
    expect(await page.locator('a[href^="/urunler/"]').count()).toBeGreaterThan(0);
  });

  test('sonuç bulunamadığında boş durum gösterir', async ({ page }) => {
    await page.goto('/urunler?q=boylebirurunkesinlikleyok');

    await expect(page.getByText('Aradığınız kriterlere uygun ürün bulunamadı')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Filtreleri temizle' })).toBeVisible();
  });
});

test.describe('Ürün detayı', () => {
  test('ürün bilgilerini ve varyasyon seçiciyi gösterir', async ({ page }) => {
    const slug = await firstProductSlug(page);
    await page.goto(`/urunler/${slug}`);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Sprint 6'da işlevlendi: buton artık aktif ve listeye ekliyor.
    // (Sprint 5'te görünür ama pasifti.)
    const addButton = page.getByRole('button', { name: /Talep Listeme Ekle/ });
    await expect(addButton).toBeVisible();
    await expect(addButton).toBeEnabled();
  });

  test('miktar adımlayıcısı asgari değerin altına inmez', async ({ page }) => {
    const slug = await firstProductSlug(page);
    await page.goto(`/urunler/${slug}`);

    const quantity = page.locator('#quantity');
    const initial = await quantity.inputValue();

    // Sayfa asgari miktarla açılır; azaltma düğmesi bu yüzden PASİFTİR.
    await expect(page.getByRole('button', { name: 'Miktarı azalt' })).toBeDisabled();

    // Bir adım artırıp geri azaltınca başlangıç değerine dönmeli.
    await page.getByRole('button', { name: 'Miktarı artır' }).click();
    await expect(quantity).not.toHaveValue(initial);

    await page.getByRole('button', { name: 'Miktarı azalt' }).click();
    await expect(quantity).toHaveValue(initial);
  });

  test('miktar adımlayıcısı adım kuralına uyar', async ({ page }) => {
    const slug = await firstProductSlug(page);
    await page.goto(`/urunler/${slug}`);

    const quantity = page.locator('#quantity');
    const before = Number((await quantity.inputValue()).replace(',', '.'));

    await page.getByRole('button', { name: 'Miktarı artır' }).click();

    const after = Number((await quantity.inputValue()).replace(',', '.'));
    expect(after).toBeGreaterThan(before);
  });

  test('yapılandırılmış veri (JSON-LD) üretir', async ({ page }) => {
    const slug = await firstProductSlug(page);
    await page.goto(`/urunler/${slug}`);

    const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(raw ?? '{}') as { '@type': string; name: string };

    expect(data['@type']).toBe('Product');
    expect(data.name.length).toBeGreaterThan(0);
  });

  test('SEO üstverisi ürüne özgüdür', async ({ page }) => {
    const slug = await firstProductSlug(page);
    await page.goto(`/urunler/${slug}`);

    const heading = await page.getByRole('heading', { level: 1 }).textContent();
    await expect(page).toHaveTitle(new RegExp(escapeRegExp((heading ?? '').slice(0, 15))));

    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveCount(1);
  });
});

test.describe('KURAL 8 — fiyat gizleme', () => {
  test('showPrice=false ürününde fiyat yerine yönlendirme metni çıkar', async ({ page }) => {
    await page.goto(`/urunler/${HIDDEN_PRICE_SLUG}`);

    await expect(page.getByText('Fiyat için mağazamıza danışın').first()).toBeVisible();
  });

  test('fiyatı gizli üründe JSON-LD offers bloğu YAZILMAZ', async ({ page }) => {
    await page.goto(`/urunler/${HIDDEN_PRICE_SLUG}`);

    const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(raw ?? '{}') as Record<string, unknown>;

    // Fiyatsız bir `offers` nesnesi geçersiz yapılandırılmış veridir.
    expect(data.offers).toBeUndefined();
  });

  test('hiçbir public sayfada alış fiyatı sızmaz', async ({ page }) => {
    for (const path of ['/urunler', `/urunler/${HIDDEN_PRICE_SLUG}`, '/']) {
      await page.goto(path);

      const html = await page.content();

      expect(html, `${path} yanıtında purchasePrice bulundu`).not.toContain('purchasePrice');
    }
  });
});

test.describe('Yayında olmayan içerik', () => {
  test('bulunmayan ürün 404 döner', async ({ page }) => {
    const response = await page.goto('/urunler/boyle-bir-urun-yok');

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Sayfa bulunamadı' })).toBeVisible();
  });

  test('bulunmayan kategori, marka ve bitki 404 döner', async ({ page }) => {
    for (const path of ['/kategori/yok', '/marka/yok', '/bitki/yok']) {
      const response = await page.goto(path);

      expect(response?.status(), `${path} 404 dönmeli`).toBe(404);
    }
  });
});

test.describe('Taksonomi sayfaları', () => {
  test('kategori sayfası ürünleri listeler', async ({ page }) => {
    await page.goto('/kategoriler');

    const firstCategory = page.locator('a[href^="/kategori/"]').first();
    await firstCategory.click();

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/ürün$/).first()).toBeVisible();
  });

  test('marka sayfası açılır', async ({ page }) => {
    await page.goto('/markalar');
    await page.locator('a[href^="/marka/"]').first().click();

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('bitki sayfası açılır', async ({ page }) => {
    await page.goto('/bitkiler');
    await page.locator('a[href^="/bitki/"]').first().click();

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('SEO altyapısı', () => {
  test('sitemap.xml ürünleri içerir', async ({ request }) => {
    const response = await request.get('/sitemap.xml');

    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain('<urlset');
    expect(body).toContain('/urunler/');
  });

  test('robots.txt yönetim panelini kapatır', async ({ request }) => {
    const response = await request.get('/robots.txt');

    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain('Disallow: /admin');
    expect(body).toContain('Sitemap:');
  });
});

test.describe('Statik sayfalar', () => {
  const pages = [
    { path: '/hakkimizda', heading: 'Hakkımızda' },
    { path: '/iletisim', heading: 'İletişim' },
    { path: '/kvkk', heading: 'KVKK Aydınlatma Metni' },
    { path: '/gizlilik', heading: 'Gizlilik Politikası' },
    { path: '/kullanim-kosullari', heading: 'Kullanım Koşulları' },
  ];

  for (const item of pages) {
    test(`${item.path} açılır`, async ({ page }) => {
      const response = await page.goto(item.path);

      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { name: item.heading, level: 1 })).toBeVisible();
    });
  }
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
