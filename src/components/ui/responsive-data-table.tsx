'use client';

import React from 'react';
import { Button } from './button';
import { LoadMore } from './load-more';
import { LoadingState } from './loading-state';
import { TruncatedText } from './tooltip';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'right';
}

export interface NumberedPaginationProps {
  mode: 'numbered';
  page: number;
  pageSize: number;
  totalCount: number;
  loading?: boolean;
  onPageChange: (nextPage: number) => void;
}

export interface InfinitePaginationProps {
  mode: 'infinite';
  hasMore: boolean;
  loadingMore?: boolean;
  onLoadMore: () => void;
}

export type GridPaginationConfig = NumberedPaginationProps | InfinitePaginationProps;

export interface ResponsiveDataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  loading?: boolean;
  pagination?: GridPaginationConfig;
}

export function ResponsiveDataTable<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage = 'Nenhum item encontrado.',
  loading = false,
  pagination,
}: ResponsiveDataTableProps<T>) {
  if (loading) {
    return <LoadingState label="Carregando..." />;
  }

  if (data.length === 0) {
    return (
      // Fundo sem borda: a tabela já mora num Card de seção, e card dentro de card é proibido.
      <div className="rounded-md bg-canvas-soft px-4 py-8 text-center">
        <p className="typo-body-md text-ink-muted">{emptyMessage}</p>
      </div>
    );
  }

  const renderCellContent = (val: React.ReactNode) => {
    if (typeof val === 'string' && val.length > 34) {
      return <TruncatedText text={val} maxWidthClass="max-w-[220px]" />;
    }
    return val;
  };

  const totalPages =
    pagination?.mode === 'numbered'
      ? Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize))
      : 1;

  return (
    <div className="flex flex-col gap-3">
      {/* Scroll horizontal garantido em mobile e desktop (palhetasoft-design Regra 8) */}
      <div className="w-full overflow-x-auto rounded-lg border border-hairline bg-surface [-webkit-overflow-scrolling:touch]">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr className="border-b border-hairline bg-canvas-soft">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`whitespace-nowrap px-4 py-3 typo-eyebrow uppercase text-ink-muted ${
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
                className="border-b border-hairline transition-colors duration-200 ease-out hover:bg-canvas-soft/60 last:border-b-0"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 typo-body-sm text-ink ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {renderCellContent(col.render(row))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modo 1.1: Paginação Normal Numerada com Supabase SDK */}
      {pagination?.mode === 'numbered' && totalPages > 1 && (
        <nav
          aria-label="Paginação da tabela"
          className="flex flex-wrap items-center justify-between gap-2 pt-1"
        >
          <span className="typo-caption text-ink-muted">
            Página {pagination.page} de {totalPages} ({pagination.totalCount} itens)
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => {
              const current = pageNum === pagination.page;
              return (
                <Button
                  key={pageNum}
                  size="sm"
                  variant="utility"
                  aria-current={current ? 'page' : undefined}
                  loading={Boolean(pagination.loading && current)}
                  disabled={pagination.loading}
                  onClick={() => pagination.onPageChange(pageNum)}
                  className={current ? '!border-primary/40 !bg-primary/10 !text-primary' : ''}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Modo 1.2: Scroll Infinito com Supabase SDK */}
      {pagination?.mode === 'infinite' && (
        <LoadMore
          hasMore={pagination.hasMore}
          loadingMore={pagination.loadingMore}
          onLoadMore={pagination.onLoadMore}
        />
      )}
    </div>
  );
}
