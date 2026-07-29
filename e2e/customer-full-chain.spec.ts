import { expect, test, type Page } from '@playwright/test';

import {
  clearMailbox,
  extractLinkPath,
  isMailpitAvailable,
  waitForMessage,
} from './support/mailpit';

/**
 * MÜŞTERİ ZİNCİRİ — TAM AKIŞ (Sprint 12, şart 1c).
 *
 * misafir sepete ekler → kayıt olur → E-POSTA DOĞRULAR → sepeti gelmiş →
 * talep gönderir → Taleplerim'de görür
 *
 * =============================================================================
 * SPRINT 11'DEKİ BOŞLUK BURADA KAPANIYOR
 * =============================================================================
 * O sprintte tarayıcı testi e-posta doğrulama adımını ATLAMAK ZORUNDA kalmıştı:
 * jeton veritabanında yalnız hash'li duruyor, ham hâli sadece e-postada. Şimdi
 * Mailpit posta kutusunu okuyor ve test GERÇEK bağlantıyı açıyor — üretim kod
 * yolu (MailService → nodemailer → SMTP) hiçbir yerde taklit edilmiyor.
 *
 * `customer-account.spec.ts` doğrulanmamış durumu ve sepet taşımayı sınar;
 * bu paket zincirin TAMAMINI, doğrulamayla birlikte kapatır. İkisi bilinçli
 * olarak ayrı: bu paket Mailpit gerektirir ve o yoksa atlanır.
 *
 * ÖN KOŞUL: API `MAIL_DRIVER=smtp` + `SMTP_HOST/PORT` Mailpit'e bakacak şekilde
 * çalışmalı. Mailpit yoksa paket ATLANIR (kendi ortamını kurmamış geliştiriciye
 * ilgisiz bir hata göstermemek için).
 */

const PASSWORD = 'Playwright2026';

function uniqueEmail(): string {
  return `chain.${Date.now().toString(36)}.${Math.floor(Math.random() * 1e6)}@playwright.test`;
}

/** Listedeki ilk ürünü sepete ekler ve adını döndürür. */
async function addFirstProductToCart(page: Page): Promise<string> {
  await page.goto('/urunler');

  const href = await page.locator('a[href^="/urunler/"]').first().getAttribute('href');

  expect(href, 'Listede ürün olmalı — seed çalıştırıldı mı?').toBeTruthy();

  await page.goto(href as string);

  const name = (await page.locator('h1').first().textContent()) ?? '';

  await page.getByRole('button', { name: /Talep Listeme Ekle/ }).click();
  await expect(page.getByText('Talep listenize eklendi')).toBeVisible();

  return name.trim();
}

