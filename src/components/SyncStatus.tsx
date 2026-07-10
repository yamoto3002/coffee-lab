'use client';

import { Check, Cloud, LoaderCircle, RotateCcw, TriangleAlert } from 'lucide-react';

type SyncTone = 'idle' | 'syncing' | 'success' | 'pending' | 'error';

export default function SyncStatus({ message, tone = 'idle', onRetry, compact = false }: { message?: string; tone?: SyncTone; onRetry?: () => void; compact?: boolean }) {
  const visual = {
    idle: { Icon: Cloud, className: 'text-slate-400' },
    syncing: { Icon: LoaderCircle, className: 'text-cyan-100' },
    success: { Icon: Check, className: 'text-emerald-200' },
    pending: { Icon: Cloud, className: 'text-amber-100' },
    error: { Icon: TriangleAlert, className: 'text-amber-100' },
  }[tone];
  const Icon = visual.Icon;
  if (!message) return null;
  return (
    <div className={`sync-status ${compact ? 'sync-status-compact' : ''} ${visual.className}`} aria-live="polite">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${tone === 'syncing' ? 'animate-spin' : ''}`} />
      <span className="min-w-0 truncate">{message}</span>
      {onRetry && (tone === 'error' || tone === 'pending') && <button type="button" onClick={onRetry} className="tap-button ml-1 rounded-md p-1 text-current" aria-label="同期を再試行"><RotateCcw className="h-3.5 w-3.5" /></button>}
    </div>
  );
}
