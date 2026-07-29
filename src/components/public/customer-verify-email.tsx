'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ClipboardList, Loader2, XCircle } from 'lucide-react';
import { Alert, Button } from '@zirve/ui';

import { ApiError } from '@/lib/api-error';
import { customerAuthApi } from '@/lib/customer-api';
import { useCustomerAuthStore } from '@/lib/customer-auth-store';

type VerifyState =
  | { kind: 'pending' }
  | { kind: 'done'; linkedInquiryCount: number }
  | { kind: 'failed'; message: string };

/**
 * E-posta doğrulama ekranı — Sprint 11 şartı 1.
 *
 * OTURUM GEREKTİRMEZ: kullanıcı bağlantıyı telefonundaki posta uygulamasından,
 * hiç giriş yapmadığı bir tarayıcıda açabilir. Uç `@Public()`tir ve jetonun
 * kendisi kimlik kanıtıdır.
 *
 * OTURUM VARSA GÜNCELLENİR: aynı tarayıcıda giriş yapılmışsa store'daki
 * `account` yenilenir; aksi hâlde hesap menüsü "doğrulanmadı" uyarısını
 * göstermeye devam ederdi.
 *
 * `useRef` KİLİDİ: React 18 geliştirme modunda efektler iki kez çalışır.
 * Jeton TEK KULLANIMLIK olduğu için ikinci çağrı `INVALID_TOKEN` alır ve
 * kullanıcı başarılı bir doğrulamayı hata olarak görürdü.
 */
export function CustomerVerifyEmail({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const setAccount = useCustomerAuthStore((state) => state.setAccount);
  const hasSession = useCustomerAuthStore((state) => state.refreshToken !== null);

  const [state, setState] = useState<VerifyState>({ kind: 'pending' });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }

    started.current = true;

    customerAuthApi
      .verifyEmail(token)
      .then((result) => {
        setState({ kind: 'done', linkedInquiryCount: result.linkedInquiryCount });

        if (hasSession) {
          setAccount(result.account);
          // Geçmiş talepler hesaba bağlandı; liste yeniden çekilmeli.
          void queryClient.invalidateQueries({ queryKey: ['customer'] });
        }
      })
      .catch((error: unknown) => {
        setState({
          kind: 'failed',
          message:
            error instanceof ApiError
              ? error.message
              : 'Doğrulama tamamlanamadı. Lütfen tekrar deneyin.',
        });
      });
  }, [token, hasSession, setAccount, queryClient]);

  if (state.kind === 'pending') {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-on-surface-variant">
        <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        <p role="status">E-posta adresiniz doğrulanıyor...</p>
      </div>
    );
  }

  if (state.kind === 'failed') {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="error" title="Bağlantı geçersiz">
          {state.message}
        </Alert>

        <p className="text-sm text-on-surface-variant">
          Doğrulama bağlantıları 24 saat geçerlidir ve yalnız bir kez kullanılabilir. Hesabınıza
          giriş yapıp yeni bir bağlantı isteyebilirsiniz.
        </p>

        <Button asChild full>
          <Link href="/giris">Giriş Yap</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <CheckCircle2 className="size-10 text-success" aria-hidden="true" />
        <p className="text-label-md text-on-surface">E-posta adresiniz doğrulandı</p>
      </div>

      {state.linkedInquiryCount > 0 ? (
        <Alert variant="success" title="Geçmiş talepleriniz hesabınıza eklendi">
          Bu e-posta adresiyle daha önce gönderdiğiniz {state.linkedInquiryCount} talep artık
          &ldquo;Taleplerim&rdquo; sayfasında görünüyor.
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Button asChild full>
          <Link href="/hesabim/taleplerim">
            <ClipboardList />
            Taleplerimi Gör
          </Link>
        </Button>

        <Button asChild variant="outline" full>
          <Link href="/urunler">Ürünlere göz at</Link>
        </Button>
      </div>
    </div>
  );
}

/** Jeton hiç gelmediğinde gösterilen durum. */
export function CustomerVerifyEmailMissingToken() {
  return (
    <div className="flex flex-col gap-4">
      <Alert variant="error" title="Doğrulama bağlantısı eksik">
        <span className="flex items-start gap-2">
          <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Bağlantı eksik veya bozuk görünüyor. E-postadaki bağlantıyı doğrudan açmayı deneyin.
        </span>
      </Alert>

      <Button asChild variant="outline" full>
        <Link href="/giris">Giriş Yap</Link>
      </Button>
    </div>
  );
}
