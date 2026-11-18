'use client';

import React, { useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
}

export function Input({
  label,
  hint,
  error,
  id,
  className = '',
  containerClassName = '',
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`.trim()}>
      {label && (
        <label htmlFor={inputId} className="typo-caption font-medium text-ink-secondary">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`min-h-[42px] w-full rounded-xs border border-[var(--color-input-border)] bg-surface px-3 py-1.5 typo-body-sm text-ink placeholder:text-ink-faint focus:border-primary focus:shadow-soft focus:outline-none disabled:bg-canvas-soft disabled:text-ink-muted ${className}`.trim()}
        {...props}
      />
      {error ? (
        <span className="typo-caption text-accent-orange-deep">{error}</span>
      ) : (
        hint && <span className="typo-caption text-ink-muted">{hint}</span>
      )}
    </div>
  );
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export function Textarea({
  label,
  error,
  id,
  className = '',
  containerClassName = '',
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`.trim()}>
      {label && (
        <label htmlFor={textareaId} className="typo-caption font-medium text-ink-secondary">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`w-full rounded-xs border border-[var(--color-input-border)] bg-surface px-3 py-2 typo-body-sm text-ink placeholder:text-ink-faint focus:border-primary focus:shadow-soft focus:outline-none ${className}`.trim()}
        {...props}
      />
      {error && <span className="typo-caption text-accent-orange-deep">{error}</span>}
    </div>
  );
}
