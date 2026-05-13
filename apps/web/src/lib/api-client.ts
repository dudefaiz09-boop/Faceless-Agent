import {
  ApiClient,
  AnnouncementsService,
  AssignmentsService,
  StudentsService,
  ChatbotService,
} from '@educonnect/shared-api';
import { getSupabaseAccessToken, supabase } from './supabase';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = new ApiClient({
  baseUrl: BASE_URL,
  getToken: getSupabaseAccessToken,
  getTenantId: () => {
    // In a multi-tenant SaaS, this would come from the subdomain, local storage, or custom claims
    return localStorage.getItem('educonnect_school_id') || 'default-school';
  },
  onUnauthorized: () => {
    void supabase.auth.signOut();
  },
});

export const announcementsService = new AnnouncementsService(apiClient);
export const assignmentsService = new AssignmentsService(apiClient);
export const studentsService = new StudentsService(apiClient);
export const chatbotService = new ChatbotService(apiClient);
