'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button, cn } from '@zirve/ui';

import { FILTER_KEYS, splitList, toggleInList, withParam } from '@/lib/product-filters';
import type { CategoryNode, Taxonomy } from '@/lib/public-types';

/**
 * Ürün filtre paneli.
 *
 * Durum URL'de yaşar (bkz. lib/product-filters.ts). Her değişiklik
 * `router.push` ile adresi günceller; sunucu bileşeni yeni `searchParams`
 * ile yeniden render edilir. Böylece "filtreli liste linki" paylaşılabilir
 * ve geri tuşu beklendiği gibi çalışır.
 */
export function FilterPanel({ taxonomy, className }: { taxonomy: Taxonomy; className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const apply = (key: string, value: string | undefined): void => {
    const next = withParam(searchParams, key, value);
    const query = next.toString();

    router.push(query === '' ? '/urunler' : `/urunler?${query}`);
  };

  const toggle = (key: string, value: string): void => {
    apply(key, toggleInList(searchParams.get(key) ?? undefined, value));
  };

  const selected = (key: string): string[] => splitList(searchParams.get(key) ?? undefined);

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <CategoryFilter
        categories={taxonomy.categories ?? []}
        active={searchParams.get(FILTER_KEYS.category)}
        onSelect={(slug) => apply(FILTER_KEYS.category, slug)}
      />

      <CheckList
        title="Marka"
        items={(taxonomy.brands ?? []).map((brand) => ({ value: brand.slug, label: brand.name }))}
        selected={selected(FILTER_KEYS.brand)}
        onToggle={(value) => toggle(FILTER_KEYS.brand, value)}
      />

      <CheckList
        title="Bitki"
        items={(taxonomy.plants ?? []).map((plant) => ({ value: plant.slug, label: plant.name }))}
        selected={selected(FILTER_KEYS.plant)}
        onToggle={(value) => toggle(FILTER_KEYS.plant, value)}
      />

      <CheckList
        title="Toprak Türü"
        items={(taxonomy.soilTypes ?? []).map((soil) => ({ value: soil.slug, label: soil.name }))}
        selected={selected(FILTER_KEYS.soilType)}
        onToggle={(value) => toggle(FILTER_KEYS.soilType, value)}
      />

      <CheckList
        title="Birim"
        items={(taxonomy.unitTypes ?? []).map((unit) => ({ value: unit.code, label: unit.name }))}
        selected={selected(FILTER_KEYS.unit)}
        onToggle={(value) => toggle(FILTER_KEYS.unit, value)}
      />

      <PriceFilter
        min={searchParams.get(FILTER_KEYS.minPrice) ?? ''}
        max={searchParams.get(FILTER_KEYS.maxPrice) ?? ''}
        onApply={(min, max) => {
          const next = withParam(
            withParam(searchParams, FILTER_KEYS.minPrice, min === '' ? undefined : min),
            FILTER_KEYS.maxPrice,
            max === '' ? undefined : max,
          );
          const query = next.toString();

          router.push(query === '' ? '/urunler' : `/urunler?${query}`);
        }}
      />

      <label className="flex cursor-pointer items-center gap-2 text-sm text-on-surface">
        <input
          type="checkbox"
          checked={searchParams.get(FILTER_KEYS.inStock) === '1'}
          onChange={(event) => apply(FILTER_KEYS.inStock, event.target.checked ? '1' : undefined)}
          className="size-4 rounded border-outline-variant text-primary accent-primary"
        />
        Yalnız stokta olanlar
      </label>
    </div>
  );
}

