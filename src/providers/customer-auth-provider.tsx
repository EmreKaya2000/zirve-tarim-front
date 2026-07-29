'use client';

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { CustomerLoginResponse } from '@zirve/types';

import { showToast } from '@/components/toast';
import { ApiError } from '@/lib/api-error';
import { useCartStore } from '@/lib/cart-store';
import { customerAuthApi, customerCartApi, CUSTOMER_QUERY_KEYS } from '@/lib/customer-api';
import { setCustomerUnauthorizedHandler } from '@/lib/customer-api-client';
import { customerAuthStore, useCustomerAuthStore } from '@/lib/customer-auth-store';

/** Müşteri oturumu geçersizleştiğinde yönlendirilecek sayfa. */
export const CUSTOMER_LOGIN_PATH = '/giris';

/** Girişten sonra varsayılan hedef. */
export const CUSTOMER_HOME_PATH = '/hesabim';

/**
 * Müşteri oturumu altyapısını bağlar — Sprint 11.
 *
 * `AuthProvider` (yönetici) ile YAN YANA çalışır; ikisi farklı store ve farklı
 * axios örneği kullanır (gerekçe: customer-auth-store.ts başlığı). Aynı
 * tarayıcıda hem yönetim panelinde hem vitrinde oturum açık olabilir.
 */
export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const handlerReady = useRef(false);

  if (!handlerReady.current) {
    handlerReady.current = true;
  }

  useEffect(() => {
    setCustomerUnauthorizedHandler(() => {
      // Vitrinin ÇOĞU sayfası kimlik istemez; oturumu düşen kullanıcıyı
      // ürün listesinden zorla giriş ekranına atmak kabul edilemez.
      // Yalnız hesap alanındaysa yönlendirilir.
      if (window.location.pathname.startsWith('/hesabim')) {
        router.replace(CUSTOMER_LOGIN_PATH);
      }
    });
  }, [router]);

  return <>{children}</>;
}

/** Müşteri oturum durumunu okuyan kanca. */
export function useCustomerAuth() {
  const account = useCustomerAuthStore((state) => state.account);
  const refreshToken = useCustomerAuthStore((state) => state.refreshToken);
  const isHydrated = useCustomerAuthStore((state) => state.isHydrated);
  const isLoggingOut = useCustomerAuthStore((state) => state.isLoggingOut);

  return {
    account,
    isHydrated,
    isLoggingOut,
    /**
     * Oturum var sayılır: `refreshToken` varsa access token yoksa bile
     * sessizce yenilenebilir (sayfa yenilendiğinde bellek boşalır).
     */
    isAuthenticated: refreshToken !== null,
    isEmailVerified: account?.isEmailVerified === true,
  };
}

/**
 * Oturum kurar ve MİSAFİR SEPETİNİ HESABA TAŞIR — Sprint 11 şartı 3.
 *
 * SIRA ÖNEMLİDİR ve şöyledir:
 *   1. Oturum store'a yazılır (jeton olmadan birleştirme çağrılamaz).
 *   2. `POST /customer/cart/merge` çağrılır; gövdede localStorage sepeti.
 *   3. YALNIZ BAŞARILI yanıttan SONRA yerel sepet temizlenir.
 *   4. Atlanan ve miktarı değişen kalemler toast ile bildirilir.
 *
 * 3. ADIM NEDEN SONRA: yerel sepet önce temizlenirse ve birleştirme ağ
 * hatasıyla düşerse kullanıcının sepeti KAYBOLUR ve geri getirmenin yolu
 * yoktur. Bu sprintin tek amacı sepetin kaybolmaması olduğu için sıra
 * tersine çevrilemez.
 *
 * BİRLEŞTİRME HATASI GİRİŞİ DÜŞÜRMEZ: kullanıcı oturumunu açmıştır, sepeti
 * hâlâ cihazında durur ve sepet sayfasına girdiğinde yeniden denenir.
 */
