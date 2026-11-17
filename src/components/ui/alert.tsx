import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { sanitizeNoDashes } from '@/lib/copy-guard';

export type AlertTone = 'info' | 'success' | 'warning';

export interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Alert({ tone = 'info', title, children, className = '' }: AlertProps) {
  const iconMap: Record<AlertTone, React.ReactNode> = {
    info: <Info className="h-5 w-5 text-primary shrink-0" />,
    success: <CheckCircle2 className="h-5 w-5 text-accent-green shrink-0" />,
    warning: <AlertCircle className="h-5 w-5 text-accent-orange shrink-0" />,
  };

  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-xl border border-hairline bg-surface px-4 py-3 shadow-soft ${className}`.trim()}
    >
      <div className="mt-0.5">{iconMap[tone]}</div>
      <div className="min-w-0 flex-1">
        {title && <p className="typo-body-sm font-semibold text-ink">{sanitizeNoDashes(title)}</p>}
        <div className="typo-caption text-ink-secondary">{children}</div>
      </div>
    </div>
  );
}
