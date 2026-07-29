import type { Metadata } from 'next';

import { StaticPage, TextList, TextSection } from '@/components/public/static-page';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası',
  description: 'Bu sitede hangi verilerin toplandığı ve nasıl korunduğu.',
  alternates: { canonical: '/gizlilik' },
};

export default function PrivacyPage() {
  return (
    <StaticPage
      title="Gizlilik Politikası"
      breadcrumbLabel="Gizlilik"
      description="Bu sitede hangi verilerin toplandığını ve nasıl kullanıldığını açıklar."
      needsLegalReview
    >
      <TextSection title="Topladığımız veriler">
        <p>
          Siteyi yalnız gezmek için kişisel bilgi vermeniz gerekmez. Yalnız talep gönderdiğinizde
          iletişim bilgilerinizi bizimle paylaşırsınız.
        </p>
      </TextSection>

      <TextSection title="Çerezler ve yerel depolama">
        <p>
          Sitede reklam veya takip çerezi kullanılmaz. Tarayıcınızın yerel depolama alanı yalnız şu
          amaçla kullanılır:
        </p>
        <TextList
          items={[
            'Talep listenizin (sepet) sayfalar arasında korunması — bu veri yalnız sizin cihazınızda tutulur ve talebi göndermediğiniz sürece bize iletilmez.',
          ]}
        />
      </TextSection>

      <TextSection title="Üçüncü taraf hizmetler">
        <p>
          Site yazı tipleri de dahil olmak üzere içeriği kendi sunucularımızdan sunar; sayfa
          açıldığında üçüncü taraf sunucularına istek gönderilmez. Harita ve WhatsApp bağlantılarına
          tıkladığınızda ilgili hizmetin kendi gizlilik politikası geçerli olur.
        </p>
      </TextSection>

      <TextSection title="Ödeme bilgisi">
        <p>
          Bu site üzerinden <strong>ödeme alınmaz</strong>. Kredi kartı veya banka hesabı bilgisi
          hiçbir aşamada istenmez, toplanmaz ve saklanmaz. Böyle bir bilgi talep eden bir sayfayla
          karşılaşırsanız lütfen bizimle iletişime geçin.
        </p>
      </TextSection>

      <TextSection title="Veri güvenliği">
        <TextList
          items={[
            'Yönetim paneline erişim kimlik doğrulaması ve rol denetimiyle korunur.',
            'Parolalar geri döndürülemez biçimde özetlenerek saklanır.',
            'Talep kayıtlarındaki değişiklikler denetim günlüğüne yazılır.',
          ]}
        />
      </TextSection>

      <TextSection title="Değişiklikler">
        <p>Bu politika güncellenebilir. Güncel sürüm her zaman bu sayfada yayımlanır.</p>
      </TextSection>
    </StaticPage>
  );
}
