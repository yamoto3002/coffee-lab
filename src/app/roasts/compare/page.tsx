'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Star } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DBService, secondsToTime, timeToSeconds } from '@/lib/db';
import { formatDate } from '@/lib/date';
import { Bean, Roast, RoastStep, Tasting } from '@/types';

function CompareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idsParam = searchParams.get('ids') || '';
  const [roasts, setRoasts] = useState<Roast[]>([]);
  const [beans, setBeans] = useState<Bean[]>([]);
  const [stepsByRoast, setStepsByRoast] = useState<Record<string, RoastStep[]>>({});
  const [tastingsByRoast, setTastingsByRoast] = useState<Record<string, Tasting[]>>({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!idsParam) {
        router.push('/roasts');
        return;
      }
      const ids = idsParam.split(',').filter(Boolean).slice(0, 3);
      const nextRoasts = ids.map(id => DBService.getRoastById(id)).filter(Boolean) as Roast[];
      const nextSteps: Record<string, RoastStep[]> = {};
      const nextTastings: Record<string, Tasting[]> = {};
      nextRoasts.forEach(roast => {
        nextSteps[roast.id] = DBService.getRoastSteps(roast.id);
        nextTastings[roast.id] = DBService.getTastingsForRoast(roast.id).filter(tasting => tasting.status === 'completed');
      });
      setBeans(DBService.getBeans());
      setRoasts(nextRoasts);
      setStepsByRoast(nextSteps);
      setTastingsByRoast(nextTastings);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [idsParam, router]);

  const chartData = useMemo(() => {
    const secsSet = new Set<number>();
    roasts.forEach(roast => stepsByRoast[roast.id]?.forEach(step => secsSet.add(timeToSeconds(step.time))));
    const secsList = Array.from(secsSet).sort((a, b) => a - b);
    return secsList.map(secs => {
      const row: Record<string, number | string> = { secs };
      roasts.forEach(roast => {
        const active = [...(stepsByRoast[roast.id] || [])]
          .sort((a, b) => timeToSeconds(a.time) - timeToSeconds(b.time))
          .filter(step => timeToSeconds(step.time) <= secs)
          .at(-1);
        row[`heat_${roast.id}`] = active?.heat || 0;
        row[`air_${roast.id}`] = active?.air || 0;
      });
      return row;
    });
  }, [roasts, stepsByRoast]);

  const colors = ['#00DFFF', '#FB3D71', '#FF8A3D'];
  const beanName = (beanId: string) => {
    const bean = beans.find(item => item.id === beanId);
    return bean ? `[${bean.country}] ${bean.name}` : 'Unknown Bean';
  };

  if (roasts.length === 0) return null;

  return (
    <div className="lab-shell flex min-h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-white/10 bg-[#080E14]/95 px-6 py-4 backdrop-blur">
        <Link href="/roasts" className="tap-button rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-wide">焙煎プロファイル比較</h1>
          <p className="text-xs text-slate-400">選択したバッチの火力・風量・評価を並べます</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 pb-28 md:p-6">
        <section className="lab-card-soft rounded-xl p-5">
          <h2 className="mb-4 text-sm font-semibold text-[#F4F4F6]">火力と風量の重ね合わせ</h2>
          <div className="h-[360px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                  <XAxis dataKey="secs" type="number" domain={[0, 'dataMax + 30']} tickFormatter={value => secondsToTime(Number(value))} stroke="#94A3B8" fontSize={11} />
                  <YAxis domain={[0, 8]} ticks={[0, 2, 4, 6, 8]} stroke="#94A3B8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#243149', color: '#F4F4F6' }} labelFormatter={value => secondsToTime(Number(value))} />
                  <Legend />
                  {roasts.map((roast, index) => (
                    <Line key={`heat-${roast.id}`} type="stepAfter" dataKey={`heat_${roast.id}`} name={`${roast.id} 火力`} stroke={colors[index % colors.length]} strokeWidth={2.4} dot={false} />
                  ))}
                  {roasts.map((roast, index) => (
                    <Line key={`air-${roast.id}`} type="stepAfter" dataKey={`air_${roast.id}`} name={`${roast.id} 風量`} stroke={colors[index % colors.length]} strokeDasharray="5 5" strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="flex h-full items-center justify-center text-sm text-slate-500">比較できるタイムラインがありません。</div>}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {roasts.map((roast, index) => {
            const tastings = tastingsByRoast[roast.id] || [];
            const topTasting = [...tastings].sort((a, b) => b.score - a.score)[0];
            return (
              <Link key={roast.id} href={`/roasts/${roast.id}`} className="tap-button lab-card-soft rounded-xl p-5" style={{ borderColor: `${colors[index % colors.length]}44` }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-mono text-xl font-bold" style={{ color: colors[index % colors.length] }}>{roast.id}</h2>
                    <span className="mt-0.5 block text-xs text-slate-400">{formatDate(roast.roastDate)}</span>
                  </div>
                  {topTasting && <strong className="font-mono text-2xl" style={{ color: topTasting.impressionColor }}>{topTasting.score}</strong>}
                </div>
                <p className="mt-3 text-sm font-semibold text-[#F4F4F6]">{beanName(roast.beanId)}</p>
                <div className="mt-4 space-y-2 text-sm">
                  <Row label="投入 / 焙煎後" value={`${roast.greenWeight}g / ${roast.roastedWeight}g`} />
                  <Row label="Loss" value={`${roast.lossRatio}%`} />
                  <Row label="1st / 2nd / Drop" value={`${roast.firstCrackTime || '不明'} / ${roast.secondCrackTime || '-'} / ${roast.dropTime || '-'}`} />
                  <Row label="Dev" value={roast.developmentRatio === null ? '不明' : `${roast.developmentRatio}%`} />
                </div>
                {topTasting && (
                  <div className="mt-4 flex" style={{ color: topTasting.impressionColor }}>
                    {Array.from({ length: topTasting.recommendationRating }).map((_, star) => <Star key={star} className="h-3 w-3 fill-current" />)}
                  </div>
                )}
              </Link>
            );
          })}
        </section>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-white/10 pb-1">
      <span className="text-slate-500">{label}</span>
      <strong className="text-right font-mono text-[#F4F4F6]">{value}</strong>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-500">Loading...</div>}>
      <CompareContent />
    </Suspense>
  );
}
