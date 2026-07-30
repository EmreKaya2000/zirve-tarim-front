'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import {
  ChevronDown,
  ClipboardList,
  LogIn,
  LogOut,
  Menu,
  Search,
  ShoppingBasket,
  Sprout,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { Button, cn } from '@zirve/ui';

import { useActiveCart } from '@/lib/active-cart';
import { SITE_NAME } from '@/lib/env';
import type { CategoryNode } from '@/lib/public-types';
import { useCustomerAuth, useCustomerLogout } from '@/providers/customer-auth-provider';

/** Üst menüdeki sabit bağlantılar. */
const NAV_LINKS = [
  { href: '/urunler', label: 'Ürünler' },
  { href: '/kategoriler', label: 'Kategoriler' },
  { href: '/markalar', label: 'Markalar' },
  { href: '/bitkiler', label: 'Bitkiler' },
  { href: '/iletisim', label: 'İletişim' },
] as const;

/**
 * Vitrin üst çubuğu.
 *
 * Client bileşen: arama kutusu, kategori açılır menüsü ve mobil çekmece
 * etkileşim gerektirir. Kategori verisi PROP OLARAK gelir — sunucu
 * bileşeni olan layout onu ISR ile bir kez çeker, her gezinmede yeniden
 * istek atılmaz.
 */
