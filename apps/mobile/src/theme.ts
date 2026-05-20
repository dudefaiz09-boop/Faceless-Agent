export const colors = {
  ai: '#67e8f9',
  background: '#020617',
  border: '#24324a',
  card: '#0f172a',
  cardMuted: '#111c33',
  cardSoft: '#15213a',
  danger: '#f87171',
  dangerSoft: '#2a1218',
  line: '#1e293b',
  muted: '#94a3b8',
  primary: '#2563eb',
  primarySoft: '#172554',
  success: '#86efac',
  successStrong: '#10b981',
  text: '#f8fafc',
  warning: '#fbbf24',
  warningSoft: '#2a210f',
  whiteSoft: '#e2e8f0',
};

export function formatDate(value?: string | number | Date | null) {
  if (!value) return 'Not synced yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not synced yet';
  return date.toLocaleString([], {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
}

export function formatCurrency(amount: number) {
  return `INR ${Math.round(amount || 0).toLocaleString()}`;
}
