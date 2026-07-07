'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Star } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DBService, secondsToTime, timeToSeconds } from '@/lib/db';
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

  const colors = ['#D09B6A', '#3B82F6', '#22C55E'];
  const beanName = (beanId: string) => {
    const bean = beans.find(item => item.id === beanId);
    return bean ? `[${bean.country}] ${bean.name}` : 'Unknown Bean';
  };

  if (roasts.length === 0) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-[#232326] bg-[#0E0E10] px-6 py-4">
        <Link href="/roasts" className="rounded-lg p-1.5 text-[#8E8E93] hover:bg-[#232326] hover:text-[#F4F4F6]">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-wide">焙煎プロファイル比較</h1>
          <p className="text-xs text-[#8E8E93]">選択したバッチの火力・風量・評価を並べて確認</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-6 pb-24">
        <section className="rounded-xl border border-[#232326] bg-[#131315] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[#F4F4F6]">火力・風量の重ね合わせ</h2>
          <div className="h-80">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232326" />
                  <XAxis dataKey="secs" type="number" tickFormatter={value => secondsToTime(Number(value))} stroke="#8E8E93" fontSize={11} />
                  <YAxis domain={[0, 8]} ticks={[0, 2, 4, 6, 8]} stroke="#8E8E93" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#131315', borderColor: '#232326' }} labelFormatter={value => secondsToTime(Number(value))} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  {roasts.map((roast, index) => (
                    <Line key={`heat_${roast.id}`} type="stepAfter" dataKey={`heat_${roast.id}`} name={`${roast.id} 火力`} stroke={colors[index]} strokeWidth={2.5} dot={false} />
                  ))}
                  {roasts.map((roast, index) => (
                    <Line key={`air_${roast.id}`} type="stepAfter" dataKey={`air_${roast.id}`} name={`${roast.id} 風量`} stroke={colors[index]} strokeWidth={2} strokeDasharray="4 4" dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="flex h-full items-center justify-center text-sm text-[#8E8E93]">比較できるタイムラインがありません。</div>}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {roasts.map((roast, index) => {
            const tastings = tastingsByRoast[roast.id] || [];
            return (
              <article key={roast.id} className="flex flex-col overflow-hidden rounded-xl border bg-[#131315]" style={{ borderColor: colors[index] }}>
                <div className="border-b border-[#232326] px-5 py-4 text-center" style={{ backgroundColor: `${colors[index]}14` }}>
                  <span className="font-mono text-lg font-black" style={{ color: colors[index] }}>{roast.id}</span>
                  <span className="mt-0.5 block text-xs text-[#8E8E93]">{roast.roastDate}</span>
                </div>
                <div className="flex-1 space-y-5 p-5 text-sm">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-[#8E8E93]">使用生豆</span>
                    <h3 className="mt-1 font-bold text-[#F4F4F6]">{beanName(roast.beanId)}</h3>
                  </div>
                  <div className="space-y-2 border-t border-[#232326] pt-4 font-mono text-xs">
                    <Row label="投入 / 焙煎後" value={`${roast.greenWeight}g / ${roast.roastedWeight}g`} />
                    <Row label="Loss" value={`${roast.lossRatio}%`} />
                    <Row label="Dev" value={`${roast.developmentTime} / ${roast.developmentRatio}%`} accent />
                    <Row label="1st / Drop" value={`${roast.firstCrackTime || '-'} / ${roast.dropTime || '-'}`} />
                  </div>
                  <div className="space-y-3 border-t border-[#232326] pt-4">
                    {[7, 10, 14].map(day => {
                      const tasting = tastings.find(item => item.tastingDay === day);
                      return (
                        <div key={day} className="rounded-lg bg-[#1A1A1E] p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[#8E8E93]">Day {day}</span>
                            {tasting ? <strong className="font-mono text-[#D09B6A]">{tasting.score}点</strong> : <span className="text-xs text-[#8E8E93]">未評価</span>}
                          </div>
                          {tasting && (
                            <div className="mt-2 flex text-[#D09B6A]">
                              {Array.from({ length: tasting.recommendationRating }).map((_, starIndex) => <Star key={starIndex} className="h-3 w-3 fill-current" />)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="border-t border-[#232326] p-4">
                  <Link href={`/roasts/${roast.id}`} className="flex items-center justify-center rounded-lg bg-[#1C1C1F] py-2 text-xs font-semibold">詳細を開く</Link>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}

function Row({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[#8E8E93]">{label}</span>
      <span className={accent ? 'font-bold text-[#D09B6A]' : 'text-[#F4F4F6]'}>{value}</span>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-[#8E8E93]">Loading...</div>}>
      <CompareContent />
    </Suspense>
  );
}
