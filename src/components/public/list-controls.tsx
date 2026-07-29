'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@zirve/ui';

import { FILTER_KEYS, SORT_OPTIONS, withParam } from '@/lib/product-filters';

/** Sıralama seçici — seçim URL'ye yazılır. */
export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = searchParams.get(FILTER_KEYS.sort) ?? 'newest';

  return (
    <label className="flex items-center gap-2 text-sm text-on-surface-variant">
      <span className="hidden sm:inline">Sırala</span>
      <select
        value={current}
        onChange={(event) => {
          const next = withParam(searchParams, FILTER_KEYS.sort, event.target.value);

          router.push(`${pathname}?${next.toString()}`);
        }}
        className="rounded-[8px] border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary-container"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Uygulanmış filtreleri rozet olarak gösterir; tek tek kaldırılabilir. */
export function ActiveFilterChips({
  labels,
}: {
  /** URL anahtarı -> gösterilecek etiket eşlemesi. */
  labels: { key: string; value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (labels.length === 0) {
    return null;
  }

  const remove = (key: string, value: string): void => {
    const currentValue = searchParams.get(key);
    // Çoklu filtrede yalnız ilgili öğe çıkarılır, tamamı değil.
    const remaining = (currentValue ?? '')
      .split(',')
      .filter((item) => item !== '' && item !== value);

    const next = withParam(
      searchParams,
      key,
      remaining.length === 0 ? undefined : remaining.join(','),
    );
    const query = next.toString();

    router.push(query === '' ? pathname : `${pathname}?${query}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {labels.map((item) => (
        <button
          key={`${item.key}:${item.value}`}
          type="button"
          onClick={() => remove(item.key, item.value)}
          className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container px-3 py-1 text-label-sm text-on-primary-fixed-variant transition-opacity hover:opacity-80"
        >
          {item.label}
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ))}

      <Link
        href={pathname}
        className="text-label-sm uppercase text-on-surface-variant underline hover:text-on-surface"
      >
        Tümünü temizle
      </Link>
    </div>
  );
}

/**
 * Sayfalama — `<Link>` tabanlı.
 *
 * packages/ui'daki `Pagination` bileşeni `onPageChange` ile çalışır ve
 * client tarafındadır; vitrinde tarama motorunun sayfa 2, 3... içeriğini
 * görebilmesi için GERÇEK BAĞLANTI gerekir. Bu yüzden ayrı bir bileşen.
 */
export function PaginationNav({
  page,
  totalPages,
  className,
}: {
  page: number;
  totalPages: number;
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) {
    return null;
  }

  const hrefFor = (target: number): string => {
    const next = new URLSearchParams(searchParams.toString());

    if (target <= 1) {
      next.delete(FILTER_KEYS.page);
    } else {
      next.set(FILTER_KEYS.page, String(target));
    }

    const query = next.toString();

    return query === '' ? pathname : `${pathname}?${query}`;
  };

  return (
    <nav aria-label="Sayfalar" className={cn('flex items-center justify-center gap-1', className)}>
      <PageLink href={hrefFor(page - 1)} disabled={page <= 1} label="Önceki sayfa">
        <ChevronLeft className="size-4" aria-hidden="true" />
      </PageLink>

      {pageNumbers(page, totalPages).map((item, index) =>
        item === null ? (
          <span key={`gap-${index}`} className="px-2 text-on-surface-variant">
            …
          </span>
        ) : (
          <PageLink key={item} href={hrefFor(item)} active={item === page} label={`Sayfa ${item}`}>
            {item}
          </PageLink>
        ),
      )}

      <PageLink href={hrefFor(page + 1)} disabled={page >= totalPages} label="Sonraki sayfa">
        <ChevronRight className="size-4" aria-hidden="true" />
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  active = false,
  disabled = false,
  label,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  label: string;
}) {
  const classes = cn(
    'flex h-9 min-w-9 items-center justify-center rounded-[8px] px-2 text-sm transition-colors',
    active
      ? 'bg-primary text-on-primary'
      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
    disabled && 'pointer-events-none opacity-40',
  );

  if (disabled) {
    return (
      <span className={classes} aria-disabled="true" aria-label={label}>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={classes}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}

/** 1 … 4 [5] 6 … 12 biçiminde sayfa numarası dizisi. `null` = boşluk. */
function pageNumbers(page: number, totalPages: number): (number | null)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const result: (number | null)[] = [1];

  if (page > 3) {
    result.push(null);
  }

  for (let value = Math.max(2, page - 1); value <= Math.min(totalPages - 1, page + 1); value += 1) {
    result.push(value);
  }

  if (page < totalPages - 2) {
    result.push(null);
  }

  result.push(totalPages);

  return result;
}
