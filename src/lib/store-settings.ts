import { SETTING_KEYS } from '@zirve/types';

import { getPublicSettings } from './public-api';
import type { PublicSetting } from './public-types';

/**
 * Mağaza bilgileri.
 *
 * Ayarlar veritabanında anahtar-değer olarak durur; sayfalar bu düz nesneyi
 * kullanır. Anahtarlar SETTING_KEYS sabitinden gelir — Kural 12: kodda
 * serbest string ayar anahtarı yazılmaz.
 */
export interface StoreInfo {
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  workingHours: string | null;
  /** Yalnız rakamlardan oluşan numara; bağlantı `whatsappUrl` ile üretilir. */
  whatsapp: string | null;
  mapUrl: string | null;
  /** Ürün sayfasında gösterilen yasal uyarı (SPEC §4.7). */
  productWarning: string | null;
}

function read(settings: PublicSetting[], key: string): string | null {
  const value = settings.find((setting) => setting.key === key)?.value.trim();

  return value === undefined || value === '' ? null : value;
}

export function toStoreInfo(settings: PublicSetting[]): StoreInfo {
  return {
    name: read(settings, SETTING_KEYS.STORE_NAME),
    phone: read(settings, SETTING_KEYS.STORE_PHONE),
    email: read(settings, SETTING_KEYS.STORE_EMAIL),
    address: read(settings, SETTING_KEYS.STORE_ADDRESS),
    workingHours: read(settings, SETTING_KEYS.STORE_WORKING_HOURS),
    whatsapp: read(settings, SETTING_KEYS.STORE_WHATSAPP),
    mapUrl: read(settings, SETTING_KEYS.STORE_MAP_URL),
    productWarning: read(settings, SETTING_KEYS.LEGAL_PRODUCT_WARNING),
  };
}

/** Sunucu bileşenlerinden çağrılır; sonuç ISR ile önbelleklenir. */
export async function getStoreInfo(): Promise<StoreInfo> {
  return toStoreInfo(await getPublicSettings());
}

/**
 * WhatsApp bağlantısı.
 *
 * Numara boşsa `null` döner ve arayüz bağlantıyı HİÇ göstermez — çalışmayan
 * bir "WhatsApp" düğmesi, hiç olmamasından kötüdür.
 */
export function whatsappUrl(whatsapp: string | null, message?: string): string | null {
  if (whatsapp === null) {
    return null;
  }

  const digits = whatsapp.replace(/\D/g, '');

  if (digits === '') {
    return null;
  }

  const text = message === undefined ? '' : `?text=${encodeURIComponent(message)}`;

  return `https://wa.me/${digits}${text}`;
}

/** Telefon numarasını `tel:` bağlantısına çevirir. */
export function telUrl(phone: string | null): string | null {
  if (phone === null) {
    return null;
  }

  const digits = phone.replace(/[^\d+]/g, '');

  return digits === '' ? null : `tel:${digits}`;
}
