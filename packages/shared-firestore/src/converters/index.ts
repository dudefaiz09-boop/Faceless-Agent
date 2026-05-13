import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { Announcement } from '@educonnect/shared';

/**
 * TYPED FIRESTORE CONVERTERS
 * Ensures type safety and consistent data formatting during Read/Write.
 */

export const announcementConverter: FirestoreDataConverter<Announcement> = {
  toFirestore(announcement: Announcement) {
    const { id, ...data } = announcement;
    return {
      ...data,
      // Always use server-side timestamps for consistency
      updatedAt: serverTimestamp(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Announcement {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      title: data.title,
      content: data.content,
      authorId: data.authorId,
      authorName: data.authorName,
      targetClasses: data.targetClasses || [],
      visibility: data.visibility || 'public',
      // Standardize timestamps to ISO strings for cross-platform ease
      createdAt:
        data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : data.createdAt,
    } as Announcement;
  },
};
