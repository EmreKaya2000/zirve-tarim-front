import { expect, test, type Page } from '@playwright/test';

/**
 * Müşteri hesabı akışı uçtan uca testi (Sprint 11).
 *
 * KAPSANAN YOL:
 *   misafir sepete ekler → kayıt olur → sepeti hesabına taşınmış olarak bulur
 *   → talep gönderir → Taleplerim'de görür → çıkışta yerel sepet boş başlar
 *
 * E-POSTA DOĞRULAMA ADIMI BURADA YOK — bilinçli bir sınır:
 *
 * Doğrulama jetonu veritabanında YALNIZ SHA-256 ÖZETİYLE saklanır (tasarım
 * gereği) ve ham hâli yalnız e-postada bulunur. Tarayıcı testinin posta
 * kutusuna erişimi yoktur; erişebilmesi için jetonu bir uçtan geri veren bir
 * "test kapısı" açmak gerekirdi ve bu, test kolaylığı için üretime taşınan
 * gerçek bir güvenlik açığı olurdu.
 *
 * Doğrulama ve geçmiş talep bağlama, GERÇEK jetonla API e2e paketinde
 * kapsamlı biçimde test edilir:
 *   apps/api/test/customer-auth.e2e-spec.ts
 *     → "DOĞRULANMIŞ e-postayla geçmiş MİSAFİR talepleri hesaba bağlanır"
 *     → "UÇTAN UCA: misafir sepeti -> kayıt -> doğrulama -> talep"
 *
 * Burada ise doğrulanmamış durumun ARAYÜZDE doğru yansıdığı sınanır
 * (uyarı bandı görünür). Tarayıcıda tam zinciri koşturmak için
 * docker-compose'a bir posta yakalayıcı (Mailpit) eklenmesi gerekir — Sprint
 * 12'nin altyapı işine ait.
 *
 * ÖN KOŞUL: API ayakta ve veritabanı seed edilmiş olmalı (playwright.config.ts).
 *
 * YEREL TEKRARLI KOŞULARDA HIZ SINIRI: `POST /customer-auth/register` IP
 * başına SAATTE 5 istekle sınırlıdır. Bu paket koşu başına 2 kayıt yapar, yani
 * CI'da (tek koşu) sorun olmaz; aynı makinede üst üste üçten fazla koşarsanız
 * sınır devreye girer ve kayıt formu ilerlemez. Sınır kaldırılMAMALI —
 * geliştirirken API'yi `NODE_ENV=test` ile başlatmak yeterlidir (o modda
 * ThrottlerGuard atlanır, bkz. app.module.ts `skipIf`).
 */

/** Her koşuda çakışmayan bir e-posta üretir. */
function uniqueEmail(): string {
  return `pw.${Date.now().toString(36)}.${Math.floor(Math.random() * 1e6)}@playwright.test`;
}

const PASSWORD = 'Playwright2026';

/** Listedeki ilk ürünü sepete ekler ve ürün adını döndürür. */
async function addFirstProductToCart(page: Page): Promise<string> {
  await page.goto('/urunler');

  const href = await page.locator('a[href^="/urunler/"]').first().getAttribute('href');

  expect(href, 'Listede ürün olmalı — seed çalıştırıldı mı?').toBeTruthy();

  await page.goto(href as string);

  const productName = (await page.locator('h1').first().textContent()) ?? '';

  await page.getByRole('button', { name: /Talep Listeme Ekle/ }).click();
  await expect(page.getByText('Talep listenize eklendi')).toBeVisible();

  return productName.trim();
}

/**
 * Kayıt formunu doldurur ve gönderir.
 *
 * ALANLAR ID İLE SEÇİLİR, etiket metniyle DEĞİL: `Label` bileşeni zorunlu
 * alanlara görsel bir `*` ekliyor ve bu, erişilebilir ada karışıyor. Kırılgan
 * bir metin eşleşmesi yerine formun kendi `id` sözleşmesi kullanılır.
 */
