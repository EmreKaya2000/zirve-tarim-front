import type { Metadata } from 'next';

import { StaticPage, TextList, TextSection } from '@/components/public/static-page';
import { getStoreInfo } from '@/lib/store-settings';

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni',
  description: '6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aydınlatma metni.',
  alternates: { canonical: '/kvkk' },
};

export default async function KvkkPage() {
  const store = await getStoreInfo();
  const controller = store.name ?? 'Zirve Tarım';

  return (
    <StaticPage
      title="KVKK Aydınlatma Metni"
      breadcrumbLabel="KVKK"
      description="6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında bilgilendirme."
      needsLegalReview
    >
      <TextSection title="Veri sorumlusu">
        <p>
          Kişisel verileriniz, veri sorumlusu sıfatıyla {controller} tarafından aşağıda açıklanan
          kapsamda işlenmektedir.
        </p>
        {store.address !== null ? <p>Adres: {store.address}</p> : null}
        {store.email !== null ? <p>E-posta: {store.email}</p> : null}
      </TextSection>

      <TextSection title="İşlenen kişisel veriler">
        <p>Talep formunu doldurduğunuzda aşağıdaki veriler işlenir:</p>
        <TextList
          items={[
            'Kimlik bilgisi: ad ve soyad',
            'İletişim bilgisi: telefon numarası, varsa e-posta adresi, il ve ilçe, varsa açık adres',
            'Talep içeriği: seçtiğiniz ürünler, miktarlar ve eklediğiniz notlar',
            'İşlem güvenliği: talebin gönderildiği IP adresi ve tarayıcı bilgisi',
          ]}
        />
      </TextSection>

      <TextSection title="İşleme amaçları">
        <TextList
          items={[
            'Talebinizin değerlendirilmesi ve sizinle iletişime geçilmesi',
            'Ürün ve fiyat bilgisi verilmesi, teslimatın mağazada planlanması',
            'Talep kayıtlarının saklanması ve hukuki yükümlülüklerin yerine getirilmesi',
            'Kötüye kullanımın (spam, sahte talep) önlenmesi',
          ]}
        />
      </TextSection>

      <TextSection title="Hukuki sebep">
        <p>
          Verileriniz, KVKK m.5/2-(c) uyarınca sözleşmenin kurulması veya ifasıyla doğrudan ilgili
          olması, m.5/2-(ç) uyarınca hukuki yükümlülüğün yerine getirilmesi ve m.5/2-(f) uyarınca
          meşru menfaat hukuki sebeplerine dayanılarak işlenir. Bu kapsam dışındaki işlemeler için
          açık rızanız alınır.
        </p>
      </TextSection>

      <TextSection title="Aktarım">
        <p>
          Kişisel verileriniz, yalnız yasal olarak yetkili kamu kurum ve kuruluşlarına ve hizmet
          aldığımız altyapı sağlayıcılarına, işleme amacıyla sınırlı olarak aktarılabilir.
          Verileriniz pazarlama amacıyla üçüncü kişilerle paylaşılmaz.
        </p>
      </TextSection>

      <TextSection title="Saklama süresi">
        <p>
          Talep kayıtları, ilgili mevzuatta öngörülen süreler boyunca saklanır; sürenin dolmasının
          ardından silinir, yok edilir veya anonim hâle getirilir.
        </p>
      </TextSection>

      <TextSection title="Haklarınız">
        <p>KVKK m.11 uyarınca veri sorumlusuna başvurarak:</p>
        <TextList
          items={[
            'Kişisel verinizin işlenip işlenmediğini öğrenme',
            'İşlenmişse buna ilişkin bilgi talep etme',
            'İşlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme',
            'Eksik veya yanlış işlenmişse düzeltilmesini isteme',
            'Şartları oluştuğunda silinmesini veya yok edilmesini isteme',
            'İşlemenin zararına bir sonuç doğurması hâlinde itiraz etme',
          ]}
        />
        <p>
          haklarına sahipsiniz. Başvurularınızı yukarıdaki iletişim bilgileri üzerinden
          iletebilirsiniz.
        </p>
      </TextSection>
    </StaticPage>
  );
}
