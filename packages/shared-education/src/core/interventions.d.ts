import { z } from 'zod';
export declare const InterventionAlertSchema: z.ZodObject<
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
    studentId: z.ZodString;
    teacherId: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<['attendance', 'assignment', 'grade', 'behavior']>;
    severity: z.ZodEnum<['low', 'medium', 'high', 'critical']>;
    reason: z.ZodString;
    suggestedAction: z.ZodOptional<z.ZodString>;
    isApproved: z.ZodDefault<z.ZodBoolean>;
    approvedBy: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<['pending', 'active', 'resolved', 'ignored']>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    type: 'attendance' | 'grade' | 'assignment' | 'behavior';
    status: 'active' | 'pending' | 'resolved' | 'ignored';
    id: string;
    studentId: string;
    schoolId: string;
    isArchived: boolean;
    severity: 'high' | 'low' | 'medium' | 'critical';
    reason: string;
    isApproved: boolean;
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
    teacherId?: string | undefined;
    suggestedAction?: string | undefined;
    approvedBy?: string | undefined;
  },
  {
    type: 'attendance' | 'grade' | 'assignment' | 'behavior';
    id: string;
    studentId: string;
    schoolId: string;
    severity: 'high' | 'low' | 'medium' | 'critical';
    reason: string;
    status?: 'active' | 'pending' | 'resolved' | 'ignored' | undefined;
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
    isArchived?: boolean | undefined;
    teacherId?: string | undefined;
    suggestedAction?: string | undefined;
    isApproved?: boolean | undefined;
    approvedBy?: string | undefined;
  }
>;
export type InterventionAlert = z.infer<typeof InterventionAlertSchema>;
