import { z } from 'zod';
export declare const AnnouncementSchema: z.ZodObject<
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
    content: z.ZodString;
    authorId: z.ZodString;
    authorName: z.ZodOptional<z.ZodString>;
    targetClasses: z.ZodArray<z.ZodString, 'many'>;
    targetRoles: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
    priority: z.ZodDefault<z.ZodEnum<['low', 'normal', 'high']>>;
    isScheduled: z.ZodDefault<z.ZodBoolean>;
    scheduledFor: z.ZodOptional<z.ZodString>;
    attachments: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
    views: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string;
    title: string;
    attachments: string[];
    content: string;
    targetClasses: string[];
    priority: 'high' | 'normal' | 'low';
    authorId: string;
    schoolId: string;
    isArchived: boolean;
    targetRoles: string[];
    isScheduled: boolean;
    views: string[];
    createdAt?:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null
      | undefined;
    updatedAt?:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null
      | undefined;
    authorName?: string | undefined;
    scheduledFor?: string | undefined;
  },
  {
    id: string;
    title: string;
    content: string;
    targetClasses: string[];
    authorId: string;
    schoolId: string;
    createdAt?:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null
      | undefined;
    attachments?: string[] | undefined;
    updatedAt?:
      | string
      | number
      | {
          toDate: (...args: unknown[]) => Date;
        }
      | null
      | undefined;
    priority?: 'high' | 'normal' | 'low' | undefined;
    authorName?: string | undefined;
    isArchived?: boolean | undefined;
    targetRoles?: string[] | undefined;
    isScheduled?: boolean | undefined;
    scheduledFor?: string | undefined;
    views?: string[] | undefined;
  }
>;
export type Announcement = z.infer<typeof AnnouncementSchema>;
