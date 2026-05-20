import { formatError } from '@educonnect/shared';

export interface RequestConfig extends RequestInit {
  params?: Record<string, string>;
  timeout?: number;
  retry?: number;
  retryDelay?: (attempt: number) => number;
  cancelToken?: string;
  allowOfflineQueue?: boolean;
}

export type Interceptor<T> = (data: T) => T | Promise<T>;

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => Promise<string | null>;
  getTenantId?: () => string | null;
  onUnauthorized?: () => void;
  defaultTimeout?: number;
  defaultRetry?: number;
  isOnline?: () => boolean;
  debug?: boolean;
}

export type ApiErrorKind = 'network' | 'auth' | 'tenant' | 'validation' | 'server';

export class ApiRequestError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly endpoint: string;
  readonly method: string;
  readonly data?: any;

  constructor(args: {
    kind: ApiErrorKind;
    message: string;
    status?: number;
    endpoint: string;
    method: string;
    data?: any;
  }) {
    super(args.message);
    this.name = `Api${args.kind.charAt(0).toUpperCase()}${args.kind.slice(1)}Error`;
    this.kind = args.kind;
    this.status = args.status;
    this.endpoint = args.endpoint;
    this.method = args.method;
    this.data = args.data;
  }
}

function classifyResponse(status: number, body: any): ApiErrorKind {
  const message = `${body?.error || ''} ${body?.message || ''}`.toLowerCase();
  if (status === 401) return 'auth';
  if (status === 403) return message.includes('tenant') ? 'tenant' : 'auth';
  if (status === 400 && message.includes('tenant')) return 'tenant';
  if (status === 400 || status === 422) return 'validation';
  return 'server';
}

function userSafeMessage(kind: ApiErrorKind, fallback: string) {
  if (kind === 'network') return 'API server unreachable. Please check the API URL and try again.';
  if (kind === 'auth') return 'You are not signed in or do not have permission.';
  if (kind === 'tenant') return 'Tenant context missing or denied. Select a school and retry.';
  if (kind === 'validation') return fallback || 'The request contains invalid data.';
  return fallback || 'Server error, please try again.';
}

function runtimeOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'https://example.invalid';
}

function baseEndsWithApi(baseUrl: string) {
  try {
    return new URL(baseUrl).pathname.replace(/\/+$/, '').endsWith('/api');
  } catch {
    return baseUrl.replace(/\/+$/, '').endsWith('/api');
  }
}

function buildRequestUrl(baseUrl: string, path: string) {
  const normalizedBase = (baseUrl || '').trim().replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const requestPath =
    baseEndsWithApi(normalizedBase) && /^\/api(\/|$)/.test(normalizedPath)
      ? normalizedPath.replace(/^\/api(?=\/|$)/, '') || '/'
      : normalizedPath;

  return new URL(`${normalizedBase}${requestPath}`, runtimeOrigin());
}

export class ApiClient {
  private config: ApiClientConfig;
  private requestInterceptors: Interceptor<RequestConfig>[] = [];
  private responseInterceptors: Interceptor<any>[] = [];
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(config: ApiClientConfig) {
    this.config = {
      defaultTimeout: 15000, // 15s default for mobile stability
      defaultRetry: 3,
      isOnline: () => (typeof navigator !== 'undefined' ? navigator.onLine : true),
      getTenantId: () => null,
      ...config,
    };
  }

  addRequestInterceptor(interceptor: Interceptor<RequestConfig>) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: Interceptor<any>) {
    this.responseInterceptors.push(interceptor);
  }

  cancelRequest(token: string) {
    if (this.abortControllers.has(token)) {
      this.abortControllers.get(token)?.abort();
      this.abortControllers.delete(token);
    }
  }

  async request<T>(path: string, config: RequestConfig = {}): Promise<T> {
    let finalConfig = { ...config };

    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      finalConfig = await interceptor(finalConfig);
    }

    const {
      params,
      timeout = this.config.defaultTimeout,
      retry = this.config.defaultRetry,
      retryDelay = (attempt) => Math.pow(2, attempt) * 1000,
      cancelToken,
      allowOfflineQueue,
      ...fetchConfig
    } = finalConfig;

    // Check offline status
    if (this.config.isOnline && !this.config.isOnline()) {
      if (allowOfflineQueue && fetchConfig.method !== 'GET') {
        throw new Error('OFFLINE_QUEUED');
      }
      throw new Error('NETWORK_OFFLINE');
    }

    // Construct URL with params. Supports both `/api` and absolute
    // `https://project.vercel.app/api` base URLs without duplicating `/api`.
    const url = buildRequestUrl(this.config.baseUrl, path);
    if (params) {
      Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
    }

    const execute = async (attempt: number): Promise<T> => {
      const controller = new AbortController();
      if (cancelToken) {
        this.abortControllers.set(cancelToken, controller);
      }

      const id = setTimeout(() => controller.abort(), timeout);

      try {
        const token = this.config.getToken ? await this.config.getToken() : null;
        const tenantId = this.config.getTenantId ? this.config.getTenantId() : null;
        const method = (fetchConfig.method || 'GET').toUpperCase();

        const headers = new Headers(fetchConfig.headers);
        if (token && !headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        if (tenantId && !headers.has('x-school-id')) {
          headers.set('x-school-id', tenantId);
        }
        if (!headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }

        if (this.config.debug) {
          console.debug('[ApiClient] request', {
            baseUrl: this.config.baseUrl,
            endpoint: url.pathname,
            method,
            selectedTenantId: tenantId,
            hasToken: Boolean(token),
          });
        }

        const response = await fetch(url.toString(), {
          ...fetchConfig,
          headers,
          signal: controller.signal,
        });

        clearTimeout(id);
        if (cancelToken) this.abortControllers.delete(cancelToken);

        if (response.status === 401) {
          this.config.onUnauthorized?.();
        }

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const kind = classifyResponse(response.status, errorBody);
          throw new ApiRequestError({
            kind,
            status: response.status,
            message: userSafeMessage(kind, errorBody.message || response.statusText),
            endpoint: url.pathname,
            method,
            data: errorBody,
          });
        }

        let data = await response.json();

        // Apply response interceptors
        for (const interceptor of this.responseInterceptors) {
          data = await interceptor(data);
        }

        return data;
      } catch (error: any) {
        clearTimeout(id);
        if (cancelToken) this.abortControllers.delete(cancelToken);

        if (error.name === 'AbortError') {
          throw new ApiRequestError({
            kind: 'network',
            message: 'API request timed out. Please try again.',
            endpoint: url.pathname,
            method: (fetchConfig.method || 'GET').toUpperCase(),
            data: error,
          });
        }

        // Retry logic for 5xx or network failures
        if (attempt < (retry ?? 0) && (error.status >= 500 || !error.status)) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt)));
          return execute(attempt + 1);
        }

        if (error instanceof ApiRequestError) {
          throw error;
        }

        throw new ApiRequestError({
          kind: 'network',
          message: userSafeMessage('network', error?.message || 'Network request failed'),
          endpoint: url.pathname,
          method: (fetchConfig.method || 'GET').toUpperCase(),
          data: formatError(error),
        });
      }
    };

    return execute(0);
  }

  get<T>(path: string, config?: RequestConfig) {
    return this.request<T>(path, { ...config, method: 'GET' });
  }

  post<T>(path: string, data?: any, config?: RequestConfig) {
    return this.request<T>(path, {
      ...config,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put<T>(path: string, data?: any, config?: RequestConfig) {
    return this.request<T>(path, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete<T>(path: string, config?: RequestConfig) {
    return this.request<T>(path, { ...config, method: 'DELETE' });
  }
}
