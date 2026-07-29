'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ClipboardList } from 'lucide-react';
import { INQUIRY_STATUS_LABELS } from '@zirve/types';
import { Alert, Badge, Pagination, Skeleton } from '@zirve/ui';

import { customerInquiriesApi, CUSTOMER_QUERY_KEYS } from '@/lib/customer-api';
import { formatDate, formatMoney } from '@/lib/format';
import { inquiryStatusVariant } from '@/lib/inquiry-status';

import { EmptyState } from './states';

const PAGE_SIZE = 10;

/**
 * "Taleplerim" listesi — Sprint 11 şartı 4.
 *
 * TAHMİNİ TUTAR GÖSTERİLİR ama BAĞLAYICI OLMADIĞI yazılır (Ç-01): bu bir
 * sipariş geçmişi değil, talep geçmişidir.
 */
export function CustomerInquiriesList() {
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: CUSTOMER_QUERY_KEYS.inquiries(page),
    queryFn: () => customerInquiriesApi.list({ page, limit: PAGE_SIZE }),
  });

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-[12px]" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <Alert variant="error" title="Talepleriniz yüklenemedi">
        Sayfayı yenileyip tekrar deneyin.
      </Alert>
    );
  }

  if (query.data.items.length === 0) {
    return (
      <EmptyState
        title="Henüz talep göndermediniz"
        description="Ürünleri inceleyip ihtiyacınızı listeye ekleyin, sonra tek seferde mağazamıza iletin. Gönderdiğiniz talepler burada görünecek."
        icon={<ClipboardList className="size-10" aria-hidden="true" />}
        action={{ href: '/urunler', label: 'Ürünlere göz at' }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {query.data.items.map((inquiry) => (
          <li key={inquiry.inquiryNumber}>
            <Link
              href={`/hesabim/taleplerim/${inquiry.inquiryNumber}`}
              className="flex items-center gap-4 rounded-[12px] border border-outline-variant bg-surface-container-lowest p-4 transition-colors hover:border-outline"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-financial text-label-md text-on-surface">
                    {inquiry.inquiryNumber}
                  </span>

                  <Badge variant={inquiryStatusVariant(inquiry.status)}>
                    {INQUIRY_STATUS_LABELS[inquiry.status]}
                  </Badge>
                </div>

                <p className="mt-1 text-sm text-on-surface-variant">
                  {formatDate(inquiry.createdAt)} &middot; {inquiry.itemCount} ürün
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="font-financial text-label-md text-on-surface">
                  {formatMoney(inquiry.estimatedTotal)}
                </p>
                <p className="text-label-sm uppercase text-on-surface-variant opacity-70">
                  tahmini
                </p>
              </div>

              <ChevronRight className="size-5 shrink-0 text-outline" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>

      {query.data.meta.totalPages > 1 ? (
        <Pagination
          page={query.data.meta.page}
          totalPages={query.data.meta.totalPages}
          total={query.data.meta.total}
          limit={query.data.meta.limit}
          itemLabel="talep"
          onPageChange={setPage}
        />
      ) : null}

      <p className="text-sm text-on-surface-variant">
        Tutarlar bilgi amaçlıdır ve bağlayıcı değildir; talebiniz onaylandığında kesin fiyat
        mağazamız tarafından bildirilir.
      </p>
    </div>
  );
}
