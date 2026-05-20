import { ApiClient, AnnouncementsService, AssignmentsService } from '@educonnect/shared-api';
import { getSupabaseAccessToken, supabase } from './supabase';
import { ENV } from '../config/env';

let mobileTenantId: string | null = null;

export function setMobileTenantId(schoolId: string | null) {
  mobileTenantId = schoolId;
}

export const apiClient = new ApiClient({
  baseUrl: ENV.API_BASE_URL,
  getToken: getSupabaseAccessToken,
  getTenantId: () => mobileTenantId,
  onUnauthorized: () => {
    void supabase.auth.signOut();
  },
});

export const announcementsService = new AnnouncementsService(apiClient);
export const assignmentsService = new AssignmentsService(apiClient);
