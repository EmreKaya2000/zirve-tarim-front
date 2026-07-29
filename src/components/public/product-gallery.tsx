'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@zirve/ui';

import type { PublicImage } from '@/lib/public-types';

/** Ürün görsel galerisi — büyük görsel + küçük görsel şeridi. */
export function ProductGallery({
  images,
  productName,
}: {
  images: PublicImage[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-[12px] border border-outline-variant bg-surface-container-low text-outline">
        <ImageOff className="size-12" aria-hidden="true" />
      </div>
    );
  }

  const active = images[Math.min(activeIndex, images.length - 1)] as PublicImage;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-[12px] border border-outline-variant bg-surface-container-lowest">
        <Image
          src={active.url}
          alt={active.altText ?? productName}
          fill
          sizes="(max-width: 1024px) 100vw, 45vw"
          // Ürün sayfasının LCP öğesi bu görseldir.
          priority
          className="object-contain"
        />
      </div>

      {images.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <li key={image.id ?? image.url}>
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`${index + 1}. görseli göster`}
                aria-current={index === activeIndex}
                className={cn(
                  'relative size-16 shrink-0 overflow-hidden rounded-[8px] border-2 transition-colors',
                  index === activeIndex
                    ? 'border-primary-container'
                    : 'border-outline-variant hover:border-outline',
                )}
              >
                <Image src={image.url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
