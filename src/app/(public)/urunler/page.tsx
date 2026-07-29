import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@zirve/ui';

import { FilterDrawer, FilterPanel } from '@/components/public/filter-panel';
import { ActiveFilterChips, PaginationNav, SortSelect } from '@/components/public/list-controls';
import { ProductGrid } from '@/components/public/product-card';
import { EmptyState, ProductGridSkeleton } from '@/components/public/states';
import { formatCount } from '@/lib/format';
import {
  FILTER_KEYS,
  parseProductQuery,
  splitList,
  type RawSearchParams,
} from '@/lib/product-filters';
import { getProducts, getTaxonomy } from '@/lib/public-api';
import type { Taxonomy } from '@/lib/public-types';

export const metadata: Metadata = {
  title: 'Ürünler',
  description:
    'Zirai ilaç, gübre, tohum ve sulama ekipmanları. Kategori, marka, bitki ve toprak türüne göre filtreleyin.',
  alternates: { canonical: '/urunler' },
};

/*
 * DİKKAT — bu segmentte `loading.tsx` YOKTUR ve olmamalıdır.
 *
 * `/urunler/loading.tsx` yalnız bu sayfayı değil, ALT SEGMENTİ de
 * (`/urunler/[slug]`) saran bir Suspense sınırı kurar. Next kabuğu
 * HTTP 200 ile hemen akıtır ve ürün sayfası sonradan `notFound()`
 * çağırdığında durum kodu artık değiştirilemez — olmayan bir ürün 404
 * yerine 200 döner. İskelet yükleme bu yüzden sayfanın İÇİNDEKİ Suspense
 * sınırıyla sağlanır.
 */

/**
 * Ürün listeleme.
 *
 * Sunucu bileşenidir: filtreler `searchParams`'tan okunur, veri sunucuda
 * çekilir ve HTML olarak gönderilir. Yalnız etkileşimli parçalar (filtre
 * paneli, sıralama, sayfalama bağlantıları) client bileşeni.
 */
export default async function ProductsPage({
  // Next 15: searchParams bir Promise'tir.
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 lg:px-8">
      <header>
        <h1 className="text-h1 text-on-surface">Ürünler</h1>
      </header>

      <Suspense key={JSON.stringify(params)} fallback={<ProductsSkeleton />}>
        <ProductResults params={params} />
      </Suspense>
    </div>
  );
}

/** Veri bağımlı bölüm — Suspense sınırının içinde. */
async function ProductResults({ params }: { params: RawSearchParams }) {
  const query = parseProductQuery(params);

  const [result, taxonomy] = await Promise.all([
    getProducts(query),
    getTaxonomy(['categories', 'brands', 'plants', 'soilTypes', 'unitTypes']),
  ]);

  const chips = buildChips(params, taxonomy);

  return (
    <>
      <p className="mt-2 text-on-surface-variant">
        {formatCount(result.meta.total)} ürün listeleniyor
      </p>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <Suspense fallback={null}>
            <FilterPanel taxonomy={taxonomy} />
          </Suspense>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Suspense fallback={null}>
              <FilterDrawer taxonomy={taxonomy} total={result.meta.total} />
            </Suspense>

            <div className="ml-auto">
              <Suspense fallback={null}>
                <SortSelect />
              </Suspense>
            </div>
          </div>

          {chips.length > 0 ? (
            <div className="mt-4">
              <Suspense fallback={null}>
                <ActiveFilterChips labels={chips} />
              </Suspense>
            </div>
          ) : null}

          <div className="mt-6">
            {result.items.length === 0 ? (
              <EmptyState
                title="Aradığınız kriterlere uygun ürün bulunamadı"
                description="Filtreleri gevşetmeyi veya farklı bir arama terimi denemeyi önerebiliriz."
                action={{ href: '/urunler', label: 'Filtreleri temizle' }}
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
        </div>
      </div>
    </>
  );
}

function ProductsSkeleton() {
  return (
    <>
      <Skeleton className="mt-2 h-5 w-32" />

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:gap-8">
        <aside className="hidden w-64 shrink-0 flex-col gap-4 lg:flex">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </aside>

        <div className="min-w-0 flex-1">
          <ProductGridSkeleton />
        </div>
      </div>
    </>
  );
}

/**
 * Aktif filtreleri okunur etiketlere çevirir.
 *
 * URL'de slug durur (`marka=agromax`), kullanıcıya ise marka adı gösterilir.
 * Taksonomide karşılığı bulunmayan slug atlanır: elle yazılmış geçersiz bir
 * parametre için "undefined" rozeti göstermek anlamsız olurdu.
 */
function buildChips(
  params: RawSearchParams,
  taxonomy: Taxonomy,
): { key: string; value: string; label: string }[] {
  const chips: { key: string; value: string; label: string }[] = [];

  const single = (key: string): string | undefined => {
    const value = params[key];
    const raw = Array.isArray(value) ? value[0] : value;

    return raw === undefined || raw.trim() === '' ? undefined : raw.trim();
  };

  const search = single(FILTER_KEYS.search);
  if (search !== undefined) {
    chips.push({ key: FILTER_KEYS.search, value: search, label: `Arama: ${search}` });
  }

  const category = single(FILTER_KEYS.category);
  if (category !== undefined) {
    const match = flattenCategories(taxonomy.categories ?? []).find(
      (item) => item.slug === category,
    );

    if (match !== undefined) {
      chips.push({ key: FILTER_KEYS.category, value: category, label: match.name });
    }
  }

  const named: { key: string; source: { slug: string; name: string }[] }[] = [
    { key: FILTER_KEYS.brand, source: taxonomy.brands ?? [] },
    { key: FILTER_KEYS.plant, source: taxonomy.plants ?? [] },
    { key: FILTER_KEYS.soilType, source: taxonomy.soilTypes ?? [] },
  ];

  for (const group of named) {
    for (const slug of splitList(single(group.key))) {
      const match = group.source.find((item) => item.slug === slug);

      if (match !== undefined) {
        chips.push({ key: group.key, value: slug, label: match.name });
      }
    }
  }

  for (const code of splitList(single(FILTER_KEYS.unit))) {
    const match = (taxonomy.unitTypes ?? []).find((unit) => unit.code === code);

    if (match !== undefined) {
      chips.push({ key: FILTER_KEYS.unit, value: code, label: match.name });
    }
  }

  if (single(FILTER_KEYS.inStock) === '1') {
    chips.push({ key: FILTER_KEYS.inStock, value: '1', label: 'Stokta olanlar' });
  }

  return chips;
}

function flattenCategories(
  nodes: { id: string; name: string; slug: string; children: unknown[] }[],
): { name: string; slug: string }[] {
  return nodes.flatMap((node) => [
    { name: node.name, slug: node.slug },
    ...flattenCategories(
      node.children as { id: string; name: string; slug: string; children: unknown[] }[],
    ),
  ]);
}
