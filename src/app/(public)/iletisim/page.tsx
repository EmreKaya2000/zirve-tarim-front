import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Alert } from '@zirve/ui';

import { Breadcrumbs } from '@/components/public/product-info';
import { getStoreInfo, telUrl, whatsappUrl } from '@/lib/store-settings';

export const metadata: Metadata = {
  title: 'İletişim',
  description: 'Mağaza adresimiz, telefon numaramız ve çalışma saatlerimiz.',
  alternates: { canonical: '/iletisim' },
};

export default async function ContactPage() {
  const store = await getStoreInfo();

  const tel = telUrl(store.phone);
  const whatsapp = whatsappUrl(store.whatsapp, 'Merhaba, bilgi almak istiyorum.');

  const hasAnyContact =
    store.phone !== null || store.email !== null || store.address !== null || whatsapp !== null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8 lg:py-12">
      <Breadcrumbs items={[{ label: 'Ana Sayfa', href: '/' }, { label: 'İletişim' }]} />

      <h1 className="mt-4 text-h1 text-on-surface">İletişim</h1>
      <p className="mt-2 text-body-lg text-on-surface-variant">
        Ürünler hakkında bilgi almak veya talebinizi görüşmek için bize ulaşın.
      </p>

      {hasAnyContact ? (
        <div className="mt-8 flex flex-col gap-3">
          {store.address !== null ? (
            <ContactRow icon={<MapPin />} label="Adres" href={store.mapUrl}>
              {store.address}
            </ContactRow>
          ) : null}

          {tel !== null ? (
            <ContactRow icon={<Phone />} label="Telefon" href={tel}>
              {store.phone}
            </ContactRow>
          ) : null}

          {whatsapp !== null ? (
            <ContactRow icon={<MessageCircle />} label="WhatsApp" href={whatsapp}>
              Mesaj gönderin
            </ContactRow>
          ) : null}

          {store.email !== null ? (
            <ContactRow icon={<Mail />} label="E-posta" href={`mailto:${store.email}`}>
              {store.email}
            </ContactRow>
          ) : null}

          {store.workingHours !== null ? (
            <ContactRow icon={<Clock />} label="Çalışma Saatleri">
              {store.workingHours}
            </ContactRow>
          ) : null}
        </div>
      ) : (
        <Alert variant="info" className="mt-8" title="İletişim bilgileri henüz girilmemiş">
          Mağaza bilgileri yönetim panelinden tanımlandığında bu sayfada görünecektir.
        </Alert>
      )}

      <Alert variant="info" className="mt-8" title="Online satış yapılmamaktadır">
        Bu site üzerinden ödeme alınmaz. Talebinizi ilettikten sonra sizi arıyor, fiyat ve teslimatı
        mağazada tamamlıyoruz.
      </Alert>
    </div>
  );
}

function ContactRow({
  icon,
  label,
  href,
  children,
}: {
  icon: ReactNode;
  label: string;
  href?: string | null;
  children: ReactNode;
}) {
  const content = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-secondary-container text-on-primary-fixed-variant [&_svg]:size-4">
        {icon}
      </span>

      <span className="min-w-0">
        <span className="block text-label-sm uppercase text-on-surface-variant">{label}</span>
        <span className="block text-on-surface">{children}</span>
      </span>
    </>
  );

  const className =
    'flex items-center gap-4 rounded-[12px] border border-outline-variant bg-surface-container-lowest p-4';

  if (href === null || href === undefined) {
    return <div className={className}>{content}</div>;
  }

  const isExternal = href.startsWith('http');

  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className={`${className} transition-colors hover:border-primary-container`}
    >
      {content}
    </a>
  );
}
