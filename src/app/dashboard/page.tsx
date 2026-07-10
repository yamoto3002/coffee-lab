'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ChartNoAxesCombined, ChevronRight, Flame, GitCompareArrows, RefreshCw, ScrollText, TestTube2 } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import CoachInsightCard from '@/components/CoachInsightCard';
import EmptyState from '@/components/EmptyState';
import SyncStatus from '@/components/SyncStatus';
import { getCoachInsights } from '@/lib/coach';
import { DBService } from '@/lib/db';
import { addDateDays, parseDateOnly, todayDateString } from '@/lib/date';
import { Bean, Roast, Tasting } from '@/types';

type CalendarItem = { id: string; label: string; href: string; color: string; kind: 'roast' | 'tasting' };
type SyncTone = 'idle' | 'syncing' | 'success' | 'pending' | 'error';

export default function DashboardPage() {
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

  const syncFromCloud = useCallback(async () => {
    setSyncTone('syncing'); setSyncMessage('バックグラウンドで同期中');
    const result = await DBService.syncFromCloud();
    loadLocal();
    if (result.ok) { setSyncTone('success'); setSyncMessage(`最終同期 ${new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`); }
    else if (result.pending) { setSyncTone('pending'); setSyncMessage('未同期の記録があります。ローカルには保存済みです。'); }
    else { setSyncTone('error'); setSyncMessage('同期を再試行できます。ローカルの記録は安全です。'); }
  }, [loadLocal]);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => { loadLocal(); void syncFromCloud(); }, 0);
    const timer = window.setInterval(() => void syncFromCloud(), 60000);
    window.addEventListener('online', syncFromCloud);
    return () => { window.clearTimeout(initialTimer); window.clearInterval(timer); window.removeEventListener('online', syncFromCloud); };
  }, [loadLocal, syncFromCloud]);

  const completedTastings = useMemo(() => tastings.filter(tasting => tasting.status === 'completed'), [tastings]);
  const insights = useMemo(() => getCoachInsights({ beans, roasts, tastings }), [beans, roasts, tastings]);
  const latestRoast = useMemo(() => [...roasts].sort((a, b) => b.roastDate.localeCompare(a.roastDate) || b.id.localeCompare(a.id))[0], [roasts]);
  const tastingInsight = insights.find(insight => insight.type === 'tasting' && insight.actionHref);
  const calendar = useMemo(() => buildCalendar(roasts, beans), [roasts, beans]);
  const trendData = useMemo(() => [...roasts].sort((a, b) => a.roastDate.localeCompare(b.roastDate) || a.id.localeCompare(b.id)).slice(-10).map(roast => ({ id: roast.id, loss: roast.lossRatio || undefined, dev: roast.developmentRatio ?? undefined })), [roasts]);
  const canShowTrend = trendData.filter(point => point.loss !== undefined || point.dev !== undefined).length >= 3;

  if (roasts.length === 0) {
    return <div className="lab-shell px-5 py-8 pb-28 md:px-10"><div className="mx-auto max-w-5xl"><EmptyState title="まだ分析するには記録が少ないです" message="まずは一度焙煎を保存しましょう。テイスティングを1件追加すると、味とプロファイルを結び付けて見られます。" actionLabel={beans.length > 0 ? 'Live Roastを開始' : '生豆を登録'} actionHref={beans.length > 0 ? '/roasts/new' : '/beans'} icon={<ChartNoAxesCombined className="h-7 w-7" />} /></div></div>;
  }

  return (
    <div className="lab-shell flex min-h-screen flex-col">
      <header className="flex flex-col gap-4 border-b border-white/10 bg-[#080b14]/82 px-5 py-5 backdrop-blur-xl md:flex-row md:items-center md:justify-between md:px-8">
        <div><p className="eyebrow text-cyan-200">Sensory Lab</p><h1 className="mt-2 page-title">分析と次の仮説</h1><p className="mt-2 text-sm text-slate-400">数字を眺めるより先に、次に試すことを決める場所です。</p></div>
        <div className="flex items-center gap-2"><SyncStatus message={syncMessage} tone={syncTone} onRetry={() => void syncFromCloud()} compact /><button onClick={() => void syncFromCloud()} className="tap-button rounded-xl border border-white/10 bg-white/[0.05] p-2.5 text-slate-300" aria-label="再同期"><RefreshCw className="h-4 w-4" /></button></div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 p-5 pb-28 md:p-8">
        <section>
          <div className="mb-4 flex items-end justify-between gap-4"><div><p className="eyebrow text-fuchsia-300">AI Coach summary</p><h2 className="mt-2 text-xl font-semibold text-white">今週の観察メモ</h2></div><span className="text-xs text-slate-500">実データのみ</span></div>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
            {insights[0] && <CoachInsightCard insight={insights[0]} featured />}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {insights.slice(1, 3).map(insight => <CoachInsightCard key={insight.id} insight={insight} />)}
              {insights.length === 1 && <div className="lab-card-soft rounded-2xl p-5"><p className="eyebrow text-slate-500">Growing signal</p><p className="mt-3 text-sm leading-6 text-slate-300">次の焙煎やテイスティングが増えるほど、比較できる傾向がここに増えていきます。</p></div>}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4"><p className="eyebrow text-cyan-200">Actions</p><h2 className="mt-2 text-xl font-semibold text-white">次のアクション</h2></div>
          <div className="no-scrollbar -mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            <Action href={tastingInsight?.actionHref || `/roasts/${latestRoast.id}/tasting/1`} icon={<TestTube2 className="h-5 w-5" />} label="テイスティングを記録" description="味の変化を残す" color="#00F0FF" />
            <Action href="/roasts/new" icon={<Flame className="h-5 w-5" />} label="次の焙煎を開始" description="仮説を一つ試す" color="#FFB86B" />
            <Action href="/roasts/compare" icon={<GitCompareArrows className="h-5 w-5" />} label="比較を見る" description="条件の違いを追う" color="#8C00FF" />
            <Action href="/report" icon={<ScrollText className="h-5 w-5" />} label="レポートを見る" description="記録をまとめる" color="#FF3D71" />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <div className="lab-card-soft p-5 md:p-6"><div className="flex items-center justify-between gap-3"><div><p className="eyebrow text-cyan-200">Roast timeline</p><h2 className="mt-2 text-lg font-semibold text-white">今月の焙煎とテイスティング目安</h2></div><CalendarDays className="h-5 w-5 text-cyan-100" /></div><CalendarGrid monthLabel={calendar.monthLabel} days={calendar.days} /></div>
          <div className="lab-card-soft p-5 md:p-6"><p className="eyebrow text-orange-200">Lab snapshot</p><h2 className="mt-2 text-lg font-semibold text-white">記録の現在地</h2><div className="mt-6 grid grid-cols-3 gap-3"><Snapshot label="焙煎" value={roasts.length} /><Snapshot label="テイスティング" value={completedTastings.length} /><Snapshot label="生豆" value={beans.length} /></div><div className="mt-7 rounded-2xl border border-white/10 bg-black/15 p-4"><p className="text-xs leading-5 text-slate-400">カレンダーには焙煎日とDay7の目安を表示しています。味の変化はテイスティングとして別に残すと、比較が育ちます。</p></div></div>
        </section>

        {canShowTrend && <section className="lab-card-soft p-5 md:p-6"><div className="mb-5"><p className="eyebrow text-fuchsia-300">Useful trends</p><h2 className="mt-2 text-lg font-semibold text-white">Loss / Dev% の推移</h2><p className="mt-1 text-xs text-slate-500">直近の記録が3件以上あるときだけ表示します。</p></div><div className="h-64 md:h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={trendData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.16)" /><XAxis dataKey="id" stroke="#94A3B8" fontSize={10} /><YAxis stroke="#94A3B8" fontSize={10} /><Tooltip contentStyle={{ background: '#0e1423', border: '1px solid rgba(255,255,255,.12)', borderRadius: '12px', color: '#f5f7fa' }} /><Line type="monotone" dataKey="loss" name="Loss (%)" stroke="#FFB86B" strokeWidth={2.5} connectNulls /><Line type="monotone" dataKey="dev" name="Dev (%)" stroke="#00F0FF" strokeWidth={2.5} connectNulls /></LineChart></ResponsiveContainer></div></section>}
      </main>
    </div>
  );
}

