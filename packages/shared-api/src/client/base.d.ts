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
export declare class ApiRequestError extends Error {
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
  });
}
export declare class ApiClient {
  private config;
  private requestInterceptors;
  private responseInterceptors;
  private abortControllers;
  constructor(config: ApiClientConfig);
  addRequestInterceptor(interceptor: Interceptor<RequestConfig>): void;
  addResponseInterceptor(interceptor: Interceptor<any>): void;
  cancelRequest(token: string): void;
  request<T>(path: string, config?: RequestConfig): Promise<T>;
  get<T>(path: string, config?: RequestConfig): Promise<T>;
  post<T>(path: string, data?: any, config?: RequestConfig): Promise<T>;
  put<T>(path: string, data?: any, config?: RequestConfig): Promise<T>;
  delete<T>(path: string, config?: RequestConfig): Promise<T>;
}
