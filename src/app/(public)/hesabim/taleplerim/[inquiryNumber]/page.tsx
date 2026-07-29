import type { Metadata } from 'next';

import { CustomerAccountShell } from '@/components/public/customer-account-shell';
import { CustomerInquiryDetail } from '@/components/public/customer-inquiry-detail';

export const metadata: Metadata = {
  title: 'Talep Detayı',
  robots: { index: false, follow: false },
};

/**
 * Talep detayı sayfası.
 *
 * VERİ SUNUCUDA ÇEKİLMEZ, istemcide çekilir. Gerekçe: talep yalnız SAHİBİNE
 * gösterilir ve sahiplik müşteri jetonuyla belirlenir; jeton `localStorage`da
 * durduğu için sunucu render'ında erişilemez (bkz. customer-auth-store.ts
 * ödünleşme notu). Sunucuda çekmeye kalkmak jetonsuz bir istek üretir ve
 * daima 401 alırdı.
 */
export default async function MyInquiryDetailPage({
  params,
}: {
  params: Promise<{ inquiryNumber: string }>;
}) {
  const { inquiryNumber } = await params;

  return (
    <CustomerAccountShell title="Talep Detayı">
      <CustomerInquiryDetail inquiryNumber={decodeURIComponent(inquiryNumber)} />
    </CustomerAccountShell>
  );
}
