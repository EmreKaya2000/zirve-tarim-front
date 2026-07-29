import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/env';
import { getBrands, getCategoryTree, getPlants, getProducts } from '@/lib/public-api';
import type { CategoryNode } from '@/lib/public-types';

/**
 * Site haritası istek anında üretilir.
 *
 * Derleme anında üretilseydi API erişilemediği için yalnız statik yollarla
 * dolar ve TEK BİR ürün içermeyen bir harita yayımlanırdı. Veri yine
 * `fetch` önbelleğinden gelir (lib/public-api.ts REVALIDATE), her istekte
 * veritabanına gidilmez.
 *
 * NOT: `export const revalidate` burada KULLANILAMAZ — Next bu alanı
 * derleme anında statik olarak okur ve yalnız sayı sabiti kabul eder;
 * `REVALIDATE.sitemap` gibi bir referans "Unsupported node type" verir.
 */
export const dynamic = 'force-dynamic';

/**
 * Haritaya girecek en fazla ürün.
 *
 * Katalog bu sınırı aşarsa harita eksik kalır; o noktada sayfalanmış
 * harita (`/sitemap/[id].xml`) gerekir. Aşım SESSİZ KALMAZ, loglanır.
 */
const MAX_PRODUCTS = 5000;

/**
 * Sayfa başına ürün.
 *
 * API'nin `limit` üst sınırı 100'dür (packages/types MAX_LIMIT); daha
 * büyük bir değer 400 döner. Bu tek satır bir kez atlandığında harita
 * TEK BİR ürün içermeden yayımlanmıştı — istek hata veriyordu ama
 * aşağıdaki `catch` onu yutuyordu.
 */
const PAGE_SIZE = 100;

/** Ürünleri sayfa sayfa çeker. */
async function fetchAllProducts(): Promise<{ slug: string; createdAt: string }[]> {
  const collected: { slug: string; createdAt: string }[] = [];
  let page = 1;

  while (collected.length < MAX_PRODUCTS) {
    const result = await getProducts({ page, limit: PAGE_SIZE, sort: 'newest' });

    collected.push(...result.items.map((item) => ({ slug: item.slug, createdAt: item.createdAt })));

    if (page >= result.meta.totalPages) {
      return collected;
    }

    if (collected.length >= MAX_PRODUCTS) {
      console.warn(
        `Site haritası ${MAX_PRODUCTS} ürünle sınırlandı; katalogda ${result.meta.total} ürün var. ` +
          'Sayfalanmış site haritasına geçilmelidir.',
      );

      return collected.slice(0, MAX_PRODUCTS);
    }

    page += 1;
  }

  return collected;
}

const STATIC_ROUTES: {
  path: string;
  priority: number;
  changeFrequency: 'daily' | 'weekly' | 'monthly';
}[] = [
  { path: '', priority: 1, changeFrequency: 'daily' },
  { path: '/urunler', priority: 0.9, changeFrequency: 'daily' },
  { path: '/kategoriler', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/markalar', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/bitkiler', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/hakkimizda', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/iletisim', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/kvkk', priority: 0.2, changeFrequency: 'monthly' },
  { path: '/gizlilik', priority: 0.2, changeFrequency: 'monthly' },
  { path: '/kullanim-kosullari', priority: 0.2, changeFrequency: 'monthly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Katalog verisi alınamazsa harita BOŞ DÖNMEZ: statik sayfalar yine
  // yayımlanır. Boş bir sitemap, arama motoruna "sitede hiçbir şey yok"
  // sinyali gönderirdi.
  //
  // Hata YUTULMAZ, loglanır: sessiz bir catch yüzünden harita bir kez
  // ürünsüz yayımlandı ve bunu ancak test yakaladı.
  const [products, categories, brands, plants] = await Promise.all([
    fetchAllProducts().catch((error: unknown) => {
      console.error('Site haritası: ürünler alınamadı.', error);

      return [];
    }),
    getCategoryTree().catch((error: unknown) => {
      console.error('Site haritası: kategoriler alınamadı.', error);

      return [];
    }),
    getBrands().catch((error: unknown) => {
      console.error('Site haritası: markalar alınamadı.', error);

      return [];
    }),
    getPlants().catch((error: unknown) => {
      console.error('Site haritası: bitkiler alınamadı.', error);

      return [];
    }),
  ]);

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  for (const product of products) {
    entries.push({
      url: `${SITE_URL}/urunler/${product.slug}`,
      lastModified: new Date(product.createdAt),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  for (const category of flatten(categories)) {
    entries.push({
      url: `${SITE_URL}/kategori/${category.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  }

  for (const brand of brands) {
    entries.push({
      url: `${SITE_URL}/marka/${brand.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.5,
    });
  }

  for (const plant of plants) {
    entries.push({
      url: `${SITE_URL}/bitki/${plant.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.5,
    });
  }

  return entries;
}

function flatten(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}
