'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DBService, getAgingDays } from '@/lib/db';
import { Bean, Roast, Tasting } from '@/types';
import { Search, Flame, Calendar, Star, Columns, CheckSquare, Square, ChevronRight, Filter, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

export default function RoastsPage() {
  const router = useRouter();

  const [roasts, setRoasts] = useState<Roast[]>([]);
  const [beans, setBeans] = useState<Bean[]>([]);
  const [tastings, setTastings] = useState<Tasting[]>([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [beanFilter, setBeanFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');

  // Comparison State
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setRoasts(DBService.getRoasts());
    setBeans(DBService.getBeans());
    setTastings(DBService.getTastings());
  };

  const handleCheckboxToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      if (selectedIds.length >= 3) {
        alert('一度に比較できるのは最大3つまでです。');
        return;
      }
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleCompareSubmit = () => {
    if (selectedIds.length < 2) {
      alert('比較するには少なくとも2つの焙煎記録を選択してください。');
      return;
    }
    router.push(`/roasts/compare?ids=${selectedIds.join(',')}`);
  };

  // Filter & Sort Logic
  const filteredRoasts = roasts.filter(roast => {
    const bean = beans.find(b => b.id === roast.beanId);
    const beanName = bean ? bean.name.toLowerCase() : '';
    const country = bean ? bean.country.toLowerCase() : '';
    const query = searchQuery.toLowerCase();
    
    // Text search
    const matchesSearch = 
      roast.id.toLowerCase().includes(query) ||
      beanName.includes(query) ||
      country.includes(query);

    // Status filter
    const matchesStatus = 
      statusFilter === 'all' || 
      roast.status === statusFilter;

    // Bean filter
    const matchesBean = 
      beanFilter === 'all' || 
      roast.beanId === beanFilter;

    return matchesSearch && matchesStatus && matchesBean;
  });

  // Sorting logic
  const sortedRoasts = [...filteredRoasts].sort((a, b) => {
    if (sortBy === 'date-desc') {
      return new Date(b.roastDate).getTime() - new Date(a.roastDate).getTime();
    }
    if (sortBy === 'date-asc') {
      return new Date(a.roastDate).getTime() - new Date(b.roastDate).getTime();
    }
    if (sortBy === 'dev-desc') {
      return b.developmentRatio - a.developmentRatio;
    }
    if (sortBy === 'loss-desc') {
      return b.lossRatio - a.lossRatio;
    }
    if (sortBy === 'score-desc') {
      // Find highest completed tasting score
      const aMax = Math.max(...tastings.filter(t => t.roastId === a.id && t.status === 'completed').map(t => t.score), 0);
      const bMax = Math.max(...tastings.filter(t => t.roastId === b.id && t.status === 'completed').map(t => t.score), 0);
      return bMax - aMax;
    }
    return 0;
  });

  const getBeanName = (beanId: string) => {
    const bean = beans.find(b => b.id === beanId);
    return bean ? `[${bean.country}] ${bean.name}` : 'Unknown Bean';
  };

  const getRoastTastingStats = (roastId: string) => {
    const roastTastings = tastings.filter(t => t.roastId === roastId && t.status === 'completed');
    if (roastTastings.length === 0) return null;
    
    const maxScore = Math.max(...roastTastings.map(t => t.score));
    const maxRating = Math.max(...roastTastings.map(t => t.recommendationRating));
    return { maxScore, maxRating };
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-[#232326] bg-[#0E0E10] px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-wide">焙煎記録</h1>
          <p className="text-xs text-[#8E8E93]">すべての焙煎履歴、タイムラインおよびプロファイル</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setCompareMode(!compareMode);
              setSelectedIds([]);
            }}
            className={clsx(
              "flex items-center gap-1.5 py-2 px-4 rounded-lg font-semibold text-sm transition-all border border-[#232326] cursor-pointer",
              compareMode ? "bg-[#1E1E22] text-[#D09B6A] border-[#D09B6A]" : "bg-[#131315] hover:bg-[#1C1C1F] text-[#E4E4E7]"
            )}
          >
            <Columns className="w-4 h-4" />
            比較モード {compareMode ? 'ON' : 'OFF'}
          </button>
          
          <Link
            href="/roasts/new"
            className="flex items-center gap-1.5 py-2 px-4 rounded-lg bg-[#D09B6A] hover:bg-[#B37B4D] text-[#0B0B0C] font-semibold text-sm transition-all active:scale-95 cursor-pointer"
          >
            <Flame className="w-4 h-4" />
            新規焙煎登録
          </Link>
        </div>
      </header>

      {/* Floating comparison trigger bar */}
      {compareMode && selectedIds.length > 0 && (
        <div className="bg-[#1C1C1F] border-b border-[#D09B6A] px-6 py-3 flex items-center justify-between z-10 sticky top-0">
          <span className="text-sm font-semibold text-[#E4E4E7]">
            {selectedIds.length} 個の焙煎を選択中（最大3つ）
          </span>
          <button
            onClick={handleCompareSubmit}
            disabled={selectedIds.length < 2}
            className={clsx(
              "py-1.5 px-4 rounded font-bold text-xs transition-colors cursor-pointer",
              selectedIds.length >= 2 
                ? "bg-[#D09B6A] text-[#0B0B0C] hover:bg-[#B37B4D]" 
                : "bg-[#232326] text-[#8E8E93] cursor-not-allowed"
            )}
          >
            プロファイル比較を実行 ➔
          </button>
        </div>
      )}

      {/* Filter panel */}
      <div className="bg-[#131315]/50 border-b border-[#232326] p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#8E8E93]" />
          <input
            type="text"
            placeholder="ID、豆名、生産国で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#131315] border border-[#232326] rounded-lg text-sm text-[#F4F4F6] placeholder-[#8E8E93]"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap gap-3.5 w-full md:w-auto items-center justify-end">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#8E8E93]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#131315] border border-[#232326] rounded-lg px-2.5 py-1.5 text-xs text-[#E4E4E7]"
            >
              <option value="all">すべてのステータス</option>
              <option value="waiting_day7">Waiting Day 7</option>
              <option value="waiting_day10">Waiting Day 10</option>
              <option value="waiting_day14">Waiting Day 14</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <select
            value={beanFilter}
            onChange={(e) => setBeanFilter(e.target.value)}
            className="bg-[#131315] border border-[#232326] rounded-lg px-2.5 py-1.5 text-xs text-[#E4E4E7] max-w-[150px] md:max-w-xs"
          >
            <option value="all">すべての使用生豆</option>
            {beans.map(b => (
              <option key={b.id} value={b.id}>[{b.id}] {b.name}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#131315] border border-[#232326] rounded-lg px-2.5 py-1.5 text-xs text-[#E4E4E7]"
          >
            <option value="date-desc">焙煎日：新しい順</option>
            <option value="date-asc">焙煎日：古い順</option>
            <option value="score-desc">テイスト最高評価順</option>
            <option value="dev-desc">Dev比率：高い順</option>
            <option value="loss-desc">重量減少率：高い順</option>
          </select>
        </div>
      </div>

      {/* Roast lists */}
      <div className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto w-full">
        {sortedRoasts.length === 0 ? (
          <div className="py-20 text-center text-[#8E8E93] text-sm">
            該当する焙煎記録が見つかりません
          </div>
        ) : (
          <div className="space-y-4">
            {sortedRoasts.map((roast) => {
              const aging = getAgingDays(roast.roastDate);
              const stats = getRoastTastingStats(roast.id);
              const isSelected = selectedIds.includes(roast.id);

              return (
                <div
                  key={roast.id}
                  onClick={() => {
                    if (compareMode) {
                      handleCheckboxToggle(roast.id);
                    } else {
                      router.push(`/roasts/${roast.id}`);
                    }
                  }}
                  className={clsx(
                    "flex flex-col sm:flex-row items-stretch border rounded-xl overflow-hidden bg-[#131315] hover:border-[#3A3A40] transition-all cursor-pointer relative",
                    isSelected ? "border-[#D09B6A]" : "border-[#232326]"
                  )}
                >
                  {/* Selection overlay indicator for comparison mode */}
                  {compareMode && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheckboxToggle(roast.id);
                      }}
                      className="absolute top-4 left-4 z-10"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-[#D09B6A] bg-[#0B0B0C] rounded" />
                      ) : (
                        <Square className="w-5 h-5 text-[#8E8E93] hover:text-[#F4F4F6] bg-[#0B0B0C] rounded" />
                      )}
                    </div>
                  )}

                  {/* Batch Id Block */}
                  <div className={clsx(
                    "sm:w-36 flex flex-col justify-center items-center py-4 px-3 border-b sm:border-b-0 sm:border-r border-[#232326] gap-1",
                    compareMode ? "pl-12 sm:pl-3" : ""
                  )}>
                    <span className="font-mono text-lg font-bold text-[#D09B6A]">{roast.id}</span>
                    <span className="text-[10px] bg-[#1E1E22] text-[#8E8E93] px-2 py-0.5 rounded-full font-mono">
                      エイジング {aging}日
                    </span>
                  </div>

                  {/* Primary Info */}
                  <div className="flex-1 p-5 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-[#8E8E93]" />
                        <span className="text-xs text-[#8E8E93] font-mono">{roast.roastDate}</span>
                      </div>
                      <h3 className="font-bold text-sm text-[#F4F4F6] line-clamp-1">
                        {getBeanName(roast.beanId)}
                      </h3>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs font-mono text-[#A1A1AA]">
                      <div className="bg-[#1C1C1F] p-2 rounded">
                        <span className="text-[9px] text-[#8E8E93] block">投入 ➔ 焙煎後</span>
                        <span className="font-bold text-[#F4F4F6]">{roast.greenWeight}g ➔ {roast.roastedWeight}g</span>
                      </div>
                      <div className="bg-[#1C1C1F] p-2 rounded">
                        <span className="text-[9px] text-[#8E8E93] block">減少率 (Loss)</span>
                        <span className="font-bold text-[#F4F4F6]">{roast.lossRatio}%</span>
                      </div>
                      <div className="bg-[#1C1C1F] p-2 rounded">
                        <span className="text-[9px] text-[#8E8E93] block">Dev比率 (Ratio)</span>
                        <span className="font-bold text-[#D09B6A]">{roast.developmentRatio}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Status, score and actions block */}
                  <div className="sm:w-44 flex flex-col justify-center border-t sm:border-t-0 sm:border-l border-[#232326] p-4 gap-3 bg-[#0E0E10]/20">
                    <div className="flex justify-between items-center sm:flex-col sm:items-start gap-1">
                      <span className="text-[10px] uppercase text-[#8E8E93]">ステータス</span>
                      <span className={clsx(
                        "text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono tracking-wider",
                        roast.status === 'completed' ? "bg-emerald-950/40 text-emerald-400" :
                        roast.status.includes('waiting') ? "bg-amber-950/40 text-[#D09B6A]" :
                        "bg-[#1C1C1F] text-[#8E8E93]"
                      )}>
                        {roast.status.replace('_', ' ')}
                      </span>
                    </div>

                    {stats ? (
                      <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1">
                        <span className="text-[10px] uppercase text-[#8E8E93]">最高評価</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-extrabold text-[#D09B6A] font-mono">{stats.maxScore}点</span>
                          <div className="flex text-[#D09B6A]">
                            {Array.from({ length: stats.maxRating }).map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-current" />
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1">
                        <span className="text-[10px] uppercase text-[#8E8E93]">最高評価</span>
                        <span className="text-xs text-[#8E8E93] italic">未テイスティング</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Chevron Right (ignored in comparison mode) */}
                  {!compareMode && (
                    <div className="hidden sm:flex items-center justify-center w-12 border-l border-[#232326] hover:bg-[#1E1E22]">
                      <ChevronRight className="w-5 h-5 text-[#8E8E93]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
