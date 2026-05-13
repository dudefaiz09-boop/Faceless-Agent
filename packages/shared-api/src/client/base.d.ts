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
