'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FieldError,
  FieldHint,
  FormField,
  Input,
  Label,
  Skeleton,
} from '@zirve/ui';

import { showToast } from '@/components/toast';
import { customerProfileApi, CUSTOMER_QUERY_KEYS } from '@/lib/customer-api';
import { applyServerErrors, profileSchema, type ProfileFormValues } from '@/lib/customer-forms';
import { useCustomerAuthStore } from '@/lib/customer-auth-store';

/**
 * Profil düzenleme — Sprint 11 şartı 4.
 *
 * E-POSTA DEĞİŞİKLİĞİ ANINDA UYGULANMAZ: yeni adrese doğrulama bağlantısı
 * gönderilir ve adres ancak bağlantı açıldığında değişir. Form bunu
 * `pendingEmail` alanıyla açıkça gösterir — aksi hâlde kullanıcı adresin
 * değiştiğini sanıp eski adresle giriş yapamadığını düşünürdü.
 */
export function CustomerProfileForm() {
  const queryClient = useQueryClient();
  const setAccount = useCustomerAuthStore((state) => state.setAccount);

  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const profile = useQuery({
    queryKey: CUSTOMER_QUERY_KEYS.profile,
    queryFn: customerProfileApi.get,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: '', lastName: '', phone: '', email: '' },
  });

  // Sunucudan gelen değerler forma yazılır. `reset` kullanılır, `defaultValues`
  // değil: veri ilk render'dan SONRA gelir ve defaultValues o noktada donmuş
  // olur.
  useEffect(() => {
    if (profile.data === undefined) {
      return;
    }

    reset({
      firstName: profile.data.firstName,
      lastName: profile.data.lastName,
      phone: profile.data.phone,
      email: profile.data.email,
    });
  }, [profile.data, reset]);

  const mutation = useMutation({
    mutationFn: customerProfileApi.update,
    onSuccess: (result) => {
      queryClient.setQueryData(CUSTOMER_QUERY_KEYS.profile, result.account);
      // Header'daki ad ve e-posta da güncellenir.
      setAccount(result.account);
      setPendingEmail(result.pendingEmail);

      reset({
        firstName: result.account.firstName,
        lastName: result.account.lastName,
        phone: result.account.phone,
        // ADRES HENÜZ DEĞİŞMEDİYSE eski değer gösterilir: form gerçeği
        // yansıtmalı.
        email: result.account.email,
      });

      showToast({
        variant: result.pendingEmail === null ? 'success' : 'info',
        title:
          result.pendingEmail === null
            ? 'Bilgileriniz güncellendi'
            : 'Bilgileriniz güncellendi, e-posta doğrulaması bekleniyor',
        lines:
          result.pendingEmail === null
            ? undefined
            : [`${result.pendingEmail} adresine doğrulama bağlantısı gönderdik.`],
      });
    },
    onError: (error: unknown) => {
      setFormError(
        applyServerErrors<ProfileFormValues>(
          error,
          ['firstName', 'lastName', 'phone', 'email'],
          setError,
        ),
      );
    },
  });

  if (profile.isPending) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (profile.isError) {
    return (
      <Alert variant="error" title="Profil bilgileri yüklenemedi">
        Sayfayı yenileyip tekrar deneyin.
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-body-lg font-semibold">Hesap Bilgilerim</CardTitle>
        <CardDescription>
          Bu bilgiler talep formunuzda otomatik olarak doldurulur; her talepte değiştirebilirsiniz.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          noValidate
          onSubmit={handleSubmit((values) => {
            setFormError(null);
            setPendingEmail(null);

            mutation.mutate({
              firstName: values.firstName,
              lastName: values.lastName,
              phone: values.phone,
              // Adres değişmediyse GÖNDERİLMEZ: her kaydetmede gereksiz bir
              // doğrulama e-postası tetiklenmesin.
              ...(values.email !== profile.data.email && { email: values.email }),
            });
          })}
          className="flex flex-col gap-5"
        >
          {formError !== null ? (
            <Alert variant="error" title="Güncelleme yapılamadı">
              {formError}
            </Alert>
          ) : null}

          {pendingEmail !== null ? (
            <Alert variant="info" title="E-posta değişikliği onay bekliyor">
              <span className="font-financial">{pendingEmail}</span> adresine gönderdiğimiz
              bağlantıyı açtığınızda adresiniz güncellenecek. O ana kadar mevcut adresinizle giriş
              yapmaya devam edin.
            </Alert>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
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
            <Label htmlFor="phone" required>
              Telefon
            </Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              invalid={errors.phone !== undefined}
              {...register('phone')}
            />
            <FieldError message={errors.phone?.message} />
          </FormField>

          <FormField>
            <Label htmlFor="email" required>
              E-posta
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              invalid={errors.email !== undefined}
              {...register('email')}
            />
            <FieldHint>
              Adresi değiştirirseniz yeni adrese doğrulama bağlantısı gönderilir; adresiniz ancak
              bağlantıyı açtığınızda güncellenir.
            </FieldHint>
            <FieldError message={errors.email?.message} />
          </FormField>

          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting || mutation.isPending} disabled={!isDirty}>
              {isSubmitting || mutation.isPending ? null : <Save />}
              Kaydet
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
