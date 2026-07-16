'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ChartNoAxesCombined, ChevronRight, Flame, GitCompareArrows, TestTube2 } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import CoachInsightCard from '@/components/CoachInsightCard';
import EmptyState from '@/components/EmptyState';
import SyncStatus from '@/components/SyncStatus';
import { getCoachInsights, getInsightsForRoast } from '@/lib/coach';
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

  const insights = useMemo(() => getCoachInsights({ beans, roasts, tastings }), [beans, roasts, tastings]);
  const latestRoast = useMemo(() => [...roasts].sort((a, b) => b.roastDate.localeCompare(a.roastDate) || b.id.localeCompare(a.id))[0], [roasts]);
  const primaryInsight = latestRoast ? getInsightsForRoast({ beans, roasts, tastings }, latestRoast.id)[0] || insights[0] : insights[0];
  const tastingInsight = insights.find(insight => insight.type === 'tasting' && insight.actionHref);
  const calendar = useMemo(() => buildCalendar(roasts, beans), [roasts, beans]);
  const trendData = useMemo(() => [...roasts].sort((a, b) => a.roastDate.localeCompare(b.roastDate) || a.id.localeCompare(b.id)).slice(-10).map(roast => ({ id: roast.id, loss: roast.lossRatio || undefined, dev: roast.developmentRatio ?? undefined })), [roasts]);
  const canShowTrend = trendData.filter(point => point.loss !== undefined || point.dev !== undefined).length >= 3;

  if (roasts.length === 0) {
    return <div className="lab-shell px-5 py-8 pb-28 md:px-10"><div className="mx-auto max-w-5xl"><EmptyState title="まだ分析するには記録が少ないです" message="まずは一度焙煎を保存しましょう。テイスティングを1件追加すると、味とプロファイルを結び付けて見られます。" actionLabel={beans.length > 0 ? 'Live Roastを開始' : '生豆を登録'} actionHref={beans.length > 0 ? '/roasts/new' : '/beans'} icon={<ChartNoAxesCombined className="h-7 w-7" />} /></div></div>;
  }

  return (
    <div className="lab-shell flex min-h-screen flex-col">
      <header className="flex flex-col gap-4 border-b border-[var(--border)] bg-[var(--background)] px-5 py-5 md:flex-row md:items-center md:justify-between md:px-8">
        <div><h1 className="page-title">分析と次の仮説</h1><p className="mt-2 text-sm text-slate-400">数字を眺めるより先に、次に試すことを決める場所です。</p></div>
        <SyncStatus message={syncMessage} tone={syncTone} onRetry={() => void syncFromCloud()} compact />
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 p-5 pb-28 md:p-8">
        <section>
          <div className="mb-4 flex items-end justify-between gap-4"><h2 className="text-xl font-semibold text-[var(--foreground)]">記録から見えたこと</h2><span className="text-xs text-slate-400">端末内の実データから算出</span></div>
          <div className="max-w-4xl">
            {primaryInsight && <CoachInsightCard insight={primaryInsight} featured />}
          </div>
        </section>

        <section>
          <div className="mb-4"><h2 className="text-xl font-semibold text-[var(--foreground)]">次のアクション</h2></div>
          <div className="border-y border-[var(--border)] py-5">
            <Link href={tastingInsight?.actionHref || `/roasts/${latestRoast.id}/tasting/1`} className="tap-button flex items-center justify-between gap-4 rounded-[10px] bg-[var(--primary)] px-5 py-4 font-bold text-[var(--primary-foreground)]">
              <span className="flex items-center gap-3"><TestTube2 className="h-5 w-5" /><span>味見を記録して仮説を進める</span></span><ChevronRight className="h-5 w-5" />
            </Link>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Link href="/roasts/new" className="tap-button inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--text-secondary)]"><Flame className="h-4 w-4 text-[var(--primary)]" />次の焙煎を開始</Link>
              <Link href="/roasts/compare" className="tap-button inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--text-secondary)]"><GitCompareArrows className="h-4 w-4 text-[var(--flavor-floral)]" />条件を比較</Link>
            </div>
          </div>
        </section>

        <section>
          <div className="lab-card-soft p-5 md:p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-[var(--foreground)]">次の味見予定</h2><CalendarDays className="h-5 w-5 text-[var(--accent)]" /></div><div className="md:hidden"><UpcomingList days={calendar.days} /></div><div className="hidden md:block"><CalendarGrid monthLabel={calendar.monthLabel} days={calendar.days} /></div></div>
        </section>

        {canShowTrend && <section className="lab-card-soft p-5 md:p-6"><div className="mb-5"><h2 className="text-lg font-semibold text-[var(--foreground)]">Loss / Dev% の推移</h2><p className="mt-1 text-xs text-slate-400">直近の記録が3件以上あるときだけ表示します。</p></div><div className="h-64 md:h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={trendData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="id" stroke="var(--muted-foreground)" fontSize={12} /><YAxis stroke="var(--muted-foreground)" fontSize={12} /><Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--foreground)' }} /><Line type="monotone" dataKey="loss" name="Loss (%)" stroke="var(--primary)" strokeWidth={2.5} connectNulls /><Line type="monotone" dataKey="dev" name="Dev (%)" stroke="var(--accent)" strokeWidth={2.5} connectNulls /></LineChart></ResponsiveContainer></div></section>}
      </main>
    </div>
  );
}

