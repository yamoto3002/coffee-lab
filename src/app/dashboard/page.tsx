'use client';

import { useState, useEffect } from 'react';
import { DBService } from '@/lib/db';
import { Bean, Roast, Tasting } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter, Label, Legend, LineChart, Line } from 'recharts';
import { BarChart2, Star, Award, Database, TrendingUp, Layers, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [roasts, setRoasts] = useState<Roast[]>([]);
  const [tastings, setTastings] = useState<Tasting[]>([]);

  useEffect(() => {
    setBeans(DBService.getBeans());
    setRoasts(DBService.getRoasts());
    setTastings(DBService.getTastings());
  }, []);

  const completedTastings = tastings.filter(t => t.status === 'completed');

  // KPI Calculations
  const averageScore = completedTastings.length > 0 
    ? Math.round((completedTastings.reduce((sum, t) => sum + t.score, 0) / completedTastings.length) * 10) / 10
    : 0;

  const highestTasting = completedTastings.length > 0
    ? [...completedTastings].sort((a, b) => b.score - a.score)[0]
    : null;

  const lowestTasting = completedTastings.length > 0
    ? [...completedTastings].sort((a, b) => a.score - b.score)[0]
    : null;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyRoastsCount = roasts.filter(r => {
    const d = new Date(r.roastDate);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const activeBeans = beans.filter(b => b.currentWeight > 0);

  // Chart 1: Aging Comparison (Day 7 vs Day 10 vs Day 14 Average scores)
  const d7Scores = completedTastings.filter(t => t.tastingDay === 7);
  const d10Scores = completedTastings.filter(t => t.tastingDay === 10);
  const d14Scores = completedTastings.filter(t => t.tastingDay === 14);

  const getAvg = (list: Tasting[]) => list.length > 0 ? Math.round((list.reduce((s, x) => s + x.score, 0) / list.length) * 10) / 10 : 0;
  const getAvgParam = (list: Tasting[], key: keyof Tasting) => {
    const vals = list.map(x => x[key]).filter(v => typeof v === 'number') as number[];
    return vals.length > 0 ? Math.round((vals.reduce((s, x) => s + x, 0) / vals.length) * 10) / 10 : 0;
  };

  const agingEvolutionData = [
    { name: 'Day 7', Score: getAvg(d7Scores), Sweetness: getAvgParam(d7Scores, 'sweetness'), Acidity: (getAvgParam(d7Scores, 'acidityIntensity') + getAvgParam(d7Scores, 'acidityQuality')) / 2 },
    { name: 'Day 10', Score: getAvg(d10Scores), Sweetness: getAvgParam(d10Scores, 'sweetness'), Acidity: (getAvgParam(d10Scores, 'acidityIntensity') + getAvgParam(d10Scores, 'acidityQuality')) / 2 },
    { name: 'Day 14', Score: getAvg(d14Scores), Sweetness: getAvgParam(d14Scores, 'sweetness'), Acidity: (getAvgParam(d14Scores, 'acidityIntensity') + getAvgParam(d14Scores, 'acidityQuality')) / 2 },
  ];

  // Chart 2: Average Score by Bean Origin
  const beanScoresData = beans.map(b => {
    const beanRoasts = roasts.filter(r => r.beanId === b.id);
    const ids = beanRoasts.map(r => r.id);
    const beanTastings = completedTastings.filter(t => ids.includes(t.roastId));
    const avg = beanTastings.length > 0 ? Math.round((beanTastings.reduce((sum, t) => sum + t.score, 0) / beanTastings.length) * 10) / 10 : 0;
    return {
      name: b.name.substring(0, 12) + '...',
      fullName: `[${b.country}] ${b.name}`,
      avgScore: avg
    };
  }).filter(d => d.avgScore > 0);

  // Chart 3: Process type performance (Radar Chart)
  const processGroups = ['Washed', 'Natural', 'Honey', 'Anaerobic'];
  const processPerformanceData = processGroups.map(proc => {
    const procBeans = beans.filter(b => b.process === proc).map(b => b.id);
    const procRoasts = roasts.filter(r => procBeans.includes(r.beanId)).map(r => r.id);
    const procTastings = completedTastings.filter(t => procRoasts.includes(t.roastId));
    const avg = procTastings.length > 0 ? Math.round((procTastings.reduce((sum, t) => sum + t.score, 0) / procTastings.length) * 10) / 10 : 0;
    return {
      subject: proc,
      value: avg,
      fullMark: 100
    };
  }).filter(d => d.value > 0);

  // Chart 4: Correlation between Development Ratio and Tasting Score (Scatter Chart)
  const correlationData = roasts.map(r => {
    const roastTastings = completedTastings.filter(t => t.roastId === r.id);
    if (roastTastings.length === 0) return null;
    const maxScore = Math.max(...roastTastings.map(t => t.score));
    return {
      devRatio: r.developmentRatio,
      score: maxScore,
      id: r.id
    };
  }).filter(Boolean) as { devRatio: number; score: number; id: string }[];

  // Recommended ranking
  const recommendedRankings = [...roasts]
    .map(r => {
      const rTastings = completedTastings.filter(t => t.roastId === r.id);
      const maxRating = rTastings.length > 0 ? Math.max(...rTastings.map(t => t.recommendationRating)) : 0;
      const maxScore = rTastings.length > 0 ? Math.max(...rTastings.map(t => t.score)) : 0;
      return { ...r, maxRating, maxScore };
    })
    .filter(r => r.maxRating > 0)
    .sort((a, b) => b.maxRating - a.maxRating || b.maxScore - a.maxScore)
    .slice(0, 5);

  const getBeanDetails = (beanId: string) => {
    return beans.find(b => b.id === beanId);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-[#232326] bg-[#0E0E10] px-6 py-4">
        <h1 className="text-xl font-bold tracking-wide">分析ダッシュボード</h1>
        <p className="text-xs text-[#8E8E93]">焙煎プロファイルとテイスト評価の統合データ分析</p>
      </header>

      {/* Main Container */}
      <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full pb-24">
        
        {/* Row 1: KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-[#131315] p-4.5 rounded-xl border border-[#232326] space-y-1">
            <span className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider block">全体平均スコア</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-[#D09B6A] font-mono">{averageScore}</span>
              <span className="text-xs text-[#8E8E93]">点</span>
            </div>
            <p className="text-[9px] text-[#8E8E93] truncate">計 {completedTastings.length} 回の評価</p>
          </div>

          <div className="bg-[#131315] p-4.5 rounded-xl border border-[#232326] space-y-1">
            <span className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider block">最高スコア</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-emerald-400 font-mono">
                {highestTasting ? highestTasting.score : '-'}
              </span>
              <span className="text-xs text-[#8E8E93]">点</span>
            </div>
            <p className="text-[9px] text-[#8E8E93] truncate">
              {highestTasting ? `Batch: ${highestTasting.roastId} (Day${highestTasting.tastingDay})` : '未評価'}
            </p>
          </div>

          <div className="bg-[#131315] p-4.5 rounded-xl border border-[#232326] space-y-1">
            <span className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider block">最低スコア</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-red-400 font-mono">
                {lowestTasting ? lowestTasting.score : '-'}
              </span>
              <span className="text-xs text-[#8E8E93]">点</span>
            </div>
            <p className="text-[9px] text-[#8E8E93] truncate">
              {lowestTasting ? `Batch: ${lowestTasting.roastId}` : '未評価'}
            </p>
          </div>

          <div className="bg-[#131315] p-4.5 rounded-xl border border-[#232326] space-y-1">
            <span className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider block">今月の焙煎数</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-[#F4F4F6] font-mono">{monthlyRoastsCount}</span>
              <span className="text-xs text-[#8E8E93]">回</span>
            </div>
            <p className="text-[9px] text-[#8E8E93] truncate">年間総数: {roasts.length} バッチ</p>
          </div>

          <div className="bg-[#131315] p-4.5 rounded-xl border border-[#232326] space-y-1 col-span-2 lg:col-span-1">
            <span className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider block">保有生豆銘柄数</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-[#F4F4F6] font-mono">{activeBeans.length}</span>
              <span className="text-xs text-[#8E8E93]">銘柄</span>
            </div>
            <p className="text-[9px] text-[#8E8E93] truncate">
              総量: {beans.reduce((s, b) => s + b.currentWeight, 0).toLocaleString()}g
            </p>
          </div>
        </div>

        {/* Row 2: Charts Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Chart A: Aging quality evolution */}
          <div className="bg-[#131315] p-5 rounded-xl border border-[#232326] space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#F4F4F6]">エイジング進展に伴う評価変化</h3>
              <p className="text-xs text-[#8E8E93]">Day 7 ➔ 10 ➔ 14 での平均テイスト推移</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={agingEvolutionData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232326" />
                  <XAxis dataKey="name" stroke="#8E8E93" fontSize={11} />
                  <YAxis domain={[0, 10]} stroke="#8E8E93" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#131315', borderColor: '#232326' }} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Line type="monotone" dataKey="Sweetness" stroke="#D09B6A" strokeWidth={2.5} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Acidity" stroke="#3B82F6" strokeWidth={2.5} />
                  <Line type="monotone" dataKey="Score" name="総合点 (平均/10)" stroke="#EF4444" strokeWidth={2.5} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart B: Score by Bean */}
          <div className="bg-[#131315] p-5 rounded-xl border border-[#232326] space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#F4F4F6]">生豆銘柄別平均評価</h3>
              <p className="text-xs text-[#8E8E93]">各豆のテイスト合計点平均（Q-grader合計基準）</p>
            </div>
            <div className="h-64">
              {beanScoresData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={beanScoresData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#232326" />
                    <XAxis dataKey="name" stroke="#8E8E93" fontSize={10} />
                    <YAxis domain={[70, 95]} stroke="#8E8E93" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#131315', borderColor: '#232326' }}
                      formatter={(value, name, props) => [`${value}点`, '平均点']}
                      labelFormatter={(label, items) => items[0]?.payload?.fullName || label}
                    />
                    <Bar dataKey="avgScore" fill="#D09B6A" radius={[4, 4, 0, 0]} barSize={35} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#8E8E93]">
                  グラフ化に必要な十分なテイストデータがありません
                </div>
              )}
            </div>
          </div>

          {/* Chart C: Process Performance (Radar) */}
          <div className="bg-[#131315] p-5 rounded-xl border border-[#232326] space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#F4F4F6]">精製プロセス別パフォーマンス</h3>
              <p className="text-xs text-[#8E8E93]">Washed / Natural / Honey / Anaerobic の平均点比較</p>
            </div>
            <div className="h-64 flex items-center justify-center">
              {processPerformanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={processPerformanceData}>
                    <PolarGrid stroke="#232326" />
                    <PolarAngleAxis dataKey="subject" stroke="#8E8E93" fontSize={11} />
                    <PolarRadiusAxis domain={[70, 90]} tickCount={3} stroke="#232326" />
                    <Radar name="平均スコア" dataKey="value" stroke="#D09B6A" fill="#D09B6A" fillOpacity={0.25} />
                    <Tooltip contentStyle={{ backgroundColor: '#131315', borderColor: '#232326' }} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#8E8E93]">
                  十分な精製方法データが登録されていません
                </div>
              )}
            </div>
          </div>

          {/* Chart D: Dev Ratio vs Overall Score (Correlation) */}
          <div className="bg-[#131315] p-5 rounded-xl border border-[#232326] space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#F4F4F6]">デベロップメント比率とテイストの相関</h3>
              <p className="text-xs text-[#8E8E93]">最適な「スイートスポット（開発率）」の割り出し</p>
            </div>
            <div className="h-64">
              {correlationData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#232326" />
                    <XAxis 
                      type="number" 
                      dataKey="devRatio" 
                      name="Dev Ratio" 
                      unit="%" 
                      domain={[10, 22]} 
                      stroke="#8E8E93"
                      fontSize={11}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="score" 
                      name="Max Score" 
                      unit="点" 
                      domain={[75, 95]} 
                      stroke="#8E8E93"
                      fontSize={11}
                    />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{ backgroundColor: '#131315', borderColor: '#232326' }}
                      formatter={(value, name) => [value, name === 'devRatio' ? '開発比率' : 'テイスト得点']}
                    />
                    <Scatter name="Roasts" data={correlationData} fill="#D09B6A" shape="circle" line={false} />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#8E8E93]">
                  相関図の描画に必要なテイスト評価が存在しません
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Row 3: Rankings & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Top Rankings */}
          <div className="bg-[#131315] p-5 rounded-xl border border-[#232326] space-y-4 lg:col-span-2">
            <h3 className="text-sm font-semibold text-[#F4F4F6] flex items-center gap-2">
              <Award className="w-4.5 h-4.5 text-[#D09B6A]" />
              おすすめプロファイル・ランキング (星5〜4)
            </h3>
            
            <div className="space-y-2.5">
              {recommendedRankings.length === 0 ? (
                <p className="text-xs text-[#8E8E93] italic py-4 text-center">該当する高評価バッチがありません</p>
              ) : (
                recommendedRankings.map((r, idx) => {
                  const b = getBeanDetails(r.beanId);
                  return (
                    <Link
                      key={r.id}
                      href={`/roasts/${r.id}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-[#1A1A1E] border border-[#232326] hover:bg-[#1C1C1F] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-[#8E8E93] w-6">#{idx + 1}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-[#D09B6A] font-bold">{r.id}</span>
                            <span className="text-[10px] text-[#8E8E93]">{r.roastDate}</span>
                          </div>
                          <span className="text-xs text-[#E4E4E7] font-semibold line-clamp-1 mt-0.5">
                            {b ? `[${b.country}] ${b.name}` : 'Unknown Bean'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <span className="text-[9px] text-[#8E8E93] block font-mono">Dev / Loss</span>
                          <span className="text-xs text-[#E4E4E7] font-mono">{r.developmentRatio}% / {r.lossRatio}%</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold font-mono text-[#D09B6A] block">{r.maxScore}点</span>
                          <div className="flex text-[#D09B6A]">
                            {Array.from({ length: r.maxRating }).map((_, i) => (
                              <Star key={i} className="w-2.5 h-2.5 fill-current" />
                            ))}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* Stock warnings */}
          <div className="bg-[#131315] p-5 rounded-xl border border-[#232326] space-y-4">
            <h3 className="text-sm font-semibold text-[#EF4444] flex items-center gap-2">
              <AlertCircle className="w-4.5 h-4.5" />
              生豆在庫アラート
            </h3>
            
            <div className="space-y-3">
              {beans.filter(b => b.currentWeight < 100).length === 0 ? (
                <p className="text-xs text-[#8E8E93] italic py-4 text-center">在庫切れに近い銘柄はありません</p>
              ) : (
                beans.filter(b => b.currentWeight < 100).map(b => (
                  <div key={b.id} className="p-3 bg-[#1A1A1E] border border-[#232326] rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-bold text-[#E4E4E7] line-clamp-1">{b.name}</h4>
                      <span className="text-[10px] text-[#8E8E93]">{b.country} - {b.process}</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-mono font-bold ${b.currentWeight === 0 ? 'text-[#EF4444]' : 'text-amber-500'}`}>
                        {b.currentWeight}g
                      </span>
                      <span className="text-[9px] text-[#8E8E93] block">残量</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
