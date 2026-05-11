import { ErrorCode, formatError } from '@educonnect/shared';

export interface RequestConfig extends RequestInit {
  params?: Record<string, string>;
  timeout?: number;
  retry?: number;
  retryDelay?: (attempt: number) => number;
}

export type Interceptor<T> = (data: T) => T | Promise<T>;

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => Promise<string | null>;
  onUnauthorized?: () => void;
  defaultTimeout?: number;
  defaultRetry?: number;
}

export class ApiClient {
  private config: ApiClientConfig;
  private requestInterceptors: Interceptor<RequestConfig>[] = [];
  private responseInterceptors: Interceptor<any>[] = [];

  constructor(config: ApiClientConfig) {
    this.config = {
      defaultTimeout: 10000,
      defaultRetry: 3,
      ...config,
    };
  }

  addRequestInterceptor(interceptor: Interceptor<RequestConfig>) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: Interceptor<any>) {
    this.responseInterceptors.push(interceptor);
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
      ...fetchConfig
    } = finalConfig;

    // Construct URL with params
    const url = new URL(`${this.config.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
    }

    const execute = async (attempt: number): Promise<T> => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      try {
        const token = this.config.getToken ? await this.config.getToken() : null;
        const headers = new Headers(fetchConfig.headers);
        if (token && !headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        if (!headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }

        const response = await fetch(url.toString(), {
          ...fetchConfig,
          headers,
          signal: controller.signal,
        });

        clearTimeout(id);

        if (response.status === 401) {
          this.config.onUnauthorized?.();
        }

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw {
            status: response.status,
            message: errorBody.message || response.statusText,
            data: errorBody,
          };
        }

        let data = await response.json();

        // Apply response interceptors
        for (const interceptor of this.responseInterceptors) {
          data = await interceptor(data);
        }

        return data;
      } catch (error: any) {
        clearTimeout(id);

        if (error.name === 'AbortError') {
          throw new Error('Request Timeout');
        }

        // Retry logic
        if (attempt < (retry ?? 0) && (error.status >= 500 || !error.status)) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt)));
          return execute(attempt + 1);
        }

        throw formatError(error);
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
