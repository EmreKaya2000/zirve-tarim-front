'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ClipboardList, Loader2, MailCheck, User } from 'lucide-react';
import { Alert, Button, cn } from '@zirve/ui';

import { showToast } from '@/components/toast';
import { ApiError } from '@/lib/api-error';
import { customerAuthApi } from '@/lib/customer-api';
import { useCustomerAuth } from '@/providers/customer-auth-provider';

const NAV_ITEMS = [
  { href: '/hesabim', label: 'Hesap Bilgilerim', icon: User },
  { href: '/hesabim/taleplerim', label: 'Taleplerim', icon: ClipboardList },
] as const;

/**
 * Hesap alanının çerçevesi ve ERİŞİM KAPISI — Sprint 11 şartı 4.
 *
 * KORUMA İSTEMCİDE YAPILIR ve bu YETERLİDİR: `/hesabim` sayfaları hiçbir
 * gizli veriyi kendi içinde taşımaz, verinin tamamı API'den gelir ve API
 * `CustomerJwtGuard` ile korunur. Bir saldırgan sayfayı açsa bile boş bir
 * iskelet görür.
 *
 * Sunucu tarafında koruma yapılabilmesi için jetonun çerezde olması gerekirdi;
 * bugün `localStorage`da (bkz. customer-auth-store.ts ödünleşme notu).
 */
export function CustomerAccountShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isHydrated, isLoggingOut } = useCustomerAuth();

  useEffect(() => {
    // Hidrasyon BEKLENİR: oturum localStorage'dan geri yüklenmeden
    // yönlendirme yapılırsa girişli kullanıcı da giriş ekranına atılır.
    //
    // ÇIKIŞ SIRASINDA SUSAR: kullanıcı "Çıkış Yap"a bastıysa oturumun
    // olmaması beklenen durumdur ve gideceği yer ana sayfadır, giriş sayfası
    // değil (bkz. customer-auth-store.ts -> isLoggingOut).
    if (isHydrated && !isAuthenticated && !isLoggingOut) {
      router.replace(`/giris?next=${encodeURIComponent(pathname)}`);
    }
  }, [isHydrated, isAuthenticated, isLoggingOut, router, pathname]);

  if (!isHydrated) {
    return (
      <div className="mx-auto flex max-w-[1100px] items-center justify-center gap-2 px-4 py-24 text-on-surface-variant">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        <span role="status">Hesabınız yükleniyor...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Yönlendirme (veya çıkış) tamamlanana kadar boş kalır; içerik render
    // EDİLMEZ.
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 lg:px-8 lg:py-12">
      <header>
        <h1 className="text-h2 text-on-surface">{title}</h1>
        {description !== undefined ? (
          <p className="mt-1 text-on-surface-variant">{description}</p>
        ) : null}
      </header>

      <EmailVerificationNotice />

      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr] lg:items-start">
        <nav aria-label="Hesap menüsü" className="flex gap-2 overflow-x-auto lg:flex-col">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/hesabim' ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-[10px] px-3 py-2.5 text-label-md transition-colors',
                  isActive
                    ? 'bg-secondary-container text-on-primary-fixed-variant'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
                )}
              >
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

/**
 * Doğrulanmamış e-posta uyarısı ve yeniden gönderme.
 *
 * KAPATILAMAZ ve bu bilinçlidir: doğrulama olmadan geçmiş misafir talepleri
 * hesaba bağlanmaz. Kullanıcı "eski taleplerim nerede" sorusunun yanıtını
 * burada görmelidir.
 */
function EmailVerificationNotice() {
  const { isEmailVerified, account } = useCustomerAuth();

  const resend = useMutation({
    mutationFn: customerAuthApi.resendVerification,
    onSuccess: (result) => {
      showToast({
        variant: 'info',
        title: 'Doğrulama e-postası gönderildi',
        lines: [result.message],
      });
    },
    onError: (error: unknown) => {
      showToast({
        variant: 'warning',
        title: 'E-posta gönderilemedi',
        lines: [
          error instanceof ApiError ? error.message : 'Lütfen birkaç dakika sonra tekrar deneyin.',
        ],
      });
    },
  });

  if (isEmailVerified) {
    return null;
  }

  return (
    <Alert variant="warning" title="E-posta adresiniz doğrulanmadı" className="mt-6">
      <p>
        <span className="font-financial">{account?.email}</span> adresine gönderdiğimiz bağlantıyı
        açtığınızda, bu adresle daha önce gönderdiğiniz misafir talepleri de hesabınıza taşınır.
      </p>

      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        loading={resend.isPending}
        onClick={() => resend.mutate()}
      >
        {resend.isPending ? null : <MailCheck />}
        Doğrulama e-postasını yeniden gönder
      </Button>
    </Alert>
  );
}
