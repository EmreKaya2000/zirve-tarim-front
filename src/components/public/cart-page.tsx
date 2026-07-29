'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CloudUpload,
  ImageOff,
  Minus,
  Plus,
  ShoppingBasket,
  Trash2,
} from 'lucide-react';
import { Alert, Button, Card, CardContent, ConfirmDialog, cn } from '@zirve/ui';

import { showToast } from '@/components/toast';
import { useActiveCart, type ActiveCartItem } from '@/lib/active-cart';
import { useCartStore } from '@/lib/cart-store';
import { customerCartApi, CUSTOMER_QUERY_KEYS } from '@/lib/customer-api';
import { formatMoney, formatQuantity } from '@/lib/format';
import { ApiError } from '@/lib/api-error';
import { publicInquiriesApi, type CartValidationResult } from '@/lib/inquiries-api';
import {
  decrement,
  increment,
  quantityErrorMessage,
  validateQuantity,
  type QuantityRules,
} from '@/lib/quantity';
import { useCustomerAuth } from '@/providers/customer-auth-provider';

import { EmptyState } from './states';
import { InquiryForm } from './inquiry-form';

/**
 * Talep listesi (sepet) sayfası.
 *
 * İKİ KAYNAK, TEK ARAYÜZ (Sprint 11): sepet misafirde localStorage'dan,
 * girişli kullanıcıda sunucudan gelir. Ayrım `useActiveCart` içinde kalır
 * (bkz. lib/active-cart.ts).
 *
 * SUNUCU DOĞRULAMASI YALNIZ MİSAFİR YOLUNDA yapılır: localStorage ürünün
 * yayından kalktığını bilemez, bu yüzden sayfa açılışında
 * `POST /public/cart/validate` çağrılır (Sprint 6 akışı, ARCHITECTURE §10.1).
 * Sunucu sepeti ise her okumada güncel katalog verisiyle ve `isAvailable`
 * işaretiyle geldiği için ikinci bir doğrulama isteği gereksizdir.
 */
