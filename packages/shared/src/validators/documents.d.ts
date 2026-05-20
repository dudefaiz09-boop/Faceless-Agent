/**
 * DOCUMENT VALIDATORS
 * Ensures document data matches our centralized schemas.
 */
export declare function validateAnnouncement(data: unknown): {
  title: string;
  visibility: 'school' | 'class' | 'public' | 'private';
  content: string;
  targetClasses: string[];
};
