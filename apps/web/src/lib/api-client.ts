import {
  ApiClient,
  AnnouncementsService,
  AssignmentsService,
  StudentsService,
  ChatbotService,
  AttendanceService,
  FeesService,
  LibraryService,
  NotificationsService,
  ParentPortalService,
  PerformanceService,
  RolesService,
  TeachersService,
  UsersService,
} from '@educonnect/shared-api';
import { getSupabaseAccessToken, supabase } from './supabase';
import { getStoredTenantId } from './tenant';
import { env } from './env';

const BASE_URL = env.VITE_API_BASE_URL;

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
export const attendanceService = new AttendanceService(apiClient);
export const feesService = new FeesService(apiClient);
export const libraryService = new LibraryService(apiClient);
export const notificationsService = new NotificationsService(apiClient);
export const parentPortalService = new ParentPortalService(apiClient);
export const performanceService = new PerformanceService(apiClient);
export const rolesService = new RolesService(apiClient);
export const teachersService = new TeachersService(apiClient);
export const usersService = new UsersService(apiClient);
