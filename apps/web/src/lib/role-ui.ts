import {
  Activity,
  Baby,
  Banknote,
  BookOpen,
  Brain,
  Library,
  Megaphone,
  type LucideIcon,
} from 'lucide-react';

export type RoleName =
  | 'admin'
  | 'principal'
  | 'teacher'
  | 'student'
  | 'parent'
  | 'librarian'
  | 'accountant'
  | 'staff';

export type RoleAction = {
  title: string;
  description: string;
  to: string;
  icon: LucideIcon;
};

type CapabilityInput = {
  role: string | null;
  canManageAttendance?: boolean;
  canManageAssignments?: boolean;
  canManageFees?: boolean;
  canManageLibrary?: boolean;
  canManagePerformance?: boolean;
  isAdmin?: boolean;
  isTeacher?: boolean;
};

export function isRole(role: string | null | undefined, target: RoleName) {
  return role === target;
}

export function getRoleDashboardActions({
  role,
  canManageAttendance,
  canManageAssignments,
  canManageFees,
  canManageLibrary,
  isAdmin,
  isTeacher,
}: CapabilityInput): RoleAction[] {
  const actions: RoleAction[] = [];

  if (role !== 'accountant' && role !== 'librarian') {
    actions.push({
      title: 'Ask AI',
      description:
        role === 'parent'
          ? "Summarize your kids' week."
          : role === 'student'
            ? 'Get study help and revision notes.'
            : 'Generate lessons, reports, or study help.',
      to: '/chatbot',
      icon: Brain,
    });
  }

  if (isAdmin || isTeacher || role === 'principal') {
    actions.push({
      title: 'Post update',
      description: 'Publish a targeted school announcement.',
      to: '/announcements',
      icon: Megaphone,
    });
  }

  if (canManageAttendance) {
    actions.push({
      title: 'Mark attendance',
      description: 'Record daily attendance faster.',
      to: '/attendance',
      icon: Activity,
    });
  }

  if (canManageAssignments) {
    actions.push({
      title: 'Create assignment',
      description: 'Draft and publish class work.',
      to: '/assignments',
      icon: BookOpen,
    });
  }

  if (role === 'parent') {
    actions.push({
      title: 'Parent Portal',
      description: "Review your kids' progress.",
      to: '/parent-portal',
      icon: Baby,
    });
  }

  if (canManageFees || role === 'accountant') {
    actions.push({
      title: 'Fee records',
      description: 'Review dues and payments.',
      to: '/fees',
      icon: Banknote,
    });
  }

  if (canManageLibrary || role === 'librarian') {
    actions.push({
      title: 'Library',
      description: 'Manage resources and returns.',
      to: '/library',
      icon: Library,
    });
  }

  return actions;
}

export function getAttendanceCopy(role: string | null, canManageAttendance: boolean) {
  if (canManageAttendance) {
    return {
      title: 'Attendance',
      description: 'Track student attendance and review history.',
      historyTitle: 'Attendance History',
      selector: 'Select Class',
    };
  }

  if (role === 'parent') {
    return {
      title: "Your kids' attendance",
      description: 'View attendance records for your linked children.',
      historyTitle: "Your kids' attendance history",
      selector: 'Select Child',
    };
  }

  return {
    title: 'Attendance',
    description: 'View your attendance record.',
    historyTitle: 'Attendance History',
    selector: 'Select Student',
  };
}

export function getAssignmentsCopy(role: string | null, canManageAssignments: boolean) {
  if (canManageAssignments) {
    return {
      title: 'Assignments',
      description: 'Manage assignments and grade student submissions.',
      publishedDetail: 'Class',
      empty: 'No assignments found for this class.',
    };
  }

  if (role === 'parent') {
    return {
      title: "Your kids' assignments",
      description: 'Track coursework for your linked children.',
      publishedDetail: 'For selected child',
      empty: 'No assignments found for the selected child.',
    };
  }

  return {
    title: 'Assignments',
    description: 'Track your coursework and submit your work.',
    publishedDetail: 'For your class',
    empty: 'No assignments found for your class.',
  };
}

export function getFeesCopy(role: string | null, canManageFees: boolean) {
  if (canManageFees) {
    return {
      title: 'Financial Management',
      description: 'Monitor academy revenue and manage student dues.',
      selector: 'Filter Class',
    };
  }

  if (role === 'parent') {
    return {
      title: "Your kids' fees",
      description: 'Review fee balances and payment history for your linked children.',
      selector: 'Select Child',
    };
  }

  return {
    title: 'Fees',
    description: 'Track your fee status and make secure payments.',
    selector: 'Your Account',
  };
}

export function getPerformanceCopy(role: string | null, canManagePerformance: boolean) {
  if (canManagePerformance) {
    return {
      title: 'Performance Analytics',
      description: 'Track class performance and subject trends.',
      selector: 'Select Class',
    };
  }

  if (role === 'parent') {
    return {
      title: "Your kids' performance",
      description: 'Review academic progress for your linked children.',
      selector: 'Select Child',
    };
  }

  return {
    title: 'Performance',
    description: 'Visualize your academic growth and AI study tips.',
    selector: 'Your Record',
  };
}
