import { ApiClient, AnnouncementsService, AssignmentsService } from '@educonnect/shared-api';
import { auth } from './firebase';
import { ENV } from '../config/env';

export const apiClient = new ApiClient({
  baseUrl: ENV.API_BASE_URL,
  getToken: () => (auth.currentUser ? auth.currentUser.getIdToken() : Promise.resolve(null)),
  onUnauthorized: () => auth.signOut(),
});

export const announcementsService = new AnnouncementsService(apiClient);
export const assignmentsService = new AssignmentsService(apiClient);
