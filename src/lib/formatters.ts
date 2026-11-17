export function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatDateBR(isoDate: string | Date | null | undefined): string {
  if (!isoDate) return '';
  const date = typeof isoDate === 'string' ? new Date(isoDate.length === 10 ? `${isoDate}T12:00:00` : isoDate) : isoDate;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR').format(date);
}
