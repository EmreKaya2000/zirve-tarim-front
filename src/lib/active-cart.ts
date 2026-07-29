'use client';

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useCustomerAuth } from '@/providers/customer-auth-provider';

import { addQuantity, CART_MAX_ITEMS, useCartStore, type CartItem } from './cart-store';
import { customerCartApi, CUSTOMER_QUERY_KEYS } from './customer-api';

/**
 * AKTİF SEPET — misafir ve girişli kullanıcıyı TEK arayüz arkasına alır.
 *
 * NEDEN GEREKLİ (Sprint 11 şartı 3): sepetin kaynağı oturum durumuna göre
 * DEĞİŞİR.
 *   misafir  -> localStorage (Sprint 6 akışı, sunucuya hiçbir şey gitmez)
 *   girişli  -> sunucu sepeti (cihazlar arası taşınır)
 *
 * Bu ayrım her tüketiciye (ürün sayfası, header rozeti, sepet sayfası, talep
 * formu) ayrı ayrı yazılsaydı dört yerde `if (isAuthenticated)` dallanması
 * olurdu ve biri güncellenmeyi unuttuğunda kullanıcı iki farklı sepet görürdü.
 *
 * KVKK NOTU KORUNUR: misafir yolunda veri kullanıcının cihazında kalır.
 */

/** Kaynağı ne olursa olsun bir sepet kaleminin ortak gösterimi. */
export interface ActiveCartItem {
  /**
   * Yazma işlemlerinde kullanılan anahtar.
   *
   * Sunucu sepetinde `cart_items.id`, misafir sepetinde `variantId`. Sepet
   * satırını GÜNCELLEMEK için sunucu kalem kimliğini ister; misafir tarafında
   * böyle bir kimlik yoktur.
   */
  key: string;
  variantId: string;
  quantity: string;

  productSlug: string;
  productName: string;
  variantName: string | null;
  unitCode: string;
  unitName: string;
  imageUrl: string | null;
  displayedPrice: string | null;

  minOrderQuantity: string;
  quantityStep: string;
  maxOrderQuantity: string | null;
  allowsDecimal: boolean;

  /**
   * Kalem hâlâ talep edilebilir mi?
   *
   * Misafir sepetinde DAİMA `true`dur: localStorage ürünün yayından kalktığını
   * bilemez. O bilgi sepet sayfasının `POST /public/cart/validate` çağrısından
   * gelir (Sprint 6 akışı). Sunucu sepetinde ise her okumada hesaplanır.
   */
  isAvailable: boolean;
  unavailableReason: string | null;
}

export interface ActiveCart {
  items: ActiveCartItem[];
  itemCount: number;
  /** Kaynak hazır mı? (localStorage hidrasyonu veya sunucu isteği tamamlandı) */
  isReady: boolean;
  /** Sepet sunucudan mı geliyor? Arayüz buna göre farklı ipucu gösterir. */
  isServerCart: boolean;
  /** Sunucu sepetinde bekleyen bir yazma var mı? (düğmeleri kilitlemek için) */
  isMutating: boolean;

  add: (item: CartItem) => Promise<void>;
  updateQuantity: (item: ActiveCartItem, quantity: string) => Promise<void>;
  remove: (item: ActiveCartItem) => Promise<void>;
  clear: () => Promise<void>;
}

