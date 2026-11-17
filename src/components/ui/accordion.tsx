'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from './button';

export interface AccordionProps {
  title: string;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Accordion({
  title,
  defaultOpen = false,
  badge,
  children,
  className = '',
}: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-lg border border-hairline bg-surface ${className}`.trim()}>
      <Button
        variant="utility"
        fullWidth
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="!justify-between !border-0 !rounded-lg !px-4 !py-3 text-left"
      >
        <span className="flex items-center gap-2 font-semibold text-ink">
          {title}
          {badge}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </Button>
      {open && <div className="border-t border-hairline px-4 py-4">{children}</div>}
    </div>
  );
}
