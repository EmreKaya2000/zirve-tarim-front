import Link from 'next/link';
import type { ReactNode } from 'react';
import { Sprout } from 'lucide-react';

/**
 * Kimlik sayfalarının ortak çerçevesi — Sprint 11.
 *
 * Beş sayfa (kayıt, giriş, şifremi unuttum, şifre sıfırla, e-posta doğrula)
 * aynı iskeleti paylaşır. Her birine tek tek yazılsaydı başlık hizası ve
 * genişlik zamanla ayrışırdı.
 *
 * SUNUCU BİLEŞENİDİR: yalnız yerleşim yapar, durum tutmaz. Formlar kendi
 * içlerinde `'use client'` taşır.
 */
export function CustomerAuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-12 sm:py-16">
      <Link href="/" className="mx-auto flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-[12px] bg-primary text-on-primary">
          <Sprout className="size-6" aria-hidden="true" />
        </span>
      </Link>

      <h1 className="mt-6 text-center text-h2 text-on-surface">{title}</h1>

      {description !== undefined ? (
        <p className="mt-2 text-center text-on-surface-variant">{description}</p>
      ) : null}

      <div className="mt-8 rounded-[16px] border border-outline-variant bg-surface-container-lowest p-6 sm:p-8">
        {children}
      </div>

      {footer !== undefined ? (
        <div className="mt-6 text-center text-sm text-on-surface-variant">{footer}</div>
      ) : null}
    </div>
  );
}
