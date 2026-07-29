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

```bash
# 1) API'yi kaldır (bu deponun YANINDA klonlu olmalı)
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

## `@zirve/types` — sözleşme kopyası

`src/types/` klasörü **kopyadır**, kaynağı `zirve-tarim-api`. Her dosyanın
başında "ELLE DÜZENLEMEYİN" uyarısı vardır.

Neden kopya: paket API sözleşmesidir (71 tip + 116 çalışma zamanı değeri —
talep durum makinesi, `MAX_LIMIT`, `ERROR_CODES`, etiket haritaları). Registry
üzerinden dağıtmak en temiz yol ama paket PRIVATE olacağı için her makinede ve
her CI işinde `NODE_AUTH_TOKEN` isterdi. Kopya, token kurulmadan çalışan bir
sistem verir; **ayrışma CI'da yakalanır** (`pnpm types:check`).

Sözleşmeyi değiştirmek gerekiyorsa **Api deposunda** değiştirin, sonra burada
`pnpm sync:types` çalıştırın. Registry'ye geçiş adımları Api deposunun
README'sinde; import yolları (`@zirve/types`) değişmediği için uygulama kodu
etkilenmez.

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
