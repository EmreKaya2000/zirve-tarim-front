import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, Badge, cn } from '@zirve/ui';

import type { PublicProductDetail, SideEffectSeverity } from '@/lib/public-types';

/** Yan etki önem seviyelerinin Türkçe karşılığı ve rengi. */
const SEVERITY: Record<
  SideEffectSeverity,
  { label: string; variant: 'neutral' | 'info' | 'warning' | 'error' }
> = {
  LOW: { label: 'Düşük', variant: 'neutral' },
  MEDIUM: { label: 'Orta', variant: 'info' },
  HIGH: { label: 'Yüksek', variant: 'warning' },
  CRITICAL: { label: 'Kritik', variant: 'error' },
};

/** Başlıklı içerik bölümü — ürün detayındaki tüm bloklar bunu kullanır. */
export function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('border-t border-outline-variant pt-6', className)}>
      <h2 className="text-h3 text-on-surface">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Uzun metin blokları — açıklama, kullanım talimatı, saklama koşulları. */
export function ProseBlock({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-3 text-body-lg leading-relaxed text-on-surface-variant">
      {text.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

/** Etiket bulutu — bitkiler, toprak türleri, kullanım dönemleri. */
export function TagList({
  items,
}: {
  items: { id: string; name: string; href?: string; note: string | null; hint?: string | null }[];
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => {
        const content = (
          <>
            <span className="text-label-md">{item.name}</span>
            {item.hint !== null && item.hint !== undefined ? (
              <span className="text-sm opacity-70"> · {item.hint}</span>
            ) : null}
            {item.note !== null ? (
              <span className="block text-sm text-on-surface-variant">{item.note}</span>
            ) : null}
          </>
        );

        return (
          <li
            key={item.id}
            className="rounded-[10px] border border-outline-variant bg-surface-container-lowest px-3 py-2"
          >
            {item.href === undefined ? (
              content
            ) : (
              <Link href={item.href} className="hover:text-primary-container">
                {content}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Yararlar listesi. */
export function BenefitList({ benefits }: { benefits: PublicProductDetail['benefits'] }) {
  return (
    <ul className="flex flex-col gap-2">
      {benefits.map((entry) => (
        <li
          key={entry.benefit.id}
          className="rounded-[10px] border border-outline-variant bg-surface-container-lowest p-3"
        >
          <p className="text-label-md text-on-surface">{entry.benefit.name}</p>

          {entry.benefit.description !== null && entry.benefit.description !== undefined ? (
            <p className="mt-1 text-sm text-on-surface-variant">{entry.benefit.description}</p>
          ) : null}

          {entry.note !== null ? (
            <p className="mt-1 text-sm text-on-surface-variant">{entry.note}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Yan etkiler ve uyarılar.
 *
 * `severityOverride` VARSA O KULLANILIR: aynı yan etki farklı ürünlerde
 * farklı ciddiyette olabilir (bir üründe "orta", diğerinde "kritik").
 * Ürüne özel değer, taksonomideki genel değerin önüne geçer.
 */
export function SideEffectList({
  sideEffects,
}: {
  sideEffects: PublicProductDetail['sideEffects'];
}) {
  return (
    <ul className="flex flex-col gap-2">
      {sideEffects.map((entry) => {
        const severity = entry.severityOverride ?? entry.sideEffect.severity;
        const meta = SEVERITY[severity];
        const isSerious = severity === 'HIGH' || severity === 'CRITICAL';

        return (
          <li
            key={entry.sideEffect.id}
            className={cn(
              'flex gap-3 rounded-[10px] border p-3',
              isSerious ? 'border-error/30 bg-error-container/40' : 'border-outline-variant',
            )}
          >
            <AlertTriangle
              className={cn('mt-0.5 size-4 shrink-0', isSerious ? 'text-error' : 'text-warning')}
              aria-hidden="true"
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-label-md text-on-surface">{entry.sideEffect.name}</span>
                <Badge variant={meta.variant}>{meta.label}</Badge>
              </div>

              {entry.sideEffect.description !== null ? (
                <p className="mt-1 text-sm text-on-surface-variant">
                  {entry.sideEffect.description}
                </p>
              ) : null}

              {entry.sideEffect.precaution !== null ? (
                <p className="mt-1 text-sm text-on-surface">
                  <strong>Alınacak tedbir:</strong> {entry.sideEffect.precaution}
                </p>
              ) : null}

              {entry.note !== null ? (
                <p className="mt-1 text-sm text-on-surface-variant">{entry.note}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Yasal uyarı metni (SPEC §4.7).
 *
 * Ayarlardan gelir; mağaza yöneticisi panelden güncelleyebilir. Metin
 * tanımsızsa blok hiç gösterilmez — boş bir "Yasal Uyarı" başlığı
 * güven vermez.
 */
export function LegalWarning({ text }: { text: string | null }) {
  if (text === null) {
    return null;
  }

  return (
    <Alert variant="warning" title="Yasal Uyarı">
      <p className="whitespace-pre-line">{text}</p>
    </Alert>
  );
}

/** Kırıntı navigasyonu. */
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Sayfa yolu" className="text-sm text-on-surface-variant">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 ? <span aria-hidden="true">/</span> : null}

            {item.href === undefined ? (
              <span className="text-on-surface">{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:text-on-surface">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
