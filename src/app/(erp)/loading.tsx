import React from 'react';
import { Card, LoadingState } from '@/components/ui';

export default function ErpRouteLoading() {
  return (
    <Card variant="flat" className="flex flex-col">
      <LoadingState label="Carregando..." />
    </Card>
  );
}
