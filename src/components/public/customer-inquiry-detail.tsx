'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Package } from 'lucide-react';
import { INQUIRY_STATUS_LABELS, PREFERRED_CONTACT_LABELS } from '@zirve/types';
import { Alert, Badge, Button, Card, CardContent, Skeleton } from '@zirve/ui';

import { ApiError } from '@/lib/api-error';
import { customerInquiriesApi, CUSTOMER_QUERY_KEYS } from '@/lib/customer-api';
import { formatDate, formatMoney, formatQuantity } from '@/lib/format';
import { CUSTOMER_INQUIRY_STATUS_HINTS, inquiryStatusVariant } from '@/lib/inquiry-status';

import { EmptyState } from './states';

/**
 * Talep detayı — MÜŞTERİ GÖRÜNÜMÜ (Sprint 11 şartı 4).
 *
 * BAŞKASININ TALEBİ 404 DÖNER (403 değil). Arayüz de bunu "bulunamadı" olarak
 * gösterir; "bu talep size ait değil" demek, numaranın var olduğunu ele
 * verirdi.
 */
export function CustomerInquiryDetail({ inquiryNumber }: { inquiryNumber: string }) {
  const query = useQuery({
    queryKey: CUSTOMER_QUERY_KEYS.inquiry(inquiryNumber),
    queryFn: () => customerInquiriesApi.get(inquiryNumber),
    // 404 yeniden DENENMEZ: kayıt yoksa tekrar sormanın faydası olmaz ve
    // kullanıcı üç kat daha uzun bekler.
    retry: false,
  });

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-[12px]" />
        <Skeleton className="h-48 w-full rounded-[12px]" />
      </div>
    );
  }

  if (query.isError) {
    const isMissing = query.error instanceof ApiError && query.error.status === 404;

    return isMissing ? (
      <EmptyState
        title="Talep bulunamadı"
        description="Bu talep numarası hesabınızda kayıtlı değil. Misafir olarak gönderdiğiniz bir talep olabilir: e-posta adresinizi doğrulayarak geçmiş taleplerinizi hesabınıza taşıyabilirsiniz."
        icon={<Package className="size-10" aria-hidden="true" />}
        action={{ href: '/hesabim/taleplerim', label: 'Taleplerime dön' }}
      />
    ) : (
      <Alert variant="error" title="Talep yüklenemedi">
        Sayfayı yenileyip tekrar deneyin.
      </Alert>
    );
  }

  const inquiry = query.data;
  const hasHiddenPrices = inquiry.items.some((item) => item.displayedPrice === null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/hesabim/taleplerim">
            <ArrowLeft />
            Taleplerim
          </Link>
        </Button>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="font-financial text-h3 text-on-surface">{inquiry.inquiryNumber}</h2>

          <Badge variant={inquiryStatusVariant(inquiry.status)}>
            {INQUIRY_STATUS_LABELS[inquiry.status]}
          </Badge>
        </div>

        <p className="mt-1 text-sm text-on-surface-variant">
          {formatDate(inquiry.createdAt)} tarihinde gönderildi
        </p>
      </div>

      {/* Durumun ne anlama geldiği MÜŞTERİ DİLİYLE anlatılır. */}
      <Alert variant="info" title="Talebinizin durumu">
        {CUSTOMER_INQUIRY_STATUS_HINTS[inquiry.status]}

        {inquiry.contactedAt !== null ? (
          <p className="mt-1 text-sm">
            Sizinle {formatDate(inquiry.contactedAt)} tarihinde iletişime geçildi.
          </p>
        ) : null}
      </Alert>

      <section>
        <h3 className="text-label-md text-on-surface">Talep Ettiğiniz Ürünler</h3>

        <ul className="mt-3 flex flex-col gap-3">
          {inquiry.items.map((item, index) => (
            <li
              key={`${item.sku}-${index}`}
              className="flex flex-wrap items-start justify-between gap-3 rounded-[12px] border border-outline-variant bg-surface-container-lowest p-4"
            >
              <div className="min-w-0 flex-1">
                {/*
                  Ürün bağlantısı YALNIZ hâlâ yayındaysa verilir; sunucu
                  yayından kalkmış ürün için `productSlug: null` döner ve
                  kullanıcı 404 sayfasına götürülmez.
                */}
                {item.productSlug === null ? (
                  <p className="text-label-md text-on-surface">{item.productName}</p>
                ) : (
                  <Link
                    href={`/urunler/${item.productSlug}`}
                    className="text-label-md text-on-surface hover:text-primary-container"
                  >
                    {item.productName}
                  </Link>
                )}

                <p className="text-sm text-on-surface-variant">
                  {item.variantName ?? item.unitTypeName}
                  <span className="ml-2 font-financial opacity-70">{item.sku}</span>
                </p>

                {item.note !== null ? (
                  <p className="mt-1 text-sm text-on-surface-variant">Notunuz: {item.note}</p>
                ) : null}
              </div>

              <div className="text-right">
                <p className="font-financial text-label-md text-on-surface">
                  {formatQuantity(item.quantity)} {item.unitTypeName}
                </p>

                {item.lineTotal === null ? (
                  <p className="text-sm text-primary-container">Fiyat için danışın</p>
                ) : (
                  <p className="font-financial text-sm text-on-surface-variant">
                    {formatMoney(item.lineTotal)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <div className="flex items-baseline justify-between border-b border-outline-variant pb-3">
            <span className="text-label-md text-on-surface">Tahmini tutar</span>
            <span className="font-financial text-h3 text-on-surface">
              {formatMoney(inquiry.estimatedTotal)}
            </span>
          </div>

          {hasHiddenPrices ? (
            <p className="text-sm text-on-surface-variant">
              Bazı ürünlerin fiyatı gösterilmiyor; bu tutar onları içermez.
            </p>
          ) : null}

          <p className="text-sm text-on-surface-variant">
            Tutar talep anındaki fiyatlara göre hesaplanmıştır, bilgi amaçlıdır ve bağlayıcı
            değildir.
          </p>
        </CardContent>
      </Card>

      <section>
        <h3 className="text-label-md text-on-surface">İletişim Bilgileriniz</h3>

        <dl className="mt-3 grid gap-x-6 gap-y-3 rounded-[12px] border border-outline-variant p-4 sm:grid-cols-2">
          <Field label="Ad Soyad" value={inquiry.contactName} />
          <Field label="Telefon" value={inquiry.contactPhone} financial />
          <Field label="E-posta" value={inquiry.contactEmail ?? '—'} />
          <Field
            label="Tercih edilen iletişim"
            value={PREFERRED_CONTACT_LABELS[inquiry.preferredContact]}
          />
          <Field label="İl / İlçe" value={`${inquiry.city} / ${inquiry.district}`} />
          <Field label="Adres" value={inquiry.address ?? '—'} />
        </dl>

        {inquiry.customerNote !== null ? (
          <div className="mt-3 rounded-[12px] border border-outline-variant p-4">
            <p className="text-label-sm uppercase text-on-surface-variant">Notunuz</p>
            <p className="mt-1 whitespace-pre-line text-sm text-on-surface">
              {inquiry.customerNote}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  financial = false,
}: {
  label: string;
  value: string;
  financial?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-label-sm uppercase text-on-surface-variant opacity-70">{label}</dt>
      <dd
        className={`mt-0.5 truncate text-sm text-on-surface ${financial ? 'font-financial' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}
