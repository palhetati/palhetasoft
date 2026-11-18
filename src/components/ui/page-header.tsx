'use client';

import React, { useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { sanitizeNoDashes } from '@/lib/copy-guard';
import { Button } from './button';
import { Card } from './card';
import { Tooltip } from './tooltip';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  helpTitle: string;
  helpText: string;
  actions?: React.ReactNode;
  defaultHelpOpen?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  helpTitle,
  helpText,
  actions,
  defaultHelpOpen = false,
}: PageHeaderProps) {
  const [helpOpen, setHelpOpen] = useState(defaultHelpOpen);
  const cleanHelpTitle = sanitizeNoDashes(helpTitle);
  const cleanHelpText = sanitizeNoDashes(helpText);

  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="typo-heading-1 text-ink">{sanitizeNoDashes(title)}</h1>
            <Tooltip content="Ver explicação desta tela">
              <Button
                variant="icon-circular"
                aria-label={`Ajuda: ${cleanHelpTitle}`}
                aria-expanded={helpOpen}
                onClick={() => setHelpOpen((prev) => !prev)}
                className="!min-h-[36px] !min-w-[36px] !p-1.5"
              >
                <CircleHelp className="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>
          {subtitle && (
            <p className="typo-body-sm mt-1 text-ink-muted">{sanitizeNoDashes(subtitle)}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {/* Seção de Ajuda dedicada ao módulo com transição suave */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          helpOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <Card variant="soft" className="!p-4">
          <p className="typo-eyebrow uppercase text-primary">{cleanHelpTitle}</p>
          <p className="typo-body-sm mt-1 text-ink-secondary">{cleanHelpText}</p>
        </Card>
      </div>
    </header>
  );
}