async function register(page: Page, email: string): Promise<void> {
  await page.goto('/kayit');

  await page.locator('#firstName').fill('Playwright');
  await page.locator('#lastName').fill('Test');
  await page.locator('#email').fill(email);
  await page.locator('#phone').fill('0532 123 45 67');
  await page.locator('#password').fill(PASSWORD);
  await page.locator('#passwordConfirm').fill(PASSWORD);
  await page.locator('#consentAccepted').check();

  await page.getByRole('button', { name: 'Hesap Oluştur' }).click();
}

test.describe('Müşteri kimliği', () => {
  test('misafirde Giriş ve Kayıt bağlantıları görünür', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Giriş', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Kayıt Ol' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hesap menüsü' })).toBeHidden();
  });

  test('şifre politikası arayüzde uygulanır', async ({ page }) => {
    await page.goto('/kayit');

    await page.locator('#firstName').fill('Playwright');
    await page.locator('#lastName').fill('Test');
    await page.locator('#email').fill(uniqueEmail());
    await page.locator('#phone').fill('0532 123 45 67');
    // Rakam yok: politika reddetmeli.
    await page.locator('#password').fill('sadeceharfler');
    await page.locator('#passwordConfirm').fill('sadeceharfler');
    await page.locator('#consentAccepted').check();

    await page.getByRole('button', { name: 'Hesap Oluştur' }).click();

    // `role="alert"` ile ARANIR, düz metinle değil: aynı kural metni alanın
    // altında KALICI bir ipucu olarak da duruyor. Metin eşleşmesi ikisini
    // birden bulur ve strict mode ihlali üretir. Aranan şey ipucu değil,
    // HATA'nın belirmesi.
    await expect(
      page.getByRole('alert').filter({ hasText: /en az bir harf ile bir rakam/ }),
    ).toBeVisible();
  });

  test('şifre tekrarı eşleşmezse gönderim engellenir', async ({ page }) => {
    await page.goto('/kayit');

    // TÜM ALANLAR DOLDURULUR: şifre eşleşmesi şemada nesne düzeyinde bir
    // `refine` kuralıdır ve yalnız temel alan doğrulamaları GEÇTİKTEN sonra
    // çalışır. Boş bırakılan bir ad alanı, eşleşme hatasının hiç
    // görünmemesine yol açardı.
    await page.locator('#firstName').fill('Playwright');
    await page.locator('#lastName').fill('Test');
    await page.locator('#email').fill(uniqueEmail());
    await page.locator('#phone').fill('0532 123 45 67');
    await page.locator('#password').fill(PASSWORD);
    await page.locator('#passwordConfirm').fill('BaskaSifre2026');
    await page.locator('#consentAccepted').check();

    await page.getByRole('button', { name: 'Hesap Oluştur' }).click();

    await expect(page.getByText('Şifreler eşleşmiyor.')).toBeVisible();
  });

  test('hesap alanı oturumsuz açılınca girişe yönlendirir', async ({ page }) => {
    await page.goto('/hesabim/taleplerim');

    await expect(page).toHaveURL(/\/giris\?next=/);
  });

  test('şifremi unuttum genel yanıt döner', async ({ page }) => {
    await page.goto('/sifremi-unuttum');

    await page.locator('#email').fill(uniqueEmail());
    await page.getByRole('button', { name: /Sıfırlama Bağlantısı Gönder/ }).click();

    // Adres kayıtlı OLMASA DA aynı yanıt: kullanıcı sayımı engellenir.
    await expect(page.getByText('İsteğiniz alındı')).toBeVisible();
  });

  test('geçersiz doğrulama bağlantısı anlaşılır hata gösterir', async ({ page }) => {
    await page.goto('/eposta-dogrula/gecersiz-jeton-degeri');

    await expect(page.getByText('Bağlantı geçersiz')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Giriş Yap' })).toBeVisible();
  });
});

