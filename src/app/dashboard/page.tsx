'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BarChart2, CalendarDays, Flame, Lightbulb, RefreshCw, TestTube2 } from 'lucide-react';
import { DBService } from '@/lib/db';
import { addDateDays, todayDateString } from '@/lib/date';
import { Bean, Roast, Tasting } from '@/types';

type CalendarItem = {
  id: string;
  label: string;
  href: string;
  type: 'roast' | 'tasting';
  color: string;
};

export default function DashboardPage() {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [roasts, setRoasts] = useState<Roast[]>([]);
  const [tastings, setTastings] = useState<Tasting[]>([]);
  const [syncMessage, setSyncMessage] = useState('ローカル準備完了');

  const loadLocal = useCallback(() => {
    setBeans(DBService.getBeans());
    setRoasts(DBService.getRoasts());
    setTastings(DBService.getTastings());
  }, []);

  const syncFromCloud = useCallback(async () => {
    setSyncMessage('同期中');
    const result = await DBService.syncFromCloud();
    loadLocal();
    setSyncMessage(result.ok ? `同期済み ${new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}` : result.error || 'Google Sheetsとの同期に失敗しました。');
  }, [loadLocal]);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      loadLocal();
      void syncFromCloud();
    }, 0);
    const timer = window.setInterval(() => void syncFromCloud(), 60000);
    window.addEventListener('online', syncFromCloud);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
      window.removeEventListener('online', syncFromCloud);
    };
  }, [loadLocal, syncFromCloud]);

  const completedTastings = tastings.filter(tasting => tasting.status === 'completed');
  const latestRoast = useMemo(() => [...roasts].sort((a, b) => b.id.localeCompare(a.id))[0], [roasts]);
  const tastingTarget = useMemo(() => roasts.find(roast => !tastings.some(tasting => tasting.roastId === roast.id)) || latestRoast, [roasts, tastings, latestRoast]);
  const hasAnalysisData = roasts.length > 0 || completedTastings.length > 0;

  const insights = useMemo(() => {
    const list: { title: string; body: string; href: string; color: string }[] = [];
    const firstCrackMissing = roasts.find(roast => !roast.firstCrackTime || roast.firstCrackStatus === 'not_detected' || roast.firstCrackStatus === 'unknown');
    const highLoss = [...roasts].filter(roast => roast.lossRatio >= 18).sort((a, b) => b.lossRatio - a.lossRatio)[0];
    const day7 = roasts.find(roast => addDateDays(roast.roastDate, 7) === todayDateString());
    const untasted = roasts.find(roast => !tastings.some(tasting => tasting.roastId === roast.id));

    if (untasted) {
      list.push({
        title: 'これをテイスティングしてみませんか？',
        body: `${untasted.id} はまだ味の記録がありません。今日の印象を残せます。`,
        href: `/roasts/${untasted.id}/tasting/new`,
        color: '#00DFFF',
      });
    }
    if (day7) {
      list.push({
        title: 'Day7の豆があります',
        body: `${day7.id} は焙煎から7日目です。香りの開き方を見るのに良いタイミングです。`,
        href: `/roasts/${day7.id}/tasting/new`,
        color: '#FB3D71',
      });
    }
    if (highLoss) {
      list.push({
        title: 'Lossが高めの焙煎があります',
        body: `${highLoss.id} はLoss ${highLoss.lossRatio}%です。火力推移とDrop時刻を見返せます。`,
        href: `/roasts/${highLoss.id}`,
        color: '#FF8A3D',
      });
    }
    if (firstCrackMissing) {
      list.push({
        title: '1st Crack未記録の焙煎があります',
        body: `${firstCrackMissing.id} はDevが不明です。次回の観察ポイントにできます。`,
        href: `/roasts/${firstCrackMissing.id}`,
        color: '#8B5CF6',
      });
    }
    if (list.length === 0 && latestRoast) {
      list.push({
        title: '最近焙煎した豆があります',
        body: `${latestRoast.id} の条件をベースに、次の仮説を作れます。`,
        href: `/roasts/${latestRoast.id}`,
        color: '#00DFFF',
      });
    }
    list.push({
      title: 'コーヒー豆知識',
      body: '同じ焙煎でもDay3とDay7で酸の見え方が変わります。味の変化は別記録で残すと比較しやすいです。',
      href: '/roasts',
      color: '#22C55E',
    });
    return list.slice(0, 4);
  }, [roasts, tastings, latestRoast]);

  const beanTotals = useMemo(() => beans.map(bean => {
    const beanRoasts = roasts.filter(roast => roast.beanId === bean.id);
    const total = beanRoasts.reduce((sum, roast) => sum + roast.greenWeight, 0);
    const latest = [...beanRoasts].sort((a, b) => b.id.localeCompare(a.id))[0];
    return {
      bean,
      count: beanRoasts.length,
      total: Math.round(total * 10) / 10,
      latest,
    };
  }).filter(item => item.count > 0).sort((a, b) => b.total - a.total), [beans, roasts]);

  const calendar = useMemo(() => buildCalendar(roasts, beans), [roasts, beans]);

  return (
    <div className="lab-shell flex min-h-screen flex-col">
      <header className="flex flex-col gap-4 border-b border-white/10 bg-[#080E14]/95 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div>
          <h1 className="text-xl font-bold tracking-wide">分析</h1>
          <p className="text-xs text-slate-400">焙煎の振り返りと次の行動</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">{syncMessage}</span>
          <button onClick={syncFromCloud} className="tap-button rounded-xl bg-white/[0.06] p-2 text-slate-300 hover:text-white" aria-label="再同期">
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link href={tastingTarget ? `/roasts/${tastingTarget.id}/tasting/new` : '/roasts'} className="tap-button inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-bold text-[#080E14]">
            <TestTube2 className="h-4 w-4" />
            テイスティングを記録
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 pb-28 md:p-6">
        {!hasAnalysisData ? (
          <div className="lab-card flex min-h-[55vh] flex-col items-center justify-center rounded-2xl p-8 text-center">
            <BarChart2 className="mb-4 h-10 w-10 text-cyan-200" />
            <h2 className="text-xl font-bold">分析できるデータがまだありません</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">焙煎ログやテイスティングを保存すると、ここに提案・カレンダー・豆別集計が出ます。</p>
            <div className="mt-6 flex gap-3">
              <Link href="/beans" className="tap-button rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200">生豆を登録</Link>
              <Link href="/roasts/new" className="tap-button rounded-lg bg-cyan-300 px-4 py-2 text-sm font-bold text-[#080E14]">焙煎する</Link>
            </div>
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {insights.map(item => (
                <Link key={item.title} href={item.href} className="tap-button lab-card-soft rounded-xl p-5" style={{ borderColor: `${item.color}44` }}>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${item.color}18`, color: item.color }}>
                    <Lightbulb className="h-5 w-5" />
                  </div>
                  <h2 className="text-base font-semibold leading-snug">{item.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.body}</p>
                </Link>
              ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="lab-card-soft rounded-xl p-5">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#F4F4F6]"><CalendarDays className="h-4 w-4 text-cyan-200" />焙煎カレンダー</h2>
                <CalendarGrid days={calendar.days} monthLabel={calendar.monthLabel} />
              </div>

              <div className="lab-card-soft rounded-xl p-5">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#F4F4F6]"><Flame className="h-4 w-4 text-[#FF8A3D]" />豆別の焙煎量</h2>
                <div className="space-y-3">
                  {beanTotals.map(item => (
                    <Link key={item.bean.id} href={`/beans?beanId=${item.bean.id}`} className="tap-button block rounded-xl border border-white/10 bg-white/[0.035] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{item.bean.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.bean.country} / {item.bean.process}</p>
                        </div>
                        <span className="shrink-0 rounded-full px-2 py-1 font-mono text-xs font-bold" style={{ backgroundColor: `${item.bean.themeColor || '#00DFFF'}22`, color: item.bean.themeColor || '#00DFFF' }}>{item.total}g</span>
                      </div>
                      <div className="mt-3 flex justify-between text-xs text-slate-400">
                        <span>{item.count}回</span>
                        <span>{item.latest ? `最新 ${item.latest.id}` : '-'}</span>
                      </div>
                    </Link>
                  ))}
                  {beanTotals.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">豆別に集計できる焙煎がありません。</div>}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function buildCalendar(roasts: Roast[], beans: Bean[]) {
  const today = todayDateString();
  const [year, month] = today.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = first.getDay();
  const itemsByDate = new Map<string, CalendarItem[]>();

  roasts.forEach(roast => {
    const bean = beans.find(item => item.id === roast.beanId);
    const roastDate = roast.roastDate;
    const tastingDate = addDateDays(roast.roastDate, 7);
    if (roastDate.startsWith(`${year}-${String(month).padStart(2, '0')}`)) {
      itemsByDate.set(roastDate, [
        ...(itemsByDate.get(roastDate) || []),
        { id: roast.id, label: roast.id, href: `/roasts/${roast.id}`, type: 'roast', color: bean?.themeColor || '#00DFFF' },
      ]);
    }
    if (tastingDate.startsWith(`${year}-${String(month).padStart(2, '0')}`)) {
      itemsByDate.set(tastingDate, [
        ...(itemsByDate.get(tastingDate) || []),
        { id: `${roast.id}-day7`, label: `${roast.id} D7`, href: `/roasts/${roast.id}/tasting/new`, type: 'tasting', color: '#FB3D71' },
      ]);
    }
  });

  const days: { date: string; day: number | null; items: CalendarItem[] }[] = [];
  for (let i = 0; i < startOffset; i += 1) days.push({ date: '', day: null, items: [] });
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    days.push({ date, day, items: itemsByDate.get(date) || [] });
  }

  return { monthLabel: `${year}/${String(month).padStart(2, '0')}`, days };
}

function CalendarGrid({ monthLabel, days }: { monthLabel: string; days: { date: string; day: number | null; items: CalendarItem[] }[] }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-lg font-bold text-cyan-100">{monthLabel}</span>
        <span className="text-xs text-slate-500">R:焙煎 / D7:テイスティング目安</span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-500">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <span key={day}>{day}</span>)}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <div key={`${day.date}-${index}`} className="min-h-20 rounded-lg border border-white/10 bg-white/[0.025] p-1.5">
            {day.day && <span className="font-mono text-xs text-slate-300">{day.day}</span>}
            <div className="mt-1 space-y-1">
              {day.items.slice(0, 3).map(item => (
                <Link key={item.id} href={item.href} className="block truncate rounded px-1.5 py-1 text-[10px] font-semibold text-[#080E14]" style={{ backgroundColor: item.color }}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
