import { ApiClient } from '../client/base.js';

export type AuthProfile = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  schoolId?: string;
  tenantId?: string;
  defaultTenantId?: string;
  classId?: string | null;
  classIds?: string[];
  subjectIds?: string[];
  sectionIds?: string[];
  linkedStudentIds?: string[];
  assignedModules?: string[];
  is_super_admin?: boolean;
  isSuperAdmin?: boolean;
  managed_tenant_ids?: string[];
  managedTenantIds?: string[];
  roles?: string[];
  role?: string;
  permissions?: Record<string, boolean>;
  disabled?: boolean;
  status?: string;
};

export class AuthProfileService {
  constructor(private client: ApiClient) {}

  getProfile() {
    return this.client.get<AuthProfile>('/auth/profile', { retry: 0 });
  }
}