function Action({ href, icon, label, description, color }: { href: string; icon: React.ReactNode; label: string; description: string; color: string }) {
  return <Link href={href} className="tap-button lab-card-soft min-w-[220px] snap-start p-5 sm:min-w-0" style={{ borderColor: `${color}38` }}><span className="flex h-10 w-10 items-center justify-center rounded-xl border" style={{ color, backgroundColor: `${color}14`, borderColor: `${color}30` }}>{icon}</span><span className="mt-5 flex items-center justify-between gap-2 text-sm font-semibold text-white">{label}<ChevronRight className="h-4 w-4" style={{ color }} /></span><span className="mt-1 block text-xs text-slate-400">{description}</span></Link>;
}

function Snapshot({ label, value }: { label: string; value: number }) { return <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-center"><span className="eyebrow text-slate-500">{label}</span><strong className="display-number mt-2 block truncate text-3xl text-white">{value}</strong></div>; }

function CalendarGrid({ days, monthLabel }: { days: { key: string; day: number; current: boolean; today: boolean; items: CalendarItem[] }[]; monthLabel: string }) {
  return <div className="mt-6"><div className="mb-3 flex items-center justify-between"><span className="font-mono text-sm font-semibold text-white">{monthLabel}</span><span className="text-[10px] text-slate-500">焙煎 / Day7</span></div><div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-500">{['日', '月', '火', '水', '木', '金', '土'].map(label => <span key={label} className="py-1">{label}</span>)}</div><div className="grid grid-cols-7 gap-1">{days.map(day => <div key={day.key} className={`min-h-[66px] rounded-xl border p-1.5 text-left ${day.current ? 'border-white/[.08] bg-white/[.025]' : 'border-transparent opacity-30'} ${day.today ? 'ring-1 ring-cyan-300/45' : ''}`}><span className={`ml-1 text-[10px] ${day.today ? 'font-bold text-cyan-100' : 'text-slate-500'}`}>{day.day}</span><div className="mt-1 space-y-1">{day.items.slice(0, 2).map(item => <Link key={item.id} href={item.href} title={item.label} className="block truncate rounded px-1 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: `${item.color}18`, color: item.color }}>{item.label}</Link>)}</div></div>)}</div></div>;
}

