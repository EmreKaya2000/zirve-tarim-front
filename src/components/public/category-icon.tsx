import Image from 'next/image';
import { Sprout } from 'lucide-react';

import { cn } from '@zirve/ui';

/**
 * Kategori ikonu — yüklenen görsel, yoksa varsayılan.
 *
 * NEDEN AYRI BİLEŞEN: kategoriler dört yerde ikonla görünüyor (kategori
 * listesi, masaüstü menü, mobil çekmece, kategori detay başlığı). Aynı
 * "görsel varsa göster, yoksa varsayılana düş" mantığını dört yere kopyalamak,
 * bir gün birinde düzeltilip diğerlerinde unutulacak dört ayrı yer demekti.
 *
 * `next/image` KULLANILABİLİYOR çünkü `/uploads` yolu next.config.ts
 * içindeki rewrite ile AYNI KÖKENDEN sunuluyor; uzak kaynak tanımı gerekmez
 * ve HTML'e mutlak API adresi gömülmez.
 */
export function CategoryIcon({
  iconUrl,
  size,
  className,
}: {
  iconUrl?: string | null;
  /** Kutunun kenar uzunluğu (px). Görsel de bu boyutta istenir. */
  size: number;
  className?: string;
}) {
  const hasIcon = typeof iconUrl === 'string' && iconUrl !== '';

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-[10px]',
        'bg-secondary-container text-on-primary-fixed-variant',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {hasIcon ? (
        <Image
          src={iconUrl}
          alt=""
          width={size}
          height={size}
          className="size-full object-contain"
        />
      ) : (
        /*
          İkon yüklemek ZORUNLU DEĞİL; ikonu olmayan kategoride boş bir kutu
          göstermek gerileme olurdu. Varsayılan ikon ölçüyle birlikte küçülür.
        */
        <Sprout style={{ width: size * 0.5, height: size * 0.5 }} aria-hidden="true" />
      )}
    </span>
  );
}
