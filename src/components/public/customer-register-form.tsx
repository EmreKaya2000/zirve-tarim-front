'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { Alert, Button, FieldError, FieldHint, FormField, Input, Label } from '@zirve/ui';
import { CUSTOMER_PASSWORD_RULE_MESSAGE } from '@zirve/types';

import { showToast } from '@/components/toast';
import { customerAuthApi } from '@/lib/customer-api';
import { applyServerErrors, registerSchema, type RegisterFormValues } from '@/lib/customer-forms';
import { useCustomerSessionStart } from '@/providers/customer-auth-provider';

import { isSafePublicRedirect } from './customer-login-form';

/**
 * Müşteri kayıt formu — Sprint 11 şartı 1.
 *
 * İKİ AŞAMALI AKIŞ ve nedeni:
 *   1. `POST /customer-auth/register` — JETON DÖNDÜRMEZ. Yanıt, e-posta
 *      kayıtlı olsun ya da olmasın aynıdır (kullanıcı sayımı koruması).
 *   2. `POST /customer-auth/login` — aynı bilgilerle oturum açılır ve
 *      ardından misafir sepeti hesaba taşınır.
 *
 * Adres BAŞKASINA aitse 2. adım `INVALID_CREDENTIALS` ile döner. Bu da
 * "hesap var" DEMEZ (aynı hata yanlış şifrede de gelir), ama kullanıcıya
 * yapabileceği bir şey söylemek gerekir: giriş yap ya da şifreni sıfırla.
 */
export function CustomerRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startSession = useCustomerSessionStart();

  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', phone: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      await customerAuthApi.register({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        password: values.password,
        consentAccepted: true,
      });
    } catch (error) {
      setFormError(
        applyServerErrors<RegisterFormValues>(
          error,
          ['firstName', 'lastName', 'email', 'phone', 'password', 'consentAccepted'],
          setError,
        ),
      );

      return;
    }

    try {
      const session = await customerAuthApi.login({
        email: values.email,
        password: values.password,
      });

      // Oturumu kurar VE misafir sepetini hesaba taşır.
      await startSession(session);

      showToast({
        variant: 'success',
        title: 'Hesabınız oluşturuldu',
        lines: ['Doğrulama bağlantısını e-posta adresinize gönderdik.'],
      });

      const next = searchParams.get('next');

      router.replace(isSafePublicRedirect(next) ? next : '/hesabim');
      router.refresh();
    } catch {
      // Kayıt istendi ama oturum açılamadı: en olası neden adresin başka
      // birine ait olmasıdır. Bunu SÖYLEMEYİZ; kullanıcıya iki geçerli yol
      // gösterip bırakırız.
      setFormError(
        'Hesap oluşturma isteğiniz alındı ancak otomatik giriş yapılamadı. ' +
          'Bu adres daha önce kullanılmış olabilir: giriş yapmayı deneyin veya şifrenizi sıfırlayın.',
      );
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError !== null ? (
        <Alert variant="error" title="Kayıt tamamlanamadı">
          {formError}
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <FormField>
          <Label htmlFor="firstName" required>
            Ad
          </Label>
          <Input
            id="firstName"
            autoComplete="given-name"
            invalid={errors.firstName !== undefined}
            {...register('firstName')}
          />
          <FieldError message={errors.firstName?.message} />
        </FormField>

        <FormField>
          <Label htmlFor="lastName" required>
            Soyad
          </Label>
          <Input
            id="lastName"
            autoComplete="family-name"
            invalid={errors.lastName !== undefined}
            {...register('lastName')}
          />
          <FieldError message={errors.lastName?.message} />
        </FormField>
      </div>

      <FormField>
        <Label htmlFor="email" required>
          E-posta
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="ornek@eposta.com"
          invalid={errors.email !== undefined}
          {...register('email')}
        />
        <FieldHint>Giriş yaparken bu adresi kullanacaksınız.</FieldHint>
        <FieldError message={errors.email?.message} />
      </FormField>

      <FormField>
        <Label htmlFor="phone" required>
          Telefon
        </Label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0532 123 45 67"
          invalid={errors.phone !== undefined}
          {...register('phone')}
        />
        <FieldError message={errors.phone?.message} />
      </FormField>

      <FormField>
        <Label htmlFor="password" required>
          Şifre
        </Label>
        <Input
          id="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
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
        <FieldHint>{CUSTOMER_PASSWORD_RULE_MESSAGE}</FieldHint>
        <FieldError message={errors.password?.message} />
      </FormField>

      <FormField>
        <Label htmlFor="passwordConfirm" required>
          Şifre (tekrar)
        </Label>
        <Input
          id="passwordConfirm"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          invalid={errors.passwordConfirm !== undefined}
          {...register('passwordConfirm')}
        />
        <FieldError message={errors.passwordConfirm?.message} />
      </FormField>

      <FormField>
        <label className="flex cursor-pointer items-start gap-2 text-sm text-on-surface">
          <input
            id="consentAccepted"
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 rounded border-outline-variant accent-primary"
            {...register('consentAccepted')}
          />
          <span>
            <Link
              href="/kvkk"
              target="_blank"
              className="underline transition-colors hover:text-primary-container"
            >
              KVKK Aydınlatma Metni
            </Link>
            &rsquo;ni okudum; bilgilerimin hesabımın oluşturulması ve taleplerimin değerlendirilmesi
            amacıyla işlenmesini kabul ediyorum.
          </span>
        </label>
        <FieldError message={errors.consentAccepted?.message} />
      </FormField>

      <Button type="submit" size="lg" full loading={isSubmitting}>
        {isSubmitting ? null : <UserPlus />}
        Hesap Oluştur
      </Button>
    </form>
  );
}
