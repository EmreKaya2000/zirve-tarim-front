import { Suspense } from 'react';

import { formatCount } from '@/lib/format';
import { parseProductQuery, type RawSearchParams } from '@/lib/product-filters';
import { getProducts, type ProductQuery } from '@/lib/public-api';

import { PaginationNav, SortSelect } from './list-controls';
import { ProductGrid } from './product-card';
import { EmptyState } from './states';

/**
 * Kategori / marka / bitki sayfalarının ürün bölümü.
 *
 * Bu sayfalarda TAM FİLTRE PANELİ GÖSTERİLMEZ: sayfanın kendisi zaten bir
 * filtredir ("Gübre" kategorisi). Yalnız sıralama ve sayfalama sunulur;
 * daha fazlasını isteyen kullanıcı /urunler sayfasına yönlendirilir.
 */
export async function TaxonomyProductList({
  searchParams,
  fixedFilter,
  emptyTitle,
  emptyDescription,
}: {
  searchParams: RawSearchParams;
  /** Sayfanın sabit filtresi, ör. `{ category: 'gubre' }`. */
  fixedFilter: Partial<ProductQuery>;
  emptyTitle: string;
  emptyDescription?: string;
}) {
  // Sabit filtre SONRA uygulanır: kullanıcı URL'ye `?kategori=x` yazarak
  // marka sayfasının kapsamını değiştiremesin.
  const query = { ...parseProductQuery(searchParams), ...fixedFilter };
  const result = await getProducts(query);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-on-surface-variant">{formatCount(result.meta.total)} ürün</p>

        {result.items.length > 0 ? (
          <Suspense fallback={null}>
            <SortSelect />
          </Suspense>
        ) : null}
      </div>

      <div className="mt-6">
        {result.items.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            action={{ href: '/urunler', label: 'Tüm ürünlere göz atın' }}
          />
        ) : (
          <ProductGrid products={result.items} />
        )}
      </div>

      <Suspense fallback={null}>
        <PaginationNav
          page={result.meta.page}
          totalPages={result.meta.totalPages}
          className="mt-10"
        />
      </Suspense>
    </>
  );
}
