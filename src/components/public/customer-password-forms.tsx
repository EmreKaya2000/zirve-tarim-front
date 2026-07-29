'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, KeyRound, Mail, Send } from 'lucide-react';
import { Alert, Button, FieldError, FieldHint, FormField, Input, Label } from '@zirve/ui';
import { CUSTOMER_PASSWORD_RULE_MESSAGE } from '@zirve/types';

import { showToast } from '@/components/toast';
import { ApiError } from '@/lib/api-error';
import { customerAuthApi } from '@/lib/customer-api';
import {
  applyServerErrors,
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordFormValues,
  type ResetPasswordFormValues,
} from '@/lib/customer-forms';

/**
 * "Şifremi unuttum" formu — Sprint 11 şartı 1.
 *
 * BAŞARI EKRANI ADRESİ TEKRARLAMAZ ve "gönderildi" demez: sunucu adresin
 * kayıtlı olup olmadığını söylemez, arayüz de söylememelidir. Kayıtlı değilse
 * gerçekten bir e-posta gitmemiştir; "gönderildi" yazmak yanlış bilgi olurdu.
 */
export function ForgotPasswordForm() {
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      const result = await customerAuthApi.forgotPassword(values.email);

      setSentMessage(result.message);
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'İstek gönderilemedi. Lütfen tekrar deneyin.',
      );
    }
  });

  if (sentMessage !== null) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="info" title="İsteğiniz alındı">
          {sentMessage}
        </Alert>

        <Button asChild variant="outline" full>
          <Link href="/giris">Giriş sayfasına dön</Link>
        </Button>
      </div>
    );
  }

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
          autoComplete="email"
          placeholder="ornek@eposta.com"
          startIcon={<Mail />}
          invalid={errors.email !== undefined}
          {...register('email')}
        />
        <FieldHint>Hesabınızda kayıtlı e-posta adresini girin.</FieldHint>
        <FieldError message={errors.email?.message} />
      </FormField>

      <Button type="submit" size="lg" full loading={isSubmitting}>
        {isSubmitting ? null : <Send />}
        Sıfırlama Bağlantısı Gönder
      </Button>
    </form>
  );
}

/**
 * Şifre sıfırlama formu.
 *
 * Başarıdan sonra kullanıcı GİRİŞE yönlendirilir, otomatik oturum AÇILMAZ:
 * sıfırlama tüm oturumları düşürür (hesap ele geçirilmiş olabilir) ve yeni
 * şifreyi bir kez de girişte kullanmak, kullanıcının onu doğru
 * hatırladığının teyidi olur.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();

  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', passwordConfirm: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      await customerAuthApi.resetPassword({ token, password: values.password });

      showToast({
        variant: 'success',
        title: 'Şifreniz güncellendi',
        lines: ['Yeni şifrenizle giriş yapabilirsiniz.'],
      });

      router.replace('/giris');
    } catch (error) {
      setFormError(applyServerErrors<ResetPasswordFormValues>(error, ['password'], setError));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError !== null ? (
        <Alert variant="error" title="Şifre güncellenemedi">
          {formError}

          <p className="mt-2">
            Bağlantının süresi dolmuş olabilir.{' '}
            <Link href="/sifremi-unuttum" className="underline">
              Yeni bağlantı isteyin
            </Link>
            .
          </p>
        </Alert>
      ) : null}

      <FormField>
        <Label htmlFor="password" required>
          Yeni şifre
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
          Yeni şifre (tekrar)
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

      <Alert variant="info" title="Tüm oturumlar kapatılacak">
        Güvenliğiniz için şifre değiştiğinde açık olan diğer oturumlar sonlandırılır.
      </Alert>

      <Button type="submit" size="lg" full loading={isSubmitting}>
        {isSubmitting ? null : <KeyRound />}
        Şifreyi Güncelle
      </Button>
    </form>
  );
}
