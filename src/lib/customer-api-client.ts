import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiErrorResponse, ApiSuccessResponse, CustomerLoginResponse } from '@zirve/types';
import type { PaginationMeta } from '@zirve/types';

import { ApiError } from './api-error';
import { customerAuthStore } from './customer-auth-store';
import { resolveApiBaseUrl } from './env';

/**
 * MÜŞTERİ istekleri için AYRI axios örneği — Sprint 11.
 *
 * NEDEN `apiClient` KULLANILMIYOR: o örnek tek bir `AuthBridge`e bağlıdır ve
 * o köprü yönetici oturumunu taşır. Aynı örnek paylaşılsaydı:
 *   - yönetici oturumu açıkken vitrinde gezinen kişinin müşteri isteklerine
 *     ADMIN jetonu eklenir ve `/customer/*` uçları 401 verirdi (audience
 *     ayrımı gereği — docs/ARCHITECTURE.md §8.4),
 *   - 401 sonrası yenileme yanlış uca (`/auth/refresh`) gider,
 *   - bir taraftaki çıkış diğerinin oturumunu düşürürdü.
 *
 * Yenileme mantığı `api-client.ts` ile AYNI DESENDEDİR (tek uçuş kuralı dahil);
 * tekrar eden kısım bilinçlidir — iki kimlik alanının davranışı ileride
 * ayrışabilir ve ortak bir soyutlama o ayrışmayı gizlerdi.
 */

const REQUEST_TIMEOUT_MS = 15_000;

/** Gövdesiz başarı yanıtı: silme uçlarının döndürdüğü durum kodu. */
const HTTP_NO_CONTENT = 204;

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

let onUnauthorized: (() => void) | null = null;

/** Oturum geçersizleştiğinde çağrılacak işleyiciyi kaydeder. */
export function setCustomerUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export const customerApiClient: AxiosInstance = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// --- İstek: müşteri jetonunu ekle ---
customerApiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = customerAuthStore.getAccessToken();

  if (token !== null && token.length > 0) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  return config;
});

/**
 * Eşzamanlı 401'lerde TEK yenileme isteği yapılmasını sağlar.
 *
 * Yenileme jetonu TEK KULLANIMLIKTIR: paralel iki istek ayrı ayrı yenileme
 * denerse ikincisi "yeniden kullanım" sayılır ve backend TÜM oturumları
 * düşürür. Kullanıcı sebepsiz yere giriş ekranına atılır.
 */
let refreshPromise: Promise<string> | null = null;

async function refreshCustomerToken(): Promise<string> {
  const refreshToken = customerAuthStore.getRefreshToken();

  if (refreshToken === null || refreshToken.length === 0) {
    throw ApiError.unknown(401, 'Oturum bulunamadı.');
  }

  // Interceptor'a takılmaması için ayrı bir axios çağrısı.
  const response = await axios.post<ApiSuccessResponse<CustomerLoginResponse>>(
    '/customer-auth/refresh',
    { refreshToken },
    {
      baseURL: resolveApiBaseUrl(),
      timeout: REQUEST_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' },
    },
  );

  const session = response.data.data;
  customerAuthStore.setSession(session);

  return session.accessToken;
}

