'use client';

import React from 'react';
import { sanitizeNoDashes } from '@/lib/copy-guard';
import { Alert } from './alert';
import { Button } from './button';
import { Modal } from './modal';

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  loadingLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  errorMessage?: string | null;
  children?: React.ReactNode;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  loadingLabel = 'Carregando...',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  loading = false,
  errorMessage = null,
  children,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={() => {
        if (!loading) onClose();
      }}
      title={sanitizeNoDashes(title)}
      footer={
        <>
          <Button variant="utility" disabled={loading} onClick={onClose}>
            {sanitizeNoDashes(cancelLabel)}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger-utility' : 'primary'}
            loading={loading}
            loadingText={sanitizeNoDashes(loadingLabel)}
            onClick={onConfirm}
          >
            {sanitizeNoDashes(confirmLabel)}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="typo-body-md text-ink-secondary">{sanitizeNoDashes(description)}</p>
        {children}
        {errorMessage && (
          <Alert tone="warning" title="Não foi possível concluir">
            {sanitizeNoDashes(errorMessage)}
          </Alert>
        )}
      </div>
    </Modal>
  );
}
