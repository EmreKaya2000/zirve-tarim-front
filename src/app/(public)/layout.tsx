import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/public/site-footer';
import { SiteHeader } from '@/components/public/site-header';
import { getCategoryTree } from '@/lib/public-api';
import { getStoreInfo } from '@/lib/store-settings';

/**
 * Vitrin sayfaları İSTEK ANINDA render edilir.
 *
 * NEDEN derleme anında üretilmiyor: `next build`, API'ye erişimi OLMAYAN
 * ortamlarda çalışır — Docker imaj derlemesi ve CI'ın veritabanısız işi.
 * Sayfalar derleme anında veri çekmeye kalksaydı imaj derlemesi kırılır,
 * ya da daha kötüsü, boş içerikli HTML kalıcı olarak imaja gömülürdü.
 *
 * Önbellek KAYBOLMAZ, katman değişir: veri `fetch` düzeyinde
 * `next.revalidate` ile önbelleklenir (lib/public-api.ts REVALIDATE).
 * Ürün listesi 5, taksonomi 10 dakika boyunca veritabanına gitmez.
 */
export const dynamic = 'force-dynamic';

/**
 * Public vitrin yerleşimi.
 *
 * Kategori ağacı ve mağaza bilgisi BURADA bir kez çekilir ve önbellekten
 * gelir; her sayfa ayrı ayrı istemez. Header client bileşeni olduğu için
 * veriyi prop olarak alır.
 *
 * TERMİNOLOJİ (docs/ARCHITECTURE.md Ç-01): bu tarafta "sipariş", "satın al"
 * veya "ödeme" ifadeleri KULLANILMAZ. Sepet bir talep listesidir.
 */
export default async function PublicLayout({ children }: { children: ReactNode }) {
  // İkisi paralel: biri diğerini beklemez.
  const [categories, store] = await Promise.all([getCategoryTree(), getStoreInfo()]);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader categories={categories} />

      <main className="flex-1">{children}</main>

      <SiteFooter store={store} />
    </div>
  );
}
