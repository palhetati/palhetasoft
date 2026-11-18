'use client';

import React, { useId } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  containerClassName?: string;
}

export function Select({
  label,
  options,
  error,
  id,
  className = '',
  containerClassName = '',
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`.trim()}>
      {label && (
        <label htmlFor={selectId} className="typo-caption font-medium text-ink-secondary">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`min-h-[42px] w-full rounded-xs border border-[var(--color-input-border)] bg-surface px-3 py-1.5 typo-body-sm text-ink focus:border-primary focus:shadow-soft focus:outline-none disabled:bg-canvas-soft ${className}`.trim()}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="typo-caption text-accent-orange-deep">{error}</span>}
    </div>
  );
}
