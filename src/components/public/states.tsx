import Link from 'next/link';
import type { ReactNode } from 'react';
import { PackageSearch } from 'lucide-react';
import { Button, Skeleton } from '@zirve/ui';

/**
 * Boş / yükleniyor / hata durumları.
 *
 * Üç durum da her sayfada tasarlanır (gereksinim 6). Tek dosyada
 * toplandılar: bir sayfada "sonuç yok" ekranının unutulması, kullanıcıya
 * bomboş bir alan göstermek demektir.
 */

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[12px] border border-dashed border-outline-variant px-6 py-16 text-center">
      <span className="text-outline">
        {icon ?? <PackageSearch className="size-10" aria-hidden="true" />}
      </span>

      <p className="text-body-lg text-on-surface">{title}</p>

      {description !== undefined ? (
        <p className="max-w-md text-sm text-on-surface-variant">{description}</p>
      ) : null}

      {action !== undefined ? (
        <Button asChild variant="outline" className="mt-2">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}

/** Ürün kartı iskeleti. */
export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[12px] border border-outline-variant bg-surface-container-lowest">
      <Skeleton className="aspect-square rounded-none" />
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-2 h-5 w-24" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

/** Basit kart listesi iskeleti — kategori/marka/bitki sayfaları için. */
export function TileGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-28" />
      ))}
    </div>
  );
}
