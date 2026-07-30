import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { CustomerAuthShell } from '@/components/public/customer-auth-shell';
import { CustomerLoginForm } from '@/components/public/customer-login-form';

export const metadata: Metadata = {
  title: 'Giriş Yap',
  description: 'Hesabınıza giriş yapın; talep listeniz ve talep geçmişiniz sizi bekliyor.',
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <CustomerAuthShell
      title="Giriş Yap"
      description="Talep listeniz ve gönderdiğiniz talepler hesabınızda saklı."
      footer={
        <>
          Hesabınız yok mu?{' '}
          <Link
            href="/kayit"
            className="text-primary-container underline transition-colors hover:text-primary"
          >
            Ücretsiz oluşturun
          </Link>
        </>
      }
    >
      <Suspense fallback={<FormSkeleton />}>
        <CustomerLoginForm />
      </Suspense>
    </CustomerAuthShell>
  );
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-[8px] bg-surface-container-high" />
      ))}
    </div>
  );
}