export function useCustomerSessionStart() {
  const queryClient = useQueryClient();
  const clearLocalCart = useCartStore((state) => state.clear);

  return useCallback(
    async (session: CustomerLoginResponse): Promise<void> => {
      customerAuthStore.setSession(session);

      const localItems = useCartStore.getState().items;

      try {
        const result = await customerCartApi.merge(
          localItems.map((item) => ({
            productVariantId: item.variantId,
            quantity: item.quantity,
          })),
        );

        // Sunucu sepeti artık tek gerçek kaynak; yerel kopya temizlenir.
        clearLocalCart();

        queryClient.setQueryData(CUSTOMER_QUERY_KEYS.cart, result.cart);

        reportMergeOutcome(result.skippedItems, result.adjustedItems, localItems.length);
      } catch (error) {
        // Sepet cihazda DURUYOR. Sepet sayfası açıldığında birleştirme
        // yeniden denenecek.
        showToast({
          variant: 'warning',
          title: 'Sepetiniz henüz taşınamadı',
          lines: [
            error instanceof ApiError
              ? error.message
              : 'Bağlantı sorunu oluştu. Talep listesi sayfasını açtığınızda yeniden denenecek.',
          ],
        });
      }
    },
    [queryClient, clearLocalCart],
  );
}

/**
 * Oturumu kapatır.
 *
 * ÇIKIŞTA YEREL SEPET BOŞ BAŞLAR (Sprint 11 şartı 3): sunucu sepeti hesapta
 * durmaya devam eder ve tekrar girişte geri gelir. Çıkan kullanıcının sepetini
 * cihazda bırakmak, aynı bilgisayarı kullanan bir sonraki kişiye onun
 * listesini göstermek olurdu.
 */
export function useCustomerLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearLocalCart = useCartStore((state) => state.clear);

  return useCallback(async (): Promise<void> => {
    const refreshToken = customerAuthStore.getRefreshToken();

    // Hesap alanının erişim kapısına "bu bir çıkış, giriş sayfasına
    // yönlendirme" denir. Bayrak olmadan kullanıcı çıkmak isterken
    // `/giris?next=/hesabim` adresine atılırdı (bkz. isLoggingOut açıklaması).
    customerAuthStore.beginLogout();

    try {
      await customerAuthApi.logout(refreshToken);
    } catch {
      // Sunucuya ulaşılamasa bile YEREL oturum kapatılır: kullanıcı "çıkış
      // yaptım" dediğinde cihazda jeton kalmamalıdır.
    }

    customerAuthStore.clear();
    clearLocalCart();

    // Hesaba ait tüm önbellek düşürülür; bir sonraki kullanıcı öncekinin
    // sepetini veya taleplerini görmesin.
    queryClient.removeQueries({ queryKey: ['customer'] });

    router.replace('/');
    router.refresh();
  }, [router, queryClient, clearLocalCart]);
}

/** Birleştirme sonucunu kullanıcıya bildirir. */
function reportMergeOutcome(
  skippedItems: { message: string; productName: string | null }[],
  adjustedItems: { message: string }[],
  localItemCount: number,
): void {
  if (localItemCount === 0) {
    return;
  }

  const movedCount = localItemCount - skippedItems.length;

  if (skippedItems.length > 0) {
    showToast({
      variant: 'warning',
      title:
        movedCount > 0
          ? `${movedCount} ürün hesabınıza taşındı, ${skippedItems.length} ürün taşınamadı`
          : 'Listenizdeki ürünler taşınamadı',
      lines: skippedItems.map((item) =>
        item.productName === null ? item.message : `${item.productName}: ${item.message}`,
      ),
    });
  } else if (movedCount > 0) {
    showToast({
      variant: 'success',
      title: 'Talep listeniz hesabınıza taşındı',
      lines:
        adjustedItems.length > 0 ? undefined : ['Listeniz artık tüm cihazlarınızda görünecek.'],
    });
  }

  // Miktarı değiştirilen kalemler AYRI bildirilir: kullanıcı 8 kg istediğini
  // sanarken sepetinde 10 kg bulmasın.
  if (adjustedItems.length > 0) {
    showToast({
      variant: 'info',
      title: 'Bazı miktarlar sipariş kurallarına göre ayarlandı',
      lines: adjustedItems.map((item) => item.message),
    });
  }
}
