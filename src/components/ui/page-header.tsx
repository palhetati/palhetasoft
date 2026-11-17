'use client';

import React from 'react';
import { sanitizeNoDashes } from '@/lib/copy-guard';
import { HelpHint } from './help-hint';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  helpTitle: string;
  helpText: string;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  helpTitle,
  helpText,
  actions,
}: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="typo-heading-2 text-ink">{sanitizeNoDashes(title)}</h1>
          <HelpHint title={helpTitle} description={helpText} />
        </div>
        {subtitle && (
          <p className="typo-caption mt-1 text-ink-muted">{sanitizeNoDashes(subtitle)}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
