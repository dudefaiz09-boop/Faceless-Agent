import { z } from 'zod';
export const TimestampValueSchema = z.union([
    z.object({ toDate: z.function().returns(z.date()) }),
    z.string(),
    z.number(),
    z.null(),
]);
export const UserProfileSchema = z.object({
    uid: z.string(),
    displayName: z.string(),
    email: z.string().email(),
    roles: z.array(z.string()),
    classId: z.string().optional(),
    section: z.string().optional(),
    subjects: z.array(z.string()).optional(),
    classes: z.array(z.string()).optional(),
    createdAt: TimestampValueSchema.optional(),
    linkedParentIds: z.array(z.string()).optional(),
});
export const ChatLogSchema = z.object({
    id: z.string(),
    query: z.string(),
    response: z.string(),
    timestamp: TimestampValueSchema,
    feedback: z.enum(['helpful', 'not_helpful']).nullable(),
});
export const AuditLogSchema = z.object({
    id: z.string(),
    action: z.string(),
    details: z.string(),
    timestamp: TimestampValueSchema,
    performedBy: z.string(),
});
export const AssignmentSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    dueDate: z.string(), // ISO string YYYY-MM-DD
    classId: z.string(),
    attachments: z.array(z.string()).default([]),
    rubric: z.string().optional(),
    visibility: z.enum(['public', 'private', 'archived']).default('public'),
    createdBy: z.string().optional(),
    createdAt: TimestampValueSchema.optional(),
    updatedAt: TimestampValueSchema.optional(),
});
export const SubmissionSchema = z.object({
    id: z.string(),
    assignmentId: z.string(),
    studentId: z.string(),
    studentName: z.string(),
    content: z.string(),
    fileUrl: z.string().nullable(),
    status: z.enum(['pending', 'submitted', 'graded', 'returned']),
    submittedAt: TimestampValueSchema.optional(),
    grade: z.string().nullable(),
    feedback: z.string().nullable(),
    aiScore: z.number().nullable(),
    aiFeedback: z.string().nullable(),
    teacherScore: z.string().nullable(),
    teacherFeedback: z.string().nullable(),
    checkedByAI: z.boolean().default(false),
    recheckedByTeacher: z.boolean().default(false),
});
export const AttendanceRecordSchema = z.object({
    id: z.string().optional(),
    studentId: z.string(),
    classId: z.string(),
    date: z.string(), // YYYY-MM-DD
    status: z.enum(['present', 'absent', 'late']),
    markedBy: z.string().optional(),
    updatedAt: TimestampValueSchema.optional(),
});
//# sourceMappingURL=domain.js.map