import { z } from 'zod';
export declare const RubricCriterionSchema: z.ZodObject<
  {
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    maxPoints: z.ZodNumber;
  },
  'strip',
  z.ZodTypeAny,
  {
    title: string;
    maxPoints: number;
    description?: string | undefined;
  },
  {
    title: string;
    maxPoints: number;
    description?: string | undefined;
  }
>;
export declare const RubricSchema: z.ZodObject<
  {
    criteria: z.ZodArray<
      z.ZodObject<
        {
          title: z.ZodString;
          description: z.ZodOptional<z.ZodString>;
          maxPoints: z.ZodNumber;
        },
        'strip',
        z.ZodTypeAny,
        {
          title: string;
          maxPoints: number;
          description?: string | undefined;
        },
        {
          title: string;
          maxPoints: number;
          description?: string | undefined;
        }
      >,
      'many'
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    criteria: {
      title: string;
      maxPoints: number;
      description?: string | undefined;
    }[];
  },
  {
    criteria: {
      title: string;
      maxPoints: number;
      description?: string | undefined;
    }[];
  }
>;
export declare const AttachmentSchema: z.ZodObject<
  {
    name: z.ZodString;
    url: z.ZodString;
    type: z.ZodString;
    size: z.ZodOptional<z.ZodNumber>;
  },
  'strip',
  z.ZodTypeAny,
  {
    type: string;
    name: string;
    url: string;
    size?: number | undefined;
  },
  {
    type: string;
    name: string;
    url: string;
    size?: number | undefined;
  }
>;
export declare const AssignmentSchema: z.ZodObject<
  {
    id: z.ZodString;
    schoolId: z.ZodString;
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
    isArchived: z.ZodDefault<z.ZodBoolean>;
  } & {
    title: z.ZodString;
    description: z.ZodString;
    dueDate: z.ZodString;
    classId: z.ZodOptional<z.ZodString>;
    targetClasses: z.ZodArray<z.ZodString, 'many'>;
    status: z.ZodDefault<
      z.ZodNativeEnum<{
        readonly DRAFT: 'draft';
        readonly SCHEDULED: 'scheduled';
        readonly PUBLISHED: 'published';
        readonly ARCHIVED: 'archived';
      }>
    >;
    attachments: z.ZodDefault<
      z.ZodArray<
        z.ZodObject<
          {
            name: z.ZodString;
            url: z.ZodString;
            type: z.ZodString;
            size: z.ZodOptional<z.ZodNumber>;
          },
          'strip',
          z.ZodTypeAny,
          {
            type: string;
            name: string;
            url: string;
            size?: number | undefined;
          },
          {
            type: string;
            name: string;
            url: string;
            size?: number | undefined;
          }
        >,
        'many'
      >
    >;
    rubric: z.ZodOptional<
      z.ZodObject<
        {
          criteria: z.ZodArray<
            z.ZodObject<
              {
                title: z.ZodString;
                description: z.ZodOptional<z.ZodString>;
                maxPoints: z.ZodNumber;
              },
              'strip',
              z.ZodTypeAny,
              {
                title: string;
                maxPoints: number;
                description?: string | undefined;
              },
              {
                title: string;
                maxPoints: number;
                description?: string | undefined;
              }
            >,
            'many'
          >;
        },
        'strip',
        z.ZodTypeAny,
        {
          criteria: {
            title: string;
            maxPoints: number;
            description?: string | undefined;
          }[];
        },
        {
          criteria: {
            title: string;
            maxPoints: number;
            description?: string | undefined;
          }[];
        }
      >
    >;
    teacherId: z.ZodString;
    pointsPossible: z.ZodDefault<z.ZodNumber>;
    allowResubmissions: z.ZodDefault<z.ZodBoolean>;
  },
  'strip',
  z.ZodTypeAny,
  {
    status: 'archived' | 'draft' | 'scheduled' | 'published';
    id: string;
    title: string;
    description: string;
    dueDate: string;
    attachments: {
      type: string;
      name: string;
      url: string;
      size?: number | undefined;
    }[];
    targetClasses: string[];
    schoolId: string;
    isArchived: boolean;
    teacherId: string;
    pointsPossible: number;
    allowResubmissions: boolean;
    classId?: string | undefined;
    createdAt?:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null
      | undefined;
    rubric?:
      | {
          criteria: {
            title: string;
            maxPoints: number;
            description?: string | undefined;
          }[];
        }
      | undefined;
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
    id: string;
    title: string;
    description: string;
    dueDate: string;
    targetClasses: string[];
    schoolId: string;
    teacherId: string;
    status?: 'archived' | 'draft' | 'scheduled' | 'published' | undefined;
    classId?: string | undefined;
    createdAt?:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null
      | undefined;
    attachments?:
      | {
          type: string;
          name: string;
          url: string;
          size?: number | undefined;
        }[]
      | undefined;
    rubric?:
      | {
          criteria: {
            title: string;
            maxPoints: number;
            description?: string | undefined;
          }[];
        }
      | undefined;
    updatedAt?:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null
      | undefined;
    isArchived?: boolean | undefined;
    pointsPossible?: number | undefined;
    allowResubmissions?: boolean | undefined;
  }
