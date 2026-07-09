'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Beaker, CalendarCheck2, Coffee, Flame, Plus, Sparkles, TestTube2 } from 'lucide-react';
import { DBService, getAgingDays } from '@/lib/db';
import { formatDate, todayDateString } from '@/lib/date';
import { Bean, Roast, Tasting } from '@/types';

type Suggestion = {
  title: string;
  body: string;
  href: string;
  icon: React.ReactNode;
  color: string;
};

export default function Home() {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [roasts, setRoasts] = useState<Roast[]>([]);
  const [tastings, setTastings] = useState<Tasting[]>([]);

  const loadLocal = useCallback(() => {
    setBeans(DBService.getBeans());
    setRoasts(DBService.getRoasts());
    setTastings(DBService.getTastings());
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadLocal();
      void DBService.syncFromCloud().then(loadLocal);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadLocal]);

  const latestRoast = useMemo(() => [...roasts].sort((a, b) => b.id.localeCompare(a.id))[0], [roasts]);
  const tastingDue = useMemo(() => roasts.find(roast => getAgingDays(roast.roastDate) >= 1 && !tastings.some(tasting => tasting.roastId === roast.id)), [roasts, tastings]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const list: Suggestion[] = [];
    const leastUsedBean = [...beans].sort((a, b) => {
      const aCount = roasts.filter(roast => roast.beanId === a.id).length;
      const bCount = roasts.filter(roast => roast.beanId === b.id).length;
      return aCount - bCount;
    })[0];
    const firstCrackMissing = roasts.find(roast => !roast.firstCrackTime || roast.firstCrackStatus === 'not_detected' || roast.firstCrackStatus === 'unknown');
    const highScore = [...tastings].sort((a, b) => b.score - a.score)[0];

    if (tastingDue) {
      list.push({
        title: `${tastingDue.id} をテイスティングしませんか`,
        body: `焙煎から${getAgingDays(tastingDue.roastDate)}日目です。変化を残すなら今がよさそうです。`,
        href: `/roasts/${tastingDue.id}/tasting/new`,
        icon: <CalendarCheck2 className="h-5 w-5" />,
        color: '#00DFFF',
      });
    }
    if (leastUsedBean) {
      list.push({
        title: '次に焼く豆の候補',
        body: `${leastUsedBean.country} / ${leastUsedBean.name} は焙煎回数が少なめです。`,
        href: `/roasts/new?beanId=${leastUsedBean.id}`,
        icon: <Flame className="h-5 w-5" />,
        color: leastUsedBean.themeColor || '#FF8A3D',
      });
    }
    if (firstCrackMissing) {
      list.push({
        title: '1st Crack未記録のログがあります',
        body: `${firstCrackMissing.id} はDevが不明です。次回の比較用に詳細を確認できます。`,
        href: `/roasts/${firstCrackMissing.id}`,
        icon: <Beaker className="h-5 w-5" />,
        color: '#8B5CF6',
      });
    }
    if (highScore) {
      list.push({
        title: '高評価の条件を再現する',
        body: `${highScore.roastId} は ${highScore.score}点。火力・風量の流れを見返せます。`,
        href: `/roasts/${highScore.roastId}`,
        icon: <TestTube2 className="h-5 w-5" />,
        color: highScore.impressionColor || '#FB3D71',
      });
    }

    return list.slice(0, 4);
  }, [beans, roasts, tastings, tastingDue]);

  return (
    <div className="lab-shell">
      <section className="relative overflow-hidden border-b border-white/10 px-5 py-10 md:px-10 md:py-16">
        <div className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              Science. Flavor. Evolution.
            </div>
            <div>
              <h1 className="max-w-3xl text-5xl font-semibold tracking-normal md:text-7xl">
                Coffee <span className="neon-text">Lab</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 md:text-lg">
                焙煎、テイスティング、分析をひとつの流れで記録します。データは静かに、操作は気持ちよく。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/roasts/new" className="tap-button flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-[#FF8A3D] px-5 py-3 text-sm font-bold text-[#080E14]">
                <Flame className="h-4 w-4" />
                Live Roast
              </Link>
              <Link href="/dashboard" className="tap-button flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-[#F4F4F6]">
                <Beaker className="h-4 w-4" />
                分析を見る
              </Link>
            </div>
          </div>

          <div className="lab-card rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Today</p>
                <p className="mt-1 font-mono text-2xl font-bold text-cyan-100">{formatDate(todayDateString())}</p>
              </div>
              <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
                同期はバックグラウンド
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <MiniStat label="Beans" value={String(beans.length)} color="#00DFFF" />
              <MiniStat label="Roasts" value={String(roasts.length)} color="#FB3D71" />
              <MiniStat label="Tastings" value={String(tastings.length)} color="#FF8A3D" />
            </div>
            <div className="mt-6 rounded-xl border border-white/10 bg-[#050A11] p-4">
              <div className="h-28">
                <svg viewBox="0 0 320 100" className="h-full w-full" role="img" aria-label="Roast profile curve">
                  <path d="M8 82 C 52 70, 82 56, 118 58 S 178 76, 214 38 S 274 18, 312 22" fill="none" stroke="#00DFFF" strokeWidth="5" strokeLinecap="round" />
                  <path d="M8 82 C 52 70, 82 56, 118 58 S 178 76, 214 38 S 274 18, 312 22" fill="none" stroke="#FB3D71" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              {latestRoast ? (
                <p className="mt-2 text-sm text-slate-300">
                  最新ログ: <Link href={`/roasts/${latestRoast.id}`} className="font-mono font-bold text-cyan-100">{latestRoast.id}</Link> / {formatDate(latestRoast.roastDate)}
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-400">最初の焙煎ログを作ると、ここにプロファイルが育ちます。</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-8 px-5 py-8 pb-24 md:px-10">
        {suggestions.length > 0 ? (
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">次のアクション</h2>
              <Link href="/dashboard" className="text-sm font-semibold text-cyan-200">分析へ</Link>
            </div>
            <div className="no-scrollbar -mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-4">
              {suggestions.map(item => (
                <Link key={item.title} href={item.href} className="tap-button lab-card-soft min-w-[250px] snap-start rounded-xl p-5 md:min-w-0" style={{ borderColor: `${item.color}44` }}>
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: `${item.color}22`, color: item.color }}>
                    {item.icon}
                  </div>
                  <h3 className="text-base font-semibold leading-snug">{item.title}</h3>
                  <p className="mt-2 min-h-12 text-sm leading-relaxed text-slate-400">{item.body}</p>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold" style={{ color: item.color }}>
                    開く
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <section className="lab-card rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-semibold">最初の実験を始めましょう</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-400">
              生豆を登録して焙煎すると、提案・分析・テイスティング導線がここに出てきます。
            </p>
            <Link href="/beans" className="tap-button mt-6 inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-sm font-bold text-[#080E14]">
              <Plus className="h-4 w-4" />
              生豆を追加
            </Link>
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <QuickLink href="/beans" icon={<Coffee className="h-5 w-5" />} title="生豆管理" body="購入日と購入量を編集できます。" />
          <QuickLink href="/roasts" icon={<Flame className="h-5 w-5" />} title="焙煎記録" body="ID順とtasting済みだけで素早く絞り込みます。" />
          <QuickLink href={tastingDue ? `/roasts/${tastingDue.id}/tasting/new` : '/dashboard'} icon={<TestTube2 className="h-5 w-5" />} title="テイスティング" body="記録入口を分析画面にも置きました。" />
        </section>
      </main>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <span className="block text-[10px] uppercase text-slate-500">{label}</span>
      <strong className="mt-1 block truncate font-mono text-2xl" style={{ color }}>{value}</strong>
    </div>
  );
}

function QuickLink({ href, icon, title, body }: { href: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <Link href={href} className="tap-button lab-card-soft rounded-xl p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-100">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{body}</p>
    </Link>
  );
}
