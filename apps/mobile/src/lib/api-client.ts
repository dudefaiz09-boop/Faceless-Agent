import { ApiClient, AnnouncementsService, AssignmentsService } from '@educonnect/shared-api';
import { getSupabaseAccessToken, supabase } from './supabase';
import { ENV } from '../config/env';

export const apiClient = new ApiClient({
  baseUrl: ENV.API_BASE_URL,
  getToken: getSupabaseAccessToken,
  onUnauthorized: () => {
    void supabase.auth.signOut();
  },
});

export const announcementsService = new AnnouncementsService(apiClient);
export const assignmentsService = new AssignmentsService(apiClient);
