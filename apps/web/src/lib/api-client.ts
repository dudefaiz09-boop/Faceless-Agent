import {
  ApiClient,
  AnnouncementsService,
  AssignmentsService,
  StudentsService,
  ChatbotService,
} from '@educonnect/shared-api';
import { getSupabaseAccessToken, supabase } from './supabase';
import { getStoredTenantId } from './tenant';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

function getActiveTenantId() {
  return getStoredTenantId();
}

export const apiClient = new ApiClient({
  baseUrl: BASE_URL,
  getToken: getSupabaseAccessToken,
  getTenantId: () => {
    return getActiveTenantId();
  },
  onUnauthorized: () => {
    void supabase.auth.signOut();
  },
  debug: import.meta.env.DEV || import.meta.env.MODE === 'preview',
});

export const announcementsService = new AnnouncementsService(apiClient);
export const assignmentsService = new AssignmentsService(apiClient);
export const studentsService = new StudentsService(apiClient);
export const chatbotService = new ChatbotService(apiClient);
