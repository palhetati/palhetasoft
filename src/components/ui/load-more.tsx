'use client';

import React, { useEffect, useRef } from 'react';
import { Button } from './button';
import { LoadingState } from './loading-state';

export interface LoadMoreProps {
  hasMore: boolean;
  loadingMore?: boolean;
  onLoadMore: () => void;
  label?: string;
}

/**
 * Rolagem infinita (Modo B): busca o próximo lote quando o fim da lista entra na tela,
 * com botão de reserva para quem não rola (teclado, leitor de tela, lista curta).
 */
export function LoadMore({
  hasMore,
  loadingMore = false,
  onLoadMore,
  label = 'Carregar mais itens',
}: LoadMoreProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || loadingMore) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: '120px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  if (!hasMore && !loadingMore) return null;

  return (
    <div ref={sentinelRef} className="py-1">
      {loadingMore ? (
        <LoadingState compact label="Carregando..." />
      ) : (
        <div className="flex justify-center">
          <Button size="sm" variant="utility" onClick={onLoadMore}>
            {label}
          </Button>
        </div>
      )}
    </div>
  );
}
