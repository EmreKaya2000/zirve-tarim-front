import { notFound } from 'next/navigation';

import { resolveApiBaseUrl } from './env';
import type {
  BrandRef,
  CategoryDetail,
  CategoryNode,
  Paginated,
  PlantRef,
  PublicProductDetail,
  PublicProductListItem,
  PublicSetting,
  RelatedProduct,
  Taxonomy,
} from './public-types';

/**
 * Public katalog veri katmanı — SUNUCU BİLEŞENLERİ İÇİN.
 *
 * NEDEN axios istemcisi (lib/api-client.ts) KULLANILMIYOR:
 * o istemci tarayıcı için yazıldı — oturum deposu okur, 401'de token
 * yeniler, interceptor zinciri çalıştırır. Sunucu bileşeninde ne oturum
 * vardır ne de Next'in önbelleğini kullanabilir. Burada sade `fetch`
 * kullanılır; `next.revalidate` ile ISR devreye girer.
 *
 * Yanıt zarfı ({ success, data, meta }) TEK YERDE burada açılır.
 */

/** Yeniden doğrulama süreleri (saniye). */
export const REVALIDATE = {
  /** Ürün listesi ve detayı — fiyat/stok değişebilir. */
  product: 300,
  /** Taksonomi ve ayarlar — nadiren değişir. */
  taxonomy: 600,
  /** Site haritası. */
  sitemap: 3600,
} as const;

interface FetchOptions {
  revalidate: number;
  /** Kayıt yoksa 404 sayfası göster. Aksi hâlde hata fırlatılır. */
  notFoundOn404?: boolean;
  tags?: string[];
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: { page: number; limit: number; total: number; totalPages: number };
  error?: { code: string; message: string };
}

async function request<T>(path: string, options: FetchOptions): Promise<ApiEnvelope<T>> {
  const url = `${resolveApiBaseUrl()}${path}`;

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: options.revalidate, ...(options.tags && { tags: options.tags }) },
  });

  if (response.status === 404 && options.notFoundOn404 === true) {
    notFound();
  }

  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || body === null || body.success !== true) {
    // Hata mesajı sunucudan geldiği gibi taşınır; sayfa error.tsx ile yakalar.
    throw new Error(body?.error?.message ?? `API isteği başarısız: ${path} (${response.status})`);
  }

  return body;
}

/** Sorgu dizesini kurar; tanımsız ve boş değerler atlanır. */
export function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }

  const query = search.toString();

  return query === '' ? '' : `?${query}`;
}

// =============================================================================
// ÜRÜNLER
// =============================================================================

export interface ProductQuery {
  /** `buildQuery` düz bir kayıt beklediği için indeks imzası şart. */
  [key: string]: string | number | boolean | undefined;
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  brand?: string;
  plant?: string;
  soilType?: string;
  unit?: string;
  inStock?: boolean;
  minPrice?: string;
  maxPrice?: string;
  featured?: boolean;
  sort?: string;
}

export async function getProducts(query: ProductQuery): Promise<Paginated<PublicProductListItem>> {
  const body = await request<PublicProductListItem[]>(`/public/products${buildQuery(query)}`, {
    revalidate: REVALIDATE.product,
  });

  return {
    items: body.data,
    meta: body.meta ?? { page: 1, limit: body.data.length, total: body.data.length, totalPages: 1 },
  };
}

export async function getProduct(slug: string): Promise<PublicProductDetail> {
  const body = await request<PublicProductDetail>(`/public/products/${encodeURIComponent(slug)}`, {
    revalidate: REVALIDATE.product,
    notFoundOn404: true,
  });

  return body.data;
}

export async function getRelatedProducts(slug: string): Promise<RelatedProduct[]> {
  try {
    const body = await request<RelatedProduct[]>(
      `/public/products/${encodeURIComponent(slug)}/related`,
      { revalidate: REVALIDATE.product },
    );

    return body.data;
  } catch {
    // İlişkili ürünler ikincil içeriktir: alınamazsa ürün sayfası yine açılmalı.
    return [];
  }
}

// =============================================================================
// TAKSONOMİ
// =============================================================================

export async function getCategoryTree(): Promise<CategoryNode[]> {
  const body = await request<CategoryNode[]>('/public/categories/tree', {
    revalidate: REVALIDATE.taxonomy,
  });

  return body.data;
}

export async function getCategory(slug: string): Promise<CategoryDetail> {
  const body = await request<CategoryDetail>(`/public/categories/${encodeURIComponent(slug)}`, {
    revalidate: REVALIDATE.taxonomy,
    notFoundOn404: true,
  });

  return body.data;
}

export async function getBrands(): Promise<BrandRef[]> {
  const body = await request<BrandRef[]>('/public/brands', { revalidate: REVALIDATE.taxonomy });

  return body.data;
}

export async function getBrand(slug: string): Promise<BrandRef & { description?: string | null }> {
  const body = await request<BrandRef & { description?: string | null }>(
    `/public/brands/${encodeURIComponent(slug)}`,
    { revalidate: REVALIDATE.taxonomy, notFoundOn404: true },
  );

  return body.data;
}

export async function getPlants(): Promise<PlantRef[]> {
  const body = await request<PlantRef[]>('/public/plants', { revalidate: REVALIDATE.taxonomy });

  return body.data;
}

export async function getPlant(slug: string): Promise<PlantRef> {
  const body = await request<PlantRef>(`/public/plants/${encodeURIComponent(slug)}`, {
    revalidate: REVALIDATE.taxonomy,
    notFoundOn404: true,
  });

  return body.data;
}

export async function getTaxonomy(include?: string[]): Promise<Taxonomy> {
  const query = include === undefined ? '' : buildQuery({ include: include.join(',') });
  const body = await request<Taxonomy>(`/public/taxonomy${query}`, {
    revalidate: REVALIDATE.taxonomy,
  });

  return body.data;
}

// =============================================================================
// AYARLAR
// =============================================================================

export async function getPublicSettings(): Promise<PublicSetting[]> {
  try {
    const body = await request<PublicSetting[]>('/public/settings', {
      revalidate: REVALIDATE.taxonomy,
    });

    return body.data;
  } catch {
    // Ayarlar alınamazsa site yine açılmalı: iletişim bloğu boş görünür,
    // tüm sayfa hata vermez. Mağaza bilgisi kritik ama sayfa kadar değil.
    return [];
  }
}
