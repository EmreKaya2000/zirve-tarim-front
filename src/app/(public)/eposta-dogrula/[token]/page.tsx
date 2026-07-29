import type { Metadata } from 'next';

import { CustomerAuthShell } from '@/components/public/customer-auth-shell';
import {
  CustomerVerifyEmail,
  CustomerVerifyEmailMissingToken,
} from '@/components/public/customer-verify-email';

export const metadata: Metadata = {
  title: 'E-posta Doğrulama',
  robots: { index: false, follow: false },
};

/**
 * E-posta doğrulama sayfası.
 *
 * DOĞRULAMA SUNUCU BİLEŞENİNDE YAPILMAZ, istemcide yapılır. Gerekçe: bazı
 * e-posta istemcileri ve güvenlik tarayıcıları bağlantıları KULLANICI
 * TIKLAMADAN önceden getirir (link prefetch). Sunucuda render sırasında
 * doğrulanırsa jeton — tek kullanımlık olduğu için — kullanıcı bağlantıya
 * dokunmadan tükenir ve gerçek tıklamada "bağlantı zaten kullanılmış" hatası
 * görür.
 *
 * İstemci tarafında yapılması bunu tamamen çözmez ama pratikte önler:
 * prefetch işlemi JavaScript çalıştırmaz.
 */
export default async function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const raw = decodeURIComponent(token).trim();

  return (
    <CustomerAuthShell title="E-posta Doğrulama">
      {raw === '' ? <CustomerVerifyEmailMissingToken /> : <CustomerVerifyEmail token={raw} />}
    </CustomerAuthShell>
  );
}
