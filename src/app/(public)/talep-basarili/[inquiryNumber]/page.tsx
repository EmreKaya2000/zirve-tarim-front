import Link from 'next/link';
import type { Metadata } from 'next';
import { CheckCircle2, Clock, Phone, Store } from 'lucide-react';
import { Alert, Button } from '@zirve/ui';

import { getStoreInfo, telUrl } from '@/lib/store-settings';

export const metadata: Metadata = {
  title: 'Talebiniz Alındı',
  robots: { index: false, follow: false },
};

/**
 * Talep başarı sayfası.
 *
 * Talep numarası YALNIZ URL'DEN okunur; sunucudan talep detayı ÇEKİLMEZ.
 * Çekilseydi numarayı tahmin eden biri başkasının iletişim bilgilerine
 * erişebilirdi. Numara zaten müşterinin elinde; teyit için yeterli.
 */
export default async function TalepBasariliPage({
  params,
}: {
  params: Promise<{ inquiryNumber: string }>;
}) {
  const { inquiryNumber } = await params;
  const store = await getStoreInfo();
  const tel = telUrl(store.phone);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 px-4 py-16 text-center lg:py-24">
      <span className="flex size-16 items-center justify-center rounded-full bg-success-container text-on-success-container">
        <CheckCircle2 className="size-8" aria-hidden="true" />
      </span>

      <h1 className="text-h1 text-on-surface">Talebiniz bize ulaştı</h1>

      <p className="text-body-lg text-on-surface-variant">
        Talep numaranız aşağıdadır. Bizi ararken bu numarayı belirtirseniz kaydınızı hemen buluruz.
      </p>

      <p className="rounded-[12px] border border-outline-variant bg-surface-container-lowest px-6 py-4 font-financial text-h2 text-on-surface">
        {decodeURIComponent(inquiryNumber)}
      </p>

      <div className="flex w-full flex-col gap-3 text-left">
        <Step
          icon={<Phone className="size-4" />}
          title="Sizi arayacağız"
          description="Ürünlerin durumunu ve güncel fiyatı teyit etmek için iletişime geçiyoruz."
        />
        <Step
          icon={<Clock className="size-4" />}
          title="Stok rezerve edilmedi"
          description="Talep göndermek ürünü ayırmaz; mevcudiyeti görüşmede teyit ediyoruz."
        />
        <Step
          icon={<Store className="size-4" />}
          title="Teslimat mağazada"
          description="Ürünleri mağazamızdan teslim alırsınız; ödeme de orada yapılır."
        />
      </div>

      {store.workingHours !== null ? (
        <Alert variant="info" title="Çalışma saatlerimiz" className="w-full text-left">
          {store.workingHours}
        </Alert>
      ) : null}

      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/urunler">Alışverişe devam et</Link>
        </Button>

        {tel !== null ? (
          <Button asChild variant="outline">
            <a href={tel}>
              <Phone />
              {store.phone}
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Step({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-[12px] border border-outline-variant bg-surface-container-lowest p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-secondary-container text-on-primary-fixed-variant">
        {icon}
      </span>
      <span>
        <span className="block text-label-md text-on-surface">{title}</span>
        <span className="block text-sm text-on-surface-variant">{description}</span>
      </span>
    </div>
  );
}
