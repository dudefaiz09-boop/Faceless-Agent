import { useEffect, useMemo, useState } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type DocumentFilterOperator =
  | 'eq'
  | 'array-contains'
  | 'array-contains-any'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte';

export interface DocumentFilter {
  field: string;
  op: DocumentFilterOperator;
  value: unknown;
}

export interface DocumentOrder {
  field: string;
  ascending?: boolean;
}

export interface DocumentListOptions {
  enabled?: boolean;
  filters?: DocumentFilter[];
  limit?: number;
  order?: DocumentOrder;
  realtime?: boolean;
}

type DocumentRow = {
  collection: string;
  id: string;
  data: Record<string, unknown>;
};

export type DocumentRecord<T> = T & { id: string };

function getFieldValue(data: Record<string, unknown>, field: string) {
  return field.split('.').reduce<unknown>((value, key) => {
    if (value && typeof value === 'object' && key in value) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, data);
}

function compareValues(left: unknown, right: unknown) {
  const leftValue = left instanceof Date ? left.getTime() : left;
  const rightValue = right instanceof Date ? right.getTime() : right;

  if (typeof leftValue === 'string' && typeof rightValue === 'string') {
    return leftValue.localeCompare(rightValue);
  }

  if (typeof leftValue === 'number' && typeof rightValue === 'number') {
    return leftValue - rightValue;
  }

  return String(leftValue ?? '').localeCompare(String(rightValue ?? ''));
}

function matchesFilter(data: Record<string, unknown>, filter: DocumentFilter) {
  const value = getFieldValue(data, filter.field);

  switch (filter.op) {
    case 'eq':
      return value === filter.value;
    case 'array-contains':
      return Array.isArray(value) && value.includes(filter.value);
    case 'array-contains-any':
      return (
        Array.isArray(value) &&
        Array.isArray(filter.value) &&
        filter.value.some((candidate) => value.includes(candidate))
      );
    case 'gt':
      return compareValues(value, filter.value) > 0;
    case 'gte':
      return compareValues(value, filter.value) >= 0;
    case 'lt':
      return compareValues(value, filter.value) < 0;
    case 'lte':
      return compareValues(value, filter.value) <= 0;
    default:
      return true;
  }
}

function materializeRows<T>(rows: DocumentRow[], options: DocumentListOptions) {
  let records = rows.map((row) => ({ id: row.id, ...(row.data || {}) }) as DocumentRecord<T>);

  if (options.filters?.length) {
    records = records.filter((record) =>
      options.filters?.every((filter) => matchesFilter(record as Record<string, unknown>, filter))
    );
  }

  if (options.order) {
    const { field, ascending = true } = options.order;
    records = [...records].sort((a, b) => {
      const result = compareValues(
        getFieldValue(a as Record<string, unknown>, field),
        getFieldValue(b as Record<string, unknown>, field)
      );
      return ascending ? result : -result;
    });
  }

  if (options.limit) {
    records = records.slice(0, options.limit);
  }

  return records;
}

export function collectionPath(...segments: Array<string | undefined | null>) {
  return segments.filter(Boolean).join('/');
}

export async function listDocuments<T>(
  collectionName: string,
  options: DocumentListOptions = {}
): Promise<Array<DocumentRecord<T>>> {
  if (!collectionName || options.enabled === false) return [];

  const { data, error } = await supabase
    .from('documents')
    .select('collection,id,data')
    .eq('collection', collectionName);

  if (error) throw error;
  return materializeRows<T>((data || []) as DocumentRow[], options);
}

export function useDocuments<T>(collectionName: string, options: DocumentListOptions = {}) {
  const [data, setData] = useState<Array<DocumentRecord<T>>>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(options.enabled !== false);
  const optionsKey = useMemo(() => JSON.stringify(options), [options]);

  useEffect(() => {
    let mounted = true;
    const parsedOptions = JSON.parse(optionsKey) as DocumentListOptions;

    async function load() {
      if (!collectionName || parsedOptions.enabled === false) {
        setData([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const records = await listDocuments<T>(collectionName, parsedOptions);
        if (mounted) {
          setData(records);
          setError(null);
        }
      } catch (loadError) {
        if (mounted) {
          const nextError =
            loadError instanceof Error ? loadError : new Error(String(loadError));
          setError(nextError);
          console.error(`[Supabase] Failed to load ${collectionName}:`, nextError);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    if (parsedOptions.realtime === false || !collectionName || parsedOptions.enabled === false) {
      return () => {
        mounted = false;
      };
    }

    const channel = supabase
      .channel(`documents:${collectionName}:${optionsKey}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents' },
        (payload: RealtimePostgresChangesPayload<DocumentRow>) => {
          const row = (payload.new || payload.old) as DocumentRow | null;
          if (row?.collection === collectionName) {
            void load();
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [collectionName, optionsKey]);

  return { data, error, loading, reload: () => listDocuments<T>(collectionName, options) };
}
