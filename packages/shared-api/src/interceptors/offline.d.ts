import { RequestConfig } from '../client/base.js';
/**
 * Enterprise Offline Queue Interceptor
 * Caches non-GET requests when the network is offline and retries them automatically when online.
 */
export declare class OfflineQueueInterceptor {
  private queue;
  private isOnline;
  constructor();
  setOnlineStatus(status: boolean): void;
  processQueue(): Promise<void>;
  enqueue(path: string, config: RequestConfig): Promise<any>;
  get isNetworkOnline(): boolean;
}
export declare const offlineQueue: OfflineQueueInterceptor;
