import type { ProductQuery } from './public-api';
import type { PublicProductListItem } from './public-types';

/**
 * Ürün listeleme filtrelerinin URL ile senkronu.
 *
 * FİLTRE DURUMU URL'DE TUTULUR — bileşen state'inde değil. Sebebi
 * gereksinim: "paylaşılabilir linkler". Ayrıca geri tuşu, sekme yenileme
 * ve arama motoru indekslemesi bedavaya doğru çalışır.
 */

/** Sayfa başına ürün. */
export const PAGE_SIZE = 12;

export const SORT_OPTIONS = [
  { value: 'newest', label: 'En yeniler' },
  { value: 'featured', label: 'Öne çıkanlar' },
  { value: 'name-asc', label: 'İsim (A-Z)' },
  { value: 'name-desc', label: 'İsim (Z-A)' },
  { value: 'price-asc', label: 'Fiyat (artan)' },
  { value: 'price-desc', label: 'Fiyat (azalan)' },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

export const DEFAULT_SORT: SortValue = 'newest';

/** Next'in `searchParams` gösterimi. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function single(params: RawSearchParams, key: string): string | undefined {
  const value = params[key];
  const raw = Array.isArray(value) ? value[0] : value;

  return raw === undefined || raw.trim() === '' ? undefined : raw.trim();
}

function positiveInt(params: RawSearchParams, key: string, fallback: number): number {
  const raw = single(params, key);
  const parsed = raw === undefined ? Number.NaN : Number.parseInt(raw, 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function isSort(value: string | undefined): value is SortValue {
  return SORT_OPTIONS.some((option) => option.value === value);
}

/**
 * URL parametrelerini API sorgusuna çevirir.
 *
 * GEÇERSİZ DEĞER SESSİZCE DÜŞÜRÜLÜR: elle düzenlenmiş bir adres
 * (`?sort=rastgele`) kullanıcıya hata sayfası değil, varsayılan sıralamayla
 * çalışan bir liste göstermelidir.
 */
export function parseProductQuery(params: RawSearchParams): ProductQuery {
  const sort = single(params, 'sort');

  return {
    page: positiveInt(params, 'page', 1),
    limit: PAGE_SIZE,
    search: single(params, 'q'),
    category: single(params, 'kategori'),
    brand: single(params, 'marka'),
    plant: single(params, 'bitki'),
    soilType: single(params, 'toprak'),
    unit: single(params, 'birim'),
    inStock: single(params, 'stokta') === '1' ? true : undefined,
    minPrice: numericOrUndefined(single(params, 'minFiyat')),
    maxPrice: numericOrUndefined(single(params, 'maxFiyat')),
    sort: isSort(sort) ? sort : DEFAULT_SORT,
  };
}

function numericOrUndefined(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  // API sayısal metin bekler; harf içeren değer 400 döndürürdü.
  return /^\d+([.,]\d+)?$/.test(value) ? value.replace(',', '.') : undefined;
}

/** URL'de görünen filtre anahtarları (Türkçe, kullanıcıya okunur). */
export const FILTER_KEYS = {
  search: 'q',
  category: 'kategori',
  brand: 'marka',
  plant: 'bitki',
  soilType: 'toprak',
  unit: 'birim',
  inStock: 'stokta',
  minPrice: 'minFiyat',
  maxPrice: 'maxFiyat',
  sort: 'sort',
  page: 'page',
} as const;

/**
 * Mevcut parametreleri koruyarak yenisini yazar.
 *
 * Filtre değişince `page` DAİMA sıfırlanır: 7. sayfadayken filtre daraltmak
 * çoğu zaman boş sayfa gösterirdi.
 */
export function withParam(
  current: URLSearchParams,
  key: string,
  value: string | undefined,
): URLSearchParams {
  const next = new URLSearchParams(current.toString());

  if (value === undefined || value === '') {
    next.delete(key);
  } else {
    next.set(key, value);
  }

  if (key !== FILTER_KEYS.page) {
    next.delete(FILTER_KEYS.page);
  }

  return next;
}

/** Virgülle ayrılmış çoklu değer listesinde bir öğeyi açar/kapatır. */
export function toggleInList(current: string | undefined, value: string): string | undefined {
  const items = splitList(current);
  const next = items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

  return next.length === 0 ? undefined : next.join(',');
}

/** Çoklu değer listesini diziye çevirir. */
export function splitList(value: string | undefined): string[] {
  return value === undefined || value === '' ? [] : value.split(',').filter((item) => item !== '');
}

/** Filtre uygulanmış mı? "Filtreleri temizle" düğmesini göstermek için. */
export function hasActiveFilters(params: RawSearchParams): boolean {
  const filtered: string[] = [
    FILTER_KEYS.search,
    FILTER_KEYS.category,
    FILTER_KEYS.brand,
    FILTER_KEYS.plant,
    FILTER_KEYS.soilType,
    FILTER_KEYS.unit,
    FILTER_KEYS.inStock,
    FILTER_KEYS.minPrice,
    FILTER_KEYS.maxPrice,
  ];

  return filtered.some((key) => single(params, key) !== undefined);
}

// =============================================================================
// FİYAT GÖSTERİMİ
// =============================================================================

/**
 * Bir ürünün gösterilecek fiyat aralığı.
 *
 * `showPrice=false` ise sunucu `salePrice` göndermez; bu durumda
 * `hidden: true` döner ve arayüz "Fiyat için mağazamıza danışın" yazar
 * (Sprint 5 gereksinimi 1). Fiyatı olmayan varyasyonlar atlanır.
 */
export interface PriceRange {
  hidden: boolean;
  min: string | null;
  max: string | null;
}

export function priceRange(product: PublicProductListItem): PriceRange {
  if (!product.showPrice) {
    return { hidden: true, min: null, max: null };
  }

  const prices = product.variants
    .map((variant) => variant.salePrice)
    .filter((price): price is string => price !== undefined && price !== null);

  if (prices.length === 0) {
    return { hidden: false, min: null, max: null };
  }

  // Karşılaştırma Number ile yapılır ama DÖNEN DEĞER orijinal string'dir:
  // ekrana yazılırken kuruş kaybı olmasın (§13.6).
  let min = prices[0] as string;
  let max = prices[0] as string;

  for (const price of prices) {
    if (Number(price) < Number(min)) {
      min = price;
    }

    if (Number(price) > Number(max)) {
      max = price;
    }
  }

  return { hidden: false, min, max };
}

/** Üründe stokta olan varyasyon var mı? */
export function isInStock(product: PublicProductListItem): boolean {
  return product.variants.some((variant) => Number(variant.stockQuantity) > 0);
}
