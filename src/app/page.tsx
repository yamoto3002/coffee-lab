'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Beaker, Coffee, Flame, History, Plus, Sparkles, TestTube2 } from 'lucide-react';
import CoachInsightCard from '@/components/CoachInsightCard';
import EmptyState from '@/components/EmptyState';
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

  const completedTastings = useMemo(() => tastings.filter(tasting => tasting.status === 'completed'), [tastings]);
  const latestRoast = useMemo(() => [...roasts].sort((a, b) => b.roastDate.localeCompare(a.roastDate) || b.id.localeCompare(a.id))[0], [roasts]);
  const insights = useMemo(() => getCoachInsights({ beans, roasts, tastings }), [beans, roasts, tastings]);
  const [primaryInsight, ...supportingInsights] = insights;

  return (
    <div className="lab-shell">
      <section className="relative isolate overflow-hidden border-b border-white/10 px-5 py-8 md:px-10 md:py-12">
        <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden="true">
          <svg className="absolute -right-16 top-0 h-[380px] w-[560px] max-w-none" viewBox="0 0 560 380" fill="none">
            <path d="M-16 302C68 244 99 147 188 208C278 270 284 100 374 137C439 164 468 100 580 22" stroke="url(#roast-line)" strokeWidth="2" />
            <path d="M-16 332C84 287 134 248 222 274C314 301 345 174 444 194C495 204 520 172 580 130" stroke="rgba(255,184,107,.32)" strokeWidth="1" />
            <defs><linearGradient id="roast-line" x1="0" x2="560" y1="0" y2="0"><stop stopColor="#00F0FF" stopOpacity="0" /><stop offset=".38" stopColor="#00F0FF" /><stop offset=".72" stopColor="#FF3D71" /><stop offset="1" stopColor="#FFB86B" /></linearGradient></defs>
          </svg>
        </div>

        <div className="relative mx-auto max-w-6xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-1.5 text-xs font-medium text-cyan-100">
                <Sparkles className="h-3.5 w-3.5" />
                Science. Flavor. Evolution.
              </div>
              <h1 className="mt-5 text-5xl font-semibold tracking-[-.06em] text-white sm:text-6xl md:text-7xl">Coffee <span className="neon-text">Lab</span></h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 md:text-base">毎日の焙煎を、次の仮説につなげる実験室。</p>
            </div>
            <div className="hidden text-right sm:block">
              <p className="eyebrow text-slate-500">Today</p>
              <p className="mt-2 font-mono text-lg font-semibold text-cyan-100">{formatDate(todayDateString())}</p>
              <div className="mt-3"><SyncStatus message={syncMessage} tone={syncTone} onRetry={() => void sync()} compact /></div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
            <div>
              {primaryInsight ? <CoachInsightCard insight={primaryInsight} featured /> : <EmptyState title="今日の実験を始めましょう" message="生豆や焙煎を記録すると、ここに次の一手が届きます。" actionLabel="生豆を追加" actionHref="/beans" />}
              <div className="mt-3 sm:hidden"><SyncStatus message={syncMessage} tone={syncTone} onRetry={() => void sync()} /></div>
            </div>
            <div className="lab-card overflow-hidden p-5 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div><p className="eyebrow text-slate-500">Your Lab</p><p className="mt-2 text-sm text-slate-300">記録が増えるほど、比較の解像度が上がります。</p></div>
                <Beaker className="h-7 w-7 text-fuchsia-300" />
              </div>
              <div className="mt-7 grid grid-cols-3 gap-2 sm:gap-3">
                <Metric label="Beans" value={beans.length} color="#8C00FF" />
                <Metric label="Roasts" value={roasts.length} color="#FFB86B" />
                <Metric label="Tastes" value={completedTastings.length} color="#00F0FF" />
              </div>
              <div className="mt-6 rounded-2xl border border-white/10 bg-[#060913]/70 p-4">
                <p className="eyebrow text-slate-500">Latest experiment</p>
                {latestRoast ? <Link href={`/roasts/${latestRoast.id}`} className="tap-button mt-2 flex items-end justify-between gap-3"><div><p className="font-mono text-xl font-semibold text-white">{latestRoast.id}</p><p className="mt-1 text-xs text-slate-400">焙煎日 {formatDate(latestRoast.roastDate)}</p></div><ArrowUpRight className="h-5 w-5 text-cyan-100" /></Link> : <p className="mt-2 text-sm leading-6 text-slate-400">最初の焙煎を保存すると、ここにプロファイルが育ちます。</p>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-9 px-5 py-8 pb-28 md:px-10 md:py-10">
        <section>
          <div className="mb-4 flex items-end justify-between gap-3"><div><p className="eyebrow text-cyan-200">Quick actions</p><h2 className="mt-2 text-xl font-semibold text-white">今やること</h2></div><Link href="/dashboard" className="tap-button text-sm font-semibold text-cyan-100">分析を見る</Link></div>
          <div className="no-scrollbar -mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            <QuickAction href="/roasts/new" icon={<Flame className="h-5 w-5" />} title="Live Roast" description="新しい実験を始める" color="#FFB86B" />
            <QuickAction href={primaryInsight?.type === 'tasting' && primaryInsight.actionHref ? primaryInsight.actionHref : '/roasts'} icon={<TestTube2 className="h-5 w-5" />} title="テイスティング" description="今日の味を残す" color="#00F0FF" />
            <QuickAction href="/beans" icon={<Plus className="h-5 w-5" />} title="生豆を追加" description="次の素材を登録" color="#8C00FF" />
            <QuickAction href="/roasts" icon={<History className="h-5 w-5" />} title="焙煎記録" description="過去の実験を見返す" color="#FF3D71" />
          </div>
        </section>

        {supportingInsights.length > 0 && <section>
          <div className="mb-4"><p className="eyebrow text-fuchsia-300">Coach notes</p><h2 className="mt-2 text-xl font-semibold text-white">次の仮説</h2></div>
          <div className="no-scrollbar -mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3">
            {supportingInsights.slice(0, 3).map(insight => <CoachInsightCard key={insight.id} insight={insight} />)}
          </div>
        </section>}

        {beans.length === 0 && <EmptyState title="まだ実験はまっさらです" message="生豆を一つ登録すると、焙煎・テイスティング・AI Coachの流れが始まります。サンプルデータは表示しません。" actionLabel="最初の生豆を追加" actionHref="/beans" icon={<Coffee className="h-7 w-7" />} />}
      </main>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-3"><span className="eyebrow text-slate-500">{label}</span><strong className="display-number mt-2 block truncate text-3xl" style={{ color }}>{value}</strong></div>;
}

function QuickAction({ href, icon, title, description, color }: { href: string; icon: React.ReactNode; title: string; description: string; color: string }) {
  return <Link href={href} className="tap-button lab-card-soft min-w-[200px] snap-start p-5 sm:min-w-0" style={{ borderColor: `${color}35` }}><span className="flex h-11 w-11 items-center justify-center rounded-2xl border" style={{ color, backgroundColor: `${color}14`, borderColor: `${color}2f` }}>{icon}</span><h3 className="mt-5 font-semibold text-white">{title}</h3><p className="mt-1 text-xs text-slate-400">{description}</p></Link>;
}
