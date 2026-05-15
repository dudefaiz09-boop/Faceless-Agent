import { z } from 'zod';
export declare const TimestampValueSchema: z.ZodUnion<
  [
    z.ZodObject<
      {
        toDate: z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodDate>;
      },
      'strip',
      z.ZodTypeAny,
      {
        toDate: (...args: unknown[]) => Date;
      },
      {
        toDate: (...args: unknown[]) => Date;
      }
    >,
    z.ZodString,
    z.ZodNumber,
    z.ZodNull,
  ]
>;
export declare const UserProfileSchema: z.ZodObject<
  {
    uid: z.ZodString;
    displayName: z.ZodString;
    email: z.ZodString;
    roles: z.ZodArray<z.ZodString, 'many'>;
    classId: z.ZodOptional<z.ZodString>;
    section: z.ZodOptional<z.ZodString>;
    subjects: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
    classes: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
    createdAt: z.ZodOptional<
      z.ZodUnion<
        [
          z.ZodObject<
            {
              toDate: z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodDate>;
            },
            'strip',
            z.ZodTypeAny,
            {
              toDate: (...args: unknown[]) => Date;
            },
            {
              toDate: (...args: unknown[]) => Date;
            }
          >,
          z.ZodString,
          z.ZodNumber,
          z.ZodNull,
        ]
      >
    >;
    linkedParentIds: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    uid: string;
    displayName: string;
    email: string;
    roles: string[];
    classes?: string[] | undefined;
    classId?: string | undefined;
    section?: string | undefined;
    subjects?: string[] | undefined;
    createdAt?:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null
      | undefined;
    linkedParentIds?: string[] | undefined;
  },
  {
    uid: string;
    displayName: string;
    email: string;
    roles: string[];
    classes?: string[] | undefined;
    classId?: string | undefined;
    section?: string | undefined;
    subjects?: string[] | undefined;
    createdAt?:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null
      | undefined;
    linkedParentIds?: string[] | undefined;
  }
>;
export declare const ChatLogSchema: z.ZodObject<
  {
    id: z.ZodString;
    query: z.ZodString;
    response: z.ZodString;
    timestamp: z.ZodUnion<
      [
        z.ZodObject<
          {
            toDate: z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodDate>;
          },
          'strip',
          z.ZodTypeAny,
          {
            toDate: (...args: unknown[]) => Date;
          },
          {
            toDate: (...args: unknown[]) => Date;
          }
        >,
        z.ZodString,
        z.ZodNumber,
        z.ZodNull,
      ]
    >;
    feedback: z.ZodNullable<z.ZodEnum<['helpful', 'not_helpful']>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string;
    query: string;
    response: string;
    timestamp:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null;
    feedback: 'helpful' | 'not_helpful' | null;
  },
  {
    id: string;
    query: string;
    response: string;
    timestamp:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null;
    feedback: 'helpful' | 'not_helpful' | null;
  }
>;
export declare const AuditLogSchema: z.ZodObject<
  {
    id: z.ZodString;
    action: z.ZodString;
    details: z.ZodString;
    timestamp: z.ZodUnion<
      [
        z.ZodObject<
          {
            toDate: z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodDate>;
          },
          'strip',
          z.ZodTypeAny,
          {
            toDate: (...args: unknown[]) => Date;
          },
          {
            toDate: (...args: unknown[]) => Date;
          }
        >,
        z.ZodString,
        z.ZodNumber,
        z.ZodNull,
      ]
    >;
    performedBy: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string;
    timestamp:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null;
    action: string;
    details: string;
    performedBy: string;
  },
  {
    id: string;
    timestamp:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null;
    action: string;
    details: string;
    performedBy: string;
  }
>;
export type TimestampValue = z.infer<typeof TimestampValueSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type ChatLog = z.infer<typeof ChatLogSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
export type StudentProfile = UserProfile;
export type TeacherProfile = UserProfile;
export interface BulkImportResult {
  success: boolean;
  message?: string;
}
export declare const AssignmentSchema: z.ZodObject<
  {
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    dueDate: z.ZodString;
    classId: z.ZodString;
    attachments: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
    rubric: z.ZodOptional<z.ZodString>;
    visibility: z.ZodDefault<z.ZodEnum<['public', 'private', 'archived']>>;
    createdBy: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<
      z.ZodUnion<
        [
          z.ZodObject<
            {
              toDate: z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodDate>;
            },
            'strip',
            z.ZodTypeAny,
            {
              toDate: (...args: unknown[]) => Date;
            },
            {
              toDate: (...args: unknown[]) => Date;
            }
          >,
          z.ZodString,
          z.ZodNumber,
          z.ZodNull,
        ]
      >
    >;
    updatedAt: z.ZodOptional<
      z.ZodUnion<
        [
          z.ZodObject<
            {
              toDate: z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodDate>;
            },
            'strip',
            z.ZodTypeAny,
            {
              toDate: (...args: unknown[]) => Date;
            },
            {
              toDate: (...args: unknown[]) => Date;
            }
          >,
          z.ZodString,
          z.ZodNumber,
          z.ZodNull,
        ]
      >
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    classId: string;
    id: string;
    title: string;
    description: string;
    dueDate: string;
    attachments: string[];
    visibility: 'public' | 'private' | 'archived';
    createdAt?:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null
      | undefined;
    rubric?: string | undefined;
    createdBy?: string | undefined;
    updatedAt?:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null
      | undefined;
  },
  {
    classId: string;
    id: string;
    title: string;
    description: string;
    dueDate: string;
    createdAt?:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null
      | undefined;
    attachments?: string[] | undefined;
    rubric?: string | undefined;
    visibility?: 'public' | 'private' | 'archived' | undefined;
    createdBy?: string | undefined;
    updatedAt?:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null
      | undefined;
  }
