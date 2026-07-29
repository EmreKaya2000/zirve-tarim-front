import Link from 'next/link';
import type { Metadata } from 'next';
import { Leaf } from 'lucide-react';

import { Breadcrumbs } from '@/components/public/product-info';
import { EmptyState } from '@/components/public/states';
import { getPlants } from '@/lib/public-api';

export const metadata: Metadata = {
  title: 'Bitkiler',
  description: 'Yetiştirdiğiniz bitkiye uygun zirai ürünleri bulun.',
  alternates: { canonical: '/bitkiler' },
};

export default async function PlantsPage() {
  const plants = await getPlants();

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 lg:px-8">
      <Breadcrumbs items={[{ label: 'Ana Sayfa', href: '/' }, { label: 'Bitkiler' }]} />

      <h1 className="mt-4 text-h1 text-on-surface">Bitkiler</h1>
      <p className="mt-2 text-on-surface-variant">Ürününüzü yetiştirdiğiniz bitkiye göre seçin.</p>

      <div className="mt-8">
        {plants.length === 0 ? (
          <EmptyState title="Henüz bitki tanımlanmamış" />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {plants.map((plant) => (
              <Link
                key={plant.id}
                href={`/bitki/${plant.slug}`}
                className="group flex flex-col gap-2 rounded-[12px] border border-outline-variant bg-surface-container-lowest p-5 transition-shadow hover:shadow-md"
              >
                <span className="flex size-10 items-center justify-center rounded-[10px] bg-secondary-container text-on-primary-fixed-variant">
                  <Leaf className="size-5" aria-hidden="true" />
                </span>

                <span className="text-label-md text-on-surface group-hover:text-primary-container">
                  {plant.name}
                </span>

                {plant.latinName !== null && plant.latinName !== undefined ? (
                  <span className="text-sm italic text-on-surface-variant">{plant.latinName}</span>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
