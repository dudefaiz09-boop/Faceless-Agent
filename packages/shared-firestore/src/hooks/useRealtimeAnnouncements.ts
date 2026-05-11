import { useEffect, useState } from 'react';
import { Announcement } from '@educonnect/shared';
import { AnnouncementsRepository } from '../repositories/AnnouncementsRepository.js';

/**
 * SHARED REALTIME HOOK
 * Ensures robust synchronization, cleanup, and loading states for both platforms.
 */

export function useRealtimeAnnouncements(
  repository: AnnouncementsRepository,
  options: { classId?: string | null; limit?: number } = {}
) {
  const [data, setData] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    
    // Start realtime listener with automatic cleanup
    const unsubscribe = repository.subscribeToAnnouncements((announcements) => {
      setData(announcements);
      setLoading(false);
    }, options);

    return () => {
      console.log('[Firestore] Cleaning up announcements listener...');
      unsubscribe();
    };
    // Re-run listener if classId or other significant options change
  }, [repository, options.classId, options.limit]);

  return { data, loading, error };
}
