import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { collection, query, onSnapshot, QueryConstraint, Firestore } from 'firebase/firestore';
import { createConverter } from '../converters/base.js';

/**
 * PRODUCTION REALTIME HOOK
 * Safely manages Firestore listeners without memory leaks.
 * Projects data directly into TanStack Query to eliminate duplicate cache layers.
 *
 * Supports offline-first data resolution via includeMetadataChanges.
 */
export function useRealtimeSync<T extends { id?: string }>(
  db: Firestore,
  collectionName: string,
  queryConstraints: QueryConstraint[],
  queryKey: string[]
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // 1. Build strongly typed query
    const converter = createConverter<T>();
    const q = query(collection(db, collectionName).withConverter(converter), ...queryConstraints);

    // 2. Attach Listener with Metadata Sync for Optimistic UI Support
    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        // If snapshot.metadata.hasPendingWrites is true, the data is from local cache
        // and hasn't been synced to the backend yet (Optimistic / Offline state).

        const data = snapshot.docs.map((doc) => doc.data());

        // 3. Inject into React Query to satisfy all cross-platform consumers instantly
        queryClient.setQueryData(queryKey, data);
      },
      (error) => {
        console.error(`[Firestore Realtime Error] Collection: ${collectionName}`, error);
      }
    );

    // 4. Guaranteed cleanup prevents memory leaks on component unmount
    return () => unsubscribe();
  }, [db, collectionName, JSON.stringify(queryConstraints), JSON.stringify(queryKey), queryClient]);
}
