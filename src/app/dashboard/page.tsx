'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, BarChart2, Coffee, Flame, Palette, Star, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DBService } from '@/lib/db';
import { parseDateOnly } from '@/lib/date';
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
    const date = parseDateOnly(roast.roastDate);
    const now = new Date();
    return !!date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const agingData = useMemo(() => {
    const days = Array.from(new Set(completedTastings.map(tasting => tasting.dayAfterRoast))).sort((a, b) => a - b);
    return days.map(day => {
      const list = completedTastings.filter(tasting => tasting.dayAfterRoast === day);
      const score = list.length ? Math.round((list.reduce((sum, tasting) => sum + tasting.score, 0) / list.length) * 10) / 10 : 0;
      return { name: `Day ${day}`, score };
    }).filter(item => item.score > 0);
  }, [completedTastings]);

  const beanScores = useMemo(() => {
    return beans.map(bean => {
      const roastIds = roasts.filter(roast => roast.beanId === bean.id).map(roast => roast.id);
      const beanTastings = completedTastings.filter(tasting => roastIds.includes(tasting.roastId));
      const avg = beanTastings.length ? Math.round((beanTastings.reduce((sum, tasting) => sum + tasting.score, 0) / beanTastings.length) * 10) / 10 : 0;
      return { name: bean.name.length > 14 ? `${bean.name.slice(0, 14)}...` : bean.name, score: avg, color: bean.themeColor || '#D09B6A' };
    }).filter(item => item.score > 0);
  }, [beans, roasts, completedTastings]);

  const lossByBean = useMemo(() => {
    return beans.map(bean => {
      const beanRoasts = roasts.filter(roast => roast.beanId === bean.id && roast.lossRatio > 0);
      const avg = beanRoasts.length ? Math.round((beanRoasts.reduce((sum, roast) => sum + roast.lossRatio, 0) / beanRoasts.length) * 10) / 10 : 0;
      return { name: bean.name.length > 14 ? `${bean.name.slice(0, 14)}...` : bean.name, loss: avg };
    }).filter(item => item.loss > 0);
  }, [beans, roasts]);

  const firstCrackMissingCount = roasts.filter(roast => !roast.firstCrackTime || roast.firstCrackStatus === 'not_detected').length;
  const impressionColors = useMemo(() => {
    const map = new Map<string, number>();
    completedTastings.forEach(tasting => {
      const color = tasting.impressionColor || '#D09B6A';
      map.set(color, (map.get(color) || 0) + 1);
    });
    return Array.from(map.entries()).map(([color, count]) => ({ color, count }));
  }, [completedTastings]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[#232326] bg-[#0E0E10] px-6 py-4">
        <h1 className="text-xl font-bold tracking-wide">分析</h1>
        <p className="text-xs text-[#8E8E93]">実データだけを使った焙煎とテイスティングの振り返り</p>
      </header>

      <div className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-6 pb-28">
        {!hasAnalysisData ? (
          <div className="flex min-h-[55vh] flex-col items-center justify-center rounded-2xl border border-dashed border-[#232326] bg-[#131315] p-8 text-center">
            <BarChart2 className="mb-4 h-10 w-10 text-[#D09B6A]" />
            <h2 className="text-xl font-bold">分析できるデータがまだありません</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[#8E8E93]">サンプル値は表示しません。焙煎ログやテイスティングを保存すると、ここに傾向が出ます。</p>
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
              <Metric icon={<AlertCircle className="h-4 w-4" />} label="1st不明" value={`${firstCrackMissingCount}`} />
            </section>

            {settings.showAnalysisCards && (
              <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ChartPanel title="Day別 平均評価">
                  {agingData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={agingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#232326" />
                        <XAxis dataKey="name" stroke="#8E8E93" fontSize={11} />
                        <YAxis domain={[0, 100]} stroke="#8E8E93" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#131315', borderColor: '#232326' }} />
                        <Line type="monotone" dataKey="score" name="平均スコア" stroke="#D09B6A" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart text="テイスティング結果がまだありません" />}
                </ChartPanel>

                <ChartPanel title="豆別 平均評価">
                  {beanScores.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={beanScores} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#232326" />
                        <XAxis dataKey="name" stroke="#8E8E93" fontSize={10} />
                        <YAxis domain={[0, 100]} stroke="#8E8E93" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#131315', borderColor: '#232326' }} />
                        <Bar dataKey="score" name="平均スコア" fill="#D09B6A" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart text="豆別に集計できる評価がありません" />}
                </ChartPanel>

                <ChartPanel title="豆別 Loss平均">
                  {lossByBean.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={lossByBean} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#232326" />
                        <XAxis dataKey="name" stroke="#8E8E93" fontSize={10} />
                        <YAxis stroke="#8E8E93" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#131315', borderColor: '#232326' }} />
                        <Bar dataKey="loss" name="Loss %" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart text="Lossを集計できる焙煎がありません" />}
                </ChartPanel>

                <ChartPanel title="印象色の分布">
                  {impressionColors.length > 0 ? (
                    <div className="flex h-[260px] flex-wrap content-center items-center justify-center gap-3">
                      {impressionColors.map(item => (
                        <div key={item.color} className="flex items-center gap-2 rounded-xl border border-[#232326] bg-[#1A1A1E] px-4 py-3">
                          <span className="h-8 w-8 rounded-full border border-white/10" style={{ backgroundColor: item.color }} />
                          <span className="font-mono text-lg text-[#F4F4F6]">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : <EmptyChart text="印象色つきのテイスティングがありません" />}
                </ChartPanel>
              </section>
            )}

            <section className="rounded-xl border border-[#232326] bg-[#131315] p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#8E8E93]"><Palette className="h-4 w-4 text-[#D09B6A]" />分析メモ</h2>
              <p className="text-sm leading-relaxed text-[#A1A1AA]">
                テイスティングが少ない間は、相関よりも「同じ豆のDay違い」「同じ焙煎度の飲み比べ」を増やすほうが有効です。サンプル評価は混ぜず、保存された実データだけを表示しています。
              </p>
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
