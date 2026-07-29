import type { Metadata } from 'next';

import { CustomerAuthShell } from '@/components/public/customer-auth-shell';
import { ResetPasswordForm } from '@/components/public/customer-password-forms';

export const metadata: Metadata = {
  title: 'Yeni Şifre Belirle',
  robots: { index: false, follow: false },
};

/**
 * Şifre sıfırlama sayfası.
 *
 * JETON ADRES YOLUNDAN gelir (sorgu parametresinden değil): sorgu
 * parametreleri tarayıcı geçmişinde, sunucu erişim loglarında ve
 * `Referer` başlığında daha kolay sızar. Yol parçası da loglanabilir ama
 * `Referer` ile üçüncü taraflara taşınmaz.
 *
 * Jeton İSTEMCİYE geçirilir ve doğrulama sunucuda yapılır; sayfa jetonun
 * geçerliliğini önceden kontrol ETMEZ — kontrol etmek, jetonu tek kullanımlık
 * olduğu için tüketmek anlamına gelirdi.
 */
export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <CustomerAuthShell
      title="Yeni Şifre Belirle"
      description="Bağlantı 30 dakika geçerlidir ve yalnız bir kez kullanılabilir."
    >
      <ResetPasswordForm token={decodeURIComponent(token)} />
    </CustomerAuthShell>
  );
}
