import { z } from 'zod';
/**
 * BASE SaaS SCHEMAS
 * Every document in the multi-tenant architecture MUST have a schoolId.
 */
export declare const BaseSaaSObjectSchema: z.ZodObject<
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
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string;
    schoolId: string;
    isArchived: boolean;
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
  },
  {
    id: string;
    schoolId: string;
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
  }
>;
export type BaseSaaSObject = z.infer<typeof BaseSaaSObjectSchema>;
