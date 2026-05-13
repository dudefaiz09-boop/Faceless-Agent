import { ApiClient, AnnouncementsService, AssignmentsService } from '@educonnect/shared-api';
import { auth } from './firebase';

const BASE_URL = 'https://us-central1-gen-lang-client-0979500227.cloudfunctions.net/api';

export const apiClient = new ApiClient({
  baseUrl: BASE_URL,
  getToken: () => (auth.currentUser ? auth.currentUser.getIdToken() : Promise.resolve(null)),
  onUnauthorized: () => auth.signOut(),
});

export const announcementsService = new AnnouncementsService(apiClient);
export const assignmentsService = new AssignmentsService(apiClient);
