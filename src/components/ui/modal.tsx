'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Button } from './button';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl border border-hairline bg-surface p-6 shadow-elevated sm:max-w-lg sm:rounded-xl">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-hairline pb-3">
          <h2 className="typo-title text-ink">{title}</h2>
          <Button
            variant="icon-circular"
            aria-label="Fechar janela"
            onClick={onClose}
            className="!min-h-[36px] !min-w-[36px] !p-1.5"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-4">{children}</div>
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-2 pt-3 border-t border-hairline">{footer}</div>}
      </div>
    </div>
  );
}