>;
export declare const SubmissionSchema: z.ZodObject<
  {
    id: z.ZodString;
    assignmentId: z.ZodString;
    studentId: z.ZodString;
    studentName: z.ZodString;
    content: z.ZodString;
    fileUrl: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<['pending', 'submitted', 'graded', 'returned']>;
    submittedAt: z.ZodOptional<
      z.ZodUnion<
        [
          z.ZodObject<
            {
              toDate: z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodDate>;
            },
            'strip',
            z.ZodTypeAny,
            {
              toDate: (...args: unknown[]) => Date;
            },
            {
              toDate: (...args: unknown[]) => Date;
            }
          >,
          z.ZodString,
          z.ZodNumber,
          z.ZodNull,
        ]
      >
    >;
    grade: z.ZodNullable<z.ZodString>;
    feedback: z.ZodNullable<z.ZodString>;
    aiScore: z.ZodNullable<z.ZodNumber>;
    aiFeedback: z.ZodNullable<z.ZodString>;
    teacherScore: z.ZodNullable<z.ZodString>;
    teacherFeedback: z.ZodNullable<z.ZodString>;
    checkedByAI: z.ZodDefault<z.ZodBoolean>;
    recheckedByTeacher: z.ZodDefault<z.ZodBoolean>;
  },
  'strip',
  z.ZodTypeAny,
  {
    status: 'pending' | 'submitted' | 'graded' | 'returned';
    id: string;
    feedback: string | null;
    assignmentId: string;
    studentId: string;
    studentName: string;
    content: string;
    fileUrl: string | null;
    grade: string | null;
    aiScore: number | null;
    aiFeedback: string | null;
    teacherScore: string | null;
    teacherFeedback: string | null;
    checkedByAI: boolean;
    recheckedByTeacher: boolean;
    submittedAt?:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null
      | undefined;
  },
  {
    status: 'pending' | 'submitted' | 'graded' | 'returned';
    id: string;
    feedback: string | null;
    assignmentId: string;
    studentId: string;
    studentName: string;
    content: string;
    fileUrl: string | null;
    grade: string | null;
    aiScore: number | null;
    aiFeedback: string | null;
    teacherScore: string | null;
    teacherFeedback: string | null;
    submittedAt?:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null
      | undefined;
    checkedByAI?: boolean | undefined;
    recheckedByTeacher?: boolean | undefined;
  }
>;
export declare const AttendanceRecordSchema: z.ZodObject<
  {
    id: z.ZodOptional<z.ZodString>;
    studentId: z.ZodString;
    classId: z.ZodString;
    date: z.ZodString;
    status: z.ZodEnum<['present', 'absent', 'late']>;
    markedBy: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<
      z.ZodUnion<
        [
          z.ZodObject<
            {
              toDate: z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodDate>;
            },
            'strip',
            z.ZodTypeAny,
            {
              toDate: (...args: unknown[]) => Date;
            },
            {
              toDate: (...args: unknown[]) => Date;
            }
          >,
          z.ZodString,
          z.ZodNumber,
          z.ZodNull,
        ]
      >
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    status: 'present' | 'absent' | 'late';
    date: string;
    classId: string;
    studentId: string;
    id?: string | undefined;
    updatedAt?:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null
      | undefined;
    markedBy?: string | undefined;
  },
  {
    status: 'present' | 'absent' | 'late';
    date: string;
    classId: string;
    studentId: string;
    id?: string | undefined;
    updatedAt?:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null
      | undefined;
    markedBy?: string | undefined;
  }
>;
export type Assignment = z.infer<typeof AssignmentSchema>;
export type Submission = z.infer<typeof SubmissionSchema>;
export type AttendanceRecord = z.infer<typeof AttendanceRecordSchema>;