test.describe('Misafir sepeti hesaba taşınır', () => {
  test('kayıt sonrası sepet korunur, talep gönderilir ve Taleplerim de görünür', async ({
    page,
  }) => {
    const email = uniqueEmail();

    // --- 1) MİSAFİRKEN sepete ürün ekle ---
    const productName = await addFirstProductToCart(page);

    await expect(page.getByRole('link', { name: /Talep listesi \(1 ürün\)/ })).toBeVisible();

    // --- 2) Kayıt ol (kayıt sonrası otomatik giriş + sepet birleştirme) ---
    await register(page, email);

    await expect(page).toHaveURL(/\/hesabim$/);
    await expect(page.getByRole('button', { name: 'Hesap menüsü' })).toBeVisible();

    // Birleştirme başarı bildirimi.
    await expect(page.getByText('Talep listeniz hesabınıza taşındı')).toBeVisible();

    // --- 3) Doğrulanmamış e-posta uyarısı görünür ---
    // Doğrulama olmadan geçmiş misafir talepleri bağlanmaz; kullanıcı bunu
    // bilmeli.
    await expect(page.getByText('E-posta adresiniz doğrulanmadı')).toBeVisible();

    // --- 4) SEPET KAYBOLMADI ve artık sunucudan geliyor ---
    await page.goto('/talep-sepeti');

    await expect(page.getByText(/Listeniz hesabınıza kayıtlı/)).toBeVisible();
    await expect(page.getByText(productName, { exact: false }).first()).toBeVisible();

    // --- 5) Talep formu profilden ÖN DOLU gelir ---
    await expect(page.locator('#contactName')).toHaveValue('Playwright Test');
    await expect(page.locator('#contactEmail')).toHaveValue(email);
    await expect(page.locator('#contactPhone')).toHaveValue('5321234567');

    // --- 6) Talebi gönder ---
    await page.locator('#city').fill('Konya');
    await page.locator('#district').fill('Çumra');
    await page.locator('#consentAccepted').check();

    await page.getByRole('button', { name: /Talebi Gönder/ }).click();

    await expect(page).toHaveURL(/\/talep-basarili\//);

    const inquiryNumber = (page.url().split('/talep-basarili/')[1] ?? '').trim();

    expect(inquiryNumber).not.toBe('');

    // --- 7) Taleplerim listesinde görünür ---
    await page.goto('/hesabim/taleplerim');

    await expect(page.getByText(inquiryNumber)).toBeVisible();

    // --- 8) Detay sayfası açılır ---
    await page.getByText(inquiryNumber).click();

    await expect(page).toHaveURL(new RegExp(`/hesabim/taleplerim/${inquiryNumber}$`));
    await expect(page.getByText('Talebinizin durumu')).toBeVisible();
    await expect(page.getByText('Talep Ettiğiniz Ürünler')).toBeVisible();

    // --- 9) Çıkışta YEREL sepet boş başlar ---
    await page.getByRole('button', { name: 'Hesap menüsü' }).click();
    await page.getByRole('button', { name: 'Çıkış Yap' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: 'Giriş', exact: true })).toBeVisible();

    await page.goto('/talep-sepeti');

    // Sunucudaki sepet hesapta durur ama cihazda iz kalmaz: aynı bilgisayarı
    // kullanan bir sonraki kişi öncekinin listesini görmemeli.
    await expect(page.getByText('Talep listeniz boş')).toBeVisible();
  });

  test('tekrar girişte sunucu sepeti geri gelir', async ({ page }) => {
    const email = uniqueEmail();

    await addFirstProductToCart(page);
    await register(page, email);

    await expect(page).toHaveURL(/\/hesabim$/);

    // Çıkış
    await page.getByRole('button', { name: 'Hesap menüsü' }).click();
    await page.getByRole('button', { name: 'Çıkış Yap' }).click();
    await expect(page).toHaveURL('/');

    // Yerel sepet boş
    await page.goto('/talep-sepeti');
    await expect(page.getByText('Talep listeniz boş')).toBeVisible();

    // Tekrar giriş: sunucu sepeti geri gelir.
    await page.goto('/giris');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Giriş Yap' }).click();

    await expect(page).toHaveURL(/\/hesabim$/);
    await expect(page.getByRole('link', { name: /Talep listesi \(1 ürün\)/ })).toBeVisible();
  });
});
