import { z } from 'zod';
import {
  CUSTOMER_PASSWORD_MAX_LENGTH,
  CUSTOMER_PASSWORD_RULE_MESSAGE,
  isValidCustomerPassword,
} from '@zirve/types';

import { ApiError } from './api-error';

/**
 * Müşteri formlarının doğrulama şemaları — Sprint 11.
 *
 * KURAL 10: buradaki doğrulama YALNIZ KULLANICI DENEYİMİ İÇİNDİR. Bağlayıcı
 * olan backend'dir ve aynı kuralları bağımsız olarak uygular; `curl` ile
 * atılan istek de reddedilir.
 *
 * ŞİFRE POLİTİKASI TEKRARLANMAZ: `isValidCustomerPassword` doğrudan
 * `@zirve/types`ten çağrılır — backend'in kullandığı AYNI işlev. Şema burada
 * yeniden yazılsaydı (ör. `.regex(...)` ile) iki taraf ayrışabilir ve
 * kullanıcı formu geçip gönderimde `WEAK_PASSWORD` alırdı.
 */

/**
 * Türk cep telefonu biçimi — backend'deki PHONE_PATTERN ile AYNI.
 * Gevşek olması bilinçli: çiftçi numarasını boşluklu veya ülke koduyla yazar.
 */
const PHONE_PATTERN = /^(\+?90[\s-]?)?0?[\s-]?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/;

const emailField = z
  .string()
  .trim()
  .min(1, 'E-posta adresi zorunludur.')
  .email('Geçerli bir e-posta adresi giriniz.')
  .max(255);

const phoneField = z
  .string()
  .trim()
  .min(1, 'Telefon numarası zorunludur.')
  .regex(PHONE_PATTERN, 'Geçerli bir cep telefonu numarası giriniz (ör. 0532 123 45 67).');

/** Backend ile TEK kaynaktan beslenen şifre alanı. */
const passwordField = z
  .string()
  .max(
    CUSTOMER_PASSWORD_MAX_LENGTH,
    `Şifre en fazla ${CUSTOMER_PASSWORD_MAX_LENGTH} karakter olabilir.`,
  )
  .refine(isValidCustomerPassword, CUSTOMER_PASSWORD_RULE_MESSAGE);

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, 'Ad en az 2 karakter olmalıdır.').max(100),
    lastName: z.string().trim().min(2, 'Soyad en az 2 karakter olmalıdır.').max(100),
    email: emailField,
    phone: phoneField,
    password: passwordField,
    passwordConfirm: z.string(),
    // KVKK onayı: işaretlenmemiş kutu şemayı geçemez.
    consentAccepted: z.literal(true, {
      errorMap: () => ({ message: 'Hesap açmak için aydınlatma metnini onaylamanız gerekir.' }),
    }),
  })
  /**
   * Şifre tekrarı YALNIZ ARAYÜZDE vardır, backend'e gönderilmez.
   *
   * Sunucunun ikinci bir şifre alanını doğrulaması, aynı değeri iki kez
   * taşıyıp iki kez loglanma riskine sokmak olurdu. Yazım hatasını yakalamak
   * bir kullanıcı deneyimi işidir ve yeri burasıdır.
   */
  .refine((values) => values.password === values.passwordConfirm, {
    path: ['passwordConfirm'],
    message: 'Şifreler eşleşmiyor.',
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailField,
  // Girişte politika UYGULANMAZ: mevcut şifre politikadan eski olabilir ve
  // "şifreniz kurallara uymuyor" demek kullanıcıyı giriş yapamaz hâle getirir.
  password: z.string().min(1, 'Şifre zorunludur.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailField });

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordField,
    passwordConfirm: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirm, {
    path: ['passwordConfirm'],
    message: 'Şifreler eşleşmiyor.',
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const profileSchema = z.object({
  firstName: z.string().trim().min(2, 'Ad en az 2 karakter olmalıdır.').max(100),
  lastName: z.string().trim().min(2, 'Soyad en az 2 karakter olmalıdır.').max(100),
  phone: phoneField,
  email: emailField,
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

/**
 * Sunucudan gelen alan bazlı hataları forma yazar.
 *
 * @returns Alanlara yazılamayan (genel) hata mesajı; her şey yazıldıysa `null`.
 */
export function applyServerErrors<TValues extends Record<string, unknown>>(
  error: unknown,
  fields: readonly (keyof TValues & string)[],
  setError: (field: keyof TValues & string, error: { message: string }) => void,
): string | null {
  if (!(error instanceof ApiError)) {
    return 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
  }

  let handled = false;

  for (const detail of error.details) {
    const field = detail.field ?? '';

    if (fields.includes(field as keyof TValues & string)) {
      setError(field as keyof TValues & string, { message: detail.message });
      handled = true;
    }
  }

  if (handled) {
    return null;
  }

  return error.details.length > 0
    ? `${error.message} ${error.details.map((detail) => detail.message).join(' ')}`
    : error.message;
}
