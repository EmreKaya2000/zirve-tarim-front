import { expect, test } from '@playwright/test';

/**
 * Mobil viewport duman testi.
 *
 * Yalnız `mobil` projesinde çalışır: playwright.config.ts bu dosyayı
 * `testMatch` ile o projeye, masaüstü projesine ise `testIgnore` ile
 * kapatır. Masaüstünde çalıştırılsaydı mobil menü hiç render edilmediği
 * için testler yanlış yere düşerdi.
 *
 * Mobil öncelikli gereksinim burada somutlaşıyor: menü, filtre çekmecesi
 * ve yatay taşma kontrolü.
 */
test.describe('Mobil', () => {
  test('mobil menü açılır ve gezinme bağlantıları çalışır', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Menüyü aç' }).click();

    const menu = page.getByRole('link', { name: 'Ürünler', exact: true });
    await expect(menu).toBeVisible();

    await menu.click();
    await expect(page).toHaveURL(/\/urunler$/);
  });

  test('mobil menü kapatılabilir', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Menüyü aç' }).click();
    await expect(page.getByRole('button', { name: 'Menüyü kapat' })).toBeVisible();

    await page.getByRole('button', { name: 'Menüyü kapat' }).click();
    await expect(page.getByRole('button', { name: 'Menüyü kapat' })).toBeHidden();
  });

  test('filtre çekmecesi açılır', async ({ page }) => {
    await page.goto('/urunler');

    await page.getByRole('button', { name: 'Filtrele' }).click();

    await expect(page.getByRole('heading', { name: 'Kategori' })).toBeVisible();
    await expect(page.getByRole('button', { name: /ürünü göster/ })).toBeVisible();
  });

  test('sayfa yatay olarak taşmaz', async ({ page }) => {
    for (const path of ['/', '/urunler', '/kategoriler']) {
      await page.goto(path);

      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );

      expect(overflows, `${path} sayfasında yatay kaydırma var`).toBe(false);
    }
  });

  test('ürün detayı mobilde okunabilir', async ({ page }) => {
    await page.goto('/urunler');

    const href = await page.locator('a[href^="/urunler/"]').first().getAttribute('href');
    await page.goto(href as string);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /Talep Listeme Ekle/ })).toBeVisible();
  });
});
