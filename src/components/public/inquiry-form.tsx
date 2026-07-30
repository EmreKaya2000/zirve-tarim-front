'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Send, Store } from 'lucide-react';
import { z } from 'zod';
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
  Select,
} from '@zirve/ui';
import { PREFERRED_CONTACTS, PREFERRED_CONTACT_LABELS } from '@zirve/types';

import { ApiError } from '@/lib/api-error';
import type { ActiveCartItem } from '@/lib/active-cart';
import { toInquiryItems } from '@/lib/active-cart';
import { publicInquiriesApi } from '@/lib/inquiries-api';
import { useCustomerAuth } from '@/providers/customer-auth-provider';

/**
 * Telefon doğrulaması.
 *
 * Backend'deki PHONE_PATTERN ile AYNI kuralı uygular (Kural 10: arayüz
 * doğrulaması yalnız UX içindir, bağlayıcı olan sunucudur). İki desen
 * ayrışırsa kullanıcı formu geçer ama gönderimde hata alır.
 */
const PHONE_PATTERN = /^(\+?90[\s-]?)?0?[\s-]?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/;

const schema = z.object({
  contactName: z
    .string()
    .trim()
    .min(3, 'Ad soyad en az 3 karakter olmalıdır.')
    .max(200, 'Ad soyad en fazla 200 karakter olabilir.'),
  contactPhone: z
    .string()
    .trim()
    .regex(PHONE_PATTERN, 'Geçerli bir cep telefonu numarası giriniz (ör. 0532 123 45 67).'),
  contactEmail: z
    .string()
    .trim()
    .email('Geçerli bir e-posta adresi giriniz.')
    .max(255)
    .optional()
    .or(z.literal('')),
  city: z.string().trim().min(2, 'İl zorunludur.').max(80),
  district: z.string().trim().min(2, 'İlçe zorunludur.').max(80),
  address: z.string().trim().max(500).optional().or(z.literal('')),
  customerNote: z.string().trim().max(2000).optional().or(z.literal('')),
  preferredContact: z.enum(PREFERRED_CONTACTS),
  // KVKK onayı: `literal(true)` ile işaretlenmemiş kutu şemayı geçemez.
  consentAccepted: z.literal(true, {
    errorMap: () => ({ message: 'Talep göndermek için aydınlatma metnini onaylamanız gerekir.' }),
  }),
});

type FormValues = z.infer<typeof schema>;

/**
 * Talep gönderme formu (SPEC §6.2).
 *
 * Başarılı gönderimde sepet TEMİZLENİR ve kullanıcı talep numarasının
 * gösterildiği sayfaya yönlendirilir. Sepetin temizlenmesi yönlendirmeden
 * ÖNCE yapılır: aksi hâlde geri tuşuyla dönen kullanıcı aynı talebi ikinci
 * kez gönderebilir.
 */
