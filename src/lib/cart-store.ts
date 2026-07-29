'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Talep sepeti.
 *
 * TERMİNOLOJİ (ARCHITECTURE Ç-01): bu bir SEPET DEĞİL, talep listesidir.
 * İçindeki hiçbir şey satın alma taahhüdü değildir; stok rezerve edilmez,
 * fiyat bağlayıcı olmaz.
 *
 * SAKLANAN VERİ: yalnız `variantId` ve `quantity` bağlayıcıdır. Ürün adı ve
 * fiyat GÖSTERİM İÇİN tutulur; sepet günler sonra açıldığında fiyat değişmiş
 * ya da ürün yayından kalkmış olabilir. Bu yüzden sepet sayfası açılışta
 * `POST /public/cart/validate` çağırır ve gerçeği sunucudan alır.
 *
 * KVKK: bu veri KULLANICININ CİHAZINDA kalır. Talep gönderilmediği sürece
 * sunucuya hiçbir şey iletilmez (bkz. /gizlilik sayfası).
 */

/** Depolama anahtarı — ARCHITECTURE §10.1 ile aynı. */
export const CART_STORAGE_KEY = 'zt_cart_v1';

/** Sepette en fazla farklı kalem. Backend'in MAX_INQUIRY_ITEMS ile aynı. */
export const CART_MAX_ITEMS = 50;

export interface CartItem {
  /** Bağlayıcı alan: sunucu bunu doğrular. */
  variantId: string;
  /** Bağlayıcı alan: sayısal METİN (Kural 2 — float'a çevrilmez). */
  quantity: string;

  // --- Aşağıdakiler YALNIZ GÖSTERİM İÇİN ---
  productSlug: string;
  productName: string;
  variantName: string | null;
  unitCode: string;
  unitName: string;
  imageUrl: string | null;
  /** Sepete eklendiği andaki fiyat; gizliyse null. Bağlayıcı DEĞİLDİR. */
  displayedPrice: string | null;
  /** Miktar kuralları — arayüzün adımlayıcıyı kurması için. */
  minOrderQuantity: string;
  quantityStep: string;
  maxOrderQuantity: string | null;
  allowsDecimal: boolean;
}

interface CartState {
  items: CartItem[];
  /** localStorage'dan geri yükleme tamamlandı mı? */
  isHydrated: boolean;

  add: (item: CartItem) => void;
  updateQuantity: (variantId: string, quantity: string) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  markHydrated: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isHydrated: false,

      add: (item) =>
        set((state) => {
          const index = state.items.findIndex((entry) => entry.variantId === item.variantId);

          if (index === -1) {
            // Sınır aşılıyorsa yeni kalem EKLENMEZ; sessizce yutmak yerine
            // kullanıcıya arayüzde uyarı gösterilir (sayı kontrol edilir).
            if (state.items.length >= CART_MAX_ITEMS) {
              return state;
            }

            return { items: [...state.items, item] };
          }

          // Var olan kalem: miktarlar TOPLANIR. Kullanıcı aynı ürünü ikinci
          // kez eklediğinde ilk seçimini kaybetmesi beklenmeyen bir davranış
          // olurdu.
          const existing = state.items[index] as CartItem;
          const merged: CartItem = {
            ...item,
            quantity: addQuantity(existing.quantity, item.quantity),
          };

          const items = [...state.items];
          items[index] = merged;

          return { items };
        }),

      updateQuantity: (variantId, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.variantId === variantId ? { ...item, quantity } : item,
          ),
        })),

      remove: (variantId) =>
        set((state) => ({ items: state.items.filter((item) => item.variantId !== variantId) })),

      clear: () => set({ items: [] }),

      markHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // `isHydrated` diske YAZILMAZ: her açılışta yeniden hesaplanır.
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
      version: 1,
    },
  ),
);

/**
 * Toplam kalem sayısı — header rozetinde gösterilir.
 *
 * Miktarların TOPLAMI değil, FARKLI ÜRÜN sayısı döner: "3" rozetini gören
 * kullanıcı üç ürün beklerken 300 kg tek ürün görmemeli.
 */
export function useCartCount(): number {
  return useCartStore((state) => state.items.length);
}

/**
 * Miktar toplama — string üzerinden, float kullanmadan.
 *
 * Miktar para değil ama aynı hassasiyet sorunu var: 0.1 + 0.2 = 0.30000000004.
 * En fazla 3 ondalık basamak desteklenir (Prisma Decimal(18,3)).
 *
 * `Math.round` burada MİKTAR ölçeklemesi içindir, para yuvarlaması değil
 * (aynı gerekçe lib/quantity.ts başında ayrıntılı yazılı). Bu dosyada
 * hiçbir fiyat hesaplanmaz; `displayedPrice` yalnız taşınır.
 */
/* eslint-disable-next-line no-restricted-properties -- miktar ölçekleme */
const scaleQuantity = (value: string): number => Math.round(Number(value) * QUANTITY_SCALE);

/** Miktarın ondalık çözünürlüğü (Prisma Decimal(18,3) ile aynı). */
const QUANTITY_SCALE = 1000;

export function addQuantity(a: string, b: string): string {
  return String((scaleQuantity(a) + scaleQuantity(b)) / QUANTITY_SCALE);
}
