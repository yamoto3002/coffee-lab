'use client';

import { Check, Cloud, LoaderCircle, RotateCcw, TriangleAlert } from 'lucide-react';

type SyncTone = 'idle' | 'syncing' | 'success' | 'pending' | 'error';

export default function SyncStatus({ message, tone = 'idle', onRetry, compact = false }: { message?: string; tone?: SyncTone; onRetry?: () => void; compact?: boolean }) {
  const visual = {
    idle: { Icon: Cloud, className: 'text-[var(--muted-foreground)]' },
    syncing: { Icon: LoaderCircle, className: 'text-[var(--accent)]' },
    success: { Icon: Check, className: 'text-[var(--success)]' },
    pending: { Icon: Cloud, className: 'text-[var(--warning)]' },
    error: { Icon: TriangleAlert, className: 'text-[var(--destructive)]' },
  }[tone];
  const Icon = visual.Icon;
  if (!message) return null;
  return (
    <div className={`sync-status ${compact ? 'sync-status-compact' : ''} ${visual.className}`} role="status" aria-live="polite">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${tone === 'syncing' ? 'animate-spin' : ''}`} />
      <span className="min-w-0 text-pretty">{message}</span>
      {onRetry && (tone === 'error' || tone === 'pending') && <button type="button" onClick={onRetry} className="tap-button ml-1 inline-flex h-9 min-h-9 w-9 shrink-0 items-center justify-center rounded-md text-current" aria-label="同期を再試行"><RotateCcw className="h-3.5 w-3.5" /></button>}
    </div>
  );
}