export function useActiveCart(): ActiveCart {
  const { isAuthenticated, isHydrated: isAuthHydrated } = useCustomerAuth();
  const queryClient = useQueryClient();

  const localItems = useCartStore((state) => state.items);
  const isLocalHydrated = useCartStore((state) => state.isHydrated);
  const localAdd = useCartStore((state) => state.add);
  const localUpdate = useCartStore((state) => state.updateQuantity);
  const localRemove = useCartStore((state) => state.remove);
  const localClear = useCartStore((state) => state.clear);

  const serverCart = useQuery({
    queryKey: CUSTOMER_QUERY_KEYS.cart,
    queryFn: customerCartApi.get,
    // Oturum yoksa istek HİÇ atılmaz: misafir için 401 üretmek gereksiz
    // gürültü ve gereksiz yenileme denemesi olurdu.
    enabled: isAuthHydrated && isAuthenticated,
  });

  /** Sunucu yanıtını önbelleğe yazar: ek bir GET isteği gerekmez. */
  const writeCart = useCallback(
    (cart: unknown) => queryClient.setQueryData(CUSTOMER_QUERY_KEYS.cart, cart),
    [queryClient],
  );

  const addMutation = useMutation({
    mutationFn: customerCartApi.addItem,
    onSuccess: writeCart,
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: string }) =>
      customerCartApi.updateItem(itemId, quantity),
    onSuccess: writeCart,
  });

  const removeMutation = useMutation({
    mutationFn: customerCartApi.removeItem,
    onSuccess: writeCart,
  });

  const clearMutation = useMutation({
    mutationFn: customerCartApi.clear,
    onSuccess: writeCart,
  });

  const items = useMemo<ActiveCartItem[]>(() => {
    if (isAuthenticated) {
      return (serverCart.data?.items ?? []).map((item) => ({
        key: item.id,
        variantId: item.productVariantId,
        quantity: item.quantity,
        productSlug: item.productSlug,
        productName: item.productName,
        variantName: item.variantName,
        unitCode: item.unitCode,
        unitName: item.unitName,
        imageUrl: item.imageUrl,
        displayedPrice: item.displayedPrice,
        minOrderQuantity: item.minOrderQuantity,
        quantityStep: item.quantityStep,
        maxOrderQuantity: item.maxOrderQuantity,
        allowsDecimal: item.allowsDecimal,
        isAvailable: item.isAvailable,
        unavailableReason: item.unavailableReason,
      }));
    }

    return localItems.map((item) => ({
      key: item.variantId,
      variantId: item.variantId,
      quantity: item.quantity,
      productSlug: item.productSlug,
      productName: item.productName,
      variantName: item.variantName,
      unitCode: item.unitCode,
      unitName: item.unitName,
      imageUrl: item.imageUrl,
      displayedPrice: item.displayedPrice,
      minOrderQuantity: item.minOrderQuantity,
      quantityStep: item.quantityStep,
      maxOrderQuantity: item.maxOrderQuantity,
      allowsDecimal: item.allowsDecimal,
      isAvailable: true,
      unavailableReason: null,
    }));
  }, [isAuthenticated, serverCart.data, localItems]);

  const add = useCallback(
    async (item: CartItem): Promise<void> => {
      if (!isAuthenticated) {
        localAdd(item);

        return;
      }

      // Sunucu tarafı yalnız kimlik ve miktarla ilgilenir; gösterim alanları
      // her okumada katalogdan taze gelir.
      await addMutation.mutateAsync({
        productVariantId: item.variantId,
        quantity: item.quantity,
      });
    },
    [isAuthenticated, localAdd, addMutation],
  );

  const updateQuantity = useCallback(
    async (item: ActiveCartItem, quantity: string): Promise<void> => {
      if (!isAuthenticated) {
        localUpdate(item.variantId, quantity);

        return;
      }

      await updateMutation.mutateAsync({ itemId: item.key, quantity });
    },
    [isAuthenticated, localUpdate, updateMutation],
  );

  const remove = useCallback(
    async (item: ActiveCartItem): Promise<void> => {
      if (!isAuthenticated) {
        localRemove(item.variantId);

        return;
      }

      await removeMutation.mutateAsync(item.key);
    },
    [isAuthenticated, localRemove, removeMutation],
  );

  const clear = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) {
      localClear();

      return;
    }

    await clearMutation.mutateAsync();
  }, [isAuthenticated, localClear, clearMutation]);

  return {
    items,
    itemCount: items.length,
    isReady: isAuthenticated
      ? // Sunucu sepetinde ilk yükleme tamamlanmalı; hata durumunda da
        // "hazır" sayılır, aksi hâlde sayfa sonsuza kadar iskelet gösterirdi.
        isAuthHydrated && !serverCart.isPending
      : isLocalHydrated,
    isServerCart: isAuthenticated,
    isMutating:
      addMutation.isPending ||
      updateMutation.isPending ||
      removeMutation.isPending ||
      clearMutation.isPending,
    add,
    updateQuantity,
    remove,
    clear,
  };
}

/**
 * Sepete yeni bir kalem eklenebilir mi?
 *
 * Sınır her iki tarafta AYNIDIR (`CART_MAX_ITEMS` = backend'in
 * `MAX_INQUIRY_ITEMS`ı). Mevcut kalemin miktarını artırmak sınıra takılmaz.
 */
export function canAddToCart(items: ActiveCartItem[], variantId: string): boolean {
  const alreadyInCart = items.some((item) => item.variantId === variantId);

  return alreadyInCart || items.length < CART_MAX_ITEMS;
}

/** Talep gönderiminde kullanılacak kalem listesi. */
export function toInquiryItems(items: ActiveCartItem[]): { variantId: string; quantity: string }[] {
  return (
    items
      // Yayından kalkmış kalem gönderilmez: backend zaten reddederdi ve
      // kullanıcı formu doldurduktan sonra hata alırdı.
      .filter((item) => item.isAvailable)
      .map((item) => ({ variantId: item.variantId, quantity: item.quantity }))
  );
}

/** Toplam miktar birleştirme yardımcısı — misafir sepetiyle aynı davranış. */
export { addQuantity, CART_MAX_ITEMS };