/** Kategori filtresi — tek seçim, alt kategoriler girintili. */
function CategoryFilter({
  categories,
  active,
  onSelect,
}: {
  categories: CategoryNode[];
  active: string | null;
  onSelect: (slug: string | undefined) => void;
}) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <section>
      <h3 className="text-label-md text-on-surface">Kategori</h3>

      <ul className="mt-2 flex flex-col gap-1">
        <li>
          <button
            type="button"
            onClick={() => onSelect(undefined)}
            className={cn(
              'w-full rounded-[8px] px-2 py-1.5 text-left text-sm transition-colors',
              active === null
                ? 'bg-secondary-container text-on-primary-fixed-variant'
                : 'text-on-surface-variant hover:bg-surface-container-high',
            )}
          >
            Tümü
          </button>
        </li>

        {categories.map((category) => (
          <li key={category.id}>
            <button
              type="button"
              onClick={() => onSelect(category.slug)}
              className={cn(
                'w-full rounded-[8px] px-2 py-1.5 text-left text-sm transition-colors',
                active === category.slug
                  ? 'bg-secondary-container text-on-primary-fixed-variant'
                  : 'text-on-surface-variant hover:bg-surface-container-high',
              )}
            >
              {category.name}
            </button>

            {category.children.length > 0 ? (
              <ul className="ml-3 flex flex-col gap-0.5 border-l border-outline-variant pl-2">
                {category.children.map((child) => (
                  <li key={child.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(child.slug)}
                      className={cn(
                        'w-full rounded-[8px] px-2 py-1 text-left text-sm transition-colors',
                        active === child.slug
                          ? 'bg-secondary-container text-on-primary-fixed-variant'
                          : 'text-on-surface-variant hover:bg-surface-container-high',
                      )}
                    >
                      {child.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Çoklu seçim listesi. Uzun listelerde ilk 8 gösterilir, gerisi açılır. */
function CheckList({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) {
    return null;
  }

  const visible = expanded ? items : items.slice(0, 8);

  return (
    <section>
      <h3 className="text-label-md text-on-surface">{title}</h3>

      <ul className="mt-2 flex flex-col gap-1.5">
        {visible.map((item) => (
          <li key={item.value}>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface">
              <input
                type="checkbox"
                checked={selected.includes(item.value)}
                onChange={() => onToggle(item.value)}
                className="size-4 rounded border-outline-variant accent-primary"
              />
              {item.label}
            </label>
          </li>
        ))}
      </ul>

      {items.length > 8 ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 text-label-sm uppercase text-primary-container transition-colors hover:text-primary hover:underline"
        >
          {expanded ? 'Daha az göster' : `+${items.length - 8} tane daha`}
        </button>
      ) : null}
    </section>
  );
}

/** Fiyat aralığı — uygula düğmesiyle, her tuşta istek atmamak için. */
function PriceFilter({
  min,
  max,
  onApply,
}: {
  min: string;
  max: string;
  onApply: (min: string, max: string) => void;
}) {
  const [localMin, setLocalMin] = useState(min);
  const [localMax, setLocalMax] = useState(max);

  return (
    <section>
      <h3 className="text-label-md text-on-surface">Fiyat Aralığı (₺)</h3>

      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min="0"
          inputMode="decimal"
          value={localMin}
          onChange={(event) => setLocalMin(event.target.value)}
          placeholder="En az"
          aria-label="En düşük fiyat"
          className="w-full rounded-[8px] border border-outline-variant bg-surface-container-lowest px-2 py-1.5 font-financial text-sm outline-none focus:border-primary-container"
        />
        <span className="text-outline">–</span>
        <input
          type="number"
          min="0"
          inputMode="decimal"
          value={localMax}
          onChange={(event) => setLocalMax(event.target.value)}
          placeholder="En çok"
          aria-label="En yüksek fiyat"
          className="w-full rounded-[8px] border border-outline-variant bg-surface-container-lowest px-2 py-1.5 font-financial text-sm outline-none focus:border-primary-container"
        />
      </div>

      <Button
        variant="outline"
        size="sm"
        className="mt-2 w-full"
        onClick={() => onApply(localMin, localMax)}
      >
        Uygula
      </Button>
    </section>
  );
}

/**
 * Mobil filtre çekmecesi (gereksinim 5).
 *
 * Masaüstündeki yan panelin aynısını alttan açılan bir katmanda gösterir;
 * filtre gövdesi tek yerde tanımlı olduğu için iki görünüm ayrışamaz.
 */
export function FilterDrawer({ taxonomy, total }: { taxonomy: Taxonomy; total: number }) {
  const [isOpen, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="lg:hidden">
        <SlidersHorizontal />
        Filtrele
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
          <button
            type="button"
            aria-label="Filtreleri kapat"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-scrim/50"
          />

          <div className="relative flex max-h-[85vh] flex-col rounded-t-[16px] bg-surface">
            <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
              <span className="text-label-md text-on-surface">Filtrele</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-9 items-center justify-center rounded-[10px] text-on-surface-variant hover:bg-surface-container-high"
                aria-label="Kapat"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <FilterPanel taxonomy={taxonomy} />
            </div>

            <div className="border-t border-outline-variant p-4">
              <Button className="w-full" onClick={() => setOpen(false)}>
                {total} ürünü göster
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
