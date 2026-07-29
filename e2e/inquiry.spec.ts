import { expect, test, type Page } from '@playwright/test';

/**
 * Talep akışı uçtan uca testi (Sprint 6).
 *
 * Kapsanan yol: ürün detayı → talep listesine ekle → liste sayfası →
 * form → gönderim → başarı sayfası.
 *
 * YÖNETİM TARAFI BURADA TEST EDİLMEZ: yönetim paneli giriş gerektirir ve
 * talep durumu yönetimi API e2e testlerinde (inquiries.e2e-spec.ts)
 * kapsamlı biçimde doğrulanıyor. Burada ziyaretçinin gördüğü yol test
 * edilir.
 */

/** Rastgele ad — aynı testin tekrar koşusunda kayıt çakışmasın. */
function uniqueName(): string {
  return `Playwright ${Date.now().toString(36)}`;
}

/** Listedeki ilk ürünün detay sayfasına gider ve slug'ı döndürür. */
async function openFirstProduct(page: Page): Promise<string> {
  await page.goto('/urunler');

  const href = await page.locator('a[href^="/urunler/"]').first().getAttribute('href');

  expect(href, 'Listede ürün olmalı — seed çalıştırıldı mı?').toBeTruthy();

  await page.goto(href as string);

  return (href as string).replace('/urunler/', '');
}

