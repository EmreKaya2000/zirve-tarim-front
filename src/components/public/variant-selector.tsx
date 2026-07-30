'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Minus, Plus, ShoppingBasket } from 'lucide-react';
import { Alert, Badge, Button, cn } from '@zirve/ui';

import { canAddToCart, CART_MAX_ITEMS, useActiveCart } from '@/lib/active-cart';
import { formatMoney, formatQuantity } from '@/lib/format';
import {
  decrement,
  increment,
  quantityErrorMessage,
  rulesOf,
  snapToStep,
  validateQuantity,
} from '@/lib/quantity';
import type { PublicVariant } from '@/lib/public-types';

/**
 * Varyasyon ve miktar seçici.
 *
 * Miktar kuralları burada UYGULANIR ama BAĞLAYICI DEĞİLDİR: aynı kurallar
 * talep gönderilirken sunucuda yeniden doğrulanır (Kural 10). Buradaki
 * denetim, kullanıcının geçersiz miktarı gönderdikten sonra hata almasını
 * önlemek içindir.
 */
export function VariantSelector({
  productSlug,
  productName,
  imageUrl,
  variants,
  showPrice,
}: {
  productSlug: string;
  productName: string;
  imageUrl: string | null;
  variants: PublicVariant[];
  showPrice: boolean;
}) {
  // Sepetin kaynağı oturum durumuna göre değişir (misafir -> localStorage,
  // girişli -> sunucu); ayrım `useActiveCart` içinde kalır.
  const cart = useActiveCart();

  const [selectedId, setSelectedId] = useState(
    variants.find((variant) => variant.isDefault)?.id ?? variants[0]?.id ?? '',
  );
  const [added, setAdded] = useState(false);

  const selected = variants.find((variant) => variant.id === selectedId) ?? variants[0];

  const rules = useMemo(() => (selected === undefined ? null : rulesOf(selected)), [selected]);

  const [quantity, setQuantity] = useState(() =>
    selected === undefined ? 0 : Number(selected.minOrderQuantity),
  );
  const [rawInput, setRawInput] = useState<string | null>(null);

  if (selected === undefined || rules === null) {
    return (
      <Alert variant="warning" title="Bu ürün için satış birimi tanımlanmamış">
        Bilgi almak için mağazamızla iletişime geçebilirsiniz.
      </Alert>
    );
  }

  /** Varyasyon değişince miktar o varyasyonun min değerine sıfırlanır. */
  const selectVariant = (variant: PublicVariant): void => {
    setSelectedId(variant.id);
    setQuantity(Number(variant.minOrderQuantity));
    setRawInput(null);
    setAdded(false);
  };

  const error = validateQuantity(quantity, rules);
  const stock = Number(selected.stockQuantity);
  const outOfStock = stock <= 0;

  // Zaten listede olan bir kalem güncellenir; sınır yalnız YENİ kalem
  // eklenirken işler.
  const limitReached = !canAddToCart(cart.items, selected.id);

  const addToCart = async (): Promise<void> => {
    await cart.add({
      variantId: selected.id,
      // Miktar STRING olarak saklanır: float'a çevrilirse 0.1+0.2 sorunu
      // sepette birikir (Kural 2 ile aynı gerekçe).
      quantity: String(quantity),
      productSlug,
      productName,
      variantName:
        selected.name ?? `${formatQuantity(selected.unitQuantity)} ${selected.unitType.code}`,
      unitCode: selected.unitType.code,
      unitName: selected.unitType.name,
      imageUrl,
      // Fiyat gizliyse null saklanır; sepette "danışın" yazacak.
      displayedPrice: showPrice ? (selected.salePrice ?? null) : null,
      minOrderQuantity: selected.minOrderQuantity,
      quantityStep: selected.quantityStep,
      maxOrderQuantity: selected.maxOrderQuantity,
      allowsDecimal: selected.unitType.allowsDecimal,
    });

    setAdded(true);
  };

  return (
    <div className="flex flex-col gap-5">
      {variants.length > 1 ? (
        <fieldset>
          <legend className="text-label-md text-on-surface">Satış Birimi</legend>

          <div className="mt-2 flex flex-wrap gap-2">
            {variants.map((variant) => {
              const isActive = variant.id === selected.id;

              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => selectVariant(variant)}
                  aria-pressed={isActive}
                  className={cn(
                    'flex flex-col items-start gap-0.5 rounded-[10px] border px-4 py-2.5 text-left transition-colors',
                    isActive
                      ? 'border-primary-container bg-secondary-container text-on-primary-fixed-variant'
                      : 'border-outline-variant text-on-surface-variant hover:border-outline',
                  )}
                >
                  <span className="text-label-md">
                    {variant.name ??
                      `${formatQuantity(variant.unitQuantity)} ${variant.unitType.code}`}
                  </span>

                  {showPrice && variant.salePrice !== undefined ? (
                    <span className="font-financial text-sm">{formatMoney(variant.salePrice)}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {outOfStock ? (
          <Badge variant="warning">Stokta yok</Badge>
        ) : (
          <Badge variant="success">Stokta {formatQuantity(selected.stockQuantity)} adet</Badge>
        )}

        <span className="text-sm text-on-surface-variant">SKU: {selected.sku}</span>
      </div>

      <div>
        <label htmlFor="quantity" className="text-label-md text-on-surface">
          Miktar ({selected.unitType.name})
        </label>

        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center rounded-[10px] border border-outline-variant">
            <button
              type="button"
              onClick={() => {
                setQuantity((value) => decrement(value, rules));
                setRawInput(null);
                setAdded(false);
              }}
              disabled={quantity <= rules.min}
              aria-label="Miktarı azalt"
              className="flex size-10 items-center justify-center text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-40"
            >
              <Minus className="size-4" aria-hidden="true" />
            </button>

            <input
              id="quantity"
              type="text"
              inputMode="decimal"
              value={rawInput ?? formatQuantity(quantity)}
              onChange={(event) => setRawInput(event.target.value)}
              onBlur={() => {
                if (rawInput === null) {
                  return;
                }

                // Kullanıcı virgülle yazar; nokta ile hesaplanır.
                const parsed = Number(rawInput.replace(',', '.'));

                setQuantity(
                  Number.isFinite(parsed) && parsed > 0 ? snapToStep(parsed, rules) : rules.min,
                );
                setRawInput(null);
              }}
              className="w-20 border-x border-outline-variant bg-transparent py-2 text-center font-financial text-on-surface outline-none focus:bg-surface-container-lowest"
            />

            <button
              type="button"
              onClick={() => {
                setQuantity((value) => increment(value, rules));
                setRawInput(null);
                setAdded(false);
              }}
              disabled={rules.max !== null && quantity >= rules.max}
              aria-label="Miktarı artır"
              className="flex size-10 items-center justify-center text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-40"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>

          <span className="text-sm text-on-surface-variant">
            {formatQuantity(rules.min)} {rules.unitCode} ve katları
            {rules.step !== rules.min ? ` (${formatQuantity(rules.step)} adımlı)` : ''}
          </span>
        </div>

        {error !== null ? (
          <p role="alert" className="mt-2 text-sm text-error">
            {quantityErrorMessage(error, rules.unitCode)}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Button
          size="lg"
          onClick={() => void addToCart()}
          loading={cart.isMutating}
          disabled={error !== null || limitReached || !cart.isReady}
        >
          <ShoppingBasket />
          Talep Listeme Ekle
        </Button>

        {added ? (
          <Alert variant="success" title="Talep listenize eklendi">
            <Link
              href="/talep-sepeti"
              className="underline transition-colors hover:text-primary-container"
            >
              Talep listesine git
            </Link>
          </Alert>
        ) : (
          <p className="text-sm text-on-surface-variant">
            Eklemek satın alma taahhüdü değildir. Listenizi tamamlayıp mağazaya gönderdiğinizde sizi
            arayıp fiyatı netleştiriyoruz.
          </p>
        )}

        {limitReached ? (
          <Alert variant="warning" title="Talep listesi dolu">
            Listenizde en fazla {CART_MAX_ITEMS} farklı ürün olabilir. Mevcut talebinizi
            gönderdikten sonra yenisini oluşturabilirsiniz.
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
