import { cn } from '@zirve/ui';

import { formatMoney, formatMoneyShort } from '@/lib/format';
import { priceRange } from '@/lib/product-filters';
import type { PublicProductListItem } from '@/lib/public-types';

/**
 * Fiyat gösteriminin TEK OTORİTESİ.
 *
 * Gereksinim 1: `showPrice=false` olan üründe fiyat yerine mağazaya
 * yönlendirme metni gösterilir. Bu kural tek bir bileşende toplandı;
 * her kartta ayrı ayrı yazılsaydı bir yerde unutulur ve sunucunun
 * gizlediği bilgi "0,00 ₺" olarak sızardı.
 */
export function PriceDisplay({
  product,
  size = 'md',
  className,
}: {
  product: PublicProductListItem;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const range = priceRange(product);

  if (range.hidden) {
    return (
      <p
        className={cn(
          'font-medium text-primary-container',
          size === 'lg' ? 'text-body-lg' : 'text-sm',
          className,
        )}
      >
        Fiyat için mağazamıza danışın
      </p>
    );
  }

  if (range.min === null) {
    return (
      <p className={cn('text-sm text-on-surface-variant', className)}>Fiyat bilgisi bulunmuyor</p>
    );
  }

  const format = size === 'lg' ? formatMoney : formatMoneyShort;
  const isRange = range.max !== null && range.max !== range.min;

  return (
    <p
      className={cn(
        'font-financial font-semibold text-on-surface',
        size === 'lg' && 'text-h3',
        size === 'md' && 'text-body-lg',
        size === 'sm' && 'text-sm',
        className,
      )}
    >
      {format(range.min)}
      {isRange ? <span className="text-on-surface-variant"> – {format(range.max)}</span> : null}
    </p>
  );
}
