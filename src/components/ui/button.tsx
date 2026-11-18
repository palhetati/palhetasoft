'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'utility'
  | 'success'
  | 'danger-utility'
  | 'icon-circular'
  | 'icon-ghost';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  loadingText?: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  loadingText,
  className = '',
  children,
  type = 'button',
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex cursor-pointer items-center justify-center gap-2 typo-button shadow-soft transition-all duration-200 ease-out active:scale-[0.98] disabled:opacity-55 disabled:pointer-events-none select-none min-h-[40px] sm:min-h-[42px]';

  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-primary text-on-primary rounded-full px-4 py-2 hover:bg-primary-active active:bg-primary-active',
    secondary:
      'bg-surface text-ink rounded-full px-4 py-2 border border-hairline hover:bg-canvas-soft',
    utility:
      'bg-surface text-ink-secondary rounded-md px-3.5 py-1.5 border border-hairline hover:bg-canvas-soft hover:text-ink',
    success:
      'bg-accent-teal text-on-primary rounded-md px-3.5 py-1.5 hover:opacity-95',
    'danger-utility':
      'bg-surface text-accent-orange-deep rounded-md px-3.5 py-1.5 border border-hairline hover:bg-canvas-soft',
    'icon-circular':
      'rounded-full bg-canvas-soft text-ink-secondary p-2 min-w-[40px] min-h-[40px] border border-hairline hover:text-primary hover:bg-surface',
    'icon-ghost':
      'rounded-md bg-transparent text-ink-secondary p-2 min-w-[38px] min-h-[38px] shadow-none hover:bg-canvas-soft hover:text-ink',
  };

  const sizes: Record<ButtonSize, string> = {
    sm: 'text-[13px] px-3 py-1.5 min-h-[36px]',
    md: '',
    lg: 'px-5 py-2.5 text-[14px]',
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`.trim()}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}
