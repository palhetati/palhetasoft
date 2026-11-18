'use client';

import React, { useState } from 'react';
import { sanitizeNoDashes } from '@/lib/copy-guard';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className = '' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const clean = sanitizeNoDashes(content);

  if (!clean) return <>{children}</>;

  return (
    <span
      className={`relative inline-flex max-w-full items-center ${className}`.trim()}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      <span
        role="tooltip"
        aria-hidden={!visible}
        className={`pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-max max-w-[260px] -translate-x-1/2 rounded-md border border-hairline bg-ink px-2.5 py-1.5 text-[12px] font-normal leading-snug text-on-primary shadow-elevated transition-all duration-200 ease-out ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
        }`}
      >
        {clean}
      </span>
    </span>
  );
}

export function TruncatedText({
  text,
  maxWidthClass = 'max-w-[200px]',
}: {
  text: string;
  maxWidthClass?: string;
}) {
  const clean = sanitizeNoDashes(text);
  return (
    <Tooltip content={clean}>
      <span className={`block truncate ${maxWidthClass}`}>{clean}</span>
    </Tooltip>
  );
}
