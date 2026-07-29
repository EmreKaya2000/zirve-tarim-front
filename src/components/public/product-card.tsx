import Image from 'next/image';
import Link from 'next/link';
import { ImageOff } from 'lucide-react';
import { Badge, cn } from '@zirve/ui';

import { isInStock } from '@/lib/product-filters';
import type { PublicProductListItem } from '@/lib/public-types';

import { PriceDisplay } from './price-display';

/**
 * Katalog ürün kartı.
 *
 * Sunucu bileşenidir: kartta etkileşim yok, tamamı HTML olarak üretilir —
 * arama motoru içeriği görür, mobilde JS beklemeden görünür.
 */
export function ProductCard({
  product,
  priority = false,
}: {
  product: PublicProductListItem;
  /** İlk ekranda görünen kartlarda true; LCP görselini erken yükler. */
  priority?: boolean;
}) {
  const image = product.images[0];
  const inStock = isInStock(product);

  return (
    <Link
      href={`/urunler/${product.slug}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-[12px] border border-outline-variant',
        'bg-surface-container-lowest transition-shadow hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container',
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-surface-container-low">
        {image === undefined ? (
          <div className="flex size-full items-center justify-center text-outline">
            <ImageOff className="size-10" aria-hidden="true" />
          </div>
        ) : (
          <Image
            src={image.url}
            alt={image.altText ?? product.name}
            fill
            // Izgara mobilde 2, tablette 3, masaüstünde 4 sütun.
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}

        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {product.isNew ? <Badge variant="info">Yeni</Badge> : null}
          {product.isFeatured ? <Badge variant="primary">Öne çıkan</Badge> : null}
          {!inStock ? <Badge variant="warning">Stokta yok</Badge> : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.brand !== null ? (
          <span className="text-label-sm uppercase text-on-surface-variant">
            {product.brand.name}
          </span>
        ) : null}

        <h3 className="line-clamp-2 text-label-md text-on-surface group-hover:text-primary-container">
          {product.name}
        </h3>

        {product.shortDescription !== null ? (
          <p className="line-clamp-2 text-sm text-on-surface-variant">{product.shortDescription}</p>
        ) : null}

        <div className="mt-auto pt-2">
          <PriceDisplay product={product} />
        </div>
      </div>
    </Link>
  );
}

/** Ürün ızgarası — liste, kategori, marka ve bitki sayfalarında ortak. */
export function ProductGrid({
  products,
  priorityCount = 4,
}: {
  products: PublicProductListItem[];
  priorityCount?: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < priorityCount} />
      ))}
    </div>
  );
}
