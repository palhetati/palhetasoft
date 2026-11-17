import React from 'react';

export type BadgeSticker =
  | 'primary'
  | 'sky'
  | 'purple'
  | 'pink'
  | 'orange'
  | 'teal'
  | 'green'
  | 'brown';

export interface BadgeProps {
  sticker?: BadgeSticker;
  children: React.ReactNode;
  className?: string;
}

const DOT_COLOR: Record<BadgeSticker, string> = {
  primary: 'bg-primary',
  sky: 'bg-accent-sky',
  purple: 'bg-accent-purple',
  pink: 'bg-accent-pink',
  orange: 'bg-accent-orange',
  teal: 'bg-accent-teal',
  green: 'bg-accent-green',
  brown: 'bg-accent-brown',
};

const TEXT_COLOR: Record<BadgeSticker, string> = {
  primary: 'text-primary',
  sky: 'text-ink-secondary',
  purple: 'text-accent-purple-deep',
  pink: 'text-ink-secondary',
  orange: 'text-accent-orange-deep',
  teal: 'text-ink-secondary',
  green: 'text-ink-secondary',
  brown: 'text-accent-brown',
};

export function Badge({ sticker = 'primary', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-2.5 py-1 typo-eyebrow ${TEXT_COLOR[sticker]} ${className}`.trim()}
    >
      <span className={`h-2 w-2 rounded-full ${DOT_COLOR[sticker]}`} aria-hidden="true" />
      {children}
    </span>
  );
}
