import React from 'react';
import { Card } from './card';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'right';
}

export interface ResponsiveDataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
}

export function ResponsiveDataTable<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage = 'Nenhum registro encontrado.',
}: ResponsiveDataTableProps<T>) {
  if (data.length === 0) {
    return (
      <Card variant="soft" className="py-10 text-center">
        <p className="typo-body-md text-ink-muted">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <div>
      {/* Desktop & Tablet Data Table (ex-data-table-cell from DESIGN.md) */}
      <div className="hidden overflow-x-auto rounded-lg border border-hairline bg-surface md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-hairline bg-canvas-soft">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 typo-eyebrow uppercase text-ink-muted ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className="border-b border-hairline last:border-b-0"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 typo-body-sm text-ink ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards (<= 600px / < md) */}
      <div className="flex flex-col gap-3 md:hidden">
        {data.map((row) => (
          <Card key={keyExtractor(row)} variant="flat" className="space-y-2">
            {columns.map((col) => (
              <div
                key={col.key}
                className="flex items-start justify-between gap-3 border-b border-hairline pb-2 last:border-b-0 last:pb-0"
              >
                <span className="typo-eyebrow uppercase text-ink-muted">{col.header}</span>
                <div className="typo-body-sm text-right text-ink">{col.render(row)}</div>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}
