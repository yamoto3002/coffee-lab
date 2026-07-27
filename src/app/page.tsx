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
      <header className="page-header px-5 py-5 md:px-10 md:py-7">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--muted-foreground)]">{formatDate(todayDateString())}</p>
            <h1 className="page-title mt-1">今日の実験</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">記録を残し、味を確かめ、次の条件を決めます。</p>
          </div>
          <SyncStatus message={syncMessage} tone={syncTone} onRetry={() => void sync()} compact />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6 pb-28 md:px-10 md:py-9">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(19rem,.6fr)] lg:gap-12">
          <div className="space-y-9">
            <section aria-labelledby="next-action-title">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 id="next-action-title" className="section-heading">次にすること</h2>
                <span className="text-[.8125rem] text-[var(--muted-foreground)]">記録から1件を提案</span>
              </div>
              {primaryInsight && (
                <div className="recommendation-bench p-5 pr-14 md:p-7 md:pr-24">
                  <p className="text-[.8125rem] font-semibold text-[var(--primary)]">{primaryInsight.type === 'tasting' ? '味を確かめる' : primaryInsight.type === 'inventory' ? '生豆を整える' : '条件を見返す'}</p>
                  <h3 className="mt-2 max-w-2xl text-xl font-bold leading-snug tracking-[-.015em] text-[var(--foreground)] md:text-2xl">{primaryInsight.title}</h3>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{primaryInsight.message}</p>
                  {primaryInsight.actionHref && primaryInsight.actionLabel && (
                    <Link href={primaryInsight.actionHref} className="tap-button roast-actuator relative z-10 mt-6 inline-flex min-h-12 items-center gap-2 px-5 py-3 text-sm font-bold">
                      {primaryInsight.actionLabel}<ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              )}
            </section>

            <section aria-labelledby="quick-actions-title">
              <h2 id="quick-actions-title" className="section-heading mb-3">すぐに記録する</h2>
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
                <h2 className="section-heading">最近の記録</h2>
                <Link href="/roasts" className="tap-button text-sm font-semibold text-[var(--primary)]">すべて見る</Link>
              </div>
              {latestRoast ? (
                <Link href={`/roasts/${latestRoast.id}`} className="tap-button block border-y border-[var(--border)] py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-sm font-bold text-[var(--foreground)]">{latestRoast.id}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">{formatDate(latestRoast.roastDate)}</span>
                  </div>
                  <p className="mt-2 font-semibold text-[var(--foreground)]">{latestBean?.name || '生豆不明'}</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">Drop {latestRoast.dropTime || '未記録'} · {latestRoast.greenWeight}g</p>
                </Link>
              ) : (
                <div className="border-y border-[var(--border)] py-4 text-sm leading-6 text-[var(--muted-foreground)]">
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
  return <Link href={href} className="tap-button flex min-h-[5rem] items-center gap-4 py-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] ${primary ? 'actuator-button text-[var(--primary-foreground)]' : 'bg-[var(--surface-raised)] text-[var(--muted-foreground)]'}`}>{icon}</span><span className="min-w-0 flex-1"><span className="block font-semibold text-[var(--foreground)]">{title}</span><span className="mt-0.5 block text-sm text-[var(--muted-foreground)]">{description}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" /></Link>;
}

function ProgressCount({ label, value }: { label: string; value: number }) {
  return <div><dt className="text-xs text-[var(--muted-foreground)]">{label}</dt><dd className="mt-1 font-mono text-xl font-bold text-[var(--foreground)]">{value}<span className="ml-1 text-xs font-medium text-[var(--muted-foreground)]">件</span></dd></div>;
}
