import { randomUUID } from 'node:crypto';
import { getSupabaseAdmin, type DocumentData } from './supabase.js';
import { getTenantId } from './context.js';

// Compatibility layer for the migration. Existing routes keep their
// document-store shaped calls while the storage underneath runs on Supabase.

type FilterOperator =
  | '=='
  | '>='
  | '<='
  | '>'
  | '<'
  | 'array-contains'
  | 'array-contains-any'
  | 'in';

interface QueryFilter {
  field: string;
  op: FilterOperator;
  value: any;
}

interface QueryOrder {
  field: string;
  direction: 'asc' | 'desc';
}

interface DocumentRow {
  id: string;
  data: DocumentData | null;
}

class SupabaseDocumentSnapshot {
  constructor(
    public readonly id: string,
    public readonly value: DocumentData | null
  ) {}

  get exists() {
    return this.value !== null;
  }

  data() {
    return this.value || undefined;
  }
}

class SupabaseQuerySnapshot {
  constructor(public readonly docs: SupabaseDocumentSnapshot[]) {}
}

function getFieldValue(data: DocumentData, field: string) {
  return field.split('.').reduce<any>((value, key) => value?.[key], data);
}

function matchesFilter(data: DocumentData, filter: QueryFilter) {
  const actual = getFieldValue(data, filter.field);

  switch (filter.op) {
    case '==':
      return actual === filter.value;
    case '>=':
      return actual >= filter.value;
    case '<=':
      return actual <= filter.value;
    case '>':
      return actual > filter.value;
    case '<':
      return actual < filter.value;
    case 'array-contains':
      return Array.isArray(actual) && actual.includes(filter.value);
    case 'array-contains-any':
      return (
        Array.isArray(actual) &&
        Array.isArray(filter.value) &&
        filter.value.some((item) => actual.includes(item))
      );
    case 'in':
      return Array.isArray(filter.value) && filter.value.includes(actual);
    default:
      return false;
  }
}

function byOrder(order: QueryOrder) {
  return (a: SupabaseDocumentSnapshot, b: SupabaseDocumentSnapshot) => {
    const aValue = getFieldValue(a.data() || {}, order.field);
    const bValue = getFieldValue(b.data() || {}, order.field);

    if (aValue === bValue) return 0;
    if (aValue === undefined || aValue === null) return 1;
    if (bValue === undefined || bValue === null) return -1;

    const result = aValue > bValue ? 1 : -1;
    return order.direction === 'desc' ? -result : result;
  };
}

class SupabaseDocumentReference {
  constructor(
    public readonly collectionName: string,
    public readonly id: string
  ) {}

  async get() {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('id,data')
      .eq('collection', this.collectionName)
      .eq('id', this.id)
      .maybeSingle<DocumentRow>();

    if (error) throw error;
    return new SupabaseDocumentSnapshot(this.id, data?.data || null);
  }

  async set(value: DocumentData) {
    const supabaseAdmin = getSupabaseAdmin();
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from('documents').upsert(
      {
        collection: this.collectionName,
        id: this.id,
        data: value,
        created_at: now,
        updated_at: now,
      },
      { onConflict: 'collection,id' }
    );

    if (error) throw error;
  }

