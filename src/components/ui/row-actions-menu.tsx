'use client';

import React, { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from './button';
import { Tooltip } from './tooltip';

export interface RowActionItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}

export interface RowActionsProps {
  actions: RowActionItem[];
}

export function RowActions({ actions }: RowActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  if (actions.length === 0) return null;

  // Regra palhetasoft-design: Poucos botões (até 4) -> apenas o ícone + tooltip obrigatório
  if (actions.length <= 4) {
    return (
      <div className="inline-flex items-center justify-end gap-1">
        {actions.map((action) => (
          <Tooltip key={action.key} content={action.label}>
            <Button
              variant="icon-ghost"
              size="sm"
              aria-label={action.label}
              disabled={action.disabled}
              onClick={action.onClick}
              className={action.tone === 'danger' ? 'text-accent-orange-deep' : ''}
            >
              {action.icon}
            </Button>
          </Tooltip>
        ))}
      </div>
    );
  }

  // Regra palhetasoft-design: Mais de 4 botões -> ícone de mais ações + dropdown com ícones
  return (
    <div className="relative inline-flex items-center justify-end">
      <Tooltip content="Mais ações">
        <Button
          variant="icon-ghost"
          size="sm"
          aria-label="Mais ações"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </Tooltip>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1 flex w-48 flex-col gap-0.5 rounded-lg border border-hairline bg-surface p-1.5 shadow-elevated transition-all duration-200 ease-out"
          >
            {actions.map((action) => (
              <Button
                key={action.key}
                variant="utility"
                size="sm"
                fullWidth
                disabled={action.disabled}
                onClick={() => {
                  setMenuOpen(false);
                  action.onClick();
                }}
                className={`!justify-start !border-0 !shadow-none ${
                  action.tone === 'danger' ? '!text-accent-orange-deep' : ''
                }`}
              >
                {action.icon}
                <span>{action.label}</span>
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
