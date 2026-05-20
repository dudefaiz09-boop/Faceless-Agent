import { z } from 'zod';
export declare const ParentStudentLinkSchema: z.ZodObject<
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
    parentId: z.ZodString;
    studentId: z.ZodString;
    relationship: z.ZodOptional<z.ZodString>;
    isVerified: z.ZodDefault<z.ZodBoolean>;
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string;
    studentId: string;
    schoolId: string;
    isArchived: boolean;
    parentId: string;
    isVerified: boolean;
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
    relationship?: string | undefined;
  },
  {
    id: string;
    studentId: string;
    schoolId: string;
    parentId: string;
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
    relationship?: string | undefined;
    isVerified?: boolean | undefined;
  }
>;
export type ParentStudentLink = z.infer<typeof ParentStudentLinkSchema>;
