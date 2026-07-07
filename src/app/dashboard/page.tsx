'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, BarChart2, Coffee, Flame, Star, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DBService } from '@/lib/db';
import { AppSettings, Bean, Roast, Tasting } from '@/types';

export default function DashboardPage() {
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

  const completedTastings = tastings.filter(tasting => tasting.status === 'completed');
  const hasAnalysisData = completedTastings.length > 0 || roasts.length > 0;

  const averageScore = completedTastings.length > 0
    ? Math.round((completedTastings.reduce((sum, tasting) => sum + tasting.score, 0) / completedTastings.length) * 10) / 10
    : null;

  const monthlyRoastsCount = roasts.filter(roast => {
    const date = new Date(roast.roastDate);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const agingData = useMemo(() => {
    return ([7, 10, 14] as const).map(day => {
      const list = completedTastings.filter(tasting => tasting.tastingDay === day);
      const score = list.length ? Math.round((list.reduce((sum, tasting) => sum + tasting.score, 0) / list.length) * 10) / 10 : 0;
      return { name: `Day ${day}`, score };
    }).filter(item => item.score > 0);
  }, [completedTastings]);

  const beanScores = useMemo(() => {
    return beans.map(bean => {
      const roastIds = roasts.filter(roast => roast.beanId === bean.id).map(roast => roast.id);
      const beanTastings = completedTastings.filter(tasting => roastIds.includes(tasting.roastId));
      const avg = beanTastings.length ? Math.round((beanTastings.reduce((sum, tasting) => sum + tasting.score, 0) / beanTastings.length) * 10) / 10 : 0;
      return { name: bean.name.length > 14 ? `${bean.name.slice(0, 14)}...` : bean.name, score: avg };
    }).filter(item => item.score > 0);
  }, [beans, roasts, completedTastings]);

  const lowStockBeans = beans.filter(bean => bean.currentWeight > 0 && bean.currentWeight < 100);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[#232326] bg-[#0E0E10] px-6 py-4">
        <h1 className="text-xl font-bold tracking-wide">分析</h1>
        <p className="text-xs text-[#8E8E93]">記録済みデータだけを使った焙煎とテイスティングの振り返り</p>
      </header>

      <div className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-6 pb-24">
        {!hasAnalysisData ? (
          <div className="flex min-h-[55vh] flex-col items-center justify-center rounded-2xl border border-dashed border-[#232326] bg-[#131315] p-8 text-center">
            <BarChart2 className="mb-4 h-10 w-10 text-[#D09B6A]" />
            <h2 className="text-xl font-bold">まだ分析できるデータがありません</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[#8E8E93]">生豆を登録して焙煎ログやテイスティングを保存すると、ここに傾向が表示されます。</p>
            <div className="mt-6 flex gap-3">
              <Link href="/beans" className="rounded-lg border border-[#232326] px-4 py-2 text-sm font-semibold text-[#E4E4E7]">生豆を登録</Link>
              <Link href="/roasts/new" className="rounded-lg bg-[#D09B6A] px-4 py-2 text-sm font-semibold text-[#0B0B0C]">焙煎する</Link>
            </div>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <Metric icon={<Coffee className="h-4 w-4" />} label="生豆" value={`${beans.length}`} />
              <Metric icon={<Flame className="h-4 w-4" />} label="焙煎ログ" value={`${roasts.length}`} />
              <Metric icon={<Star className="h-4 w-4" />} label="平均評価" value={averageScore === null ? '-' : `${averageScore}`} accent />
              <Metric icon={<TrendingUp className="h-4 w-4" />} label="今月の焙煎" value={`${monthlyRoastsCount}`} />
              <Metric icon={<AlertCircle className="h-4 w-4" />} label="在庫注意" value={`${lowStockBeans.length}`} />
            </section>

            {settings.showAnalysisCards && (
              <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ChartPanel title="エイジング別 平均評価">
                  {agingData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={agingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#232326" />
                        <XAxis dataKey="name" stroke="#8E8E93" fontSize={11} />
                        <YAxis domain={[0, 100]} stroke="#8E8E93" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#131315', borderColor: '#232326' }} />
                        <Line type="monotone" dataKey="score" name="平均点" stroke="#D09B6A" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart text="テイスティング結果がまだありません。" />}
                </ChartPanel>

                <ChartPanel title="生豆別 平均評価">
                  {beanScores.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={beanScores} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#232326" />
                        <XAxis dataKey="name" stroke="#8E8E93" fontSize={10} />
                        <YAxis domain={[0, 100]} stroke="#8E8E93" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#131315', borderColor: '#232326' }} />
                        <Bar dataKey="score" name="平均点" fill="#D09B6A" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart text="生豆別に集計できる評価がありません。" />}
                </ChartPanel>
              </section>
            )}

            <section className="rounded-xl border border-[#232326] bg-[#131315] p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#8E8E93]">在庫アラート</h2>
              {lowStockBeans.length === 0 ? (
                <p className="text-sm text-[#8E8E93]">在庫が100g未満の生豆はありません。</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {lowStockBeans.map(bean => (
                    <Link key={bean.id} href="/beans" className="rounded-lg border border-[#232326] bg-[#1A1A1E] p-4">
                      <p className="font-semibold text-[#F4F4F6]">{bean.name}</p>
                      <p className="mt-1 text-xs text-[#8E8E93]">{bean.country} / {bean.process}</p>
                      <p className="mt-3 font-mono text-lg font-bold text-[#D09B6A]">{bean.currentWeight}g</p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Metric({ icon, label, value, accent = false }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-[#232326] bg-[#131315] p-4">
      <div className="mb-2 flex items-center gap-2 text-[#8E8E93]">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <strong className={`font-mono text-3xl ${accent ? 'text-[#D09B6A]' : 'text-[#F4F4F6]'}`}>{value}</strong>
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-xl border border-[#232326] bg-[#131315] p-5">
      <h2 className="text-sm font-semibold text-[#F4F4F6]">{title}</h2>
      {children}
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-[#232326] text-sm text-[#8E8E93]">{text}</div>;
}
