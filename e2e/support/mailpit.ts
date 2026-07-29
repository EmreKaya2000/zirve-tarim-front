import { expect, type APIRequestContext } from '@playwright/test';

/**
 * MAILPIT İSTEMCİSİ — tarayıcı testinin posta kutusunu okuması için.
 *
 * NEDEN GEREKLİ: doğrulama ve şifre sıfırlama jetonları veritabanında YALNIZ
 * SHA-256 özetiyle saklanır; ham hâlleri sadece e-postanın içindedir. Sprint
 * 11'de bu yüzden tarayıcı zincirinden e-posta doğrulama adımı çıkarılmıştı.
 *
 * Alternatif, jetonu geri veren bir "test kapısı" açmaktı — test kolaylığı için
 * üretime taşınan gerçek bir güvenlik açığı. Mailpit gerçek SMTP konuşur:
 * üretim kod yolu (MailService -> nodemailer -> SMTP) aynen çalışır, hiçbir şey
 * taklit edilmez.
 *
 * ÖN KOŞUL: API `MAIL_DRIVER=smtp` ve `SMTP_HOST`/`SMTP_PORT` Mailpit'e bakacak
 * şekilde çalışmalı. Mailpit yoksa testler ATLANIR (bkz. isMailpitAvailable).
 */

/** Mailpit HTTP API kökü. */
export const MAILPIT_URL = process.env['MAILPIT_URL'] ?? 'http://127.0.0.1:8025';

interface MailpitMessageSummary {
  ID: string;
  To: { Address: string }[];
  Subject: string;
}

interface MailpitMessage {
  ID: string;
  Subject: string;
  Text: string;
  HTML: string;
}

/**
 * Mailpit ayakta mı?
 *
 * Testler bunu kontrol edip yoksa kendilerini atlar. Gerekçe: posta yakalayıcı
 * bir GELİŞTİRME aracıdır ve her ortamda çalışmıyor olabilir. Testin sert
 * biçimde kırılması, Mailpit'i kurmamış bir geliştiriciye kendi değişikliğiyle
 * ilgisiz bir hata gösterirdi.
 */
export async function isMailpitAvailable(request: APIRequestContext): Promise<boolean> {
  try {
    const response = await request.get(`${MAILPIT_URL}/readyz`, { timeout: 3_000 });

    return response.ok();
  } catch {
    return false;
  }
}

/** Posta kutusunu boşaltır — testler birbirinin mesajını görmesin. */
export async function clearMailbox(request: APIRequestContext): Promise<void> {
  await request.delete(`${MAILPIT_URL}/api/v1/messages`);
}

/**
 * Belirli bir adrese gelen SON mesajı bekler ve döndürür.
 *
 * SORGULAMA (polling) gerekiyor: SMTP gönderimi HTTP yanıtından bağımsız ve
 * asenkron tamamlanır. API "kayıt oluştu" dediğinde posta henüz Mailpit'e
 * ulaşmamış olabilir.
 *
 * @param subjectContains Konu filtresi. Aynı adrese birden çok mesaj gelebilir
 *                        (doğrulama + şifre sıfırlama); yalnız aradığımızı alır.
 */
export async function waitForMessage(
  request: APIRequestContext,
  to: string,
  subjectContains: string,
  timeoutMs = 15_000,
): Promise<MailpitMessage> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const listResponse = await request.get(`${MAILPIT_URL}/api/v1/messages?limit=50`);

    if (listResponse.ok()) {
      const body = (await listResponse.json()) as { messages?: MailpitMessageSummary[] };
      const match = (body.messages ?? []).find(
        (message) =>
          message.To.some((address) => address.Address.toLowerCase() === to.toLowerCase()) &&
          message.Subject.includes(subjectContains),
      );

      if (match !== undefined) {
        const detail = await request.get(`${MAILPIT_URL}/api/v1/message/${match.ID}`);

        expect(detail.ok(), 'Mailpit mesaj detayı okunamadı').toBe(true);

        return (await detail.json()) as MailpitMessage;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `Mailpit'te "${to}" adresine gelen ve konusu "${subjectContains}" içeren mesaj ` +
      `${timeoutMs} ms içinde bulunamadı. API MAIL_DRIVER=smtp ile mi çalışıyor?`,
  );
}

/**
 * E-posta gövdesinden bağlantı yolunu ayıklar.
 *
 * DÜZ METİN gövdesi kullanılır, HTML DEĞİL: metin gövdesinde bağlantı çıplak
 * hâlde durur ve etiket ayrıştırmaya gerek kalmaz. Şablonlar iki gövdeye de
 * aynı adresi yazar (mail.templates.ts).
 */
export function extractLinkPath(message: MailpitMessage, pathSegment: string): string {
  const pattern = new RegExp(`https?://[^\\s]*(${pathSegment}/[A-Za-z0-9_-]+)`);
  const match = pattern.exec(message.Text);

  if (match === null || match[1] === undefined) {
    throw new Error(
      `E-posta gövdesinde "${pathSegment}/..." bağlantısı bulunamadı.\n` +
        `Gövde:\n${message.Text.slice(0, 500)}`,
    );
  }

  return match[1];
}
