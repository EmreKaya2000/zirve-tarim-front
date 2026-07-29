'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@zirve/ui';

/**
 * Vitrin hata sınırı.
 *
 * Kullanıcıya teknik ayrıntı GÖSTERİLMEZ: `error.message` API'den gelen bir
 * metin olabilir ve iç yapı hakkında bilgi sızdırabilir. Ayrıntı yalnız
 * konsola yazılır.
 */
export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Sayfa yüklenemedi:', error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-error-container text-error">
        <AlertTriangle className="size-7" aria-hidden="true" />
      </span>

      <h1 className="text-h2 text-on-surface">Sayfa yüklenemedi</h1>

      <p className="text-on-surface-variant">
        Geçici bir sorun oluştu. Lütfen tekrar deneyin; sorun sürerse mağazamızı arayabilirsiniz.
      </p>

      {error.digest !== undefined ? (
        <p className="font-financial text-sm text-outline">Hata kodu: {error.digest}</p>
      ) : null}

      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Tekrar dene</Button>
        <Button asChild variant="outline">
          <Link href="/">Ana sayfaya dön</Link>
        </Button>
      </div>
    </div>
  );
}
