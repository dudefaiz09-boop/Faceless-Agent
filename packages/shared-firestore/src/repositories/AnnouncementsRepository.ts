import {
  Firestore,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  QueryConstraint,
} from 'firebase/firestore';
import { COLLECTIONS, Announcement } from '@educonnect/shared';
import { announcementConverter } from '../converters/index.js';

/**
 * SHARED FIRESTORE REPOSITORIES
 * Hardens realtime synchronization with optimized queries and converters.
 */

export class AnnouncementsRepository {
  constructor(private db: Firestore) {}

  private getCollection() {
    return collection(this.db, COLLECTIONS.ANNOUNCEMENTS).withConverter(announcementConverter);
  }

  /**
   * Hardened Realtime Listener
   * - Optimized query
   * - Automatic typed conversion
   * - Reliable cleanup
   */
  subscribeToAnnouncements(
    callback: (announcements: Announcement[]) => void,
    options: { classId?: string | null; limit?: number } = {}
  ) {
    const constraints: QueryConstraint[] = [
      orderBy('createdAt', 'desc'),
      limit(options.limit || 20),
    ];

    if (options.classId) {
      constraints.push(where('targetClasses', 'array-contains-any', ['all', options.classId]));
    }

    const q = query(this.getCollection(), ...constraints);

    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const announcements = snapshot.docs.map((doc) => doc.data());
        callback(announcements);

        // Log synchronization state for debugging
        if (snapshot.metadata.fromCache) {
          console.log('[Firestore] Serving data from local cache (offline).');
        }
      },
      (error) => {
        console.error('[Firestore] Listener error:', error);
      }
    );
  }
}
