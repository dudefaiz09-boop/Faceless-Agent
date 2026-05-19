import { formatError } from '@educonnect/shared';
export class ApiClient {
  config;
  requestInterceptors = [];
  responseInterceptors = [];
  abortControllers = new Map();
  constructor(config) {
    this.config = {
      defaultTimeout: 15000, // 15s default for mobile stability
      defaultRetry: 3,
      isOnline: () => (typeof navigator !== 'undefined' ? navigator.onLine : true),
      getTenantId: () => null,
      ...config,
    };
  }
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }
  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
  }
  cancelRequest(token) {
    if (this.abortControllers.has(token)) {
      this.abortControllers.get(token)?.abort();
      this.abortControllers.delete(token);
    }
  }
  async request(path, config = {}) {
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
    // Construct URL with params
    const url = new URL(`${this.config.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
    }
    const execute = async (attempt) => {
      const controller = new AbortController();
      if (cancelToken) {
        this.abortControllers.set(cancelToken, controller);
      }
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const token = this.config.getToken ? await this.config.getToken() : null;
        const tenantId = this.config.getTenantId ? this.config.getTenantId() : null;
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
      } catch (error) {
        clearTimeout(id);
        if (cancelToken) this.abortControllers.delete(cancelToken);
        if (error.name === 'AbortError') {
          throw new Error('Request Timeout or Cancelled');
        }
        // Retry logic for 5xx or network failures
        if (attempt < (retry ?? 0) && (error.status >= 500 || !error.status)) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt)));
          return execute(attempt + 1);
        }
        throw formatError(error);
      }
    };
    return execute(0);
  }
  get(path, config) {
    return this.request(path, { ...config, method: 'GET' });
  }
  post(path, data, config) {
    return this.request(path, {
      ...config,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  put(path, data, config) {
    return this.request(path, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  delete(path, config) {
    return this.request(path, { ...config, method: 'DELETE' });
  }
}
//# sourceMappingURL=base.js.map
