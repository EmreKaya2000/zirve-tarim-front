import type { InquiryStatus, PreferredContact } from '@zirve/types';

import { customerPost } from './customer-api-client';

/**
 * Talep API istemcisi — VİTRİN tarafı.
 *
 * Monorepo'da bu dosya hem public hem yönetim yarısını taşıyordu ve iki
 * uygulama da onu import ediyordu. Depolar ayrıldığında "paylaşılan dosya"
 * olmadığı görüldü: BÖLÜNECEK dosyaydı. Yönetim yarısı (`/admin/inquiries`
 * uçları, `inquiriesApi`) zirve-tarim-admin deposunda.
 *
 * Buradaki iki uç kimlik doğrulaması İSTEMEZ ama müşteri istemcisinden geçer:
 * giriş yapılmışsa jeton başlığa eklenir ve sunucu talebi HESABA BAĞLAR
 * ("Taleplerim"de görünür). Oturum yoksa talep misafir talebi olarak
 * kaydedilir — dallanma yok, istemci jetonun varlığına göre kendisi karar
 * verir.
 */

// =============================================================================
// PUBLIC
// =============================================================================

export interface CartValidationItem {
  variantId: string;
  productName: string;
  productSlug: string;
  variantName: string | null;
  sku: string;
  unitTypeName: string;
  quantity: string;
  displayedPrice: string | null;
  lineTotal: string | null;
  /** Talep stok rezerve etmez; bu yalnız bilgilendirmedir. */
  inStock: boolean;
}

export interface CartValidationResult {
  items: CartValidationItem[];
  estimatedTotal: string;
  hasHiddenPrices: boolean;
}

export interface InquiryItemInput {
  variantId: string;
  quantity: string;
  note?: string;
}

export interface CreateInquiryPayload {
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  city: string;
  district: string;
  address?: string;
  customerNote?: string;
  preferredContact: PreferredContact;
  consentAccepted: boolean;
  items: InquiryItemInput[];
}

export interface CreatedInquiry {
  id: string;
  inquiryNumber: string;
  status: InquiryStatus;
  createdAt: string;
  estimatedTotal: string;
  contactName: string;
  preferredContact: PreferredContact;
  _count: { items: number };
}

export const publicInquiriesApi = {
  /**
   * Sepeti doğrular.
   *
   * MÜŞTERİ İSTEMCİSİNDEN geçer. Monorepo'da bu çağrı yönetim istemcisinden
   * (`lib/api-client.ts`) gidiyordu — uç public olduğu için çalışıyordu ama
   * panel istemcisi vitrine ait değildi. Depolar ayrıldığında o istemci bu
   * depoda hiç bulunmuyor; çağrı doğal sahibine taşındı.
   */
  validateCart: (items: InquiryItemInput[]): Promise<CartValidationResult> =>
    customerPost<CartValidationResult, { items: InquiryItemInput[] }>('/public/cart/validate', {
      items,
    }),

  /**
   * Talep gönderir.
   *
   * MÜŞTERİ İSTEMCİSİNDEN geçer: oturum varsa jeton başlığa eklenir ve sunucu
   * talebi hesaba bağlar ("Taleplerim"de görünür). Oturum yoksa jeton
   * eklenmez ve talep MİSAFİR talebi olarak kaydedilir — Sprint 6 akışı
   * aynen çalışır.
   *
   * Dallanma YOK: istemci, jetonun varlığına göre kendisi karar verir.
   * `if (girişli) ... else ...` yazmak, iki koldan birinin ileride
   * güncellenmeyi unutması riskini taşırdı.
   */
  create: (payload: CreateInquiryPayload): Promise<CreatedInquiry> =>
    customerPost<CreatedInquiry, CreateInquiryPayload>('/public/inquiries', payload),
};
