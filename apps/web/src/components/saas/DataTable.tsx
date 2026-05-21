import React from 'react';
import type React from 'react';
import { cn } from '../../lib/utils';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage = 'No records found.',
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-950/70">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-14 text-center text-sm font-semibold text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={getRowKey(row, index)}
                  className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-6 py-4 text-sm text-slate-700 dark:text-slate-200',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
