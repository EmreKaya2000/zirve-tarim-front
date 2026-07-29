'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CustomerAccountProfile, CustomerLoginResponse } from '@zirve/types';

/**
 * MÜŞTERİ oturumu — Sprint 11.
 *
 * `auth-store.ts` (yönetici oturumu) İLE AYRI TUTULDU ve bu bilinçli bir
 * karardır:
 *
 *   1. FARKLI DEPOLAMA ANAHTARI. Tek store kullanılsaydı, kendi
 *      bilgisayarından yönetim paneline giren mağaza sahibi vitrinde
 *      gezindiğinde iki oturum birbirinin üzerine yazardı.
 *   2. FARKLI JETON EVRENİ. Müşteri jetonu `aud: zirve-customer` taşır ve
 *      `/admin/*` uçlarında GEÇERSİZDİR. Tek bir `Authorization` köprüsü
 *      olsaydı yanlış jeton yanlış uca gider ve kullanıcı sebepsiz 401
 *      görürdü.
 *   3. FARKLI 401 DAVRANIŞI. Yönetici 401'de `/admin/login`e, müşteri
 *      `/giris`e yollanır.
 *
 * JETON SAKLAMA ÖDÜNLEŞMESİ `auth-store.ts` ile AYNIDIR: `accessToken`
 * bellekte kalır (diske YAZILMAZ), `refreshToken` localStorage'dadır.
 * İdeali `httpOnly` çerezdir; API çerez üretmediği için bu yol seçildi.
 */
interface CustomerAuthState {
  account: CustomerAccountProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** Açılışta oturum geri yükleme denemesi tamamlandı mı? */
  isHydrated: boolean;

  /**
   * KULLANICI ÇIKIŞ YAPIYOR MU?
   *
   * NEDEN GEREKLİ: hesap alanının erişim kapısı (`CustomerAccountShell`)
   * "oturum yok" gördüğü anda `/giris?next=...` adresine yönlendirir. Çıkışta
   * oturum temizlendiğinde bu kural devreye girer ve kullanıcı — çıkmak
   * isterken — GİRİŞ sayfasına atılır.
   *
   * Bayrak, kapının bu tek durumda susmasını sağlar. Zamanlamaya (önce
   * yönlendir, sonra temizle) güvenmek çözüm değildi: yönlendirme bir React
   * geçişidir ve tamamlanmadan önce store değişimi render tetikleyebilir.
   */
  isLoggingOut: boolean;

  setSession: (session: CustomerLoginResponse) => void;
  setAccount: (account: CustomerAccountProfile) => void;
  beginLogout: () => void;
  clearSession: () => void;
  markHydrated: () => void;
}

export const CUSTOMER_AUTH_STORAGE_KEY = 'zt_customer_auth_v1';

export const useCustomerAuthStore = create<CustomerAuthState>()(
  persist(
    (set) => ({
      account: null,
      accessToken: null,
      refreshToken: null,
      isHydrated: false,
      isLoggingOut: false,

      setSession: (session) =>
        set({
          account: session.account,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          // Yeni oturum, yarım kalmış bir çıkışı da kapatır.
          isLoggingOut: false,
        }),

      setAccount: (account) => set({ account }),

      beginLogout: () => set({ isLoggingOut: true }),

      clearSession: () => set({ account: null, accessToken: null, refreshToken: null }),

      markHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: CUSTOMER_AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // accessToken ve isLoggingOut bilinçli olarak DIŞARIDA: ilki diske
      // yazılmaz, ikincisi tek bir gezinmeye ait geçici durumdur.
      partialize: (state) => ({ account: state.account, refreshToken: state.refreshToken }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
      version: 1,
    },
  ),
);

/** React dışından (axios interceptor) okunabilen anlık durum. */
export const customerAuthStore = {
  getAccessToken: (): string | null => useCustomerAuthStore.getState().accessToken,
  getRefreshToken: (): string | null => useCustomerAuthStore.getState().refreshToken,
  setSession: (session: CustomerLoginResponse): void =>
    useCustomerAuthStore.getState().setSession(session),
  beginLogout: (): void => useCustomerAuthStore.getState().beginLogout(),
  clear: (): void => useCustomerAuthStore.getState().clearSession(),
};
