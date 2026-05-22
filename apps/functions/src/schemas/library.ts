import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1);
const optionalString = z.string().trim().optional();

const stringArraySchema = z.array(z.string().trim().min(1));

export const libraryResourceTypeSchema = z.enum([
  'pdf',
  'ebook',
  'web_link',
  'video',
  'document',
]);

export const libraryVisibilitySchema = z.enum([
  'all',
  'roles',
  'classes',
]);

export const resourceIdParamsSchema = z
  .object({
    id: nonEmptyString,
  })
  .strict();

export const borrowHistoryParamsSchema = z
  .object({
    uid: nonEmptyString,
  })
  .strict();

const libraryResourceBodySchema = z
  .object({
    title: nonEmptyString,
    description: optionalString,
    subject: nonEmptyString,
    grade: nonEmptyString,
    classIds: stringArraySchema.optional(),
    type: libraryResourceTypeSchema.default('document'),
    fileUrl: optionalString,
    externalUrl: optionalString,
    attachmentName: optionalString,
    attachmentSize: z.coerce.number().nonnegative().optional(),
    tags: stringArraySchema.optional(),
    visibility: libraryVisibilitySchema.default('all'),
    targetRoles: stringArraySchema.optional(),
    targetClassIds: stringArraySchema.optional(),
    availableCopies: z.coerce.number().int().positive().default(1),
  })
  .strict();

export const uploadLibraryResourceSchema = libraryResourceBodySchema.refine(
  (value) => Boolean(value.fileUrl || value.externalUrl),
  {
    message: 'Either fileUrl or externalUrl is required.',
    path: ['fileUrl'],
  }
);

export const updateLibraryResourceSchema = libraryResourceBodySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one resource field is required.',
  })
  .refine(
    (value) => {
      if ('fileUrl' in value || 'externalUrl' in value) {
        return Boolean(value.fileUrl || value.externalUrl);
      }

      return true;
    },
    {
      message: 'Either fileUrl or externalUrl is required when updating resource links.',
      path: ['fileUrl'],
    }
  );

export const borrowResourceSchema = z
  .object({
    resourceId: nonEmptyString,
  })
  .strict();

export const returnResourceSchema = z
  .object({
    recordId: nonEmptyString,
  })
  .strict();