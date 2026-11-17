'use client';

import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'utility' | 'icon-circular' | 'danger-utility';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 typo-button transition-transform duration-100 disabled:opacity-50 disabled:pointer-events-none select-none min-h-[44px]';

  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-primary text-on-primary rounded-full px-5 py-2.5 active:bg-primary-active active:scale-[0.97]',
    secondary:
      'bg-surface text-ink rounded-full px-5 py-2.5 border border-hairline shadow-soft active:scale-[0.97]',
    utility:
      'bg-surface text-ink rounded-md px-3.5 py-1.5 border border-hairline active:bg-canvas-soft',
    'danger-utility':
      'bg-surface text-accent-orange-deep rounded-md px-3.5 py-1.5 border border-hairline active:bg-canvas-soft',
    'icon-circular':
      'rounded-full bg-black/5 text-ink p-2.5 min-w-[44px] active:scale-[0.93]',
  };

  const sizes: Record<ButtonSize, string> = {
    sm: 'text-[14px] px-3 py-1.5',
    md: '',
    lg: 'px-6 py-3 text-[16px]',
  };

  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