/** Misafir olarak talep gönderir; geçmiş talep bağlamayı sınamak için. */
async function submitGuestInquiry(page: Page, email: string): Promise<string> {
  await addFirstProductToCart(page);
  await page.goto('/talep-sepeti');

  await page.locator('#contactName').fill('Zincir Misafir');
  await page.locator('#contactPhone').fill('0532 777 11 22');
  await page.locator('#contactEmail').fill(email);
  await page.locator('#city').fill('Konya');
  await page.locator('#district').fill('Çumra');
  await page.locator('#consentAccepted').check();

  await page.getByRole('button', { name: /Talebi Gönder/ }).click();
  await expect(page).toHaveURL(/\/talep-basarili\//);

  return (page.url().split('/talep-basarili/')[1] ?? '').trim();
}

test.describe('Müşteri zinciri — e-posta doğrulama dahil', () => {
  test.beforeEach(async ({ request }) => {
    // Mailpit yoksa paket atlanır; sert kırılma yerine açık bir atlama mesajı.
    test.skip(
      !(await isMailpitAvailable(request)),
      'Mailpit çalışmıyor. Başlatmak için: docker compose up -d mailpit ' +
        "ve API'yi MAIL_DRIVER=smtp SMTP_HOST=localhost SMTP_PORT=1025 ile koşturun.",
    );

    await clearMailbox(request);
  });

  test('misafir talebi + sepet, doğrulamadan sonra hesaba taşınır', async ({ page, request }) => {
    const email = uniqueEmail();

    // --- 1) MİSAFİRKEN talep gönder (geçmiş talep) ---
    const guestInquiryNumber = await submitGuestInquiry(page, email);

    expect(guestInquiryNumber).not.toBe('');

    // --- 2) MİSAFİRKEN sepete ürün ekle ---
    const productName = await addFirstProductToCart(page);

    await expect(page.getByRole('link', { name: /Talep listesi \(1 ürün\)/ })).toBeVisible();

    // --- 3) Kayıt ol ---
    await page.goto('/kayit');
    await page.locator('#firstName').fill('Zincir');
    await page.locator('#lastName').fill('Testi');
    await page.locator('#email').fill(email);
    await page.locator('#phone').fill('0532 777 11 22');
    await page.locator('#password').fill(PASSWORD);
    await page.locator('#passwordConfirm').fill(PASSWORD);
    await page.locator('#consentAccepted').check();
    await page.getByRole('button', { name: 'Hesap Oluştur' }).click();

    await expect(page).toHaveURL(/\/hesabim$/);

    // Sepet taşındı.
    await expect(page.getByText('Talep listeniz hesabınıza taşındı')).toBeVisible();

    // DOĞRULAMADAN ÖNCE: geçmiş misafir talebi hesapta GÖRÜNMEZ.
    await expect(page.getByText('E-posta adresiniz doğrulanmadı')).toBeVisible();

    await page.goto('/hesabim/taleplerim');
    await expect(page.getByText(guestInquiryNumber)).toBeHidden();

    // --- 4) POSTA KUTUSUNU OKU ve doğrulama bağlantısını AÇ ---
    const message = await waitForMessage(request, email, 'doğrula');
    const verifyPath = extractLinkPath(message, '/eposta-dogrula');

    await page.goto(verifyPath);

    await expect(page.getByText('E-posta adresiniz doğrulandı')).toBeVisible();
    // Geçmiş talebin bağlandığı KULLANICIYA BİLDİRİLİR.
    await expect(page.getByText(/Geçmiş talepleriniz hesabınıza eklendi/)).toBeVisible();

    // --- 5) Geçmiş misafir talebi artık Taleplerim'de ---
    await page.goto('/hesabim/taleplerim');
    await expect(page.getByText(guestInquiryNumber)).toBeVisible();

    // --- 6) Sepet hâlâ yerinde ve sunucudan geliyor ---
    await page.goto('/talep-sepeti');
    await expect(page.getByText(/Listeniz hesabınıza kayıtlı/)).toBeVisible();
    await expect(page.getByText(productName, { exact: false }).first()).toBeVisible();

    // --- 7) Girişli talep gönder ---
    await page.locator('#city').fill('Konya');
    await page.locator('#district').fill('Çumra');
    await page.locator('#consentAccepted').check();
    await page.getByRole('button', { name: /Talebi Gönder/ }).click();

    await expect(page).toHaveURL(/\/talep-basarili\//);

    const newInquiryNumber = (page.url().split('/talep-basarili/')[1] ?? '').trim();

    // --- 8) İKİ talep birlikte görünür ---
    await page.goto('/hesabim/taleplerim');
    await expect(page.getByText(guestInquiryNumber)).toBeVisible();
    await expect(page.getByText(newInquiryNumber)).toBeVisible();
  });

  test('şifre sıfırlama zinciri e-postadan tamamlanır', async ({ page, request }) => {
    const email = uniqueEmail();

    // Hesap oluştur.
    await page.goto('/kayit');
    await page.locator('#firstName').fill('Sifre');
    await page.locator('#lastName').fill('Sifirlama');
    await page.locator('#email').fill(email);
    await page.locator('#phone').fill('0532 888 33 44');
    await page.locator('#password').fill(PASSWORD);
    await page.locator('#passwordConfirm').fill(PASSWORD);
    await page.locator('#consentAccepted').check();
    await page.getByRole('button', { name: 'Hesap Oluştur' }).click();
    await expect(page).toHaveURL(/\/hesabim$/);

    // Çıkış yap.
    await page.getByRole('button', { name: 'Hesap menüsü' }).click();
    await page.getByRole('button', { name: 'Çıkış Yap' }).click();
    await expect(page).toHaveURL('/');

    // Sıfırlama iste.
    await clearMailbox(request);
    await page.goto('/sifremi-unuttum');
    await page.locator('#email').fill(email);
    await page.getByRole('button', { name: /Sıfırlama Bağlantısı Gönder/ }).click();
    await expect(page.getByText('İsteğiniz alındı')).toBeVisible();

    // Bağlantıyı postadan al ve aç.
    const message = await waitForMessage(request, email, 'Şifre sıfırlama');
    const resetPath = extractLinkPath(message, '/sifre-sifirla');

    await page.goto(resetPath);

    const newPassword = 'YeniZincir2026';

    await page.locator('#password').fill(newPassword);
    await page.locator('#passwordConfirm').fill(newPassword);
    await page.getByRole('button', { name: /Şifreyi Güncelle/ }).click();

    // Sıfırlama sonrası GİRİŞE yönlendirilir; otomatik oturum açılmaz.
    await expect(page).toHaveURL(/\/giris/);

    // Yeni şifreyle giriş çalışır.
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(newPassword);
    await page.getByRole('button', { name: 'Giriş Yap' }).click();
    await expect(page).toHaveURL(/\/hesabim$/);
  });
});