function buildCalendar(roasts: Roast[], beans: Bean[]) {
  const now = parseDateOnly(todayDateString()) || new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const first = new Date(start); first.setDate(first.getDate() - start.getDay());
  const beanFor = (beanId: string) => beans.find(bean => bean.id === beanId);
  const itemsByDate = new Map<string, CalendarItem[]>();
  const add = (date: string, item: CalendarItem) => itemsByDate.set(date, [...(itemsByDate.get(date) || []), item]);
  roasts.forEach(roast => {
    const color = beanFor(roast.beanId)?.themeColor || '#FFB86B';
    add(roast.roastDate, { id: `roast-${roast.id}`, label: `${roast.id} 焙煎`, href: `/roasts/${roast.id}`, color, kind: 'roast' });
    const day7 = addDateDays(roast.roastDate, 7);
    add(day7, { id: `tasting-${roast.id}`, label: `${roast.id} Day7`, href: `/roasts/${roast.id}/tasting/7`, color: '#00F0FF', kind: 'tasting' });
  });
  const days = Array.from({ length: 42 }, (_, index) => { const date = new Date(first); date.setDate(first.getDate() + index); const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; return { key, day: date.getDate(), current: date.getMonth() === now.getMonth(), today: key === todayDateString(), items: itemsByDate.get(key) || [] }; });
  return { monthLabel: `${now.getFullYear()}年${now.getMonth() + 1}月`, days };
}
