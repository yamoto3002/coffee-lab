'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, ChevronRight, Columns, Flame, Search, Star } from 'lucide-react';
import { DBService, getAgingDays } from '@/lib/db';
import { Bean, Roast, Tasting } from '@/types';

export default function RoastsPage() {
  const [roasts, setRoasts] = useState<Roast[]>([]);
  const [beans, setBeans] = useState<Bean[]>([]);
  const [tastings, setTastings] = useState<Tasting[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [beanFilter, setBeanFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setRoasts(DBService.getRoasts());
    setBeans(DBService.getBeans());
    setTastings(DBService.getTastings());
  }, []);

  const sortedRoasts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = roasts.filter(roast => {
      const bean = beans.find(item => item.id === roast.beanId);
      const text = [roast.id, roast.roastDate, bean?.name, bean?.country].join(' ').toLowerCase();
      return (!query || text.includes(query))
        && (statusFilter === 'all' || roast.status === statusFilter)
        && (beanFilter === 'all' || roast.beanId === beanFilter);
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'date-asc') return new Date(a.roastDate).getTime() - new Date(b.roastDate).getTime();
      if (sortBy === 'dev-desc') return b.developmentRatio - a.developmentRatio;
      if (sortBy === 'loss-desc') return b.lossRatio - a.lossRatio;
      if (sortBy === 'score-desc') return maxScore(b.id) - maxScore(a.id);
      return new Date(b.roastDate).getTime() - new Date(a.roastDate).getTime();
    });
  }, [roasts, beans, searchQuery, statusFilter, beanFilter, sortBy, tastings]);

  const maxScore = (roastId: string) => Math.max(...tastings.filter(tasting => tasting.roastId === roastId && tasting.status === 'completed').map(tasting => tasting.score), 0);
  const maxRating = (roastId: string) => Math.max(...tastings.filter(tasting => tasting.roastId === roastId && tasting.status === 'completed').map(tasting => tasting.recommendationRating), 0);
  const beanName = (beanId: string) => {
    const bean = beans.find(item => item.id === beanId);
    return bean ? `[${bean.country}] ${bean.name}` : 'Unknown Bean';
  };

  const toggleCompare = (id: string) => {
    setSelectedIds(current => {
      if (current.includes(id)) return current.filter(item => item !== id);
      if (current.length >= 3) {
        alert('比較できる焙煎は最大3件です。');
        return current;
      }
      return [...current, id];
    });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-col gap-4 border-b border-[#232326] bg-[#0E0E10] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-wide">焙煎記録</h1>
          <p className="text-xs text-[#8E8E93]">すべての焙煎ログ、タイムライン、テイスティング状況</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setCompareMode(value => !value); setSelectedIds([]); }} className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold ${compareMode ? 'border-[#D09B6A] bg-[#D09B6A]/10 text-[#D09B6A]' : 'border-[#232326] bg-[#131315] text-[#E4E4E7]'}`}>
            <Columns className="h-4 w-4" />
            比較
          </button>
          <Link href="/roasts/new" className="flex items-center gap-1.5 rounded-lg bg-[#D09B6A] px-4 py-2 text-sm font-semibold text-[#0B0B0C]">
            <Flame className="h-4 w-4" />
            新規焙煎
          </Link>
        </div>
      </header>

      {compareMode && selectedIds.length > 0 && (
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#D09B6A] bg-[#1C1C1F] px-6 py-3">
          <span className="text-sm font-semibold text-[#E4E4E7]">{selectedIds.length}件を選択中</span>
          <Link href={`/roasts/compare?ids=${selectedIds.join(',')}`} className={`rounded px-4 py-1.5 text-xs font-bold ${selectedIds.length >= 2 ? 'bg-[#D09B6A] text-[#0B0B0C]' : 'pointer-events-none bg-[#232326] text-[#8E8E93]'}`}>
            比較する
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-4 border-b border-[#232326] bg-[#131315]/50 p-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[#8E8E93]" />
          <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="ID、生豆名、国で検索" className="w-full rounded-lg border border-[#232326] bg-[#131315] py-2 pl-9 pr-4 text-sm text-[#F4F4F6]" />
        </div>
        <div className="flex flex-wrap gap-3">
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="rounded-lg border border-[#232326] bg-[#131315] px-3 py-2 text-xs text-[#E4E4E7]">
            <option value="all">すべてのステータス</option>
            <option value="waiting_day7">Waiting Day 7</option>
            <option value="waiting_day10">Waiting Day 10</option>
            <option value="waiting_day14">Waiting Day 14</option>
            <option value="completed">Completed</option>
          </select>
          <select value={beanFilter} onChange={event => setBeanFilter(event.target.value)} className="max-w-[180px] rounded-lg border border-[#232326] bg-[#131315] px-3 py-2 text-xs text-[#E4E4E7]">
            <option value="all">すべての生豆</option>
            {beans.map(bean => <option key={bean.id} value={bean.id}>[{bean.id}] {bean.name}</option>)}
          </select>
          <select value={sortBy} onChange={event => setSortBy(event.target.value)} className="rounded-lg border border-[#232326] bg-[#131315] px-3 py-2 text-xs text-[#E4E4E7]">
            <option value="date-desc">焙煎日: 新しい順</option>
            <option value="date-asc">焙煎日: 古い順</option>
            <option value="score-desc">評価順</option>
            <option value="dev-desc">Dev高い順</option>
            <option value="loss-desc">Loss高い順</option>
          </select>
        </div>
      </div>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-4 p-6 pb-24">
        {sortedRoasts.length === 0 ? (
          <div className="py-20 text-center text-sm text-[#8E8E93]">焙煎記録がありません。</div>
        ) : (
          sortedRoasts.map(roast => {
            const score = maxScore(roast.id);
            const rating = maxRating(roast.id);
            const selected = selectedIds.includes(roast.id);
            return (
              <div key={roast.id} className={`relative overflow-hidden rounded-xl border bg-[#131315] transition hover:border-[#3A3A40] ${selected ? 'border-[#D09B6A]' : 'border-[#232326]'}`}>
                {compareMode && (
                  <button onClick={() => toggleCompare(roast.id)} className="absolute left-4 top-4 z-10 rounded bg-[#0B0B0C] px-2 py-1 text-xs font-bold text-[#D09B6A]">
                    {selected ? '選択中' : '選択'}
                  </button>
                )}
                <Link href={compareMode ? '#' : `/roasts/${roast.id}`} onClick={event => { if (compareMode) { event.preventDefault(); toggleCompare(roast.id); } }} className="grid gap-0 sm:grid-cols-[150px_1fr_170px_48px]">
                  <div className={`flex flex-col items-center justify-center border-b border-[#232326] px-4 py-5 sm:border-b-0 sm:border-r ${compareMode ? 'pt-12 sm:pt-5' : ''}`}>
                    <span className="font-mono text-lg font-bold text-[#D09B6A]">{roast.id}</span>
                    <span className="mt-1 rounded-full bg-[#1E1E22] px-2 py-0.5 font-mono text-[10px] text-[#8E8E93]">{getAgingDays(roast.roastDate)}日経過</span>
                  </div>
                  <div className="space-y-3 p-5">
                    <div>
                      <div className="mb-1 flex items-center gap-2 text-xs text-[#8E8E93]">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="font-mono">{roast.roastDate}</span>
                      </div>
                      <h2 className="font-bold text-[#F4F4F6]">{beanName(roast.beanId)}</h2>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono text-[#A1A1AA]">
                      <Mini label="投入 / 焙煎後" value={`${roast.greenWeight}g / ${roast.roastedWeight}g`} />
                      <Mini label="Loss" value={`${roast.lossRatio}%`} />
                      <Mini label="Dev" value={`${roast.developmentRatio}%`} accent />
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#232326] p-4 sm:flex-col sm:items-start sm:justify-center sm:border-l sm:border-t-0">
                    <span className="rounded bg-[#1C1C1F] px-2 py-0.5 font-mono text-[10px] uppercase text-[#D09B6A]">{roast.status.replace('_', ' ')}</span>
                    {score > 0 ? (
                      <div className="text-right sm:text-left">
                        <span className="block font-mono text-sm font-bold text-[#D09B6A]">{score}点</span>
                        <div className="mt-1 flex text-[#D09B6A]">{Array.from({ length: rating }).map((_, index) => <Star key={index} className="h-3 w-3 fill-current" />)}</div>
                      </div>
                    ) : <span className="text-xs text-[#8E8E93]">未評価</span>}
                  </div>
                  <div className="hidden items-center justify-center border-l border-[#232326] sm:flex">
                    <ChevronRight className="h-5 w-5 text-[#8E8E93]" />
                  </div>
                </Link>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}

function Mini({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded bg-[#1C1C1F] p-2">
      <span className="block text-[9px] text-[#8E8E93]">{label}</span>
      <span className={`font-bold ${accent ? 'text-[#D09B6A]' : 'text-[#F4F4F6]'}`}>{value}</span>
    </div>
  );
}
