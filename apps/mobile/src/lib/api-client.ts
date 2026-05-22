import {
  ApiClient,
  AnnouncementsService,
  AssignmentsService,
  AttendanceService,
  FeesService,
  LibraryService,
  NotificationsService,
  ParentPortalService,
  PerformanceService,
  StudentsService,
  UsersService,
} from '@educonnect/shared-api';
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
export const attendanceService = new AttendanceService(apiClient);
export const feesService = new FeesService(apiClient);
export const libraryService = new LibraryService(apiClient);
export const notificationsService = new NotificationsService(apiClient);
export const parentPortalService = new ParentPortalService(apiClient);
export const performanceService = new PerformanceService(apiClient);
export const studentsService = new StudentsService(apiClient);
export const usersService = new UsersService(apiClient);
