'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Flame, History, Plus, Sparkles } from 'lucide-react';
import CoachInsightCard from '@/components/CoachInsightCard';
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

  return (
    <div className="lab-shell">
      <section className="border-b border-white/[0.07] px-5 py-8 md:px-10 md:py-12">
        <div className="relative mx-auto max-w-6xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-1.5 text-xs font-medium text-cyan-100">
                <Sparkles className="h-3.5 w-3.5" />
                Science. Flavor. Evolution.
              </div>
              <h1 className="mt-5 text-5xl font-semibold tracking-[-.06em] text-white sm:text-6xl">Coffee <span className="neon-text">Lab</span></h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 md:text-base">毎日の焙煎を、次の仮説につなげる実験室。</p>
            </div>
            <div className="hidden text-right sm:block">
              <p className="eyebrow text-slate-500">Today</p>
              <p className="mt-2 font-mono text-lg font-semibold text-cyan-100">{formatDate(todayDateString())}</p>
              <div className="mt-3"><SyncStatus message={syncMessage} tone={syncTone} onRetry={() => void sync()} compact /></div>
            </div>
          </div>

          <div className="mt-8 max-w-3xl">
            {primaryInsight && <CoachInsightCard insight={primaryInsight} featured />}
            <div className="mt-3 sm:hidden"><SyncStatus message={syncMessage} tone={syncTone} onRetry={() => void sync()} /></div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-5 py-8 pb-28 md:px-10 md:py-10">
        <section>
          <div className="mb-4 flex items-end justify-between gap-3"><div><p className="eyebrow text-cyan-200">Quick actions</p><h2 className="mt-2 text-xl font-semibold text-white">今やること</h2></div><Link href="/dashboard" className="tap-button text-sm font-semibold text-cyan-100">分析を見る</Link></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <QuickAction href="/roasts/new" icon={<Flame className="h-5 w-5" />} title="Live Roast" description="焙煎を始める" color="#DCA66C" />
            <QuickAction href="/roasts" icon={<History className="h-5 w-5" />} title="記録を見る" description="焙煎と味を振り返る" color="#69CBD5" />
            <QuickAction href="/beans" icon={<Plus className="h-5 w-5" />} title="生豆を追加" description="素材を登録する" color="#C97392" />
          </div>
        </section>
      </main>
    </div>
  );
}

function QuickAction({ href, icon, title, description, color }: { href: string; icon: React.ReactNode; title: string; description: string; color: string }) {
  return <Link href={href} className="tap-button lab-card-soft flex min-h-28 items-center gap-4 p-4" style={{ borderColor: `${color}2f` }}><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border" style={{ color, backgroundColor: `${color}10`, borderColor: `${color}2b` }}>{icon}</span><span><span className="block font-semibold text-white">{title}</span><span className="mt-1 block text-xs text-slate-400">{description}</span></span></Link>;
}
