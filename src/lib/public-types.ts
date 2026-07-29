/**
 * Public API yanıt tipleri.
 *
 * KURAL 8'İN İSTEMCİ TARAFI YANSIMASI: bu tiplerde `purchasePrice` YOKTUR
 * ve `salePrice` İSTEĞE BAĞLIDIR. Sunucu `showPrice=false` olan üründe
 * fiyatı hiç göndermez; tipin bunu zorunlu göstermesi, arayüzde "0,00 TL"
 * gibi yanlış bir değerin ekrana gelmesine kapı açardı.
 *
 * Para alanları STRING'dir (docs/ARCHITECTURE.md §13.6): JS number'a
 * çevrilirse kuruş kaybı olur.
 */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface UnitTypeRef {
  id: string;
  name: string;
  code: string;
  allowsDecimal: boolean;
  measurementType?: string;
}

export interface PublicVariant {
  id: string;
  sku: string;
  name: string | null;
  unitQuantity: string;
  /** `showPrice=false` ise sunucu bu alanı HİÇ göndermez. */
  salePrice?: string;
  taxRate: string;
  minOrderQuantity: string;
  quantityStep: string;
  maxOrderQuantity: string | null;
  stockQuantity: string;
  isDefault: boolean;
  sortOrder: number;
  unitType: UnitTypeRef;
}

export interface PublicImage {
  id?: string;
  url: string;
  altText: string | null;
  isPrimary?: boolean;
  sortOrder?: number;
}

export interface BrandRef {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
}

export interface CategoryRef {
  id: string;
  name: string;
  slug: string;
}

export interface PublicProductListItem {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  showPrice: boolean;
  isFeatured: boolean;
  isNew: boolean;
  isPopular: boolean;
  createdAt: string;
  brand: BrandRef | null;
  images: PublicImage[];
  categories: { isPrimary: boolean; category: CategoryRef }[];
  variants: PublicVariant[];
}

export interface TaxonomyNote<T> {
  note: string | null;
  item: T;
}

export interface PlantRef {
  id: string;
  name: string;
  slug: string;
  latinName?: string | null;
  description?: string | null;
}

export interface SoilTypeRef {
  id: string;
  name: string;
  slug: string;
  phRange?: string | null;
  description?: string | null;
}

export interface BenefitRef {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
}

export type SideEffectSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SideEffectRef {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  severity: SideEffectSeverity;
  precaution: string | null;
}

export interface UsagePeriodRef {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

export interface PublicProductDetail extends PublicProductListItem {
  description: string | null;
  usageInstructions: string | null;
  ingredients: string | null;
  storageConditions: string | null;
  licenseNumber: string | null;
  metaTitle: string | null;
  metaDesc: string | null;
  plants: { note: string | null; plant: PlantRef }[];
  soilTypes: { note: string | null; soilType: SoilTypeRef }[];
  benefits: { note: string | null; benefit: BenefitRef }[];
  sideEffects: {
    note: string | null;
    severityOverride: SideEffectSeverity | null;
    sideEffect: SideEffectRef;
  }[];
  usagePeriods: { note: string | null; usagePeriod: UsagePeriodRef }[];
}

export type ProductRelationType =
  | 'COMPATIBLE'
  | 'INCOMPATIBLE'
  | 'SIMILAR'
  | 'ALTERNATIVE'
  | 'COMPLEMENTARY'
  | 'RECOMMENDED_TOGETHER';

export interface RelatedProduct {
  type: ProductRelationType;
  note: string | null;
  product: PublicProductListItem;
}

export interface CategoryNode extends CategoryRef {
  description?: string | null;
  imageUrl?: string | null;
  productCount?: number;
  children: CategoryNode[];
}

export interface CategoryDetail extends CategoryRef {
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  breadcrumb: CategoryRef[];
}

export interface Taxonomy {
  categories?: CategoryNode[];
  brands?: BrandRef[];
  plants?: PlantRef[];
  soilTypes?: SoilTypeRef[];
  benefits?: BenefitRef[];
  usagePeriods?: UsagePeriodRef[];
  unitTypes?: UnitTypeRef[];
}

export interface PublicSetting {
  key: string;
  value: string;
  valueType: 'string' | 'number' | 'boolean' | 'json';
}