>;
export declare const SubmissionCommentSchema: z.ZodObject<
  {
    authorId: z.ZodString;
    text: z.ZodString;
    createdAt: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    createdAt: string;
    authorId: string;
    text: string;
  },
  {
    createdAt: string;
    authorId: string;
    text: string;
  }
>;
export declare const AssignmentSubmissionSchema: z.ZodObject<
  {
    id: z.ZodString;
    schoolId: z.ZodString;
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
    isArchived: z.ZodDefault<z.ZodBoolean>;
  } & {
    assignmentId: z.ZodString;
    studentId: z.ZodString;
    studentName: z.ZodString;
    status: z.ZodDefault<
      z.ZodNativeEnum<{
        readonly PENDING: 'pending';
        readonly SUBMITTED: 'submitted';
        readonly LATE: 'late';
        readonly MISSING: 'missing';
        readonly GRADED: 'graded';
        readonly RETURNED: 'returned';
        readonly RESUBMITTED: 'resubmitted';
        readonly REJECTED: 'rejected';
      }>
    >;
    content: z.ZodString;
    attachments: z.ZodDefault<
      z.ZodArray<
        z.ZodObject<
          {
            name: z.ZodString;
            url: z.ZodString;
            type: z.ZodString;
            size: z.ZodOptional<z.ZodNumber>;
          },
          'strip',
          z.ZodTypeAny,
          {
            type: string;
            name: string;
            url: string;
            size?: number | undefined;
          },
          {
            type: string;
            name: string;
            url: string;
            size?: number | undefined;
          }
        >,
        'many'
      >
    >;
    submittedAt: z.ZodOptional<z.ZodString>;
    grade: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    feedback: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    teacherComments: z.ZodDefault<
      z.ZodArray<
        z.ZodObject<
          {
            authorId: z.ZodString;
            text: z.ZodString;
            createdAt: z.ZodString;
          },
          'strip',
          z.ZodTypeAny,
          {
            createdAt: string;
            authorId: string;
            text: string;
          },
          {
            createdAt: string;
            authorId: string;
            text: string;
          }
        >,
        'many'
      >
    >;
    aiScore: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    aiFeedback: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    checkedByAI: z.ZodDefault<z.ZodBoolean>;
    recheckedByTeacher: z.ZodDefault<z.ZodBoolean>;
    teacherScore: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    teacherFeedback: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    status:
      | 'pending'
      | 'submitted'
      | 'graded'
      | 'returned'
      | 'late'
      | 'missing'
      | 'resubmitted'
      | 'rejected';
    id: string;
    attachments: {
      type: string;
      name: string;
      url: string;
      size?: number | undefined;
    }[];
    assignmentId: string;
    studentId: string;
    studentName: string;
    content: string;
    checkedByAI: boolean;
    recheckedByTeacher: boolean;
    schoolId: string;
    isArchived: boolean;
    teacherComments: {
      createdAt: string;
      authorId: string;
      text: string;
    }[];
    createdAt?:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null
      | undefined;
    feedback?: string | null | undefined;
    updatedAt?:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null
      | undefined;
    submittedAt?: string | undefined;
    grade?: string | null | undefined;
    aiScore?: number | null | undefined;
    aiFeedback?: string | null | undefined;
    teacherScore?: string | null | undefined;
    teacherFeedback?: string | null | undefined;
  },
  {
    id: string;
    assignmentId: string;
    studentId: string;
    studentName: string;
    content: string;
    schoolId: string;
    status?:
      | 'pending'
      | 'submitted'
      | 'graded'
      | 'returned'
      | 'late'
      | 'missing'
      | 'resubmitted'
      | 'rejected'
      | undefined;
    createdAt?:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null
      | undefined;
    feedback?: string | null | undefined;
    attachments?:
      | {
          type: string;
          name: string;
          url: string;
          size?: number | undefined;
        }[]
      | undefined;
    updatedAt?:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null
      | undefined;
    submittedAt?: string | undefined;
    grade?: string | null | undefined;
    aiScore?: number | null | undefined;
    aiFeedback?: string | null | undefined;
    teacherScore?: string | null | undefined;
    teacherFeedback?: string | null | undefined;
    checkedByAI?: boolean | undefined;
    recheckedByTeacher?: boolean | undefined;
    isArchived?: boolean | undefined;
    teacherComments?:
      | {
          createdAt: string;
          authorId: string;
          text: string;
        }[]
      | undefined;
  }
>;
export type Rubric = z.infer<typeof RubricSchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;
export type Assignment = z.infer<typeof AssignmentSchema>;
export type AssignmentSubmission = z.infer<typeof AssignmentSubmissionSchema>;
