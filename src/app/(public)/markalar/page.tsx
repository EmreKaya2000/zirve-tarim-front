import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';

import { Breadcrumbs } from '@/components/public/product-info';
import { EmptyState } from '@/components/public/states';
import { getBrands } from '@/lib/public-api';

export const metadata: Metadata = {
  title: 'Markalar',
  description: 'Mağazamızda bulunan zirai ürün markaları.',
  alternates: { canonical: '/markalar' },
};

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 lg:px-8">
      <Breadcrumbs items={[{ label: 'Ana Sayfa', href: '/' }, { label: 'Markalar' }]} />

      <h1 className="mt-4 text-h1 text-on-surface">Markalar</h1>
      <p className="mt-2 text-on-surface-variant">Çalıştığımız üretici ve tedarikçiler.</p>

      <div className="mt-8">
        {brands.length === 0 ? (
          <EmptyState title="Henüz marka tanımlanmamış" />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/marka/${brand.slug}`}
                className="flex flex-col items-center gap-3 rounded-[12px] border border-outline-variant bg-surface-container-lowest p-6 text-center transition-shadow hover:shadow-md"
              >
                {brand.logoUrl !== null && brand.logoUrl !== undefined ? (
                  <Image
                    src={brand.logoUrl}
                    alt=""
                    width={64}
                    height={64}
                    className="size-16 object-contain"
                  />
                ) : (
                  <span className="flex size-16 items-center justify-center rounded-full bg-secondary-container text-h3 text-on-primary-fixed-variant">
                    {brand.name.slice(0, 1).toLocaleUpperCase('tr-TR')}
                  </span>
                )}

                <span className="text-label-md text-on-surface">{brand.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
