import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  serverTimestamp,
  Timestamp,
  PartialWithFieldValue,
  DocumentData,
} from 'firebase/firestore';

/**
 * GENERIC FIRESTORE CONVERTER
 * Enforces strong typing and centralizes createdAt/updatedAt timestamp management
 * for all domain models across Web and Mobile.
 */
export function createConverter<T extends { id?: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(modelObject: PartialWithFieldValue<T>): DocumentData {
      // Exclude 'id' from the document data itself since it's the document key
      const { id, ...data } = modelObject as any;
      return {
        ...data,
        updatedAt: serverTimestamp(),
      };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
      const data = snapshot.data(options);

      // Standardize Firebase Timestamps into portable data structures
      // so React Native and Web React process them identically without SDK collision.
      const normalizedData = { ...data };

      for (const [key, value] of Object.entries(normalizedData)) {
        if (value instanceof Timestamp) {
          normalizedData[key] = { toDate: () => value.toDate() };
        }
      }

      return {
        id: snapshot.id,
        ...normalizedData,
      } as T;
    },
  };
}
