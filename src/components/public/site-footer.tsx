import Link from 'next/link';
import { Clock, Mail, MapPin, MessageCircle, Phone, Sprout } from 'lucide-react';

import { SITE_NAME } from '@/lib/env';
import { whatsappUrl, telUrl, type StoreInfo } from '@/lib/store-settings';

const CATALOG_LINKS = [
  { href: '/urunler', label: 'Tüm Ürünler' },
  { href: '/kategoriler', label: 'Kategoriler' },
  { href: '/markalar', label: 'Markalar' },
  { href: '/bitkiler', label: 'Bitkiler' },
] as const;

const INFO_LINKS = [
  { href: '/hakkimizda', label: 'Hakkımızda' },
  { href: '/iletisim', label: 'İletişim' },
  { href: '/kvkk', label: 'KVKK Aydınlatma Metni' },
  { href: '/gizlilik', label: 'Gizlilik Politikası' },
  { href: '/kullanim-kosullari', label: 'Kullanım Koşulları' },
] as const;

/**
 * Vitrin alt bilgi.
 *
 * İletişim bilgileri AYARLARDAN gelir (gereksinim 4); kodda sabit telefon
 * veya adres yoktur. Bir bilgi tanımsızsa satırı hiç render edilmez —
 * "Telefon: —" yazmak, mağazanın telefonu yokmuş izlenimi verirdi.
 */
export function SiteFooter({ store }: { store: StoreInfo }) {
  const whatsapp = whatsappUrl(
    store.whatsapp,
    'Merhaba, ürünleriniz hakkında bilgi almak istiyorum.',
  );
  const tel = telUrl(store.phone);
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-outline-variant bg-surface-container-low">
      <div className="mx-auto max-w-[1440px] px-4 py-12 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-[10px] bg-primary text-on-primary">
                <Sprout className="size-5" aria-hidden="true" />
              </span>
              <span className="text-label-md text-on-surface">{store.name ?? SITE_NAME}</span>
            </div>

            <p className="mt-4 text-sm text-on-surface-variant">
              Zirai ilaç, gübre, tohum ve sulama ekipmanları. Modern çiftçi için güvenilir tedarik.
            </p>
          </div>

          <div>
            <h2 className="text-label-md text-on-surface">Katalog</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-on-surface-variant">
              {CATALOG_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-on-surface">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-label-md text-on-surface">Bilgi</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-on-surface-variant">
              {INFO_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-on-surface">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-label-md text-on-surface">İletişim</h2>
            <ul className="mt-3 flex flex-col gap-3 text-sm text-on-surface-variant">
              {tel !== null ? (
                <li className="flex items-start gap-2">
                  <Phone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <a href={tel} className="hover:text-on-surface">
                    {store.phone}
                  </a>
                </li>
              ) : null}

              {whatsapp !== null ? (
                <li className="flex items-start gap-2">
                  <MessageCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-on-surface"
                  >
                    WhatsApp ile yazın
                  </a>
                </li>
              ) : null}

              {store.email !== null ? (
                <li className="flex items-start gap-2">
                  <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <a href={`mailto:${store.email}`} className="hover:text-on-surface">
                    {store.email}
                  </a>
                </li>
              ) : null}

              {store.address !== null ? (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {store.mapUrl !== null ? (
                    <a
                      href={store.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-on-surface"
                    >
                      {store.address}
                    </a>
                  ) : (
                    <span>{store.address}</span>
                  )}
                </li>
              ) : null}

              {store.workingHours !== null ? (
                <li className="flex items-start gap-2">
                  <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{store.workingHours}</span>
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-outline-variant pt-6 text-sm text-on-surface-variant">
          <p>
            &copy; {year} {store.name ?? SITE_NAME}. Tüm hakları saklıdır.
          </p>
          {/* Ç-01: bu tarafta "sipariş" ve "ödeme" ifadeleri kullanılmaz. */}
          <p className="mt-1">
            Bu site üzerinden online satış ve ödeme yapılmaz. Ürünler için talebinizi iletirsiniz,
            teslimat ve tahsilat mağazada gerçekleşir.
          </p>
        </div>
      </div>
    </footer>
  );
}
