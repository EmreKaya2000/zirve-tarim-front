/* eslint-disable no-restricted-properties -- miktar ölçekleme, para değil (aşağıya bkz.) */

/*
 * `Math.round` bu dosyada PARA için DEĞİL, MİKTAR için kullanılır.
 *
 * Kural 2 para hesabını yasaklar ve bu doğrudur; ancak buradaki değerler
 * kilogram, litre ve adettir. Miktarın 3 ondalık basamağa ölçeklenmesi,
 * `(2.5 - 0.5) % 0.5` gibi bir kıyasın float hatası yüzünden 0 yerine
 * 0.49999...'a düşmesini engellemek içindir.
 *
 * Bu dosyada hiçbir fiyat okunmaz, çarpılmaz veya toplanmaz. Para
 * biçimlendirmesi lib/format.ts, para hesabı ise backend'in sorumluluğudur.
 */
import type { PublicVariant } from './public-types';

/**
 * Miktar kuralları — arayüz tarafı.
 *
 * DİKKAT (Kural 10): buradaki hesaplar YALNIZ KULLANICI DENEYİMİ İÇİNDİR.
 * Bağlayıcı doğrulama backend'dedir; Sprint 6'da talep gönderilirken aynı
 * kurallar sunucuda yeniden uygulanır. Bu dosya, kullanıcının geçersiz bir
 * miktarı yazıp gönderdikten sonra hata almasını önler — kuralın kendisi
 * değildir.
 *
 * ONDALIK SORUNU: JS float ile `(2.5 - 0.5) % 0.5` beklenen 0 yerine
 * 0.49999...'a düşebilir. Bu yüzden tüm kıyaslamalar tam sayı adımına
 * ölçeklenerek yapılır.
 */

/** Desteklenen en fazla ondalık basamak (Prisma Decimal(18,3) ile uyumlu). */
const MAX_DECIMALS = 3;

const SCALE = 10 ** MAX_DECIMALS;

/** Ondalık kaybı olmadan tam sayıya ölçekler. */
function scaled(value: number): number {
  return Math.round(value * SCALE);
}

export interface QuantityRules {
  min: number;
  step: number;
  max: number | null;
  allowsDecimal: boolean;
  unitCode: string;
}

export function rulesOf(variant: PublicVariant): QuantityRules {
  return {
    min: Number(variant.minOrderQuantity),
    step: Number(variant.quantityStep),
    max: variant.maxOrderQuantity === null ? null : Number(variant.maxOrderQuantity),
    allowsDecimal: variant.unitType.allowsDecimal,
    unitCode: variant.unitType.code,
  };
}

export type QuantityError =
  | { kind: 'below-min'; min: number }
  | { kind: 'above-max'; max: number }
  | { kind: 'not-integer' }
  | { kind: 'off-step'; step: number; nearest: number };

/** Miktarı doğrular. Geçerliyse `null` döner. */
export function validateQuantity(value: number, rules: QuantityRules): QuantityError | null {
  if (!Number.isFinite(value) || value <= 0) {
    return { kind: 'below-min', min: rules.min };
  }

  if (!rules.allowsDecimal && !Number.isInteger(value)) {
    return { kind: 'not-integer' };
  }

  if (scaled(value) < scaled(rules.min)) {
    return { kind: 'below-min', min: rules.min };
  }

  if (rules.max !== null && scaled(value) > scaled(rules.max)) {
    return { kind: 'above-max', max: rules.max };
  }

  if (rules.step > 0) {
    const offset = scaled(value) - scaled(rules.min);

    if (offset % scaled(rules.step) !== 0) {
      return { kind: 'off-step', step: rules.step, nearest: snapToStep(value, rules) };
    }
  }

  return null;
}

/** Değeri en yakın geçerli adıma yuvarlar (aşağı doğru, min'in altına inmez). */
export function snapToStep(value: number, rules: QuantityRules): number {
  if (rules.step <= 0) {
    return Math.max(value, rules.min);
  }

  const steps = Math.max(0, Math.round((scaled(value) - scaled(rules.min)) / scaled(rules.step)));
  const result = (scaled(rules.min) + steps * scaled(rules.step)) / SCALE;

  if (rules.max !== null && result > rules.max) {
    return snapDown(rules.max, rules);
  }

  return round(result);
}

function snapDown(value: number, rules: QuantityRules): number {
  const steps = Math.floor((scaled(value) - scaled(rules.min)) / scaled(rules.step));

  return round((scaled(rules.min) + Math.max(0, steps) * scaled(rules.step)) / SCALE);
}

function round(value: number): number {
  return Math.round(value * SCALE) / SCALE;
}

/** Bir adım artırır; üst sınırı aşmaz. */
export function increment(value: number, rules: QuantityRules): number {
  const next = round(value + rules.step);

  return rules.max !== null && next > rules.max ? value : next;
}

/** Bir adım azaltır; en az `min` kalır. */
export function decrement(value: number, rules: QuantityRules): number {
  const next = round(value - rules.step);

  return next < rules.min ? rules.min : next;
}

/** Hata nesnesini kullanıcıya gösterilecek Türkçe metne çevirir. */
export function quantityErrorMessage(error: QuantityError, unitCode: string): string {
  switch (error.kind) {
    case 'below-min':
      return `En az ${formatNumber(error.min)} ${unitCode} seçebilirsiniz.`;
    case 'above-max':
      return `En fazla ${formatNumber(error.max)} ${unitCode} seçebilirsiniz.`;
    case 'not-integer':
      return `${unitCode} biriminde ondalık miktar girilemez.`;
    case 'off-step':
      return `Miktar ${formatNumber(error.step)} ${unitCode} adımlarla artmalıdır. En yakın geçerli değer: ${formatNumber(error.nearest)}.`;
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: MAX_DECIMALS }).format(value);
}
