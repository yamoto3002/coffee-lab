'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Coffee, Flame, History, Plus } from 'lucide-react';
import SyncStatus from '@/components/SyncStatus';
import { getCoachInsights } from '@/lib/coach';
import { DBService } from '@/lib/db';
import { formatDate, todayDateString } from '@/lib/date';
import { Bean, Roast, Tasting } from '@/types';

type SyncTone = 'idle' | 'syncing' | 'success' | 'pending' | 'error';

export default function Home() {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [roasts, setRoasts] = useState<Roast[]>([]);
  const [tastings, setTastings] = useState<Tasting[]>([]);
  const [syncMessage, setSyncMessage] = useState('ローカルの記録を表示中');
  const [syncTone, setSyncTone] = useState<SyncTone>('idle');

  const loadLocal = useCallback(() => {
    setBeans(DBService.getBeans());
    setRoasts(DBService.getRoasts());
    setTastings(DBService.getTastings());
  }, []);

  const sync = useCallback(async () => {
    setSyncTone('syncing');
    setSyncMessage('バックグラウンドで同期中');
    const result = await DBService.syncFromCloud();
    loadLocal();
    if (result.ok) {
      setSyncTone('success');
      setSyncMessage(`最終同期 ${new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`);
    } else if (result.pending) {
      setSyncTone('pending');
      setSyncMessage('未同期の記録があります。ローカルには保存済みです。');
    } else {
      setSyncTone('error');
      setSyncMessage('同期を再試行できます。ローカルの記録は安全です。');
    }
  }, [loadLocal]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadLocal();
      void sync();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadLocal, sync]);

  const insights = useMemo(() => getCoachInsights({ beans, roasts, tastings }), [beans, roasts, tastings]);
  const primaryInsight = insights[0];
  const latestRoast = useMemo(() => [...roasts].sort((a, b) => b.roastDate.localeCompare(a.roastDate))[0], [roasts]);
  const latestBean = latestRoast ? beans.find(bean => bean.id === latestRoast.beanId) : undefined;
  const completedTastings = tastings.filter(tasting => tasting.status === 'completed');

  return (
    <div className="lab-shell">
      <header className="border-b border-[var(--border)] px-5 py-6 md:px-10 md:py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--muted-foreground)]">{formatDate(todayDateString())}</p>
            <h1 className="page-title mt-1">今日の実験</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">焙煎、テイスティング、振り返りを一つずつ進めます。</p>
          </div>
          <SyncStatus message={syncMessage} tone={syncTone} onRetry={() => void sync()} compact />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-6 pb-28 md:px-10 md:py-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,.75fr)]">
          <div className="space-y-10">
            <section aria-labelledby="next-action-title">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 id="next-action-title" className="text-lg font-bold text-[var(--foreground)]">次にすること</h2>
                <span className="text-xs text-[var(--muted-foreground)]">おすすめを1件表示</span>
              </div>
              {primaryInsight && (
                <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6">
                  <p className="text-xs font-semibold text-[var(--primary)]">{primaryInsight.type === 'tasting' ? 'テイスティング' : primaryInsight.type === 'inventory' ? '生豆管理' : '焙煎ノート'}</p>
                  <h3 className="mt-2 text-xl font-bold text-[var(--foreground)]">{primaryInsight.title}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">{primaryInsight.message}</p>
                  {primaryInsight.actionHref && primaryInsight.actionLabel && (
                    <Link href={primaryInsight.actionHref} className="tap-button mt-5 inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-[var(--primary-foreground)]">
                      {primaryInsight.actionLabel}<ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              )}
            </section>

            <section aria-labelledby="quick-actions-title">
              <h2 id="quick-actions-title" className="mb-3 text-lg font-bold text-[var(--foreground)]">すぐに記録する</h2>
              <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
                <QuickAction href="/roasts/new" icon={<Flame className="h-5 w-5" />} title="焙煎を始める" description="タイマーで Crack と Drop を記録" primary />
                <QuickAction href="/roasts" icon={<History className="h-5 w-5" />} title="焙煎記録を見る" description="テイスティングや比較へ進む" />
                <QuickAction href="/beans" icon={<Plus className="h-5 w-5" />} title="生豆を登録する" description="産地や精製方法を記録" />
              </div>
            </section>
          </div>

          <aside className="space-y-8" aria-label="最近の記録と進み具合">
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-[var(--foreground)]">最近の記録</h2>
                <Link href="/roasts" className="tap-button text-sm font-semibold text-[var(--primary)]">すべて見る</Link>
              </div>
              {latestRoast ? (
                <Link href={`/roasts/${latestRoast.id}`} className="tap-button block rounded-[10px] bg-[var(--surface)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-sm font-bold text-[var(--foreground)]">{latestRoast.id}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">{formatDate(latestRoast.roastDate)}</span>
                  </div>
                  <p className="mt-2 font-semibold text-[var(--foreground)]">{latestBean?.name || '生豆不明'}</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">Drop {latestRoast.dropTime || '未記録'} · {latestRoast.greenWeight}g</p>
                </Link>
              ) : (
                <div className="rounded-[10px] bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
                  <Coffee className="mb-3 h-5 w-5 text-[var(--primary)]" />
                  最初の焙煎を保存すると、ここからテイスティングと比較へ進めます。
                </div>
              )}
            </section>

            <section className="border-t border-[var(--border)] pt-6">
              <h2 className="text-sm font-bold text-[var(--foreground)]">記録の進み具合</h2>
              <dl className="mt-4 grid grid-cols-3 gap-3">
                <ProgressCount label="生豆" value={beans.length} />
                <ProgressCount label="焙煎" value={roasts.length} />
                <ProgressCount label="試飲" value={completedTastings.length} />
              </dl>
              <Link href="/dashboard" className="tap-button mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--primary)]">分析と予定を見る<ArrowRight className="h-4 w-4" /></Link>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function QuickAction({ href, icon, title, description, primary = false }: { href: string; icon: React.ReactNode; title: string; description: string; primary?: boolean }) {
  return <Link href={href} className="tap-button flex min-h-[4.75rem] items-center gap-4 py-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] ${primary ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : 'bg-[var(--surface-raised)] text-[var(--muted-foreground)]'}`}>{icon}</span><span className="min-w-0 flex-1"><span className="block font-semibold text-[var(--foreground)]">{title}</span><span className="mt-0.5 block text-sm text-[var(--muted-foreground)]">{description}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" /></Link>;
}

function ProgressCount({ label, value }: { label: string; value: number }) {
  return <div><dt className="text-xs text-[var(--muted-foreground)]">{label}</dt><dd className="mt-1 font-mono text-xl font-bold text-[var(--foreground)]">{value}<span className="ml-1 text-xs font-medium text-[var(--muted-foreground)]">件</span></dd></div>;
}