function UpcomingList({ days }: { days: { key: string; today: boolean; items: CalendarItem[] }[] }) {
  const upcoming = days.filter(day => day.key >= todayDateString()).flatMap(day => day.items.filter(item => item.kind === 'tasting').map(item => ({ ...item, date: day.key, today: day.today }))).slice(0, 5);
  return <div className="mt-5 divide-y divide-[var(--border)]">{upcoming.length ? upcoming.map(item => <Link key={item.id} href={item.href} className="tap-button flex min-h-14 items-center justify-between gap-3 py-3"><span><strong className="block text-sm text-[var(--foreground)]">{item.label}</strong><span className="text-xs text-[var(--muted-foreground)]">{item.today ? '今日' : item.date}</span></span><ChevronRight className="h-4 w-4 text-[var(--accent)]" /></Link>) : <p className="py-5 text-sm text-[var(--muted-foreground)]">直近の味見予定はありません。</p>}</div>;
}

function CalendarGrid({ days, monthLabel }: { days: { key: string; day: number; current: boolean; today: boolean; items: CalendarItem[] }[]; monthLabel: string }) {
  return <div className="mt-6"><div className="mb-3 flex items-center justify-between"><span className="font-mono text-sm font-semibold text-white">{monthLabel}</span><span className="text-xs text-slate-400">焙煎 / 7日目の味見</span></div><div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">{['日', '月', '火', '水', '木', '金', '土'].map(label => <span key={label} className="py-1">{label}</span>)}</div><div className="grid grid-cols-7 gap-1">{days.map(day => <div key={day.key} className={`min-h-[66px] rounded-[10px] border p-1.5 text-left ${day.current ? 'border-white/[.08] bg-white/[.025]' : 'border-transparent opacity-30'} ${day.today ? 'ring-1 ring-[var(--primary)]' : ''}`}><span className={`ml-1 text-xs ${day.today ? 'font-bold text-[var(--primary)]' : 'text-slate-400'}`}>{day.day}</span><div className="mt-1 space-y-1">{day.items.slice(0, 2).map(item => <Link key={item.id} href={item.href} title={item.label} className="block truncate rounded px-1 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${item.color}18`, color: item.color }}>{item.label}</Link>)}</div></div>)}</div></div>;
}

function buildCalendar(roasts: Roast[], beans: Bean[]) {
  const now = parseDateOnly(todayDateString()) || new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const first = new Date(start); first.setDate(first.getDate() - start.getDay());
  const beanFor = (beanId: string) => beans.find(bean => bean.id === beanId);
  const itemsByDate = new Map<string, CalendarItem[]>();
  const add = (date: string, item: CalendarItem) => itemsByDate.set(date, [...(itemsByDate.get(date) || []), item]);
  roasts.forEach(roast => {
    const color = beanFor(roast.beanId)?.themeColor || '#D9A066';
    add(roast.roastDate, { id: `roast-${roast.id}`, label: `${roast.id} 焙煎`, href: `/roasts/${roast.id}`, color, kind: 'roast' });
    const day7 = addDateDays(roast.roastDate, 7);
    add(day7, { id: `tasting-${roast.id}`, label: `${roast.id} 7日目`, href: `/roasts/${roast.id}/tasting/7`, color: '#70C8C3', kind: 'tasting' });
  });
  const days = Array.from({ length: 42 }, (_, index) => { const date = new Date(first); date.setDate(first.getDate() + index); const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; return { key, day: date.getDate(), current: date.getMonth() === now.getMonth(), today: key === todayDateString(), items: itemsByDate.get(key) || [] }; });
  return { monthLabel: `${now.getFullYear()}年${now.getMonth() + 1}月`, days };
}
