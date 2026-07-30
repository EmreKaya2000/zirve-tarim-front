# ZirveTarım Front

Ziraat mağazasının **halka açık vitrini**: ürün kataloğu, filtreleme, ürün
detayı, talep sepeti ve müşteri hesabı. Next.js App Router, SEO uyumlu, mobil
öncelikli.

**Sepet bir sipariş değildir.** Online ödeme yoktur; sepet mağazaya iletilen bir
**talep**tir (SPEC §6). Ödeme ve teslimat fiziksel mağazada gerçekleşir.

## Üç depolu yapı

| Depo                                                                   | Ne yapar                                  |
| ---------------------------------------------------------------------- | ----------------------------------------- |
| [zirve-tarim-api](https://github.com/EmreKaya2000/zirve-tarim-api)     | REST API + `@zirve/types` sözleşme paketi |
| **zirve-tarim-front** (bu depo)                                        | Halka açık vitrin                         |
| [zirve-tarim-admin](https://github.com/EmreKaya2000/zirve-tarim-admin) | Yönetim paneli                            |

Bu depo **tek başına çalışmaz**: API'nin ayakta ve veritabanının seed edilmiş
olması gerekir.

## Hızlı başlangıç

### Geliştirme (önerilen — kod değişikliği anında yansır)

```bash
# 1) Altyapıyı kaldır. Api deposu bu deponun YANINDA klonlu olmalı.
git clone https://github.com/EmreKaya2000/zirve-tarim-api.git ../zirve-tarim-api
cd ../zirve-tarim-api && cp .env.example .env && docker compose up -d
docker compose exec api node prisma/seed.js
cd -

# 2) Vitrini çalıştır
cp .env.example .env
pnpm install
pnpm sync:types      # sözleşmeyi Api deposundan kopyalar
pnpm dev             # http://localhost:3000
```

### Üç uygulamayı birlikte, konteyner olarak

Üç depo yan yana klonluysa Api deposundan tek komut:

```bash
cd ../zirve-tarim-api && pnpm stack:up
```

Vitrin `:3000`, panel `:3001`, API `:4000` üzerinde ayağa kalkar. Ayrıntı Api
deposunun README'sinde.

## Komutlar

| Komut              | Açıklama                                                 |
| ------------------ | -------------------------------------------------------- |
| `pnpm dev`         | Geliştirme sunucusu (`:3000`)                            |
| `pnpm build`       | Derler + standalone çıktısını tamamlar                   |
| `pnpm start`       | Derlenmiş sunucuyu çalıştırır                            |
| `pnpm lint`        | ESLint — uyarı bile hata sayılır                         |
| `pnpm typecheck`   | `tsc --noEmit`                                           |
| `pnpm test:e2e`    | Playwright — 55 test (API ayakta olmalı)                 |
| `pnpm sync:types`  | `@zirve/types` sözleşmesini Api deposundan kopyalar      |
| `pnpm types:check` | Kopya taze mi? Ayrışmışsa hata verir (CI bu adımı koşar) |

> **`pnpm test:e2e` öncesi API'yi test kipinde kaldırın.** Api deposunda
> `pnpm e2e:api` çalıştırın. Normal kipte hız sınırı (giriş ucu 5 istek/dk)
> ve `MAIL_DRIVER=log` yüzünden testlerin bir kısmı ortam nedeniyle kırılır —
> kod yüzünden değil. Testler standalone sunucuyu `127.0.0.1:3100` üzerinde
> kaldırır; bu köken API'nin `CORS_ORIGINS` listesinde olmalıdır.
> Bitince `pnpm docker:up` ile normal kipe dönün.

## `@zirve/types` — sözleşme kopyası

`src/types/` klasörü **kopyadır**, kaynağı `zirve-tarim-api`. Her dosyanın
başında "ELLE DÜZENLEMEYİN" uyarısı vardır.

Neden kopya: paket API sözleşmesidir (71 tip + 116 çalışma zamanı değeri —
talep durum makinesi, `MAX_LIMIT`, `ERROR_CODES`, etiket haritaları).

**Registry kullanılmıyor ve bu denendi.** GitHub Packages, paket kapsamının depo
sahibiyle aynı olmasını zorunlu tutar; `@zirve/types` yayınlama denemesi
`403 permission_denied: The requested installation does not exist` verdi.
Gerekçe, alternatifler ve karar Api deposunun README'sinde.

**Ayrışma CI'da yakalanır** (`pnpm types:check`): kopya yeniden üretilir ve
`git diff --exit-code` ile fark aranır. Elle düzenlenen kopya derlemeyi kırar.

Sözleşmeyi değiştirmek gerekiyorsa **Api deposunda** değiştirin, sonra burada
`pnpm sync:types` çalıştırın.

## `@zirve/ui`

`src/ui/` klasörü tasarım sisteminin kopyasıdır ve **bu deponun malıdır** —
burada düzenlenebilir. Import yolu `@zirve/ui` olarak korundu (tsconfig alias),
böylece 29 dosyadaki import satırı değişmedi.

Panelde de bir kopyası var. Bilinçli bir karar: iki arayüzün tasarımı zamanla
ayrışabilir ve buradaki ayrışma kozmetiktir, gözle görülür. Sözleşme
(`types`) için aynı şey geçerli değildi, o yüzden orada senkron zorunlu.

## Sayfalar

```
/                          ana sayfa
/urunler  /urunler/[slug]  katalog ve ürün detayı
/kategoriler  /kategori/[slug]
/markalar     /marka/[slug]
/bitkiler     /bitki/[slug]
/talep-sepeti                        talep listesi
/talep-basarili/[inquiryNumber]      talep numarası
/giris  /kayit  /hesabim             müşteri hesabı (Sprint 11)
/sifremi-unuttum  /sifre-sifirla/[token]  /eposta-dogrula
/hakkimizda  /iletisim  /kvkk  /gizlilik  /kullanim-kosullari
```

Şartname: Api deposundaki [`docs/SPEC.md`](https://github.com/EmreKaya2000/zirve-tarim-api/blob/main/docs/SPEC.md)
