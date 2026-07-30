'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LogIn, Mail } from 'lucide-react';
import { Alert, Button, FieldError, FormField, Input, Label } from '@zirve/ui';

import { customerAuthApi } from '@/lib/customer-api';
import { loginSchema, type LoginFormValues } from '@/lib/customer-forms';
import { ApiError } from '@/lib/api-error';
import { useCustomerSessionStart } from '@/providers/customer-auth-provider';

/**
 * Müşteri giriş formu — Sprint 11 şartı 1.
 *
 * Girişten sonra MİSAFİR SEPETİ HESABA TAŞINIR (`useCustomerSessionStart`).
 * Bu, sprintin merkezindeki davranıştır: kullanıcı listesini kaybetmeden
 * oturum açar.
 */
export function CustomerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startSession = useCustomerSessionStart();

  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      const session = await customerAuthApi.login(values);

      await startSession(session);

      const next = searchParams.get('next');

      router.replace(isSafePublicRedirect(next) ? next : '/hesabim');
      router.refresh();
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'Giriş yapılamadı. Lütfen tekrar deneyin.',
      );
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError !== null ? <Alert variant="error">{formError}</Alert> : null}

      <FormField>
        <Label htmlFor="email" required>
          E-posta
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          placeholder="ornek@eposta.com"
          startIcon={<Mail />}
          invalid={errors.email !== undefined}
          {...register('email')}
        />
        <FieldError message={errors.email?.message} />
      </FormField>

      <FormField>
        <div className="flex items-baseline justify-between">
          <Label htmlFor="password" required>
            Şifre
          </Label>

          <Link
            href="/sifremi-unuttum"
            className="text-sm text-primary-container underline transition-colors hover:text-primary"
          >
            Şifremi unuttum
          </Link>
        </div>

        <Input
          id="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="••••••••"
          invalid={errors.password !== undefined}
          endAdornment={
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="inline-flex size-8 items-center justify-center rounded-[6px] text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
              aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
            >
              {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
            </button>
          }
          {...register('password')}
        />
        <FieldError message={errors.password?.message} />
      </FormField>

      <Button type="submit" size="lg" full loading={isSubmitting}>
        {isSubmitting ? null : <LogIn />}
        Giriş Yap
      </Button>
    </form>
  );
}

/**
 * Yönlendirme hedefinin güvenli olup olmadığını kontrol eder.
 *
 * `//evil.com` ve `https://evil.com` gibi değerler tarayıcıda dış siteye
 * yönlendirir (open redirect). Yalnız tek eğik çizgiyle başlayan uygulama içi
 * yollar kabul edilir.
 *
 * `/admin` ile başlayan yollar da REDDEDİLİR: müşteri jetonu yönetim
 * panelinde geçersizdir; oraya yönlendirmek kullanıcıyı 401 duvarına
 * çarptırmak olurdu.
 */
export function isSafePublicRedirect(value: string | null): value is string {
  return (
    value !== null &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/admin')
  );
}
