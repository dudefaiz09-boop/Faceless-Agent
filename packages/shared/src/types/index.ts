import { UserRole } from '../constants/index.js';

export interface UserContext {
  uid: string;
  email?: string;
  displayName?: string;
  roles: UserRole[];
  isAdmin: boolean;
  classId: string | null;
  permissions: Record<string, boolean>;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName?: string;
  targetClasses: string[];
  visibility: 'school' | 'class' | 'public' | 'private';
  createdAt: string; // ISO String for JSON compatibility
}

export interface AttendanceRecord {
  id?: string;
  studentId: string;
  classId: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'late';
  markedBy: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  correlationId?: string;
}
