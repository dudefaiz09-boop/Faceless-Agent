import { z } from 'zod';
export declare const AnnouncementSchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    targetClasses: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    visibility: z.ZodDefault<z.ZodEnum<["school", "class", "public", "private"]>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    visibility: "school" | "class" | "public" | "private";
    content: string;
    targetClasses: string[];
}, {
    title: string;
    content: string;
    visibility?: "school" | "class" | "public" | "private" | undefined;
    targetClasses?: string[] | undefined;
}>;
export type AnnouncementInput = z.infer<typeof AnnouncementSchema>;
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const AttendanceSchema: z.ZodObject<{
    studentId: z.ZodString;
    classId: z.ZodString;
    date: z.ZodString;
    status: z.ZodEnum<["present", "absent", "late"]>;
}, "strip", z.ZodTypeAny, {
    status: "present" | "absent" | "late";
    date: string;
    classId: string;
    studentId: string;
}, {
    status: "present" | "absent" | "late";
    date: string;
    classId: string;
    studentId: string;
}>;
