import Link from 'next/link';
import type { Metadata } from 'next';
import { FlaskConical, Layers, Warehouse } from 'lucide-react';
import { Badge } from '@zirve/ui';

import { PriceDisplay } from '@/components/public/price-display';
import { ProductCard } from '@/components/public/product-card';
import { ProductGallery } from '@/components/public/product-gallery';
import {
  BenefitList,
  Breadcrumbs,
  LegalWarning,
  ProseBlock,
  Section,
  SideEffectList,
  TagList,
} from '@/components/public/product-info';
import { VariantSelector } from '@/components/public/variant-selector';
import { SITE_URL } from '@/lib/env';
import { getProduct, getRelatedProducts } from '@/lib/public-api';
import { priceRange } from '@/lib/product-filters';
import { getStoreInfo } from '@/lib/store-settings';
import type { ProductRelationType, PublicProductDetail } from '@/lib/public-types';

interface PageProps {
  // Next 15: params bir Promise'tir.
  params: Promise<{ slug: string }>;
}

/*
 * DİKKAT — bu segmentte `loading.tsx` YOKTUR ve olmamalıdır.
 *
 * Rota düzeyindeki `loading.tsx` bir Suspense sınırı kurar; Next kabuğu
 * HTTP 200 ile hemen akıtır. Sayfa sonradan `notFound()` çağırdığında
 * başlıklar gönderilmiş olduğu için durum kodu artık DEĞİŞTİRİLEMEZ:
 * pasif veya silinmiş bir ürün 404 yerine 200 döner ve arama motoru
 * yayında olmayan bir ürünü indeksler. Ürün varlığı akıştan ÖNCE
 * doğrulanır.
 */

