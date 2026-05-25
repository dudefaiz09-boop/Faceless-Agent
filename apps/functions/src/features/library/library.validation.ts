import { z } from 'zod';

export const uploadLibraryResourceSchema = z.object({
  body: z
    .object({
      title: z.string().min(1),
      description: z.string().optional(),
      subject: z.string().min(1),
      grade: z.string().min(1),
      classIds: z.array(z.string()).optional(),
      type: z.enum(['pdf', 'ebook', 'web_link', 'video', 'document']),
      fileUrl: z.string().optional(),
      externalUrl: z.string().optional(),
      attachmentName: z.string().optional(),
      attachmentSize: z.number().optional(),
      tags: z.array(z.string()).optional(),
      visibility: z.enum(['all', 'roles', 'classes']),
      targetRoles: z.array(z.string()).optional(),
      targetClassIds: z.array(z.string()).optional(),
      availableCopies: z.number().optional(),
    })
    .strict(),
});

export const borrowResourceSchema = z.object({
  body: z
    .object({
      resourceId: z.string(),
    })
    .strict(),
});

export const returnResourceSchema = z.object({
  body: z
    .object({
      recordId: z.string(),
    })
    .strict(),
});

export const resourceIdParamsSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

export const borrowHistoryParamsSchema = z.object({
  params: z.object({
    uid: z.string(),
  }),
});

export const updateLibraryResourceSchema = z.object({
  body: z
    .object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      subject: z.string().optional(),
      grade: z.string().optional(),
      type: z.enum(['pdf', 'ebook', 'web_link', 'video', 'document']).optional(),
      fileUrl: z.string().optional(),
      externalUrl: z.string().optional(),
      attachmentName: z.string().optional(),
      attachmentSize: z.number().optional(),
      tags: z.array(z.string()).optional(),
      visibility: z.enum(['all', 'roles', 'classes']).optional(),
      targetRoles: z.array(z.string()).optional(),
      targetClassIds: z.array(z.string()).optional(),
      classIds: z.array(z.string()).optional(),
      availableCopies: z.number().optional(),
    })
    .strict(),
});
