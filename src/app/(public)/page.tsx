import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  Clock,
  Leaf,
  MapPin,
  MessageCircle,
  PackageSearch,
  Phone,
  ShieldCheck,
  Sprout,
} from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@zirve/ui';

import { ProductGrid } from '@/components/public/product-card';
import { EmptyState } from '@/components/public/states';
import { getProducts, getTaxonomy } from '@/lib/public-api';
import { getStoreInfo, telUrl, whatsappUrl } from '@/lib/store-settings';
import type { PublicProductListItem } from '@/lib/public-types';

/** Raflarda gösterilecek ürün sayısı. */
const SHELF_SIZE = 8;

export default async function HomePage() {
  // Tüm veri tek turda çekilir; sıralı beklemek ilk boyamayı geciktirirdi.
  const [taxonomy, featured, newest, store] = await Promise.all([
    getTaxonomy(['categories', 'brands', 'plants']),
    getProducts({ limit: SHELF_SIZE, sort: 'featured', featured: true }),
    getProducts({ limit: SHELF_SIZE, sort: 'newest' }),
    getStoreInfo(),
  ]);

  const categories = taxonomy.categories ?? [];
  const brands = taxonomy.brands ?? [];
  const plants = taxonomy.plants ?? [];

  // Popüler ürünler ayrı bir filtre gerektirmiyor: "yeniler" listesinden
  // işaretli olanlar süzülür, böylece fazladan istek atılmaz.
  const popular = newest.items.filter((product) => product.isPopular);

  const tel = telUrl(store.phone);
  const whatsapp = whatsappUrl(
    store.whatsapp,
    'Merhaba, ürünleriniz hakkında bilgi almak istiyorum.',
  );

  return (
    <>
      <section className="border-b border-outline-variant bg-primary text-on-primary">
        <div className="mx-auto max-w-[1440px] px-4 py-16 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-container px-3 py-1 text-label-sm uppercase">
              <Leaf className="size-3.5" aria-hidden="true" />
              Ziraat ve Tarım Ürünleri
            </span>

            <h1 className="mt-6 text-h1">Tarlanıza değer katan ürünler</h1>

            <p className="mt-4 text-body-lg opacity-85">
              Zirai ilaç, gübre, tohum ve sulama ekipmanlarını inceleyin, ihtiyacınızı listeye
              ekleyin ve talebinizi mağazamıza iletin. Fiyat ve teslimat mağazada netleşir.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="secondary" size="lg">
                <Link href="/urunler">
                  Ürünleri İncele
                  <ArrowRight />
                </Link>
              </Button>

              {tel !== null ? (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-on-primary/30 text-on-primary"
                >
                  <a href={tel}>
                    <Phone />
                    {store.phone}
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1440px] flex-col gap-14 px-4 py-12 lg:px-8 lg:py-16">
        {categories.length > 0 ? (
          <section>
            <SectionHeader title="Kategoriler" href="/kategoriler" />

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {categories.slice(0, 8).map((category) => (
                <Link
                  key={category.id}
                  href={`/kategori/${category.slug}`}
                  className="group flex flex-col gap-2 rounded-[12px] border border-outline-variant bg-surface-container-lowest p-5 transition-shadow hover:shadow-md"
                >
                  <span className="flex size-10 items-center justify-center rounded-[10px] bg-secondary-container text-on-primary-fixed-variant">
                    <Sprout className="size-5" aria-hidden="true" />
                  </span>

                  <span className="text-label-md text-on-surface group-hover:text-primary-container">
                    {category.name}
                  </span>

                  {category.children.length > 0 ? (
                    <span className="text-sm text-on-surface-variant">
                      {category.children.length} alt kategori
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <Shelf
          title="Öne Çıkan Ürünler"
          products={featured.items}
          href="/urunler?sort=featured"
          emptyText="Henüz öne çıkan ürün işaretlenmemiş."
        />

        <Shelf
          title="Yeni Gelenler"
          products={newest.items}
          href="/urunler?sort=newest"
          emptyText="Henüz ürün eklenmemiş."
        />

        {popular.length > 0 ? (
          <Shelf
            title="Popüler Ürünler"
            products={popular}
            href="/urunler"
            emptyText="Popüler ürün bulunmuyor."
          />
        ) : null}

        {brands.length > 0 ? (
          <section>
            <SectionHeader title="Markalar" href="/markalar" />

            <div className="mt-5 flex flex-wrap gap-3">
              {brands.slice(0, 12).map((brand) => (
                <Link
                  key={brand.id}
                  href={`/marka/${brand.slug}`}
                  className="flex items-center gap-3 rounded-[10px] border border-outline-variant bg-surface-container-lowest px-4 py-3 text-label-md text-on-surface transition-colors hover:border-primary-container hover:text-primary-container"
                >
                  {brand.logoUrl !== null && brand.logoUrl !== undefined ? (
                    <Image
                      src={brand.logoUrl}
                      alt=""
                      width={24}
                      height={24}
                      className="size-6 object-contain"
                    />
                  ) : null}
                  {brand.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {plants.length > 0 ? (
          <section>
            <SectionHeader title="Bitkinize Göre Ürünler" href="/bitkiler" />

            <div className="mt-5 flex flex-wrap gap-2">
              {plants.map((plant) => (
                <Link
                  key={plant.id}
                  href={`/bitki/${plant.slug}`}
                  className="rounded-full border border-outline-variant px-4 py-2 text-sm text-on-surface-variant transition-colors hover:border-primary-container hover:text-primary-container"
                >
                  {plant.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* Ç-01: talep ile satışın farkı burada açıkça anlatılır. */}
        <section>
          <h2 className="text-h2 text-on-surface">Nasıl çalışır?</h2>
          <p className="mt-2 max-w-2xl text-on-surface-variant">
            Bu site üzerinden <strong>online satış ve ödeme yapılmaz.</strong> Sepetiniz, mağazaya
            ilettiğiniz bir talep listesidir.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <StepCard
              step="1"
              icon={<PackageSearch className="size-5" />}
              title="Ürünleri seçin"
              description="Kategori, marka veya etken maddeye göre filtreleyerek ihtiyacınızı bulun."
            />
            <StepCard
              step="2"
              icon={<Sprout className="size-5" />}
              title="Talebinizi gönderin"
              description="İletişim bilgilerinizi bırakın. Stok rezerve edilmez, fiyat garantisi verilmez."
            />
            <StepCard
              step="3"
              icon={<ShieldCheck className="size-5" />}
              title="Mağazada tamamlayın"
              description="Sizi arayıp fiyatı netleştirelim; teslimat ve ödeme mağazada yapılır."
            />
          </div>
        </section>

        <section className="rounded-[16px] bg-surface-container-low p-6 lg:p-10">
          <h2 className="text-h2 text-on-surface">Mağazamıza Gelin</h2>
          <p className="mt-2 max-w-2xl text-body-lg text-on-surface-variant">
            Ürünleri yerinde görmek, uzmanımıza danışmak ve talebinizi teslim almak için mağazamıza
            bekliyoruz.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {store.address !== null ? (
              <InfoTile icon={<MapPin />} label="Adres" value={store.address} href={store.mapUrl} />
            ) : null}

            {store.phone !== null ? (
              <InfoTile icon={<Phone />} label="Telefon" value={store.phone} href={tel} />
            ) : null}

            {whatsapp !== null ? (
              <InfoTile
                icon={<MessageCircle />}
                label="WhatsApp"
                value="Mesaj gönderin"
                href={whatsapp}
              />
            ) : null}

            {store.workingHours !== null ? (
              <InfoTile icon={<Clock />} label="Çalışma Saatleri" value={store.workingHours} />
            ) : null}
          </div>
        </section>
      </div>
    </>
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="text-h2 text-on-surface">{title}</h2>

      <Link
        href={href}
        className="shrink-0 text-label-sm uppercase text-primary-container hover:underline"
      >
        Tümü
      </Link>
    </div>
  );
}

function Shelf({
  title,
  products,
  href,
  emptyText,
}: {
  title: string;
  products: PublicProductListItem[];
  href: string;
  emptyText: string;
}) {
  return (
    <section>
      <SectionHeader title={title} href={href} />

      <div className="mt-5">
        {products.length === 0 ? (
          <EmptyState title={emptyText} />
        ) : (
          <ProductGrid products={products} priorityCount={0} />
        )}
      </div>
    </section>
  );
}

function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card interactive>
      <CardHeader>
        <div className="mb-2 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-[8px] bg-secondary-container text-on-primary-fixed-variant">
            {icon}
          </span>
          <span className="font-financial text-label-sm text-outline">ADIM {step}</span>
        </div>
        <CardTitle className="text-body-lg font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  );
}

function InfoTile({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href?: string | null;
}) {
  const body = (
    <>
      <span className="flex size-9 items-center justify-center rounded-[10px] bg-secondary-container text-on-primary-fixed-variant [&_svg]:size-4">
        {icon}
      </span>
      <span className="mt-3 block text-label-sm uppercase text-on-surface-variant">{label}</span>
      <span className="mt-1 block text-sm text-on-surface">{value}</span>
    </>
  );

  const className =
    'rounded-[12px] border border-outline-variant bg-surface-container-lowest p-4 transition-colors';

  if (href === null || href === undefined) {
    return <div className={className}>{body}</div>;
  }

  const isExternal = href.startsWith('http');

  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className={`${className} hover:border-primary-container`}
    >
      {body}
    </a>
  );
}
