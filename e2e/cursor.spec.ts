import { expect, test, type Page } from '@playwright/test';

/**
 * TIKLANABİLİR OLAN HER ŞEY EL İMLECİ GÖSTERİR.
 *
 * NEDEN BU TEST VAR
 * Tailwind v4, Preflight'tan `button { cursor: pointer }` kuralını kaldırıp
 * tarayıcının yerel varsayılanına (`default`) döndü. Yükseltmeden sonra
 * uygulamadaki HİÇBİR buton el imleci göstermedi ve bu fark edilmedi: hiçbir
 * test imleci ölçmüyordu, ekran görüntüsü de imleci göstermez. Kural
 * `src/app/globals.css` içindeki `@layer base` bloğunda tek yerden geri
 * verildi.
 *
 * Test SINIF ADI ARAMAZ — tarayıcının hesapladığı `cursor` değerine bakar.
 * `cursor-pointer` sınıfını aramak aynı hatayı yakalayamazdı; hata zaten
 * "sınıf yok ama olması gerektiğini kimse bilmiyor" hatasıydı. Kural silinir
 * ya da bir yükseltme yeniden ezerse burası kırılır.
 */

/** Görünür olup el imleci göstermeyen öğeler. */
async function elementsWithoutPointer(page: Page) {
  return page.evaluate(() => {
    const SELECTOR = 'button:not(:disabled), a[href], [role="button"], summary, label[for]';
    const offenders: { tag: string; text: string; cursor: string }[] = [];
    let visible = 0;

    for (const node of document.querySelectorAll(SELECTOR)) {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);

      // Görünmeyen öğenin imleci kullanıcıya hiç ulaşmaz; ölçmek gürültü olur.
      if (rect.width === 0 || rect.height === 0 || style.visibility === 'hidden') {
        continue;
      }

      visible += 1;

      if (style.cursor !== 'pointer') {
        offenders.push({
          tag: node.tagName.toLowerCase(),
          text: (node.textContent ?? '').trim().slice(0, 40),
          cursor: style.cursor,
        });
      }
    }

    return { visible, offenders };
  });
}

const PAGES = ['/', '/urunler', '/kategoriler', '/talep-sepeti', '/giris'];

for (const path of PAGES) {
  test(`${path} — tıklanabilir öğelerin tamamı el imleci gösterir`, async ({ page }) => {
    await page.goto(path);

    const { visible, offenders } = await elementsWithoutPointer(page);

    expect(
      visible,
      `${path} sayfasında tıklanabilir öğe bulunamadı — sayfa yüklendi mi?`,
    ).toBeGreaterThan(3);

    expect(offenders, `${path} sayfasında el imleci göstermeyen öğeler var`).toEqual([]);
  });
}

test('devre dışı buton "basılmaz" imleci gösterir', async ({ page }) => {
  await page.goto('/giris');

  /*
   * Giriş formundaki gönder butonu boş formda devre dışı değil; devre dışı
   * durumu üretmek yerine kuralın kendisi ölçülüyor: sayfaya devre dışı bir
   * buton enjekte edilip hesaplanan imleç okunuyor. Ölçülen şey CSS kuralı,
   * o yüzden bu geçerli bir doğrulama.
   */
  const cursor = await page.evaluate(() => {
    const button = document.createElement('button');

    button.disabled = true;
    button.textContent = 'test';
    document.body.append(button);

    const value = getComputedStyle(button).cursor;

    button.remove();

    return value;
  });

  expect(cursor).toBe('not-allowed');
});
