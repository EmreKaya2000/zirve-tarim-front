import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { CustomerAuthShell } from '@/components/public/customer-auth-shell';
import { CustomerRegisterForm } from '@/components/public/customer-register-form';

export const metadata: Metadata = {
  title: 'Hesap Oluştur',
  description:
    'Ücretsiz hesap oluşturun; talep listeniz tüm cihazlarınızda görünsün ve gönderdiğiniz talepleri takip edin.',
  // Kimlik sayfaları arama sonuçlarında bulunmamalı: arama motoru için
  // içerikleri yok, kullanıcı için de giriş noktası header'daki menüdür.
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  return (
    <CustomerAuthShell
      title="Hesap Oluştur"
      description="Talep listeniz cihazlar arasında taşınsın, gönderdiğiniz talepleri tek yerden takip edin."
      footer={
        <>
          Hesabınız var mı?{' '}
          <Link href="/giris" className="text-primary-container underline">
            Giriş yapın
          </Link>
        </>
      }
    >
      {/*
        `useSearchParams` kullanan form Suspense sınırı ister (Next.js
        gerekliliği): `?next=` parametresi olmadan da sayfa render edilebilsin.
      */}
      <Suspense fallback={<FormSkeleton />}>
        <CustomerRegisterForm />
      </Suspense>
    </CustomerAuthShell>
  );
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-[8px] bg-surface-container-high" />
      ))}
    </div>
  );
}
