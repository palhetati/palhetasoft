'use client';

import React from 'react';
import { sanitizeNoDashes } from '@/lib/copy-guard';
import { HelpHint } from './help-hint';

export interface StatCardProps {
  /** O que o número mede. Fica pequeno, acima do valor. */
  label: string;
  /** O número já formatado (formatBRL, contagem, percentual). */
  value: React.ReactNode;
  /** Uma linha curta abaixo do valor. */
  footnote?: React.ReactNode;
  /** Selo no canto (ex.: Badge de status). */
  badge?: React.ReactNode;
  /** 'featured' = superfície escura do indicador principal. No máximo um por tela. */
  tone?: 'default' | 'featured';
  helpTitle?: string;
  helpText?: string;
  className?: string;
}

/**
 * Card de indicador. O tamanho do valor é decidido aqui (typo-heading-2) para que
 * nenhuma tela precise decidir: destaque vem da superfície (tone="featured"), não de
 * tipo maior. Mora direto no card raiz da tela, numa grade, nunca dentro de outro card.
 */
export function StatCard({
  label,
  value,
  footnote,
  badge,
  tone = 'default',
  helpTitle,
  helpText,
  className = '',
}: StatCardProps) {
  const isDark = tone === 'featured';
  const surface = isDark
    ? 'bg-secondary text-on-primary shadow-soft'
    : 'bg-canvas-soft text-ink border border-hairline';

  return (
    <div className={`flex flex-col gap-2 rounded-lg p-4 sm:p-5 ${surface} ${className}`.trim()}>
      <div className="flex min-h-[30px] items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={`typo-caption font-medium ${isDark ? 'text-on-primary/85' : 'text-ink-secondary'}`}
          >
            {sanitizeNoDashes(label)}
          </span>
          {helpText && <HelpHint title={helpTitle ?? label} description={helpText} />}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      <p className={`typo-heading-2 tabular-nums ${isDark ? 'text-on-primary' : 'text-ink'}`}>
        {value}
      </p>
      {footnote && (
        <p className={`typo-caption ${isDark ? 'text-on-primary/75' : 'text-ink-muted'}`}>
          {footnote}
        </p>
      )}
    </div>
  );
}
