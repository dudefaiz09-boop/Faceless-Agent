export interface UserContext {
  uid: string;
  email?: string;
  displayName?: string;
  roles: string[];
  isAdmin: boolean;
  schoolId: string | null;
  classId: string | null;
  permissions: Record<string, boolean>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserContext;
    }
  }
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  targetClasses: string[];
  visibility: 'public' | 'private';
  createdAt: any; // Simplified to any for monorepo portability
}

export interface AttendanceRecord {
  id?: string;
  studentId: string;
  classId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  markedBy: string;
  updatedAt: any; // Simplified to any for monorepo portability
}
