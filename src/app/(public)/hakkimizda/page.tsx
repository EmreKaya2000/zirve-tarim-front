import type { Metadata } from 'next';

import { StaticPage, TextList, TextSection } from '@/components/public/static-page';
import { getStoreInfo } from '@/lib/store-settings';

export const metadata: Metadata = {
  title: 'Hakkımızda',
  description: 'Zirve Tarım — zirai ilaç, gübre, tohum ve sulama ekipmanları mağazası.',
  alternates: { canonical: '/hakkimizda' },
};

export default async function AboutPage() {
  const store = await getStoreInfo();

  return (
    <StaticPage
      title="Hakkımızda"
      breadcrumbLabel="Hakkımızda"
      description="Çiftçinin yanında, doğru ürün ve doğru bilgiyle."
      needsLegalReview
    >
      <TextSection title="Biz kimiz?">
        <p>
          {store.name ?? 'Zirve Tarım'}, bölgedeki üreticilere zirai ilaç, gübre, tohum ve sulama
          ekipmanları tedarik eden bir tarım ürünleri mağazasıdır. Amacımız yalnız ürün satmak
          değil; toprağınıza ve ürününüze uygun olanı birlikte belirlemek.
        </p>
      </TextSection>

      <TextSection title="Nasıl çalışıyoruz?">
        <p>
          Bu site bir kataloğdur. Ürünleri inceleyip talebinizi bize iletirsiniz; sizi arayıp
          ihtiyacınızı netleştirir, fiyat ve teslimatı mağazada tamamlarız.
        </p>
        <TextList
          items={[
            'Site üzerinden online satış ve ödeme yapılmaz.',
            'Talep göndermek stok rezervasyonu veya fiyat garantisi anlamına gelmez.',
            'Ürünler mağazamızdan teslim alınır.',
          ]}
        />
      </TextSection>

      <TextSection title="Neden bize danışmalısınız?">
        <TextList
          items={[
            'Zirai ilaçlarda doğru doz ve doğru dönem, üründen daha önemlidir.',
            'Birlikte kullanılmaması gereken ürünleri katalogda açıkça işaretliyoruz.',
            'Toprak yapınıza ve yetiştirdiğiniz bitkiye göre öneri sunuyoruz.',
          ]}
        />
      </TextSection>

      {store.address !== null || store.workingHours !== null ? (
        <TextSection title="Mağazamız">
          {store.address !== null ? <p>{store.address}</p> : null}
          {store.workingHours !== null ? <p>{store.workingHours}</p> : null}
        </TextSection>
      ) : null}
    </StaticPage>
  );
}