export function SiteHeader({ categories }: { categories: CategoryNode[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isCategoryOpen, setCategoryOpen] = useState(false);
  const [term, setTerm] = useState(searchParams.get('q') ?? '');

  // Mobil çekmece açıkken arka planın kaymaması için.
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  const submitSearch = (event: FormEvent): void => {
    event.preventDefault();
    setMenuOpen(false);

    const trimmed = term.trim();

    router.push(trimmed === '' ? '/urunler' : `/urunler?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 lg:px-8">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="-ml-2 flex size-10 items-center justify-center rounded-[10px] text-on-surface-variant hover:bg-surface-container-high lg:hidden"
          aria-label="Menüyü aç"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>

        <Link
          href="/"
          className="flex shrink-0 items-center gap-3 transition-opacity hover:opacity-80"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-primary text-on-primary">
            <Sprout className="size-5" aria-hidden="true" />
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-label-md text-on-surface">{SITE_NAME}</span>
            <span className="block text-label-sm uppercase text-on-surface-variant opacity-70">
              Ziraat ve Tarım Ürünleri
            </span>
          </span>
        </Link>

        {/* Masaüstü arama */}
        <form onSubmit={submitSearch} className="ml-2 hidden max-w-md flex-1 lg:flex">
          <label htmlFor="site-search" className="sr-only">
            Ürün ara
          </label>
          <div className="relative w-full">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-outline"
              aria-hidden="true"
            />
            <input
              id="site-search"
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Ürün, marka veya etken madde ara..."
              className="w-full rounded-full border border-outline-variant bg-surface-container-lowest py-2 pl-9 pr-4 text-sm text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary-container focus:ring-2 focus:ring-secondary-container"
            />
          </div>
        </form>

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          <div
            className="relative"
            onMouseLeave={() => setCategoryOpen(false)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setCategoryOpen(false);
              }
            }}
          >
            <button
              type="button"
              onClick={() => setCategoryOpen((open) => !open)}
              onMouseEnter={() => setCategoryOpen(true)}
              aria-expanded={isCategoryOpen}
              className="flex items-center gap-1 rounded-[8px] px-3 py-2 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            >
              Kategoriler
              <ChevronDown
                className={cn('size-4 transition-transform', isCategoryOpen && 'rotate-180')}
                aria-hidden="true"
              />
            </button>

            {isCategoryOpen ? <CategoryMenu categories={categories} /> : null}
          </div>

          {NAV_LINKS.filter((link) => link.href !== '/kategoriler').map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-[8px] px-3 py-2 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-2">
          <Link
            href="/urunler"
            className="flex size-10 items-center justify-center rounded-[10px] text-on-surface-variant hover:bg-surface-container-high lg:hidden"
            aria-label="Ürünlerde ara"
          >
            <Search className="size-5" aria-hidden="true" />
          </Link>

          <CartButton />

          <AccountMenu />
        </div>
      </div>

      {isMenuOpen ? (
        <MobileMenu
          categories={categories}
          term={term}
          onTermChange={setTerm}
          onSubmit={submitSearch}
          onClose={() => setMenuOpen(false)}
        />
      ) : null}
    </header>
  );
}

/** Masaüstü kategori açılır menüsü — iki seviye. */
function CategoryMenu({ categories }: { categories: CategoryNode[] }) {
  return (
    <div className="absolute right-0 top-full z-50 mt-1 w-[560px] rounded-[12px] border border-outline-variant bg-surface-container-lowest p-4 shadow-lg">
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {categories.slice(0, 8).map((category) => (
          <div key={category.id}>
            <Link
              href={`/kategori/${category.slug}`}
              className="text-label-md text-on-surface hover:text-primary-container"
            >
              {category.name}
            </Link>

            {category.children.length > 0 ? (
              <ul className="mt-1 flex flex-col gap-1">
                {category.children.slice(0, 4).map((child) => (
                  <li key={child.id}>
                    <Link
                      href={`/kategori/${child.slug}`}
                      className="text-sm text-on-surface-variant hover:text-on-surface"
                    >
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>

      <Link
        href="/kategoriler"
        className="mt-4 block border-t border-outline-variant pt-3 text-label-sm uppercase text-primary-container transition-colors hover:text-primary"
      >
        Tüm kategoriler
      </Link>
    </div>
  );
}

/** Mobil tam ekran menü. */
function MobileMenu({
  categories,
  term,
  onTermChange,
  onSubmit,
  onClose,
}: {
  categories: CategoryNode[];
  term: string;
  onTermChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface lg:hidden">
      <div className="flex h-16 items-center justify-between border-b border-outline-variant px-4">
        <span className="text-label-md text-on-surface">Menü</span>
        <button
          type="button"
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-[10px] text-on-surface-variant hover:bg-surface-container-high"
          aria-label="Menüyü kapat"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <form onSubmit={onSubmit}>
          <label htmlFor="mobile-search" className="sr-only">
            Ürün ara
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-outline"
              aria-hidden="true"
            />
            <input
              id="mobile-search"
              type="search"
              value={term}
              onChange={(event) => onTermChange(event.target.value)}
              placeholder="Ürün ara..."
              className="w-full rounded-full border border-outline-variant bg-surface-container-lowest py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary-container focus:ring-2 focus:ring-secondary-container"
            />
          </div>
        </form>

        <nav className="mt-6 flex flex-col">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="border-b border-outline-variant py-3 text-label-md text-on-surface transition-colors hover:text-primary-container"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <MobileAccountLinks onClose={onClose} />

        <p className="mt-6 text-label-sm uppercase text-on-surface-variant">Kategoriler</p>
        <ul className="mt-2 flex flex-col">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/kategori/${category.slug}`}
                onClick={onClose}
                className="block border-b border-outline-variant py-3 text-sm text-on-surface-variant transition-colors hover:text-on-surface"
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>

        <Button asChild variant="outline" className="mt-6 w-full">
          <Link href="/admin" onClick={onClose}>
            Yönetim Paneli
          </Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * Mobil çekmecedeki hesap bölümü.
 *
 * Masaüstündeki açılır menünün karşılığı: küçük ekranda açılır menü
 * kullanılabilir değildir, bağlantılar doğrudan listelenir.
 */
function MobileAccountLinks({ onClose }: { onClose: () => void }) {
  const { account, isAuthenticated, isHydrated, isEmailVerified } = useCustomerAuth();
  const logout = useCustomerLogout();

  if (!isHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <div className="mt-6 flex flex-col gap-2">
        <Button asChild className="w-full">
          <Link href="/giris" onClick={onClose}>
            <LogIn />
            Giriş Yap
          </Link>
        </Button>

        <Button asChild variant="outline" className="w-full">
          <Link href="/kayit" onClick={onClose}>
            <UserPlus />
            Kayıt Ol
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-[12px] border border-outline-variant p-3">
      <p className="truncate text-label-md text-on-surface">{account?.fullName ?? 'Hesabım'}</p>
      <p className="truncate text-sm text-on-surface-variant">{account?.email}</p>

      {!isEmailVerified ? (
        <p className="mt-1 text-sm text-on-warning-container">E-postanız doğrulanmadı</p>
      ) : null}

      <nav className="mt-2 flex flex-col">
        <Link
          href="/hesabim"
          onClick={onClose}
          className="flex items-center gap-2 border-t border-outline-variant py-3 text-sm text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <User className="size-4" aria-hidden="true" />
          Hesabım
        </Link>

        <Link
          href="/hesabim/taleplerim"
          onClick={onClose}
          className="flex items-center gap-2 border-t border-outline-variant py-3 text-sm text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <ClipboardList className="size-4" aria-hidden="true" />
          Taleplerim
        </Link>

        <button
          type="button"
          onClick={() => {
            onClose();
            void logout();
          }}
          className="flex items-center gap-2 border-t border-outline-variant py-3 text-left text-sm text-on-surface-variant transition-colors hover:text-error"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Çıkış Yap
        </button>
      </nav>
    </div>
  );
}

/**
 * Talep listesi düğmesi ve adet rozeti.
 *
 * ROZET HAZIR OLMADAN GÖSTERİLMEZ: misafirde sepet localStorage'dadır,
 * girişli kullanıcıda sunucudan gelir; sunucu render'ında ikisi de bilinmez.
 * Sunucuda "0", istemcide "3" render edilirse React hidrasyon uyuşmazlığı
 * verir. `isReady` beklenerek bu önlenir.
 */
function CartButton() {
  const { itemCount, isReady } = useActiveCart();

  return (
    <Link
      href="/talep-sepeti"
      className="relative flex size-10 items-center justify-center rounded-[10px] text-on-surface-variant hover:bg-surface-container-high"
      aria-label={isReady && itemCount > 0 ? `Talep listesi (${itemCount} ürün)` : 'Talep listesi'}
    >
      <ShoppingBasket className="size-5" aria-hidden="true" />

      {isReady && itemCount > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-primary font-financial text-[11px] text-on-primary">
          {itemCount > 9 ? '9+' : itemCount}
        </span>
      ) : null}
    </Link>
  );
}

/**
 * Hesap menüsü — Sprint 11 şartı 2.
 *
 * HİDRASYON: oturum durumu localStorage'dan geri yüklenene kadar HİÇBİR ŞEY
 * render edilmez. "Giriş yap" gösterip hemen ardından hesap menüsüne
 * dönüşmek hem hidrasyon uyuşmazlığı hem de gözle görülür bir titreme
 * üretirdi.
 */
function AccountMenu() {
  const { account, isAuthenticated, isHydrated, isEmailVerified } = useCustomerAuth();
  const logout = useCustomerLogout();
  const [isOpen, setOpen] = useState(false);

  if (!isHydrated) {
    // Yer TUTULUR ki menü geldiğinde başlık kaymasın.
    return <div className="size-10" aria-hidden="true" />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-1">
        <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
          <Link href="/giris">Giriş</Link>
        </Button>

        <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
          <Link href="/kayit">Kayıt Ol</Link>
        </Button>

        <Link
          href="/giris"
          aria-label="Giriş yap"
          className="flex size-10 items-center justify-center rounded-[10px] text-on-surface-variant hover:bg-surface-container-high sm:hidden"
        >
          <User className="size-5" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label="Hesap menüsü"
        className="flex items-center gap-1 rounded-[10px] px-2 py-2 text-on-surface-variant transition-colors hover:bg-surface-container-high"
      >
        <span className="relative">
          <User className="size-5" aria-hidden="true" />

          {/*
            Doğrulanmamış e-posta için sessiz bir işaret: geçmiş talepler
            doğrulanmadan hesaba bağlanmaz, kullanıcı bunu fark etmeli.
          */}
          {!isEmailVerified ? (
            <span
              className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-warning"
              aria-hidden="true"
            />
          ) : null}
        </span>

        <span className="hidden max-w-24 truncate text-label-md lg:block">
          {account?.firstName ?? 'Hesabım'}
        </span>

        <ChevronDown
          className={cn('hidden size-4 transition-transform sm:block', isOpen && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-50 mt-1 w-60 rounded-[12px] border border-outline-variant bg-surface-container-lowest p-2 shadow-lg">
          <div className="border-b border-outline-variant px-3 pb-2 pt-1">
            <p className="truncate text-label-md text-on-surface">
              {account?.fullName ?? 'Hesabım'}
            </p>
            <p className="truncate text-sm text-on-surface-variant">{account?.email}</p>

            {!isEmailVerified ? (
              <p className="mt-1 text-sm text-on-warning-container">E-postanız doğrulanmadı</p>
            ) : null}
          </div>

          <nav className="mt-1 flex flex-col">
            <Link
              href="/hesabim"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            >
              <User className="size-4" aria-hidden="true" />
              Hesabım
            </Link>

            <Link
              href="/hesabim/taleplerim"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            >
              <ClipboardList className="size-4" aria-hidden="true" />
              Taleplerim
            </Link>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void logout();
              }}
              className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-left text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-error"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Çıkış Yap
            </button>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