/**
 * Ürün detay sayfası SEO üstverisi.
 *
 * `metaTitle`/`metaDesc` yönetici tarafından girilebiliyor; girilmişse
 * onlar kullanılır, yoksa ürün adı ve kısa açıklamadan türetilir.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  const title = product.metaTitle ?? product.name;
  const description =
    product.metaDesc ??
    product.shortDescription ??
    `${product.name} ürün bilgileri, kullanım şekli ve uyarıları.`;

  const image = product.images[0];

  return {
    title,
    description,
    alternates: { canonical: `/urunler/${product.slug}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${SITE_URL}/urunler/${product.slug}`,
      ...(image !== undefined && {
        images: [{ url: image.url, alt: image.altText ?? product.name }],
      }),
    },
  };
}

const RELATION_LABELS: Record<ProductRelationType, string> = {
  COMPATIBLE: 'Birlikte kullanılabilir',
  INCOMPATIBLE: 'Birlikte kullanılmamalı',
  SIMILAR: 'Benzer ürünler',
  ALTERNATIVE: 'Alternatif ürünler',
  COMPLEMENTARY: 'Tamamlayıcı ürünler',
  RECOMMENDED_TOGETHER: 'Birlikte önerilenler',
};

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const [product, related, store] = await Promise.all([
    getProduct(slug),
    getRelatedProducts(slug),
    getStoreInfo(),
  ]);

  const primaryCategory =
    product.categories.find((entry) => entry.isPrimary)?.category ??
    product.categories[0]?.category;

  // Uyumsuzluk uyarıları en üstte gösterilir: çiftçi güvenliği için kritik.
  const incompatible = related.filter((entry) => entry.type === 'INCOMPATIBLE');
  const otherRelations = related.filter((entry) => entry.type !== 'INCOMPATIBLE');

  const grouped = new Map<ProductRelationType, typeof otherRelations>();
  for (const entry of otherRelations) {
    grouped.set(entry.type, [...(grouped.get(entry.type) ?? []), entry]);
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 lg:px-8">
      <Breadcrumbs
        items={[
          { label: 'Ana Sayfa', href: '/' },
          { label: 'Ürünler', href: '/urunler' },
          ...(primaryCategory === undefined
            ? []
            : [{ label: primaryCategory.name, href: `/kategori/${primaryCategory.slug}` }]),
          { label: product.name },
        ]}
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={product.images} productName={product.name} />

        <div className="flex flex-col gap-5">
          <div>
            {product.brand !== null ? (
              <Link
                href={`/marka/${product.brand.slug}`}
                className="text-label-sm uppercase text-primary-container hover:underline"
              >
                {product.brand.name}
              </Link>
            ) : null}

            <h1 className="mt-1 text-h1 text-on-surface">{product.name}</h1>

            <div className="mt-2 flex flex-wrap gap-2">
              {product.isNew ? <Badge variant="info">Yeni</Badge> : null}
              {product.isFeatured ? <Badge variant="primary">Öne çıkan</Badge> : null}
              {product.isPopular ? <Badge variant="success">Popüler</Badge> : null}
            </div>
          </div>

          {product.shortDescription !== null ? (
            <p className="text-body-lg text-on-surface-variant">{product.shortDescription}</p>
          ) : null}

          <PriceDisplay product={product} size="lg" />

          <VariantSelector
            productSlug={product.slug}
            productName={product.name}
            imageUrl={product.images[0]?.url ?? null}
            variants={product.variants}
            showPrice={product.showPrice}
          />

          {product.licenseNumber !== null ? (
            <p className="text-sm text-on-surface-variant">
              Ruhsat No: <span className="font-financial">{product.licenseNumber}</span>
            </p>
          ) : null}
        </div>
      </div>

      {/* Uyumsuzluk uyarısı: ürün bilgilerinden ÖNCE gösterilir. */}
      {incompatible.length > 0 ? (
        <div className="mt-10 rounded-[12px] border border-error/30 bg-error-container/40 p-5">
          <h2 className="text-label-md uppercase text-error">Birlikte kullanılmamalı</h2>

          <ul className="mt-3 flex flex-col gap-2">
            {incompatible.map((entry) => (
              <li key={entry.product.id} className="text-sm text-on-surface">
                <Link href={`/urunler/${entry.product.slug}`} className="underline">
                  {entry.product.name}
                </Link>
                {entry.note !== null ? (
                  <span className="text-on-surface-variant"> — {entry.note}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-12 grid gap-10 lg:grid-cols-3 lg:gap-12">
        <div className="flex flex-col gap-8 lg:col-span-2">
          {product.description !== null ? (
            <Section title="Ürün Açıklaması" className="border-t-0 pt-0">
              <ProseBlock text={product.description} />
            </Section>
          ) : null}

          {product.usageInstructions !== null ? (
            <Section title="Kullanım Şekli">
              <ProseBlock text={product.usageInstructions} />
            </Section>
          ) : null}

          {product.benefits.length > 0 ? (
            <Section title="Yararları">
              <BenefitList benefits={product.benefits} />
            </Section>
          ) : null}

          {product.sideEffects.length > 0 ? (
            <Section title="Yan Etkiler ve Uyarılar">
              <SideEffectList sideEffects={product.sideEffects} />
            </Section>
          ) : null}

          {[...grouped.entries()].map(([type, entries]) => (
            <Section key={type} title={RELATION_LABELS[type]}>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                {entries.map((entry) => (
                  <ProductCard key={entry.product.id} product={entry.product} />
                ))}
              </div>
            </Section>
          ))}
        </div>

        <aside className="flex flex-col gap-6">
          {product.plants.length > 0 ? (
            <SidePanel title="Uygun Bitkiler" icon={<FlaskConical className="size-4" />}>
              <TagList
                items={product.plants.map((entry) => ({
                  id: entry.plant.id,
                  name: entry.plant.name,
                  href: `/bitki/${entry.plant.slug}`,
                  note: entry.note,
                  hint: entry.plant.latinName,
                }))}
              />
            </SidePanel>
          ) : null}

          {product.soilTypes.length > 0 ? (
            <SidePanel title="Uygun Toprak Türleri" icon={<Layers className="size-4" />}>
              <TagList
                items={product.soilTypes.map((entry) => ({
                  id: entry.soilType.id,
                  name: entry.soilType.name,
                  note: entry.note,
                  hint: entry.soilType.phRange,
                }))}
              />
            </SidePanel>
          ) : null}

          {product.usagePeriods.length > 0 ? (
            <SidePanel title="Kullanım Dönemleri" icon={<Layers className="size-4" />}>
              <TagList
                items={product.usagePeriods.map((entry) => ({
                  id: entry.usagePeriod.id,
                  name: entry.usagePeriod.name,
                  note: entry.note,
                }))}
              />
            </SidePanel>
          ) : null}

          {product.ingredients !== null ? (
            <SidePanel title="İçerik / Etken Madde" icon={<FlaskConical className="size-4" />}>
              <p className="whitespace-pre-line text-sm text-on-surface-variant">
                {product.ingredients}
              </p>
            </SidePanel>
          ) : null}

          {product.storageConditions !== null ? (
            <SidePanel title="Saklama Koşulları" icon={<Warehouse className="size-4" />}>
              <p className="whitespace-pre-line text-sm text-on-surface-variant">
                {product.storageConditions}
              </p>
            </SidePanel>
          ) : null}

          <LegalWarning text={store.productWarning} />
        </aside>
      </div>

      <ProductJsonLd product={product} />
    </div>
  );
}

function SidePanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[12px] border border-outline-variant bg-surface-container-lowest p-4">
      <h2 className="flex items-center gap-2 text-label-md text-on-surface">
        <span className="text-on-surface-variant">{icon}</span>
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * Yapılandırılmış veri (schema.org/Product).
 *
 * `showPrice=false` olan üründe `offers` bloğu HİÇ YAZILMAZ: fiyatsız bir
 * teklif nesnesi Google tarafından geçersiz sayılır ve zengin sonuç
 * tamamen düşer. Fiyat gizliyken ürünü yapılandırılmış veriden çıkarmak
 * yerine teklifsiz tanımlamak doğru olandır.
 */
function ProductJsonLd({ product }: { product: PublicProductDetail }) {
  const range = priceRange(product);

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    url: `${SITE_URL}/urunler/${product.slug}`,
    ...(product.shortDescription !== null && { description: product.shortDescription }),
    ...(product.images.length > 0 && {
      image: product.images.map((image) => `${SITE_URL}${image.url}`),
    }),
    ...(product.brand !== null && { brand: { '@type': 'Brand', name: product.brand.name } }),
    ...(product.variants[0] !== undefined && { sku: product.variants[0].sku }),
  };

  if (!range.hidden && range.min !== null) {
    data.offers = {
      '@type': 'AggregateOffer',
      priceCurrency: 'TRY',
      lowPrice: range.min,
      highPrice: range.max ?? range.min,
      offerCount: product.variants.length,
      // Online satış yok: teklif "mağazadan teslim" olarak işaretlenir.
      availableDeliveryMethod: 'https://schema.org/OnSitePickup',
    };
  }

  return (
    <script
      type="application/ld+json"
      // Veri kendi sunucumuzdan gelir ve JSON.stringify ile kaçışlanır.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
