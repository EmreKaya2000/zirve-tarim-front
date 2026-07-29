import type { Metadata } from 'next';

import { CustomerAccountShell } from '@/components/public/customer-account-shell';
import { CustomerProfileForm } from '@/components/public/customer-profile-form';

export const metadata: Metadata = {
  title: 'Hesabım',
  // Hesap sayfaları kişisel veri içerir; arama motorlarına açılmaz.
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <CustomerAccountShell
      title="Hesabım"
      description="İletişim bilgilerinizi güncelleyin; talep formunuz bu bilgilerle ön dolu gelir."
    >
      <CustomerProfileForm />
    </CustomerAccountShell>
  );
}
