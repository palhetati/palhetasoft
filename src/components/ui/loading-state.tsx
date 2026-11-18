'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { sanitizeNoDashes } from '@/lib/copy-guard';

export interface LoadingStateProps {
  label?: string;
  compact?: boolean;
  className?: string;
}

export function LoadingState({
  label = 'Carregando...',
  compact = false,
  className = '',
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-2.5 text-center transition-opacity duration-200 ease-out ${
        compact ? 'py-4' : 'py-10'
      } ${className}`.trim()}
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
      <span className="typo-body-sm text-ink-muted">{sanitizeNoDashes(label)}</span>
    </div>
  );
}
