'use client';

import React from 'react';
import { HelpHint } from './help-hint';

export type CardVariant = 'flat' | 'elevated' | 'soft' | 'featured-night';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  title?: string;
  subtitle?: string;
  helpTitle?: string;
  helpText?: string;
  headerAction?: React.ReactNode;
}

export function Card({
  variant = 'flat',
  title,
  subtitle,
  helpTitle,
  helpText,
  headerAction,
  className = '',
  children,
  ...props
}: CardProps) {
  const variants: Record<CardVariant, string> = {
    flat: 'bg-surface text-ink border border-hairline rounded-lg p-4 sm:p-6',
    elevated: 'bg-surface text-ink border border-hairline rounded-lg p-4 sm:p-6 shadow-soft',
    soft: 'bg-canvas-soft text-ink border border-hairline rounded-lg p-4 sm:p-6',
    'featured-night': 'bg-secondary text-on-primary rounded-lg p-4 sm:p-6 shadow-soft',
  };

  const isDark = variant === 'featured-night';

  return (
    <div className={`${variants[variant]} ${className}`.trim()} {...props}>
      {(title || headerAction || helpText) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {title && (
                // Título de seção: um degrau abaixo do título da tela (typo-heading-1)
                // e acima do corpo (14px). Nunca menor que o texto que ele nomeia.
                <h2 className={`typo-heading-3 ${isDark ? 'text-on-primary' : 'text-ink'}`}>
                  {title}
                </h2>
              )}
              {helpText && (
                <HelpHint title={helpTitle ?? title ?? 'Informação'} description={helpText} />
              )}
            </div>
            {subtitle && (
              <p className={`typo-caption mt-1 ${isDark ? 'text-on-primary/75' : 'text-ink-muted'}`}>
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
