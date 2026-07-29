import type { Metadata } from 'next';

import { CartPage } from '@/components/public/cart-page';
import { Breadcrumbs } from '@/components/public/product-info';

export const metadata: Metadata = {
  title: 'Talep Listem',
  description: 'Talep listenizi gözden geçirin ve mağazamıza iletin.',
  // Kişiye özel ve içeriksiz bir sayfa; indekslenmesi anlamsız.
  robots: { index: false, follow: true },
};

export default function TalepSepetiPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 lg:px-8">
      <Breadcrumbs items={[{ label: 'Ana Sayfa', href: '/' }, { label: 'Talep Listem' }]} />

      <header className="mt-4">
        <h1 className="text-h1 text-on-surface">Talep Listem</h1>
        <p className="mt-2 max-w-2xl text-on-surface-variant">
          Listeniz bir sipariş değildir. Gönderdiğinizde sizi arayıp fiyat ve teslimatı
          netleştiriyoruz; ödeme mağazada yapılır.
        </p>
      </header>

      <div className="mt-8">
        <CartPage />
      </div>
    </div>
  );
}
