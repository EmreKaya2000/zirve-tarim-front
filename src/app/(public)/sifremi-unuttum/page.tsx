import type { Metadata } from 'next';
import Link from 'next/link';

import { CustomerAuthShell } from '@/components/public/customer-auth-shell';
import { ForgotPasswordForm } from '@/components/public/customer-password-forms';

export const metadata: Metadata = {
  title: 'Şifremi Unuttum',
  robots: { index: false, follow: true },
};

export default function ForgotPasswordPage() {
  return (
    <CustomerAuthShell
      title="Şifremi Unuttum"
      description="E-posta adresinizi girin; şifrenizi yenilemeniz için bir bağlantı gönderelim."
      footer={
        <Link href="/giris" className="text-primary-container underline">
          Giriş sayfasına dön
        </Link>
      }
    >
      <ForgotPasswordForm />
    </CustomerAuthShell>
  );
}