  async update(value: DocumentData) {
    const supabaseAdmin = getSupabaseAdmin();
    const snapshot = await this.get();
    if (!snapshot.exists) {
      throw new Error(`Document ${this.collectionName}/${this.id} does not exist`);
    }

    const { error } = await supabaseAdmin
      .from('documents')
      .update({
        data: {
          ...(snapshot.data() || {}),
          ...value,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('collection', this.collectionName)
      .eq('id', this.id);

    if (error) throw error;
  }

  async delete() {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('collection', this.collectionName)
      .eq('id', this.id);

    if (error) throw error;
  }
}

class SupabaseCollectionReference {
  private filters: QueryFilter[] = [];
  private order: QueryOrder | null = null;
  private maxRows: number | null = null;

  constructor(private readonly collectionName: string) {}

  doc(id: string) {
    return new SupabaseDocumentReference(this.collectionName, id);
  }

  where(field: string, op: FilterOperator, value: any) {
    const next = new SupabaseCollectionReference(this.collectionName);
    next.filters = [...this.filters, { field, op, value }];
    next.order = this.order;
    next.maxRows = this.maxRows;
    return next;
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    const next = new SupabaseCollectionReference(this.collectionName);
    next.filters = this.filters;
    next.order = { field, direction };
    next.maxRows = this.maxRows;
    return next;
  }

  limit(count: number) {
    const next = new SupabaseCollectionReference(this.collectionName);
    next.filters = this.filters;
    next.order = this.order;
    next.maxRows = count;
    return next;
  }

  async get() {
    const supabaseAdmin = getSupabaseAdmin();
    const tenantId = getTenantId();

    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('id,data')
      .eq('collection', this.collectionName)
      .eq('data->>tenantId', tenantId);

    if (error) throw error;

    let docs = ((data || []) as DocumentRow[])
      .map((row) => new SupabaseDocumentSnapshot(row.id, row.data || {}))
      .filter((doc) => this.filters.every((filter) => matchesFilter(doc.data() || {}, filter)));

    if (this.order) {
      docs = docs.sort(byOrder(this.order));
    }

    if (this.maxRows !== null) {
      docs = docs.slice(0, this.maxRows);
    }

    return new SupabaseQuerySnapshot(docs);
  }

  async add(value: DocumentData) {
    const ref = this.doc(randomUUID());
    await ref.set(value);
    return ref;
  }
}

export const db = {
  collection(name: string) {
    return new SupabaseCollectionReference(name);
  },
};

async function getUserProfile(uid: string) {
  const snapshot = await db.collection('users').doc(uid).get();
  return snapshot.exists ? snapshot.data() || {} : {};
}

export const auth = {
  getSupabaseAdmin,

  async verifyIdToken(token: string) {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      throw error || new Error('Invalid Supabase access token');
    }

    const profile = await getUserProfile(data.user.id);
    const appMetadata = data.user.app_metadata || {};
    const userMetadata = data.user.user_metadata || {};

    return {
      uid: data.user.id,
      email: data.user.email,
      name: userMetadata.display_name || userMetadata.full_name || profile.displayName,
      role: profile.role || appMetadata.role || (profile.roles || appMetadata.roles || [])[0],
      roles: profile.roles || appMetadata.roles || [],
      isAdmin: !!profile.isAdmin || !!appMetadata.isAdmin,
      schoolId: profile.schoolId || appMetadata.schoolId || null,
      classId: profile.classId || appMetadata.classId || null,
      classIds:
        profile.classIds ||
        appMetadata.classIds ||
        (profile.classId || appMetadata.classId ? [profile.classId || appMetadata.classId] : []),
      subjectIds: profile.subjectIds || appMetadata.subjectIds || [],
      sectionIds: profile.sectionIds || appMetadata.sectionIds || [],
      linkedStudentIds: profile.linkedStudentIds || appMetadata.linkedStudentIds || [],
      assignedModules: profile.assignedModules || appMetadata.assignedModules || [],
      permissions: profile.permissions || appMetadata.permissions || {},
      status: profile.status || appMetadata.status || 'active',
    };
  },

  async createUser({
    email,
    password,
    displayName,
  }: {
    email: string;
    password: string;
    displayName?: string;
  }) {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error('Supabase did not return a created user');

    return {
      uid: data.user.id,
      email: data.user.email || email,
      displayName,
    };
  },

  async setCustomUserClaims(uid: string, claims: DocumentData) {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(uid, {
      app_metadata: claims,
    });

    if (error) throw error;

    const userRef = db.collection('users').doc(uid);
    const snapshot = await userRef.get();
    if (snapshot.exists) {
      await userRef.update(claims);
    } else {
      await userRef.set({ uid, ...claims, createdAt: new Date().toISOString() });
    }
  },

  async deleteUser(uid: string) {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (error) throw error;
  },
};
