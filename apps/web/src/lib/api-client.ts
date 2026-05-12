import { ApiClient, AnnouncementsService } from '@educonnect/shared-api';
import { auth } from './firebase';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://us-central1-gen-lang-client-0979500227.cloudfunctions.net/api';

export const apiClient = new ApiClient({
  baseUrl: BASE_URL,
  getToken: () => auth.currentUser ? auth.currentUser.getIdToken() : Promise.resolve(null),
  getTenantId: () => {
    // In a multi-tenant SaaS, this would come from the subdomain, local storage, or custom claims
    return localStorage.getItem('educonnect_school_id') || 'default-school';
  },
  onUnauthorized: () => auth.signOut(),
});

export const announcementsService = new AnnouncementsService(apiClient);

// Interceptor for logging in dev
if (import.meta.env.DEV) {
  apiClient.addRequestInterceptor((config) => {
    console.log(`[API Request] ${config.method || 'GET'}`);
    return config;
  });
}
