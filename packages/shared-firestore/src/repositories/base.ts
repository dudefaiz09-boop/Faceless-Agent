import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  QueryConstraint,
  serverTimestamp,
} from 'firebase/firestore';
import { createConverter } from '../converters/base.js';

/**
 * BASE FIRESTORE REPOSITORY
 * Ensures every database interaction is typed, timestamped, and routed through
 * the exact same converter logic on both Web and Mobile platforms.
 */
export class BaseRepository<T extends { id?: string }> {
  protected converter = createConverter<T>();

  constructor(
    protected db: Firestore,
    protected collectionName: string
  ) {}

  getCollectionRef() {
    return collection(this.db, this.collectionName).withConverter(this.converter);
  }

  getDocRef(id: string) {
    return doc(this.db, this.collectionName, id).withConverter(this.converter);
  }

  async get(id: string): Promise<T | null> {
    const snap = await getDoc(this.getDocRef(id));
    return snap.exists() ? snap.data() : null;
  }

  async list(constraints: QueryConstraint[] = []): Promise<T[]> {
    const q = query(this.getCollectionRef(), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((doc) => doc.data());
  }

  async create(data: Partial<T>, customId?: string): Promise<string> {
    const ref = customId ? this.getDocRef(customId) : doc(this.getCollectionRef());
    await setDoc(ref, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as any);
    return ref.id;
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    await updateDoc(this.getDocRef(id), {
      ...data,
      updatedAt: serverTimestamp(),
    } as any);
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(this.getDocRef(id));
  }
}
