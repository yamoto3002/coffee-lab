'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DBService, secondsToTime, timeToSeconds } from '@/lib/db';
import { Bean, Roast, RoastStep, Tasting } from '@/types';
import { ArrowLeft, Star, Clock, Layers, FileText, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function CompareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idsParam = searchParams.get('ids') || '';

  const [comparedRoasts, setComparedRoasts] = useState<Roast[]>([]);
  const [beans, setBeans] = useState<Bean[]>([]);
  const [roastSteps, setRoastSteps] = useState<{ [roastId: string]: RoastStep[] }>({});
  const [roastTastings, setRoastTastings] = useState<{ [roastId: string]: Tasting[] }>({});

  useEffect(() => {
    if (!idsParam) {
      router.push('/roasts');
      return;
    }

    const ids = idsParam.split(',');
    const allBeans = DBService.getBeans();
    setBeans(allBeans);

    const roastsList: Roast[] = [];
    const stepsMap: { [roastId: string]: RoastStep[] } = {};
    const tastingsMap: { [roastId: string]: Tasting[] } = {};

    ids.forEach(id => {
      const r = DBService.getRoastById(id);
      if (r) {
        roastsList.push(r);
        stepsMap[id] = DBService.getRoastSteps(id);
        tastingsMap[id] = DBService.getTastingsForRoast(id).filter(t => t.status === 'completed');
      }
    });

    setComparedRoasts(roastsList);
    setRoastSteps(stepsMap);
    setRoastTastings(tastingsMap);
  }, [idsParam, router]);

  if (comparedRoasts.length === 0) return null;

  // Prepare overlapping graph data
  // Combine all steps from all roasts on a single timeline
  // X-axis: Time in seconds
  // Y-axis: Heat/Air values
  const allSecs: number[] = [];
  comparedRoasts.forEach(r => {
    const steps = roastSteps[r.id] || [];
    steps.forEach(s => {
      const secs = timeToSeconds(s.time);
      if (!allSecs.includes(secs)) {
        allSecs.push(secs);
      }
    });
  });
  // Sort seconds
  allSecs.sort((a, b) => a - b);

  // For chart, we interpolate heat and air values at each second mark
  // by finding the latest state active at or before that second.
  const getInterpolatedState = (steps: RoastStep[], secs: number) => {
    const active = [...steps]
      .sort((a, b) => timeToSeconds(a.time) - timeToSeconds(b.time))
      .filter(s => timeToSeconds(s.time) <= secs);
    
    if (active.length === 0) return { heat: 0, air: 0 };
    const latest = active[active.length - 1];
    return { heat: latest.heat, air: latest.air };
  };

  const lineColors = ['#D09B6A', '#3B82F6', '#A855F7'];

  const overlapChartData = allSecs.map(secs => {
    const row: any = { secs, timeStr: secondsToTime(secs) };
    comparedRoasts.forEach((r, idx) => {
      const state = getInterpolatedState(roastSteps[r.id] || [], secs);
      row[`heat_${r.id}`] = state.heat;
      row[`air_${r.id}`] = state.air;
    });
    return row;
  });

  const getBeanName = (beanId: string) => {
    const bean = beans.find(b => b.id === beanId);
    return bean ? `[${bean.country}] ${bean.name}` : 'Unknown Bean';
  };

  const getDayTasting = (roastId: string, day: 7 | 10 | 14) => {
    const list = roastTastings[roastId] || [];
    return list.find(t => t.tastingDay === day);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-[#232326] bg-[#0E0E10] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/roasts" className="p-1.5 hover:bg-[#232326] rounded-lg text-[#8E8E93] hover:text-[#F4F4F6] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-wide">焙煎プロファイル比較</h1>
            <p className="text-xs text-[#8E8E93]">選択されたバッチの重ね合わせグラフと詳細比較</p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full pb-24">
        
        {/* Section 1: Overlapping Curve Profile Chart */}
        <div className="bg-[#131315] p-5 rounded-xl border border-[#232326] space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[#F4F4F6]">火力・風量 重ね合わせプロファイル</h3>
            <p className="text-xs text-[#8E8E93]">
              実線：火力 (Heat) / 破線：風量 (Air)
            </p>
          </div>

          <div className="h-72 w-full">
            {overlapChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overlapChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232326" />
                  <XAxis 
                    dataKey="secs" 
                    type="number"
                    tickFormatter={(secs) => secondsToTime(secs)}
                    stroke="#8E8E93"
                    fontSize={11}
                  />
                  <YAxis domain={[0, 8]} ticks={[0, 2, 4, 6, 8]} stroke="#8E8E93" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#131315', borderColor: '#232326' }}
                    labelFormatter={(secs) => `時間: ${secondsToTime(Number(secs))}`}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  
                  {comparedRoasts.map((r, idx) => (
                    <Line 
                      key={`heat_${r.id}`}
                      type="stepAfter" 
                      dataKey={`heat_${r.id}`}
                      name={`${r.id} 火力`}
                      stroke={lineColors[idx]} 
                      strokeWidth={2.5}
                      dot={false}
                    />
                  ))}
                  
                  {comparedRoasts.map((r, idx) => (
                    <Line 
                      key={`air_${r.id}`}
                      type="stepAfter" 
                      dataKey={`air_${r.id}`}
                      name={`${r.id} 風量`}
                      stroke={lineColors[idx]} 
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        {/* Section 2: Side by Side Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {comparedRoasts.map((roast, idx) => {
            const listTastings = roastTastings[roast.id] || [];
            
            return (
              <div 
                key={roast.id} 
                className="bg-[#131315] border rounded-xl overflow-hidden flex flex-col justify-between"
                style={{ borderColor: lineColors[idx] }}
              >
                {/* Column header with Roast ID */}
                <div 
                  className="px-5 py-4 border-b border-[#232326] text-center"
                  style={{ backgroundColor: `${lineColors[idx]}10` }}
                >
                  <span className="font-mono text-lg font-black" style={{ color: lineColors[idx] }}>
                    {roast.id}
                  </span>
                  <span className="text-xs text-[#8E8E93] block mt-0.5">{roast.roastDate}</span>
                </div>

                {/* Column Content body */}
                <div className="p-5 flex-1 space-y-6 divide-y divide-[#232326]">
                  {/* Bean details */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider block">使用生豆</span>
                    <h4 className="text-sm font-bold text-[#F4F4F6] line-clamp-1">{getBeanName(roast.beanId)}</h4>
                  </div>

                  {/* Basic Metrics */}
                  <div className="pt-4 space-y-2 text-xs font-mono">
                    <span className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider block">基本値 / 減少率</span>
                    <div className="flex justify-between">
                      <span className="text-[#8E8E93]">投入 ➔ 焙煎後</span>
                      <span className="text-[#F4F4F6]">{roast.greenWeight}g ➔ {roast.roastedWeight}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8E8E93]">減少率 (Loss Ratio)</span>
                      <span className="text-[#F4F4F6] font-bold">{roast.lossRatio}%</span>
                    </div>
                  </div>

                  {/* Temperature events */}
                  <div className="pt-4 space-y-2 text-xs font-mono">
                    <span className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider block">温度・開発比率</span>
                    <div className="flex justify-between">
                      <span className="text-[#8E8E93]">Yellow / 1st Crack</span>
                      <span className="text-[#F4F4F6]">{roast.yellowTime} / {roast.firstCrackTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8E8E93]">Drop / Dev Time</span>
                      <span className="text-[#F4F4F6]">{roast.dropTime} / {roast.developmentTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8E8E93]">開発比率 (Dev Ratio)</span>
                      <span className="text-[#D09B6A] font-bold">{roast.developmentRatio}%</span>
                    </div>
                  </div>

                  {/* Tasting Ratings per Aging Day */}
                  {[7, 10, 14].map(day => {
                    const t = getDayTasting(roast.id, day as 7 | 10 | 14);
                    return (
                      <div key={day} className="pt-4 space-y-2">
                        <span className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider block">Day {day} 評価</span>
                        {t ? (
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-extrabold text-[#D09B6A] font-mono">{t.score}点</span>
                              <div className="flex text-[#D09B6A]">
                                {Array.from({ length: t.recommendationRating }).map((_, i) => (
                                  <Star key={i} className="w-2.5 h-2.5 fill-current" />
                                ))}
                              </div>
                            </div>
                            
                            {/* Taste sub-metrics */}
                            <div className="grid grid-cols-2 gap-1 text-[10px] text-[#A1A1AA] bg-[#1A1A1E] p-1.5 rounded">
                              <span>Flavor: <strong className="text-[#F4F4F6]">{t.flavor}</strong></span>
                              <span>Sweet: <strong className="text-[#F4F4F6]">{t.sweetness}</strong></span>
                              <span>Acid: <strong className="text-[#F4F4F6]">{((t.acidityIntensity + t.acidityQuality) / 2).toFixed(1)}</strong></span>
                              <span>Overall: <strong className="text-[#F4F4F6]">{t.overall}</strong></span>
                            </div>

                            {t.flavors && t.flavors.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {t.flavors.slice(0, 3).map(fl => (
                                  <span key={fl} className="text-[8px] bg-[#1E1E22] text-[#8E8E93] px-1.5 py-0.5 rounded border border-[#232326]">
                                    {fl}
                                  </span>
                                ))}
                                {t.flavors.length > 3 && <span className="text-[8px] text-[#8E8E93] px-1">+{t.flavors.length - 3}</span>}
                              </div>
                            )}

                            {t.improvements && (
                              <p className="text-[10px] text-[#8E8E93] italic line-clamp-2">「{t.improvements}」</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[#8E8E93] italic block">未テイスティング</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Direct Detail CTA */}
                <div className="p-4 border-t border-[#232326]">
                  <Link
                    href={`/roasts/${roast.id}`}
                    className="flex items-center justify-center gap-1 w-full py-2 rounded-lg bg-[#1C1C1F] hover:bg-[#232326] text-xs font-semibold transition-colors"
                  >
                    詳細プロファイルを開く ➔
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center text-[#8E8E93]">
        ローディング中...
      </div>
    }>
      <CompareContent />
    </Suspense>
  );
}
