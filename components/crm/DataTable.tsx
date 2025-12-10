// ==========================================
// DATA TABLE COMPONENT
// ==========================================

'use client';

import React from 'react';

interface Column<T> {
  key: string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="bg-surface border border-zinc-800/50 rounded-lg overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-zinc-900/50"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-zinc-800/30 border-t border-zinc-800/30"></div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-surface border border-zinc-800/50 rounded-lg p-12 text-center">
        <p className="text-zinc-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-zinc-800/50 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-900/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/30">
            {data.map((row, index) => (
              <tr
                key={index}
                className="hover:bg-teal-900/10 transition-colors"
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
