import type {
  CartMergeRequest,
  CartMergeResult,
  CartView,
  CustomerAccountProfile,
  CustomerInquiryDetail,
  CustomerInquiryListItem,
  CustomerLoginResponse,
  CustomerProfileUpdateRequest,
  CustomerProfileUpdateResponse,
  CustomerRegisterRequest,
  CustomerRegisterResponse,
  CustomerVerifyEmailResponse,
  PaginationMeta,
} from '@zirve/types';

import {
  customerDelete,
  customerGet,
  customerGetPaginated,
  customerPatch,
  customerPost,
} from './customer-api-client';

/**
 * Müşteri (public) API istemcisi — Sprint 11.
 *
 * Tümü `customerApiClient` üzerinden gider; yönetici oturumuyla karışmaz
 * (gerekçe: customer-api-client.ts başlığı).
 */

// =============================================================================
// KİMLİK
// =============================================================================

export const customerAuthApi = {
  /**
   * Kayıt.
   *
   * JETON DÖNMEZ — yanıt, e-posta kayıtlı olsun ya da olmasın aynıdır
   * (enumeration koruması). Çağıran taraf ardından `login` çağırır.
   */
  register: (payload: CustomerRegisterRequest): Promise<CustomerRegisterResponse> =>
    customerPost<CustomerRegisterResponse, CustomerRegisterRequest>(
      '/customer-auth/register',
      payload,
    ),

  login: (payload: { email: string; password: string }): Promise<CustomerLoginResponse> =>
    customerPost<CustomerLoginResponse, typeof payload>('/customer-auth/login', payload),

  logout: (refreshToken: string | null): Promise<{ success: boolean }> =>
    customerPost<{ success: boolean }, { refreshToken?: string }>(
      '/customer-auth/logout',
      refreshToken === null ? {} : { refreshToken },
    ),

  me: (): Promise<CustomerAccountProfile> =>
    customerGet<CustomerAccountProfile>('/customer-auth/me'),

  verifyEmail: (token: string): Promise<CustomerVerifyEmailResponse> =>
    customerPost<CustomerVerifyEmailResponse, { token: string }>('/customer-auth/verify-email', {
      token,
    }),

  resendVerification: (): Promise<{ success: true; message: string }> =>
    customerPost<{ success: true; message: string }>('/customer-auth/resend-verification'),

  forgotPassword: (email: string): Promise<{ success: true; message: string }> =>
    customerPost<{ success: true; message: string }, { email: string }>(
      '/customer-auth/forgot-password',
      { email },
    ),

  resetPassword: (payload: {
    token: string;
    password: string;
  }): Promise<{ success: true; message: string }> =>
    customerPost<{ success: true; message: string }, typeof payload>(
      '/customer-auth/reset-password',
      payload,
    ),
};

// =============================================================================
// PROFİL
// =============================================================================

export const customerProfileApi = {
  get: (): Promise<CustomerAccountProfile> =>
    customerGet<CustomerAccountProfile>('/customer/profile'),

  update: (payload: CustomerProfileUpdateRequest): Promise<CustomerProfileUpdateResponse> =>
    customerPatch<CustomerProfileUpdateResponse, CustomerProfileUpdateRequest>(
      '/customer/profile',
      payload,
    ),
};

// =============================================================================
// SEPET
// =============================================================================

export const customerCartApi = {
  get: (): Promise<CartView> => customerGet<CartView>('/customer/cart'),

  addItem: (payload: { productVariantId: string; quantity: string }): Promise<CartView> =>
    customerPost<CartView, typeof payload>('/customer/cart/items', payload),

  updateItem: (itemId: string, quantity: string): Promise<CartView> =>
    customerPatch<CartView, { quantity: string }>(`/customer/cart/items/${itemId}`, { quantity }),

  removeItem: (itemId: string): Promise<CartView> =>
    customerDelete<CartView>(`/customer/cart/items/${itemId}`),

  clear: (): Promise<CartView> => customerDelete<CartView>('/customer/cart'),

  /** Misafir (localStorage) sepetini hesaba taşır. */
  merge: (items: CartMergeRequest['items']): Promise<CartMergeResult> =>
    customerPost<CartMergeResult, CartMergeRequest>('/customer/cart/merge', { items }),
};

// =============================================================================
// TALEPLERİM
// =============================================================================

export const customerInquiriesApi = {
  list: (params: {
    page?: number;
    limit?: number;
  }): Promise<{ items: CustomerInquiryListItem[]; meta: PaginationMeta }> =>
    customerGetPaginated<CustomerInquiryListItem>('/customer/inquiries', { params }),

  get: (inquiryNumber: string): Promise<CustomerInquiryDetail> =>
    customerGet<CustomerInquiryDetail>(`/customer/inquiries/${inquiryNumber}`),
};

/** React Query anahtarları — geçersizleştirme tek yerden yapılsın. */
export const CUSTOMER_QUERY_KEYS = {
  cart: ['customer', 'cart'] as const,
  profile: ['customer', 'profile'] as const,
  inquiries: (page: number) => ['customer', 'inquiries', page] as const,
  inquiry: (inquiryNumber: string) => ['customer', 'inquiry', inquiryNumber] as const,
};