export function InquiryForm({
  items,
  onSubmitted,
}: {
  items: ActiveCartItem[];
  onSubmitted: () => void;
}) {
  const router = useRouter();
  const { account } = useCustomerAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { preferredContact: 'PHONE' },
  });

  /**
   * GİRİŞLİ KULLANICIDA İLETİŞİM ALANLARI PROFİLDEN ÖN DOLU GELİR
   * (Sprint 11 şartı 3) ve DÜZENLENEBİLİR kalır: çiftçi bu talebi oğlunun
   * numarasıyla ya da başka bir köydeki arazisi için gönderebilir.
   *
   * `isDirty` KONTROLÜ: kullanıcı bir alana dokunduktan sonra profil verisi
   * geldiğinde yazdığının üzerine yazılmaz.
   */
  useEffect(() => {
    if (account === null || isDirty) {
      return;
    }

    reset(
      {
        contactName: account.fullName,
        contactPhone: account.phone,
        contactEmail: account.email,
        preferredContact: 'PHONE',
      },
      // `keepDirtyValues`: yarış durumunda kullanıcının girdisi korunur.
      { keepDirtyValues: true },
    );
  }, [account, isDirty, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      publicInquiriesApi.create({
        contactName: values.contactName,
        contactPhone: values.contactPhone,
        ...(values.contactEmail !== undefined &&
          values.contactEmail !== '' && { contactEmail: values.contactEmail }),
        city: values.city,
        district: values.district,
        ...(values.address !== undefined && values.address !== '' && { address: values.address }),
        ...(values.customerNote !== undefined &&
          values.customerNote !== '' && { customerNote: values.customerNote }),
        preferredContact: values.preferredContact,
        consentAccepted: true,
        // Yayından kalkmış kalemler GÖNDERİLMEZ: backend zaten reddeder ve
        // kullanıcı formu doldurduktan sonra hata alırdı.
        items: toInquiryItems(items),
      }),
    onSuccess: (inquiry) => {
      onSubmitted();
      router.push(`/talep-basarili/${inquiry.inquiryNumber}`);
    },
    onError: (error: unknown) => {
      if (!(error instanceof ApiError)) {
        setFormError('Talep gönderilemedi. Lütfen tekrar deneyin.');

        return;
      }

      // Sunucu alan bazlı hata döndürdüyse ilgili girdinin altına yazılır;
      // kalem hataları forma değil listeye ait olduğu için genel mesajda
      // gösterilir.
      let handled = false;

      for (const detail of error.details) {
        const field = detail.field ?? '';

        if (field in schema.shape) {
          setError(field as keyof FormValues, { message: detail.message });
          handled = true;
        }
      }

      setFormError(
        handled
          ? null
          : error.details.length > 0
            ? `${error.message} ${error.details.map((d) => d.message).join(' ')}`
            : error.message,
      );
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-body-lg font-semibold">Talebinizi Gönderin</CardTitle>
        <CardDescription>
          Bilgilerinizi bırakın, sizi arayıp ihtiyacınızı netleştirelim.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          noValidate
          onSubmit={handleSubmit((values) => {
            setFormError(null);
            mutation.mutate(values);
          })}
          className="flex flex-col gap-4"
        >
          <FormField>
            <Label htmlFor="contactName" required>
              Ad Soyad
            </Label>
            <Input id="contactName" autoComplete="name" {...register('contactName')} />
            <FieldError message={errors.contactName?.message} />
          </FormField>

          <FormField>
            <Label htmlFor="contactPhone" required>
              Telefon
            </Label>
            <Input
              id="contactPhone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0532 123 45 67"
              {...register('contactPhone')}
            />
            <FieldError message={errors.contactPhone?.message} />
          </FormField>

          <FormField>
            <Label htmlFor="contactEmail">E-posta</Label>
            <Input
              id="contactEmail"
              type="email"
              autoComplete="email"
              {...register('contactEmail')}
            />
            <FieldHint>İsteğe bağlı. Talep özetini e-postayla da iletebiliriz.</FieldHint>
            <FieldError message={errors.contactEmail?.message} />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField>
              <Label htmlFor="city" required>
                İl
              </Label>
              <Input id="city" autoComplete="address-level1" {...register('city')} />
              <FieldError message={errors.city?.message} />
            </FormField>

            <FormField>
              <Label htmlFor="district" required>
                İlçe
              </Label>
              <Input id="district" autoComplete="address-level2" {...register('district')} />
              <FieldError message={errors.district?.message} />
            </FormField>
          </div>

          <FormField>
            <Label htmlFor="address">Adres</Label>
            <Input id="address" autoComplete="street-address" {...register('address')} />
            <FieldHint>İsteğe bağlı.</FieldHint>
            <FieldError message={errors.address?.message} />
          </FormField>

          <FormField>
            <Label htmlFor="preferredContact" required>
              Nasıl ulaşalım?
            </Label>
            <Select id="preferredContact" {...register('preferredContact')}>
              {PREFERRED_CONTACTS.map((value) => (
                <option key={value} value={value}>
                  {PREFERRED_CONTACT_LABELS[value]}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField>
            <Label htmlFor="customerNote">Notunuz</Label>
            <textarea
              id="customerNote"
              rows={3}
              placeholder="Uygulama zamanı, arazi büyüklüğü gibi bilgiler işimizi kolaylaştırır."
              className="w-full rounded-[8px] border border-outline-variant bg-surface-container-lowest px-4 py-3 text-[15px] text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary-container focus:ring-2 focus:ring-secondary-container"
              {...register('customerNote')}
            />
            <FieldError message={errors.customerNote?.message} />
          </FormField>

          {/* Ç-01: teslimatın mağazada olduğu AÇIKÇA yazılır. */}
          <Alert variant="info" title="Ürünler mağazadan teslim alınır">
            <p className="flex items-start gap-2">
              <Store className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Kargo gönderimi ve online ödeme yapılmaz. Talebiniz onaylandıktan sonra ürünleri
              mağazamızdan teslim alırsınız.
            </p>
          </Alert>

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
                &rsquo;ni okudum; iletişim bilgilerimin talebimin değerlendirilmesi amacıyla
                işlenmesini kabul ediyorum.
              </span>
            </label>
            <FieldError message={errors.consentAccepted?.message} />
          </FormField>

          {formError !== null ? (
            <Alert variant="error" title="Talep gönderilemedi">
              {formError}
            </Alert>
          ) : null}

          <Button type="submit" size="lg" disabled={mutation.isPending || items.length === 0}>
            <Send />
            {mutation.isPending ? 'Gönderiliyor...' : 'Talebi Gönder'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
