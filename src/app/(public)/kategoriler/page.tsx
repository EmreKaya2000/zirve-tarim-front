import Link from 'next/link';
import type { Metadata } from 'next';

import { CategoryIcon } from '@/components/public/category-icon';
import { Breadcrumbs } from '@/components/public/product-info';
import { EmptyState } from '@/components/public/states';
import { getCategoryTree } from '@/lib/public-api';

export const metadata: Metadata = {
  title: 'Kategoriler',
  description: 'Zirai ilaç, gübre, tohum ve sulama ekipmanları kategorileri.',
  alternates: { canonical: '/kategoriler' },
};

export default async function CategoriesPage() {
  const categories = await getCategoryTree();

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 lg:px-8">
      <Breadcrumbs items={[{ label: 'Ana Sayfa', href: '/' }, { label: 'Kategoriler' }]} />

      <h1 className="mt-4 text-h1 text-on-surface">Kategoriler</h1>
      <p className="mt-2 text-on-surface-variant">İhtiyacınıza göre ürün gruplarını inceleyin.</p>

      <div className="mt-8">
        {categories.length === 0 ? (
          <EmptyState title="Henüz kategori tanımlanmamış" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <section
                key={category.id}
                className="rounded-[12px] border border-outline-variant bg-surface-container-lowest p-5"
              >
                <Link href={`/kategori/${category.slug}`} className="group flex items-center gap-3">
                  <CategoryIcon iconUrl={category.iconUrl} size={40} />
                  <span className="text-label-md text-on-surface group-hover:text-primary-container">
                    {category.name}
                  </span>
                </Link>

                {category.description !== null && category.description !== undefined ? (
                  <p className="mt-3 text-sm text-on-surface-variant">{category.description}</p>
                ) : null}

                {category.children.length > 0 ? (
                  <ul className="mt-4 flex flex-col gap-1.5 border-t border-outline-variant pt-3">
                    {category.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={`/kategori/${child.slug}`}
                          className="text-sm text-on-surface-variant hover:text-on-surface"
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
