import type { Metadata } from 'next';
import { Suspense } from 'react';

import { Breadcrumbs } from '@/components/public/product-info';
import { ProductGridSkeleton } from '@/components/public/states';
import { TaxonomyProductList } from '@/components/public/taxonomy-product-list';
import { SITE_URL } from '@/lib/env';
import type { RawSearchParams } from '@/lib/product-filters';
import { getBrand } from '@/lib/public-api';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
}

/*
 * DİKKAT — bu segmentte `loading.tsx` YOKTUR ve olmamalıdır.
 *
 * Rota düzeyindeki `loading.tsx` bir Suspense sınırı kurar; Next kabuğu
 * HTTP 200 ile hemen akıtır. Sayfa sonradan `notFound()` çağırdığında
 * başlıklar gönderilmiş olduğu için durum kodu artık DEĞİŞTİRİLEMEZ ve
 * olmayan bir kayıt 404 yerine 200 döner (arama motoru sahte sayfayı
 * indeksler). Bu yüzden varlık kontrolü akıştan ÖNCE yapılır; iskelet
 * yükleme, sayfanın İÇİNDEKİ Suspense sınırlarıyla sağlanır.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrand(slug);

  const description = brand.description ?? `${brand.name} markasının ürünleri.`;

  return {
    title: brand.name,
    description,
    alternates: { canonical: `/marka/${brand.slug}` },
    openGraph: { title: brand.name, description, url: `${SITE_URL}/marka/${brand.slug}` },
  };
}

export default async function BrandPage({ params, searchParams }: PageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const brand = await getBrand(slug);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 lg:px-8">
      <Breadcrumbs
        items={[
          { label: 'Ana Sayfa', href: '/' },
          { label: 'Markalar', href: '/markalar' },
          { label: brand.name },
        ]}
      />

      <header className="mt-4">
        <h1 className="text-h1 text-on-surface">{brand.name}</h1>

        {brand.description !== null && brand.description !== undefined ? (
          <p className="mt-2 max-w-3xl text-body-lg text-on-surface-variant">{brand.description}</p>
        ) : null}
      </header>

      <div className="mt-8">
        <Suspense fallback={<ProductGridSkeleton />}>
          <TaxonomyProductList
            searchParams={query}
            fixedFilter={{ brand: brand.slug }}
            emptyTitle={`${brand.name} markasında henüz ürün yok`}
          />
        </Suspense>
      </div>
    </div>
  );
}
