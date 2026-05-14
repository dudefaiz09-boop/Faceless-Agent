export declare function validateAnnouncement(data: unknown): {
    title: string;
    content: string;
    priority: "low" | "normal" | "high" | "urgent";
    targetRoles: string[];
    targetClasses: string[];
    visibility: "public" | "class" | "school";
    authorId?: string | undefined;
    authorName?: string | undefined;
    isScheduled?: boolean | undefined;
    scheduledFor?: string | undefined;
};