export function CartPage() {
  const cart = useActiveCart();
  const { isAuthenticated } = useCustomerAuth();

  const [confirmClear, setConfirmClear] = useState(false);
  const [validation, setValidation] = useState<CartValidationResult | null>(null);
  const [issues, setIssues] = useState<{ variantId: string | null; message: string }[]>([]);

  const validateMutation = useMutation({
    mutationFn: (items: ActiveCartItem[]) =>
      publicInquiriesApi.validateCart(
        items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
      ),
    onSuccess: (result) => {
      setValidation(result);
      setIssues([]);
    },
    onError: (error: unknown) => {
      setValidation(null);
      setIssues(toIssues(error, cart.items));
    },
  });

  // Hazır olmadan doğrulama çağrılmaz: sepet henüz boş görünür ve sunucuya
  // boş liste gönderilirdi.
  useEffect(() => {
    if (!cart.isReady || cart.isServerCart || cart.items.length === 0) {
      return;
    }

    validateMutation.mutate(cart.items);
    // `cart.items` bağımlılığa EKLENMEZ: her miktar değişiminde sunucuya
    // istek atmak gereksiz yük olur. Kullanıcı miktar değiştirdiğinde arayüz
    // kendi kurallarıyla denetler; bağlayıcı doğrulama gönderimde yapılır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.isReady, cart.isServerCart]);

  useRetryPendingMerge(isAuthenticated && cart.isReady);

  if (!cart.isReady) {
    return <CartSkeleton />;
  }

  if (cart.items.length === 0) {
    return (
      <EmptyState
        title="Talep listeniz boş"
        description="Ürünleri inceleyip ihtiyacınızı listeye ekleyin, sonra tek seferde mağazamıza iletin."
        icon={<ShoppingBasket className="size-10" aria-hidden="true" />}
        action={{ href: '/urunler', label: 'Ürünlere göz at' }}
      />
    );
  }

  const issueFor = (variantId: string): string | undefined =>
    issues.find((issue) => issue.variantId === variantId)?.message;

  const generalIssues = issues.filter((issue) => issue.variantId === null);
  const unavailableCount = cart.items.filter((item) => !item.isAvailable).length;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
      <div className="flex flex-col gap-4">
        {/*
          Girişli kullanıcıya sepetin taşındığı SÖYLENİR: cihaz değiştirdiğinde
          listesini bulacağını bilmezse, bu sprintin sağladığı değeri hiç fark
          etmez.
        */}
        {cart.isServerCart ? (
          <p className="flex items-center gap-2 text-sm text-on-surface-variant">
            <CloudUpload className="size-4 shrink-0 text-success" aria-hidden="true" />
            Listeniz hesabınıza kayıtlı; diğer cihazlarınızda da görünür.
          </p>
        ) : null}

        {generalIssues.length > 0 ? (
          <Alert variant="warning" title="Listenizde düzeltilmesi gereken kalemler var">
            <ul className="mt-1 flex flex-col gap-1">
              {generalIssues.map((issue, index) => (
                <li key={index}>{issue.message}</li>
              ))}
            </ul>
          </Alert>
        ) : null}

        {unavailableCount > 0 ? (
          <Alert variant="warning" title="Bazı ürünler artık satışta değil">
            {unavailableCount} ürün yayından kalkmış. Talebi göndermeden önce listeden kaldırmanız
            gerekiyor; bu ürünler tahmini tutara da katılmaz.
          </Alert>
        ) : null}

        <ul className="flex flex-col gap-3">
          {cart.items.map((item) => (
            <CartRow
              key={item.key}
              item={item}
              issue={issueFor(item.variantId)}
              disabled={cart.isMutating}
              onQuantityChange={(quantity) => void cart.updateQuantity(item, quantity)}
              onRemove={() => void cart.remove(item)}
            />
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost">
            <Link href="/urunler">Alışverişe devam et</Link>
          </Button>

          <Button
            variant="outline"
            onClick={() => setConfirmClear(true)}
            disabled={cart.isMutating}
          >
            <Trash2 />
            Listeyi temizle
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-24">
        <Summary items={cart.items} validation={validation} />

        <InquiryForm items={cart.items} onSubmitted={() => void cart.clear()} />
      </div>

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Talep listesini temizle"
        description="Listedeki tüm ürünler kaldırılacak. Bu işlem geri alınamaz."
        confirmLabel="Temizle"
        onConfirm={() => {
          void cart.clear();
          setConfirmClear(false);
        }}
      />
    </div>
  );
}

/**
 * Girişten sonra taşınamamış misafir sepetini YENİDEN taşımayı dener.
 *
 * NE ZAMAN OLUŞUR: giriş anında birleştirme isteği ağ hatasıyla düştüğünde.
 * O durumda yerel sepet BİLİNÇLİ OLARAK silinmez (kullanıcı listesini
 * kaybetmesin) ve burada ikinci bir şans verilir — sepet sayfası, listeyi
 * görmek isteyen kullanıcının doğal olarak geldiği yerdir.
 *
 * `useRef` kilidi: sayfa her render'ında yeniden denemek, hata kalıcıysa
 * sonsuz istek döngüsü üretirdi.
 */
function useRetryPendingMerge(enabled: boolean): void {
  const queryClient = useQueryClient();
  const localItems = useCartStore((state) => state.items);
  const clearLocalCart = useCartStore((state) => state.clear);
  const attempted = useRef(false);

  useEffect(() => {
    if (!enabled || attempted.current || localItems.length === 0) {
      return;
    }

    attempted.current = true;

    customerCartApi
      .merge(
        localItems.map((item) => ({
          productVariantId: item.variantId,
          quantity: item.quantity,
        })),
      )
      .then((result) => {
        clearLocalCart();
        queryClient.setQueryData(CUSTOMER_QUERY_KEYS.cart, result.cart);

        showToast({
          variant: result.skippedItems.length > 0 ? 'warning' : 'success',
          title: 'Talep listeniz hesabınıza taşındı',
          lines:
            result.skippedItems.length > 0
              ? result.skippedItems.map((item) =>
                  item.productName === null ? item.message : `${item.productName}: ${item.message}`,
                )
              : undefined,
        });
      })
      .catch(() => {
        showToast({
          variant: 'warning',
          title: 'Listeniz hesabınıza taşınamadı',
          lines: ['Ürünler cihazınızda duruyor. Sayfayı yenileyip tekrar deneyebilirsiniz.'],
        });
      });
  }, [enabled, localItems, clearLocalCart, queryClient]);
}

/** Tek sepet satırı — miktar düzenleme ve kaldırma. */
function CartRow({
  item,
  issue,
  disabled,
  onQuantityChange,
  onRemove,
}: {
  item: ActiveCartItem;
  issue?: string;
  disabled: boolean;
  onQuantityChange: (quantity: string) => void;
  onRemove: () => void;
}) {
  const rules: QuantityRules = useMemo(
    () => ({
      min: Number(item.minOrderQuantity),
      step: Number(item.quantityStep),
      max: item.maxOrderQuantity === null ? null : Number(item.maxOrderQuantity),
      allowsDecimal: item.allowsDecimal,
      unitCode: item.unitCode,
    }),
    [item],
  );

  const quantity = Number(item.quantity);
  const error = validateQuantity(quantity, rules);
  const lineTotal = item.displayedPrice === null ? null : Number(item.displayedPrice) * quantity;

  // Sunucudan gelen "artık satışta değil" bilgisi, arayüzün kendi miktar
  // uyarısından ÖNCE gösterilir: miktarı düzeltmenin bir anlamı yoktur.
  const blockingMessage = item.unavailableReason ?? issue;

  return (
    <li
      className={cn(
        'flex gap-4 rounded-[12px] border bg-surface-container-lowest p-4',
        blockingMessage === undefined
          ? 'border-outline-variant'
          : 'border-error/40 bg-error-container/30',
      )}
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-[8px] bg-surface-container-low">
        {item.imageUrl === null ? (
          <div className="flex size-full items-center justify-center text-outline">
            <ImageOff className="size-6" aria-hidden="true" />
          </div>
        ) : (
          <Image src={item.imageUrl} alt="" fill sizes="80px" className="object-cover" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/urunler/${item.productSlug}`}
              className="text-label-md text-on-surface hover:text-primary-container"
            >
              {item.productName}
            </Link>

            {item.variantName !== null ? (
              <p className="text-sm text-on-surface-variant">{item.variantName}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            aria-label={`${item.productName} ürününü listeden kaldır`}
            className="flex size-8 shrink-0 items-center justify-center rounded-[8px] text-on-surface-variant hover:bg-surface-container-high hover:text-error disabled:opacity-40"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center rounded-[8px] border border-outline-variant">
            <button
              type="button"
              onClick={() => onQuantityChange(String(decrement(quantity, rules)))}
              disabled={disabled || quantity <= rules.min || !item.isAvailable}
              aria-label="Miktarı azalt"
              className="flex size-9 items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40"
            >
              <Minus className="size-4" aria-hidden="true" />
            </button>

            {/*
              `output` kullanıldı: değer bir hesaplama sonucudur ve
              role="status" taşır. Testler ve ekran okuyucular bu satırın
              miktarını sayfadaki diğer sayılardan ayırabilir.
            */}
            <output
              aria-label={`${item.productName} miktarı`}
              className="min-w-16 px-2 text-center font-financial text-sm text-on-surface"
            >
              {formatQuantity(item.quantity)} {item.unitCode}
            </output>

            <button
              type="button"
              onClick={() => onQuantityChange(String(increment(quantity, rules)))}
              disabled={
                disabled || (rules.max !== null && quantity >= rules.max) || !item.isAvailable
              }
              aria-label="Miktarı artır"
              className="flex size-9 items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>

          {item.displayedPrice === null ? (
            <span className="text-sm text-primary-container">Fiyat için danışın</span>
          ) : (
            <span className="font-financial text-label-md text-on-surface">
              {formatMoney(lineTotal)}
            </span>
          )}
        </div>

        {error !== null && item.isAvailable ? (
          <p role="alert" className="text-sm text-error">
            {quantityErrorMessage(error, rules.unitCode)}
          </p>
        ) : null}

        {blockingMessage !== undefined ? (
          <p role="alert" className="flex items-start gap-1.5 text-sm text-error">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {blockingMessage}
          </p>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Tahmini tutar.
 *
 * BAĞLAYICI DEĞİLDİR ve bu açıkça yazılır. Fiyatı gizli kalem varsa toplam
 * eksiktir; kullanıcı "toplam bu" sanmasın diye ayrıca uyarılır.
 */
function Summary({
  items,
  validation,
}: {
  items: ActiveCartItem[];
  validation: CartValidationResult | null;
}) {
  // Yayından kalkmış kalemler hiçbir toplama girmez: mağazaya iletilemeyecek
  // bir ürünü tutara katmak yanıltıcı olurdu.
  const available = items.filter((item) => item.isAvailable);
  const priced = available.filter((item) => item.displayedPrice !== null);
  const hasHidden = priced.length !== available.length;

  // Misafir yolunda sunucu doğrulaması geldiyse ONUN toplamı gösterilir:
  // fiyat değişmişse ekranda güncel değer olur.
  const total =
    validation === null
      ? priced.reduce((sum, item) => sum + Number(item.displayedPrice) * Number(item.quantity), 0)
      : Number(validation.estimatedTotal);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <div className="flex items-baseline justify-between">
          <span className="text-on-surface-variant">Ürün sayısı</span>
          <span className="font-financial text-on-surface">{available.length}</span>
        </div>

        <div className="flex items-baseline justify-between border-t border-outline-variant pt-3">
          <span className="text-label-md text-on-surface">Tahmini tutar</span>
          <span className="font-financial text-h3 text-on-surface">{formatMoney(total)}</span>
        </div>

        {hasHidden ? (
          <p className="text-sm text-on-surface-variant">
            Bazı ürünlerin fiyatı gösterilmiyor; bu tutar onları içermez.
          </p>
        ) : null}

        <Alert variant="info" title="Bu bir sipariş değildir">
          Tutar bilgi amaçlıdır ve bağlayıcı değildir. Stok rezerve edilmez; talebinizi aldıktan
          sonra sizi arayıp fiyat ve teslimatı netleştiriyoruz.
        </Alert>
      </CardContent>
    </Card>
  );
}

function CartSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 2 }, (_, index) => (
        <div
          key={index}
          className="h-28 animate-pulse rounded-[12px] bg-surface-container-high"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/**
 * Sunucu hatasını satır bazlı uyarılara çevirir.
 *
 * Backend `items[2].quantity` biçiminde alan yolu döndürür; buradaki
 * indeks GÖNDERİLEN listenin indeksidir, bu yüzden aynı sırayla eşlenir.
 */
function toIssues(
  error: unknown,
  items: ActiveCartItem[],
): { variantId: string | null; message: string }[] {
  if (!(error instanceof ApiError)) {
    return [{ variantId: null, message: 'Liste doğrulanamadı. Lütfen tekrar deneyin.' }];
  }

  if (error.details.length === 0) {
    return [{ variantId: null, message: error.message }];
  }

  return error.details.map((detail) => {
    const match = /^items\[(\d+)\]/.exec(detail.field ?? '');
    const index = match === null ? -1 : Number(match[1]);
    const item = index >= 0 ? items[index] : undefined;

    return { variantId: item?.variantId ?? null, message: detail.message };
  });
}
