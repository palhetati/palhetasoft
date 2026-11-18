'use client';

import React, { useEffect, useRef } from 'react';
import { Button } from './button';
import { Card } from './card';
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
  emptyMessage = 'Nenhum registro encontrado.',
  loading = false,
  pagination,
}: ResponsiveDataTableProps<T>) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pagination || pagination.mode !== 'infinite' || !pagination.hasMore || pagination.loadingMore) {
      return;
    }
    if (typeof IntersectionObserver === 'undefined') return;

    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          pagination.onLoadMore();
        }
      },
      { rootMargin: '120px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [pagination]);

  if (loading) {
    return <LoadingState label="Carregando..." />;
  }

  if (data.length === 0) {
    return (
      <Card variant="soft" className="py-8 text-center">
        <p className="typo-body-md text-ink-muted">{emptyMessage}</p>
      </Card>
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
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <span className="typo-caption text-ink-muted">
            Página {pagination.page} de {totalPages} ({pagination.totalCount} registros)
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
              <Button
                key={pageNum}
                size="sm"
                variant={pageNum === pagination.page ? 'primary' : 'utility'}
                loading={Boolean(pagination.loading && pageNum === pagination.page)}
                disabled={pagination.loading}
                onClick={() => pagination.onPageChange(pageNum)}
              >
                {pageNum}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Modo 1.2: Scroll Infinito com Supabase SDK */}
      {pagination?.mode === 'infinite' && (
        <div ref={sentinelRef} className="py-1">
          {pagination.loadingMore ? (
            <LoadingState compact label="Carregando..." />
          ) : pagination.hasMore ? (
            <div className="flex justify-center">
              <Button size="sm" variant="utility" onClick={pagination.onLoadMore}>
                Carregar mais itens
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
