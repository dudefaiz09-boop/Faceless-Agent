/**
 * SHARED API CLIENT
 * A platform-agnostic fetch wrapper for EduConnect API.
 */
export interface ApiClientOptions extends RequestInit {
  baseUrl?: string;
  getToken?: () => Promise<string | null>;
  onUnauthorized?: () => void;
}
export declare function createApiClient(
  defaultOptions?: ApiClientOptions
): Promise<<T>(path: string, options?: RequestInit) => Promise<T>>;
