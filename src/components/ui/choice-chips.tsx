'use client';

import React from 'react';
import { sanitizeNoDashes } from '@/lib/copy-guard';

export interface ChoiceChipOption<T extends string> {
  value: T;
  label: string;
}

export interface ChoiceChipsProps<T extends string> {
  options: ChoiceChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Nome do grupo para leitor de tela (ex.: "Filtrar por setor"). */
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Escolha de uma opção entre poucas (filtro de categoria, Hoje/Mês, pagamento único
 * ou dividido). Menor que um botão e sem o azul cheio: o azul sólido fica reservado
 * para a ação principal da tela.
 */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  disabled = false,
  className = '',
}: ChoiceChipsProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className={`flex flex-wrap gap-2 ${className}`.trim()}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`inline-flex min-h-[36px] cursor-pointer select-none items-center rounded-full border px-3.5 typo-caption font-medium transition-all duration-200 ease-out active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-55 ${
              selected
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-hairline bg-surface text-ink-secondary hover:bg-canvas-soft hover:text-ink'
            }`}
          >
            {sanitizeNoDashes(opt.label)}
          </button>
        );
      })}
    </div>
  );
}

export interface MultiChoiceChipsProps<T extends string> {
  options: ChoiceChipOption<T>[];
  values: T[];
  onToggle: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Seleção múltipla entre opções conhecidas (ex.: módulos de uma empresa ou perfis de um usuário).
 * Usa o mesmo contorno azul suave do ChoiceChips, preservando o azul cheio apenas para a ação principal.
 */
export function MultiChoiceChips<T extends string>({
  options,
  values,
  onToggle,
  ariaLabel,
  disabled = false,
  className = '',
}: MultiChoiceChipsProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className={`flex flex-wrap gap-2 ${className}`.trim()}>
      {options.map((opt) => {
        const selected = values.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onToggle(opt.value)}
            className={`inline-flex min-h-[36px] cursor-pointer select-none items-center rounded-full border px-3.5 typo-caption font-medium transition-all duration-200 ease-out active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-55 ${
              selected
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-hairline bg-surface text-ink-secondary hover:bg-canvas-soft hover:text-ink'
            }`}
          >
            {sanitizeNoDashes(opt.label)}
          </button>
        );
      })}
    </div>
  );
}
