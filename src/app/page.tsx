'use client';

import { useState, useEffect } from 'react';
import { DBService, getAgingDays } from '@/lib/db';
import { Bean, Roast, Tasting } from '@/types';
import { Bell, Flame, Calendar, Award, Star, ArrowRight, Plus, Coffee, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

interface TastingsDueItem {
  roast: Roast;
  bean?: Bean;
  day: 7 | 10 | 14;
  aging: number;
}

export default function Home() {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [roasts, setRoasts] = useState<Roast[]>([]);
  const [tastings, setTastings] = useState<Tasting[]>([]);
  const [tastingsDue, setTastingsDue] = useState<TastingsDueItem[]>([]);

  useEffect(() => {
    const allBeans = DBService.getBeans();
    const allRoasts = DBService.getRoasts();
    const allTastings = DBService.getTastings();

    setBeans(allBeans);
    setRoasts(allRoasts);
    setTastings(allTastings);

    // Calculate Tastings Due Today (or Overdue)
    const dueList: TastingsDueItem[] = [];
    allRoasts.forEach(roast => {
      const aging = getAgingDays(roast.roastDate);
      const roastTastings = allTastings.filter(t => t.roastId === roast.id);
      
      const d7 = roastTastings.find(t => t.tastingDay === 7);
      const d10 = roastTastings.find(t => t.tastingDay === 10);
      const d14 = roastTastings.find(t => t.tastingDay === 14);

      const bean = allBeans.find(b => b.id === roast.beanId);

      // Rule: Day 7 is due when aging >= 7 and Day 7 tasting is not completed
      if (aging >= 7 && (!d7 || d7.status === 'pending')) {
        dueList.push({ roast, bean, day: 7, aging });
      }
      // Rule: Day 10 is due when aging >= 10, Day 7 is completed, and Day 10 is not completed
      else if (aging >= 10 && d7 && d7.status === 'completed' && (!d10 || d10.status === 'pending')) {
        dueList.push({ roast, bean, day: 10, aging });
      }
      // Rule: Day 14 is due when aging >= 14, Day 10 is completed, and Day 14 is not completed
      else if (aging >= 14 && d10 && d10.status === 'completed' && (!d14 || d14.status === 'pending')) {
        dueList.push({ roast, bean, day: 14, aging });
      }
    });

    setTastingsDue(dueList);
  }, []);

  // Helpers
  const getBeanName = (beanId: string) => {
    const bean = beans.find(b => b.id === beanId);
    return bean ? `[${bean.country}] ${bean.name}` : 'Unknown Bean';
  };

  const getHighestRoast = () => {
    const completed = tastings.filter(t => t.status === 'completed');
    if (completed.length === 0) return null;
    const best = [...completed].sort((a, b) => b.score - a.score)[0];
    const roast = roasts.find(r => r.id === best.roastId);
    const bean = roast ? beans.find(b => b.id === roast.beanId) : null;
    return { score: best.score, rating: best.recommendationRating, roast, bean };
  };

  const bestProfile = getHighestRoast();
  const recentRoasts = [...roasts].sort((a, b) => new Date(b.roastDate).getTime() - new Date(a.roastDate).getTime()).slice(0, 3);
  const recentBeans = [...beans].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 2);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Welcome header */}
      <header className="border-b border-[#232326] bg-[#0E0E10] px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-wide">Coffee Lab</h1>
          <p className="text-xs text-[#8E8E93]">
            {new Date().toLocaleDateString('ja-JP', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Bell className="w-5 h-5 text-[#8E8E93] hover:text-[#F4F4F6] transition-colors" />
      </header>

      {/* Content wrapper */}
      <div className="flex-1 p-6 space-y-6 max-w-4xl mx-auto w-full pb-24">
        
        {/* Section 1: TO DO TODAY (Notification Center) */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93] flex items-center gap-1.5">
            今日やること
          </h2>

          {tastingsDue.length === 0 ? (
            <div className="flex items-center gap-3 p-5 rounded-xl border border-emerald-900/20 bg-emerald-950/10">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-[#F4F4F6]">本日のタスクはすべて完了しています</h3>
                <p className="text-xs text-[#8E8E93] mt-0.5">評価待ちの焙煎バッチはありません。素晴らしい焙煎ライフを！</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {tastingsDue.map(item => (
                <div 
                  key={`${item.roast.id}-d${item.day}`}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-amber-900/20 bg-amber-950/10 gap-3 transition-all hover:bg-amber-950/15"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-[#F4F4F6]">
                        {item.roast.id} Day {item.day} 評価期日（エイジング {item.aging}日）
                      </h4>
                      <p className="text-xs text-[#8E8E93] mt-0.5">
                        {item.bean ? `[${item.bean.country}] ${item.bean.name}` : '生豆不明'} (焙煎: {item.roast.roastDate})
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/roasts/${item.roast.id}/tasting/${item.day}`}
                    className="flex items-center justify-center gap-1 w-full sm:w-auto py-1.5 px-4 rounded-lg bg-[#D09B6A] hover:bg-[#B37B4D] text-[#0B0B0C] font-semibold text-xs transition-all active:scale-95 shrink-0 cursor-pointer"
                  >
                    テイスト評価を入力 ➔
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick action grid */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/roasts/new"
            className="flex flex-col items-center justify-center p-5 rounded-xl border border-[#232326] bg-[#131315] hover:bg-[#1C1C1F] hover:border-[#3A3A40] transition-all group text-center gap-2"
          >
            <div className="w-10 h-10 rounded-full bg-[#D09B6A]/10 text-[#D09B6A] flex items-center justify-center transition-colors group-hover:bg-[#D09B6A] group-hover:text-[#0B0B0C]">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-[#F4F4F6]">新規焙煎バッチ登録</span>
            <span className="text-[10px] text-[#8E8E93]">操作設定とフェーズ記録</span>
          </Link>

          <Link
            href="/beans"
            className="flex flex-col items-center justify-center p-5 rounded-xl border border-[#232326] bg-[#131315] hover:bg-[#1C1C1F] hover:border-[#3A3A40] transition-all group text-center gap-2"
          >
            <div className="w-10 h-10 rounded-full bg-[#D09B6A]/10 text-[#D09B6A] flex items-center justify-center transition-colors group-hover:bg-[#D09B6A] group-hover:text-[#0B0B0C]">
              <Coffee className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-[#F4F4F6]">生豆を追加</span>
            <span className="text-[10px] text-[#8E8E93]">在庫量と生産情報</span>
          </Link>
        </div>

        {/* Home Screen Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Recent Roasts */}
          <div className="bg-[#131315] p-5 rounded-xl border border-[#232326] space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93] flex items-center justify-between">
              <span>最近の焙煎バッチ</span>
              <Link href="/roasts" className="text-[10px] text-[#D09B6A] hover:underline flex items-center">
                すべて ➔
              </Link>
            </h3>

            <div className="space-y-2.5">
              {recentRoasts.length === 0 ? (
                <p className="text-xs text-[#8E8E93] italic py-4">焙煎記録がありません</p>
              ) : (
                recentRoasts.map(roast => (
                  <Link
                    key={roast.id}
                    href={`/roasts/${roast.id}`}
                    className="flex justify-between items-center p-3 bg-[#1A1A1E] border border-[#232326] rounded-lg hover:bg-[#1E1E22] transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#D09B6A]">{roast.id}</span>
                        <span className="text-[9px] text-[#8E8E93]">{roast.roastDate}</span>
                      </div>
                      <h4 className="text-xs font-bold text-[#E4E4E7] mt-1 line-clamp-1">
                        {getBeanName(roast.beanId)}
                      </h4>
                    </div>
                    <ChevronBadge status={roast.status} />
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Best Profile summary */}
          <div className="bg-[#131315] p-5 rounded-xl border border-[#232326] space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93] flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#D09B6A]" />
              ベストプロファイル（過去最高スコア）
            </h3>

            {bestProfile && bestProfile.roast ? (
              <Link
                href={`/roasts/${bestProfile.roast.id}`}
                className="block p-4 bg-gradient-to-br from-[#1E1E22] to-[#131315] border border-[#232326] hover:border-[#D09B6A] rounded-xl transition-all space-y-3 group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-base font-bold text-[#D09B6A]">{bestProfile.roast.id}</span>
                    <span className="text-[10px] text-[#8E8E93] block mt-0.5">焙煎: {bestProfile.roast.roastDate}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-[#D09B6A] font-mono">{bestProfile.score}点</span>
                    <div className="flex text-[#D09B6A] justify-end mt-0.5">
                      {Array.from({ length: bestProfile.rating }).map((_, i) => (
                        <Star key={i} className="w-2.5 h-2.5 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-[#F4F4F6] line-clamp-1 group-hover:text-[#D09B6A] transition-colors">
                    {bestProfile.bean ? bestProfile.bean.name : 'Unknown'}
                  </h4>
                  <p className="text-[10px] text-[#8E8E93]">
                    精製: {bestProfile.bean?.process} / Dev: {bestProfile.roast.developmentRatio}% / 減少: {bestProfile.roast.lossRatio}%
                  </p>
                </div>
              </Link>
            ) : (
              <div className="border border-dashed border-[#232326] p-8 text-center text-xs text-[#8E8E93] rounded-xl">
                最高点テイストデータがまだありません。
                <br />テイスト評価を入力すると表示されます。
              </div>
            )}
          </div>

          {/* Recently Added Beans */}
          <div className="bg-[#131315] p-5 rounded-xl border border-[#232326] space-y-4 md:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93] flex items-center justify-between">
              <span>最近追加した生豆・残量</span>
              <Link href="/beans" className="text-[10px] text-[#D09B6A] hover:underline flex items-center">
                すべて ➔
              </Link>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentBeans.length === 0 ? (
                <p className="text-xs text-[#8E8E93] italic py-4 col-span-2 text-center">登録された生豆がありません</p>
              ) : (
                recentBeans.map(bean => {
                  const ratio = bean.currentWeight / bean.initialWeight;
                  return (
                    <Link
                      key={bean.id}
                      href="/beans"
                      className="p-3.5 bg-[#1A1A1E] border border-[#232326] rounded-xl hover:bg-[#1E1E22] transition-colors flex flex-col justify-between gap-2"
                    >
                      <div>
                        <span className="text-[9px] bg-[#232326] text-[#8E8E93] px-1.5 py-0.5 rounded font-mono">
                          {bean.id}
                        </span>
                        <h4 className="text-xs font-bold text-[#E4E4E7] mt-1.5 line-clamp-1">{bean.name}</h4>
                        <span className="text-[9px] text-[#8E8E93]">{bean.country} - {bean.process}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-mono text-[#8E8E93]">
                          <span>残り在庫</span>
                          <span>{bean.currentWeight}g / {bean.initialWeight}g</span>
                        </div>
                        <div className="w-full h-1 bg-[#232326] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#D09B6A] transition-all"
                            style={{ width: `${ratio * 100}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

function ChevronBadge({ status }: { status: string }) {
  return (
    <span className={clsx(
      "text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded font-semibold",
      status === 'completed' ? "bg-emerald-950/40 text-emerald-400" :
      status.includes('waiting') ? "bg-amber-950/40 text-[#D09B6A]" :
      "bg-[#232326] text-[#8E8E93]"
    )}>
      {status.replace('waiting_', 'w_')}
    </span>
  );
}