// --- Yanıt: hatayı ApiError'a çevir, 401'de sessizce yenile ---
customerApiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!(error instanceof AxiosError)) {
      return Promise.reject(ApiError.unknown(0));
    }

    if (error.response === undefined) {
      return Promise.reject(ApiError.network());
    }

    const status = error.response.status;
    const body = error.response.data;
    const config = error.config as RetriableConfig | undefined;

    const apiError = isApiErrorResponse(body)
      ? ApiError.fromBody(body.error, status)
      : ApiError.unknown(status);

    const canRetry =
      status === 401 &&
      config !== undefined &&
      config._retried !== true &&
      // Yenileme ucunun kendisi 401 verdiyse tekrar denemek anlamsızdır.
      config.url?.includes('/customer-auth/refresh') !== true &&
      customerAuthStore.getRefreshToken() !== null;

    if (!canRetry) {
      if (status === 401) {
        customerAuthStore.clear();
        onUnauthorized?.();
      }

      return Promise.reject(apiError);
    }

    /*
     * YENİLEME İLE YENİDEN DENEME AYRI AYRI ELE ALINIR — gerekçe
     * `api-client.ts` içindeki aynı bloğun açıklamasında. Kısaca: yenilenmiş
     * jetonla yapılan isteğin kimlikle ilgisiz hatası (400, 404, 422) oturumu
     * SİLMEMELİDİR. Bu hata iki istemciye de aynı desenden kopyalanmıştı.
     */
    let newToken: string;

    try {
      refreshPromise = refreshPromise ?? refreshCustomerToken();
      newToken = await refreshPromise;
    } catch {
      customerAuthStore.clear();
      onUnauthorized?.();

      return Promise.reject(apiError);
    } finally {
      refreshPromise = null;
    }

    config._retried = true;
    config.headers.set('Authorization', `Bearer ${newToken}`);

    return customerApiClient.request(config);
  },
);

export async function customerGet<TData>(url: string, config?: AxiosRequestConfig): Promise<TData> {
  return unwrapResponse(await customerApiClient.get<ApiSuccessResponse<TData>>(url, config));
}

export async function customerPost<TData, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig,
): Promise<TData> {
  return unwrapResponse(await customerApiClient.post<ApiSuccessResponse<TData>>(url, body, config));
}

export async function customerPatch<TData, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig,
): Promise<TData> {
  return unwrapResponse(
    await customerApiClient.patch<ApiSuccessResponse<TData>>(url, body, config),
  );
}

export async function customerDelete<TData = void>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<TData> {
  return unwrapResponse(await customerApiClient.delete<ApiSuccessResponse<TData>>(url, config));
}

/** Sayfalanmış liste çeker; kayıtları ve sayfalama üstverisini birlikte döner. */
export async function customerGetPaginated<TItem>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<{ items: TItem[]; meta: PaginationMeta }> {
  const response = await customerApiClient.get<ApiSuccessResponse<TItem[]>>(url, config);
  const body = response.data;

  if (body.meta === undefined) {
    throw ApiError.unknown(
      response.status,
      'Liste yanıtında sayfalama üstverisi (meta) bulunamadı.',
    );
  }

  return { items: unwrap(body), meta: body.meta };
}

/**
 * Yanıtı HTTP durumuyla birlikte açar.
 *
 * 204 No Content'te gövde YOKTUR — Express, RFC 9110 gereği gövdeyi atar, bu
 * yüzden `ResponseInterceptor`ın sarmalayıcısı istemciye ulaşmaz. Koşul durum
 * koduna bakar, gövdenin boşluğuna değil: 200 ile gelen boş gövde hâlâ hatadır.
 * Ayrıntılı gerekçe `api-client.ts` içindeki eşdeğer fonksiyonda.
 */
function unwrapResponse<TData>(response: AxiosResponse<ApiSuccessResponse<TData>>): TData {
  if (response.status === HTTP_NO_CONTENT) {
    return undefined as unknown as TData;
  }

  return unwrap(response.data);
}

function unwrap<TData>(body: ApiSuccessResponse<TData>): TData {
  if (body.success !== true) {
    throw ApiError.unknown(200, 'Sunucu beklenmeyen bir yanıt biçimi döndürdü.');
  }

  return body.data;
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { success?: unknown; error?: unknown };

  if (candidate.success !== false || candidate.error === null) {
    return false;
  }

  if (typeof candidate.error !== 'object' || candidate.error === undefined) {
    return false;
  }

  const errorBody = candidate.error as { code?: unknown; message?: unknown };

  return typeof errorBody.code === 'string' && typeof errorBody.message === 'string';
}
