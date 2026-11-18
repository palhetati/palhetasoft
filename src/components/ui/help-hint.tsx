'use client';

import React, { useState } from 'react';
import { CircleHelp, X } from 'lucide-react';
import { sanitizeNoDashes } from '@/lib/copy-guard';
import { Button } from './button';

export interface HelpHintProps {
  title: string;
  description: string;
}

export function HelpHint({ title, description }: HelpHintProps) {
  const [open, setOpen] = useState(false);
  const cleanTitle = sanitizeNoDashes(title);
  const cleanDescription = sanitizeNoDashes(description);

  return (
    <div className="relative inline-flex items-center">
      <Button
        variant="icon-circular"
        aria-label={`Ajuda: ${cleanTitle}`}
        title={`Ajuda sobre ${cleanTitle}`}
        onClick={() => setOpen((prev) => !prev)}
        className="!min-h-[30px] !min-w-[30px] !p-1 text-ink-muted hover:text-primary"
      >
        <CircleHelp className="h-4 w-4" strokeWidth={2} />
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/10 sm:bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label={cleanTitle}
            className="fixed inset-x-4 bottom-4 z-50 rounded-xl border border-hairline bg-surface p-5 shadow-elevated sm:absolute sm:inset-auto sm:left-0 sm:top-full sm:mt-2 sm:w-80"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <span className="typo-eyebrow text-primary uppercase">{cleanTitle}</span>
              <Button
                variant="icon-circular"
                aria-label="Fechar ajuda"
                onClick={() => setOpen(false)}
                className="!min-h-[28px] !min-w-[28px] !p-1"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="typo-caption text-ink-secondary">{cleanDescription}</p>
          </div>
        </>
      )}
    </div>
  );
}
