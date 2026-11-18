'use client';

import React from 'react';
import { sanitizeNoDashes } from '@/lib/copy-guard';

export interface TileButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'title' | 'value'> {
  /** Nome do item (até duas linhas). */
  title: string;
  /** Valor principal, à esquerda da base do ladrilho (ex.: preço). */
  value?: React.ReactNode;
  /** Sinal à direita do valor (ex.: "2 no pedido"). */
  aside?: React.ReactNode;
  /** Linha de rodapé (ex.: estoque). */
  meta?: React.ReactNode;
  /** Destaca o contorno quando o item já foi escolhido. */
  selected?: boolean;
}

/**
 * Ladrilho clicável para catálogos de escolha rápida (produtos do PDV, serviços).
 * É um botão, não um card: não tem cabeçalho, não tem sombra em repouso e pode morar
 * dentro de um card de seção, em grade auto-fill.
 */
export function TileButton({
  title,
  value,
  aside,
  meta,
  selected = false,
  className = '',
  type = 'button',
  ...props
}: TileButtonProps) {
  return (
    <button
      type={type}
      className={`flex h-full w-full cursor-pointer flex-col gap-2 rounded-md border bg-surface p-3 text-left transition-all duration-200 ease-out hover:border-primary/40 hover:shadow-soft active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-55 ${
        selected ? 'border-primary/40' : 'border-hairline'
      } ${className}`.trim()}
      {...props}
    >
      <span className="line-clamp-2 typo-body-sm font-medium text-ink">
        {sanitizeNoDashes(title)}
      </span>
      {(value || aside) && (
        <span className="mt-auto flex items-end justify-between gap-2">
          {value && <span className="typo-body-sm font-semibold tabular-nums text-ink">{value}</span>}
          {aside && <span className="typo-caption font-medium text-primary">{aside}</span>}
        </span>
      )}
      {meta && <span className="typo-caption text-ink-muted">{meta}</span>}
    </button>
  );
}
