import Link from 'next/link';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CategoryIcon } from '@/components/public/category-icon';
import { Breadcrumbs } from '@/components/public/product-info';
import { ProductGridSkeleton } from '@/components/public/states';
import { TaxonomyProductList } from '@/components/public/taxonomy-product-list';
import { SITE_URL } from '@/lib/env';
import type { RawSearchParams } from '@/lib/product-filters';
import { getCategory, getCategoryTree } from '@/lib/public-api';
import type { CategoryNode } from '@/lib/public-types';

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
  const category = await getCategory(slug);

  const description =
    category.description ?? `${category.name} kategorisindeki zirai ürünleri inceleyin.`;

  return {
    title: category.name,
    description,
    alternates: { canonical: `/kategori/${category.slug}` },
    openGraph: {
      title: category.name,
      description,
      url: `${SITE_URL}/kategori/${category.slug}`,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const [category, tree] = await Promise.all([getCategory(slug), getCategoryTree()]);

  const children = findChildren(tree, category.slug);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 lg:px-8">
      <Breadcrumbs
        items={[
          { label: 'Ana Sayfa', href: '/' },
          { label: 'Kategoriler', href: '/kategoriler' },
          // Sunucudan gelen breadcrumb üst kategorileri de içerir.
          ...category.breadcrumb
            .filter((item) => item.slug !== category.slug)
            .map((item) => ({ label: item.name, href: `/kategori/${item.slug}` })),
          { label: category.name },
        ]}
      />

      <header className="mt-4">
        <div className="flex items-center gap-3">
          <CategoryIcon iconUrl={category.iconUrl} size={48} />
          <h1 className="text-h1 text-on-surface">{category.name}</h1>
        </div>

        {category.description !== null ? (
          <p className="mt-2 max-w-3xl text-body-lg text-on-surface-variant">
            {category.description}
          </p>
        ) : null}
      </header>

      {children.length > 0 ? (
        <nav aria-label="Alt kategoriler" className="mt-6 flex flex-wrap gap-2">
          {children.map((child) => (
            <Link
              key={child.id}
              href={`/kategori/${child.slug}`}
              className="rounded-full border border-outline-variant px-4 py-2 text-sm text-on-surface-variant transition-colors hover:border-primary-container hover:text-primary-container"
            >
              {child.name}
            </Link>
          ))}
        </nav>
      ) : null}

      <div className="mt-8">
        {/*
          Kategori filtresi ALT KATEGORİLERİ DE kapsar (backend kuralı):
          "Gübre" seçen kullanıcı "Sıvı Gübre" ürünlerini de görür.
        */}
        <Suspense fallback={<ProductGridSkeleton />}>
          <TaxonomyProductList
            searchParams={query}
            fixedFilter={{ category: category.slug }}
            emptyTitle={`${category.name} kategorisinde henüz ürün yok`}
            emptyDescription="Bu kategoriye ürün eklendiğinde burada listelenecek."
          />
        </Suspense>
      </div>
    </div>
  );
}

/** Ağaçta slug'ı bulup çocuklarını döndürür. */
function findChildren(nodes: CategoryNode[], slug: string): CategoryNode[] {
  for (const node of nodes) {
    if (node.slug === slug) {
      return node.children;
    }

    const found = findChildren(node.children, slug);

    if (found.length > 0) {
      return found;
    }
  }

  return [];
}
