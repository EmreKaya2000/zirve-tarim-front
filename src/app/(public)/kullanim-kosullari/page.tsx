import type { Metadata } from 'next';

import { StaticPage, TextList, TextSection } from '@/components/public/static-page';

export const metadata: Metadata = {
  title: 'Kullanım Koşulları',
  description: 'Bu sitenin kullanımına ilişkin koşullar.',
  alternates: { canonical: '/kullanim-kosullari' },
};

export default function TermsPage() {
  return (
    <StaticPage
      title="Kullanım Koşulları"
      breadcrumbLabel="Kullanım Koşulları"
      description="Siteyi kullanarak aşağıdaki koşulları kabul etmiş sayılırsınız."
      needsLegalReview
    >
      <TextSection title="Sitenin amacı">
        <p>
          Bu site bir ürün kataloğu ve talep iletme aracıdır. Site üzerinden{' '}
          <strong>online satış yapılmaz ve ödeme alınmaz</strong>. Gönderdiğiniz talep bir sipariş
          değildir; satış, mağazada tarafların anlaşmasıyla kurulur.
        </p>
      </TextSection>

      <TextSection title="Fiyat ve stok bilgisi">
        <TextList
          items={[
            'Sitede gösterilen fiyatlar bilgilendirme amaçlıdır ve bağlayıcı değildir.',
            'Bazı ürünlerde fiyat gösterilmez; bu ürünler için mağazamıza danışmanız gerekir.',
            'Talep göndermek stok rezervasyonu oluşturmaz. Ürünün mevcudiyeti teyit edilerek bildirilir.',
            'Fiyatlar önceden haber verilmeksizin değişebilir.',
          ]}
        />
      </TextSection>

      <TextSection title="Ürün bilgilerinin kullanımı">
        <p>
          Sitedeki kullanım şekli, doz, yan etki ve uyarı bilgileri üretici beyanına dayanır ve
          genel bilgilendirme amaçlıdır. Zirai ilaç uygulamasından önce ürün etiketini okumanız ve
          gerektiğinde ziraat mühendisine danışmanız gerekir. Hatalı uygulamadan doğan sonuçlardan
          mağazamız sorumlu tutulamaz.
        </p>
      </TextSection>

      <TextSection title="Talep gönderme">
        <TextList
          items={[
            'Talep formunda doğru ve güncel iletişim bilgisi vermeniz gerekir.',
            'Gerçek dışı, deneme amaçlı veya kötüye kullanım niteliğindeki talepler kaydedilmeden reddedilebilir.',
            'Talebiniz için sizinle telefon veya belirttiğiniz iletişim kanalı üzerinden iletişime geçilir.',
          ]}
        />
      </TextSection>

      <TextSection title="Fikri mülkiyet">
        <p>
          Sitedeki metin, görsel ve düzenlemeler mağazamıza veya ilgili marka sahiplerine aittir;
          izinsiz kopyalanamaz ve ticari amaçla kullanılamaz.
        </p>
      </TextSection>

      <TextSection title="Değişiklikler">
        <p>Bu koşullar güncellenebilir. Güncel sürüm her zaman bu sayfada yayımlanır.</p>
      </TextSection>
    </StaticPage>
  );
}
