import type { ReactNode } from 'react';
import { Alert } from '@zirve/ui';

import { Breadcrumbs } from './product-info';

/**
 * Metin ağırlıklı statik sayfa kabı.
 *
 * `needsLegalReview` uyarısı BİLİNÇLİ olarak koda gömüldü: aşağıdaki
 * hukuki metinler çalışan bir taslaktır, gerçek bir işletmenin bağlayıcı
 * beyanı değildir. Mağaza sahibi kendi bilgileriyle güncelleyip hukuk
 * danışmanına onaylatmadan yayına alınmamalıdır. Uyarıyı kaldırmak,
 * metni onaylamak anlamına gelir.
 */
export function StaticPage({
  title,
  description,
  breadcrumbLabel,
  needsLegalReview = false,
  children,
}: {
  title: string;
  description?: string;
  breadcrumbLabel: string;
  needsLegalReview?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8 lg:py-12">
      <Breadcrumbs items={[{ label: 'Ana Sayfa', href: '/' }, { label: breadcrumbLabel }]} />

      <h1 className="mt-4 text-h1 text-on-surface">{title}</h1>

      {description !== undefined ? (
        <p className="mt-2 text-body-lg text-on-surface-variant">{description}</p>
      ) : null}

      {needsLegalReview ? (
        <Alert variant="warning" title="Bu metin taslaktır" className="mt-6">
          Aşağıdaki içerik örnek bir şablondur. Yayına almadan önce mağaza bilgilerinizle
          güncelleyip hukuk danışmanınıza onaylatınız.
        </Alert>
      ) : null}

      <div className="mt-8 flex flex-col gap-6">{children}</div>
    </div>
  );
}

/** Başlıklı metin bölümü. */
export function TextSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-h3 text-on-surface">{title}</h2>
      <div className="mt-2 flex flex-col gap-3 leading-relaxed text-on-surface-variant">
        {children}
      </div>
    </section>
  );
}

/** Madde listesi. */
export function TextList({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