test.describe('Talep listesi', () => {
  test('boş listede yönlendirme gösterir', async ({ page }) => {
    await page.goto('/talep-sepeti');

    await expect(page.getByText('Talep listeniz boş')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ürünlere göz at' })).toBeVisible();
  });

  test('ürün eklenince header rozeti görünür', async ({ page }) => {
    await openFirstProduct(page);

    await page.getByRole('button', { name: /Talep Listeme Ekle/ }).click();

    await expect(page.getByText('Talep listenize eklendi')).toBeVisible();
    await expect(page.getByRole('link', { name: /Talep listesi \(1 ürün\)/ })).toBeVisible();
  });

  test('liste sayfaya yansır ve satır kaldırılabilir', async ({ page }) => {
    await openFirstProduct(page);
    await page.getByRole('button', { name: /Talep Listeme Ekle/ }).click();

    await page.goto('/talep-sepeti');

    const removeButton = page.getByRole('button', { name: /listeden kaldır/ });
    await expect(removeButton).toBeVisible();

    await removeButton.click();

    await expect(page.getByText('Talep listeniz boş')).toBeVisible();
  });

  test('liste sayfalar arasında korunur', async ({ page }) => {
    await openFirstProduct(page);
    await page.getByRole('button', { name: /Talep Listeme Ekle/ }).click();

    // localStorage kalıcılığı: başka sayfaya gidip dönünce kalem durmalı.
    await page.goto('/');
    await page.goto('/talep-sepeti');

    await expect(page.getByRole('button', { name: /listeden kaldır/ })).toBeVisible();
  });

  test('miktar adım kuralına göre değişir', async ({ page }) => {
    await openFirstProduct(page);
    await page.getByRole('button', { name: /Talep Listeme Ekle/ }).click();
    await page.goto('/talep-sepeti');

    // Alert bileşeni de role="status" taşır; aria-label ile satırın
    // miktar göstergesi ayırt edilir.
    const quantityText = page.getByRole('status', { name: /miktarı$/ }).first();
    const before = await quantityText.textContent();

    await page.getByRole('button', { name: 'Miktarı artır' }).click();

    await expect(quantityText).not.toHaveText(before ?? '');
  });
});

test.describe('Talep gönderimi', () => {
  test('KVKK onayı olmadan gönderilemez', async ({ page }) => {
    await openFirstProduct(page);
    await page.getByRole('button', { name: /Talep Listeme Ekle/ }).click();
    await page.goto('/talep-sepeti');

    await page.locator('#contactName').fill(uniqueName());
    await page.locator('#contactPhone').fill('0532 111 22 33');
    await page.locator('#city').fill('Konya');
    await page.locator('#district').fill('Çumra');

    // Onay kutusu işaretlenmedi.
    await page.getByRole('button', { name: /Talebi Gönder/ }).click();

    await expect(page.getByText(/aydınlatma metnini onaylamanız gerekir/i)).toBeVisible();
    await expect(page).toHaveURL(/talep-sepeti/);
  });

  test('eksik zorunlu alan uyarı gösterir', async ({ page }) => {
    await openFirstProduct(page);
    await page.getByRole('button', { name: /Talep Listeme Ekle/ }).click();
    await page.goto('/talep-sepeti');

    await page.getByRole('button', { name: /Talebi Gönder/ }).click();

    await expect(page.getByText('Ad soyad en az 3 karakter olmalıdır.')).toBeVisible();
  });

  test('geçersiz telefon reddedilir', async ({ page }) => {
    await openFirstProduct(page);
    await page.getByRole('button', { name: /Talep Listeme Ekle/ }).click();
    await page.goto('/talep-sepeti');

    await page.locator('#contactName').fill(uniqueName());
    await page.locator('#contactPhone').fill('12345');
    await page.locator('#city').fill('Konya');
    await page.locator('#district').fill('Çumra');
    await page.locator('#consentAccepted').check();

    await page.getByRole('button', { name: /Talebi Gönder/ }).click();

    await expect(page.getByText(/Geçerli bir cep telefonu numarası/)).toBeVisible();
  });

  test('TAM AKIŞ: ürün ekle → talep gönder → talep numarası al', async ({ page }) => {
    await openFirstProduct(page);
    await page.getByRole('button', { name: /Talep Listeme Ekle/ }).click();
    await page.goto('/talep-sepeti');

    await page.locator('#contactName').fill(uniqueName());
    await page.locator('#contactPhone').fill('0532 123 45 67');
    await page.locator('#contactEmail').fill('playwright@example.com');
    await page.locator('#city').fill('Konya');
    await page.locator('#district').fill('Çumra');
    await page.locator('#customerNote').fill('Playwright uçtan uca testi');
    await page.locator('#consentAccepted').check();

    await page.getByRole('button', { name: /Talebi Gönder/ }).click();

    // Başarı sayfası: talep numarası TLP-YYYY-NNNNNN biçiminde.
    await page.waitForURL(/talep-basarili/);

    await expect(page.getByRole('heading', { name: 'Talebiniz bize ulaştı' })).toBeVisible();
    await expect(page.getByText(/^[A-Z]{2,6}-\d{4}-\d{6,}$/)).toBeVisible();

    // Bilgilendirme metinleri: stok rezerve edilmedi, teslimat mağazada.
    await expect(page.getByText('Stok rezerve edilmedi')).toBeVisible();
    await expect(page.getByText('Teslimat mağazada')).toBeVisible();
  });

  test('gönderim sonrası liste temizlenir', async ({ page }) => {
    await openFirstProduct(page);
    await page.getByRole('button', { name: /Talep Listeme Ekle/ }).click();
    await page.goto('/talep-sepeti');

    await page.locator('#contactName').fill(uniqueName());
    await page.locator('#contactPhone').fill('0532 123 45 68');
    await page.locator('#city').fill('Konya');
    await page.locator('#district').fill('Çumra');
    await page.locator('#consentAccepted').check();
    await page.getByRole('button', { name: /Talebi Gönder/ }).click();

    await page.waitForURL(/talep-basarili/);

    // Sepet temizlenmeli: geri dönen kullanıcı aynı talebi ikinci kez
    // göndermeye çalışmasın.
    await page.goto('/talep-sepeti');
    await expect(page.getByText('Talep listeniz boş')).toBeVisible();
  });
});

test.describe('Fiyatı gizli ürün', () => {
  const HIDDEN_PRICE_SLUG = 'tarimtek-sirt-pulverizatoru-16-litre';

  test('listede fiyat yerine yönlendirme metni gösterilir', async ({ page }) => {
    await page.goto(`/urunler/${HIDDEN_PRICE_SLUG}`);
    await page.getByRole('button', { name: /Talep Listeme Ekle/ }).click();

    await page.goto('/talep-sepeti');

    await expect(page.getByText('Fiyat için danışın')).toBeVisible();
    await expect(page.getByText('Bazı ürünlerin fiyatı gösterilmiyor')).toBeVisible();
  });
});

test.describe('Talep sayfaları indekslenmez', () => {
  test('talep listesi noindex taşır', async ({ page }) => {
    await page.goto('/talep-sepeti');

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('robots.txt talep yollarını kapatır', async ({ request }) => {
    const body = await (await request.get('/robots.txt')).text();

    expect(body).toContain('/talep-sepeti');
    expect(body).toContain('/talep-basarili');
  });
});
