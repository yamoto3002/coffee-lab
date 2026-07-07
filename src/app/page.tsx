'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Beaker, CalendarCheck2, Coffee, Flame, PackageSearch, Plus, Sparkles } from 'lucide-react';
import { DBService, getAgingDays } from '@/lib/db';
import { AppSettings, Bean, Roast, Tasting } from '@/types';

type Suggestion = {
  title: string;
  body: string;
  href: string;
  icon: React.ReactNode;
};

export default function Home() {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [roasts, setRoasts] = useState<Roast[]>([]);
  const [tastings, setTastings] = useState<Tasting[]>([]);
  const [settings, setSettings] = useState<AppSettings>(() => DBService.getSettings());

  useEffect(() => {
    setBeans(DBService.getBeans());
    setRoasts(DBService.getRoasts());
    setTastings(DBService.getTastings());
    setSettings(DBService.getSettings());
  }, []);

  const suggestions = useMemo<Suggestion[]>(() => {
    const list: Suggestion[] = [];
    const availableBeans = beans.filter(bean => bean.currentWeight > 0);
    const lowStockBean = availableBeans.find(bean => bean.currentWeight < 100);
    const leastUsedBean = [...availableBeans].sort((a, b) => {
      const aCount = roasts.filter(roast => roast.beanId === a.id).length;
      const bCount = roasts.filter(roast => roast.beanId === b.id).length;
      return aCount - bCount;
    })[0];
    const dueRoast = roasts.find(roast => {
      const aging = getAgingDays(roast.roastDate);
      const roastTastings = tastings.filter(tasting => tasting.roastId === roast.id);
      return aging >= 7 && !roastTastings.some(tasting => tasting.tastingDay === 7 && tasting.status === 'completed');
    });
    const latestRoast = [...roasts].sort((a, b) => new Date(b.roastDate).getTime() - new Date(a.roastDate).getTime())[0];

    if (leastUsedBean) {
      list.push({
        title: '今日はこの豆を焙煎してみませんか？',
        body: `${leastUsedBean.country} / ${leastUsedBean.name}。在庫は${leastUsedBean.currentWeight}gです。`,
        href: `/roasts/new?beanId=${leastUsedBean.id}`,
        icon: <Flame className="h-5 w-5" />,
      });
    }
    if (dueRoast) {
      const bean = beans.find(item => item.id === dueRoast.beanId);
      list.push({
        title: 'テイスティングのタイミングです',
        body: `${dueRoast.id} は焙煎から${getAgingDays(dueRoast.roastDate)}日。味の変化を記録しましょう。`,
        href: `/roasts/${dueRoast.id}/tasting/7`,
        icon: <CalendarCheck2 className="h-5 w-5" />,
      });
      if (bean) list[list.length - 1].body += ` ${bean.name}`;
    }
    if (lowStockBean) {
      list.push({
        title: '在庫が減ってきた豆があります',
        body: `${lowStockBean.name} は残り${lowStockBean.currentWeight}g。使い切りや補充を検討できます。`,
        href: '/beans',
        icon: <PackageSearch className="h-5 w-5" />,
      });
    }
    if (latestRoast) {
      list.push({
        title: '前回の焙煎から次の仮説へ',
        body: `${latestRoast.id} のDevは${latestRoast.developmentRatio}%でした。次は少しだけ条件を振ってみるのも良さそうです。`,
        href: `/roasts/${latestRoast.id}`,
        icon: <Beaker className="h-5 w-5" />,
      });
    }

    return list.slice(0, 4);
  }, [beans, roasts, tastings]);

  const totalStock = beans.reduce((sum, bean) => sum + bean.currentWeight, 0);

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-[#F4F4F6]">
      <section className="relative overflow-hidden border-b border-[#232326] px-6 py-12 md:px-12 md:py-20">
        <div className="absolute inset-0 opacity-40" aria-hidden="true">
          <div className="h-full w-full bg-[linear-gradient(120deg,#0B0B0C_0%,#16110D_45%,#342114_100%)]" />
        </div>
        <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D09B6A]/30 bg-[#0B0B0C]/50 px-3 py-1 text-xs text-[#D09B6A]">
              <Sparkles className="h-3.5 w-3.5" />
              Roast, taste, learn
            </div>
            <div>
              <h1 className="max-w-3xl text-5xl font-semibold tracking-normal md:text-7xl">Coffee Lab</h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#C8B8A8]">
                生豆の状態、焙煎の判断、テイスティングの記憶をひとつの流れで残すための焙煎ノート。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/roasts/new" className="flex items-center gap-2 rounded-full bg-[#F4F4F6] px-5 py-3 text-sm font-semibold text-[#0B0B0C]">
                <Flame className="h-4 w-4" />
                焙煎を始める
              </Link>
              <Link href="/beans" className="flex items-center gap-2 rounded-full border border-[#F4F4F6]/20 px-5 py-3 text-sm font-semibold text-[#F4F4F6]">
                <Coffee className="h-4 w-4" />
                生豆を管理
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-[#F4F4F6]/10 bg-[#0B0B0C]/55 p-5 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="aspect-[4/3] rounded-xl border border-[#F4F4F6]/10 bg-[#140F0B] p-5">
              <div className="flex h-full flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.2em] text-[#8E8E93]">Today</span>
                  <span className="rounded-full bg-[#D09B6A]/15 px-3 py-1 text-xs text-[#D09B6A]">{new Date().toLocaleDateString('ja-JP')}</span>
                </div>
                <div className="space-y-5">
                  <div className="h-28 rounded-xl border border-[#D09B6A]/20 bg-[linear-gradient(180deg,rgba(208,155,106,0.22),rgba(208,155,106,0.04))] p-4">
                    <svg viewBox="0 0 320 100" className="h-full w-full" role="img" aria-label="Roast profile curve">
                      <path d="M8 84 C 65 78, 92 52, 132 50 S 190 68, 230 35 S 280 14, 312 20" fill="none" stroke="#D09B6A" strokeWidth="5" strokeLinecap="round" />
                      <path d="M8 84 C 65 78, 92 52, 132 50 S 190 68, 230 35 S 280 14, 312 20" fill="none" stroke="#F4C28A" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <MiniStat label="Beans" value={String(beans.length)} />
                    <MiniStat label="Roasts" value={String(roasts.length)} />
                    <MiniStat label="Stock" value={`${totalStock}g`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8 pb-24 md:px-12">
        {settings.showHomeSuggestions && suggestions.length > 0 ? (
          <section className="grid gap-4 md:grid-cols-2">
            {suggestions.map(item => (
              <Link key={item.title} href={item.href} className="group rounded-xl border border-[#232326] bg-[#131315] p-5 transition hover:border-[#D09B6A]/40 hover:bg-[#171719]">
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-[#D09B6A]/10 text-[#D09B6A]">
                  {item.icon}
                </div>
                <h2 className="text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 min-h-10 text-sm leading-relaxed text-[#A1A1AA]">{item.body}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#D09B6A]">
                  開く
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-[#232326] bg-[#131315] p-8 text-center">
            <h2 className="text-2xl font-semibold">最初の焙煎ラボを作りましょう</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#8E8E93]">
              まずは生豆を1つ登録すると、焙煎の候補や在庫の気づきがここに並びます。
            </p>
            <Link href="/beans" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#D09B6A] px-5 py-3 text-sm font-semibold text-[#0B0B0C]">
              <Plus className="h-4 w-4" />
              生豆を追加
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#0B0B0C]/70 p-3">
      <span className="block text-[10px] uppercase text-[#8E8E93]">{label}</span>
      <strong className="mt-1 block truncate font-mono text-lg text-[#F4F4F6]">{value}</strong>
    </div>
  );
}
