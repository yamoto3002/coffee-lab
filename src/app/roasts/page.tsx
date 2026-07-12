'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, ChevronRight, Flame, RefreshCw, Search, Star, Trash2 } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import SyncStatus from '@/components/SyncStatus';
import { DBService, getAgingDays } from '@/lib/db';
import { formatDate } from '@/lib/date';
import { Bean, Roast, Tasting } from '@/types';

type SortMode = 'id-desc' | 'id-asc';
type TastingFilter = 'all' | 'tasted';

export default function RoastsPage() {
  const [roasts, setRoasts] = useState<Roast[]>([]);
  const [beans, setBeans] = useState<Bean[]>([]);
  const [tastings, setTastings] = useState<Tasting[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tastingFilter, setTastingFilter] = useState<TastingFilter>('all');
  const [beanFilter, setBeanFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortMode>('id-desc');
  const [syncMessage, setSyncMessage] = useState('ローカル準備完了');

  const loadLocal = useCallback(() => {
    setRoasts(DBService.getRoasts());
    setBeans(DBService.getBeans());
    setTastings(DBService.getTastings());
  }, []);

  const syncFromCloud = useCallback(async () => {
    setSyncMessage('同期中');
    const result = await DBService.syncFromCloud();
    loadLocal();
    setSyncMessage(result.ok ? `同期済み ${new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}` : result.error || 'Google Sheetsとの同期に失敗しました。');
  }, [loadLocal]);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      loadLocal();
      void syncFromCloud();
    }, 0);
    const timer = window.setInterval(() => void syncFromCloud(), 60000);
    window.addEventListener('online', syncFromCloud);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
      window.removeEventListener('online', syncFromCloud);
    };
  }, [loadLocal, syncFromCloud]);

  const maxScore = (roastId: string) => Math.max(...tastings.filter(tasting => tasting.roastId === roastId && tasting.status === 'completed').map(tasting => tasting.score), 0);
  const maxRating = (roastId: string) => Math.max(...tastings.filter(tasting => tasting.roastId === roastId && tasting.status === 'completed').map(tasting => tasting.recommendationRating), 0);
  const isTasted = (roastId: string) => tastings.some(tasting => tasting.roastId === roastId && tasting.status === 'completed');
  const beanFor = (beanId: string) => beans.find(item => item.id === beanId);

  const sortedRoasts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = roasts.filter(roast => {
      const bean = beans.find(item => item.id === roast.beanId);
      const tasted = tastings.some(tasting => tasting.roastId === roast.id && tasting.status === 'completed');
      const text = [roast.id, roast.roastDate, bean?.name, bean?.country].join(' ').toLowerCase();
      return (!query || text.includes(query))
        && (tastingFilter === 'all' || tasted)
        && (beanFilter === 'all' || roast.beanId === beanFilter);
    });

    return [...filtered].sort((a, b) => sortBy === 'id-asc' ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id));
  }, [roasts, beans, searchQuery, tastingFilter, beanFilter, sortBy, tastings]);

  const deleteRoast = (roast: Roast) => {
    if (!confirm(`焙煎記録 ${roast.id} を削除しますか？紐づくテイスティングも削除されます。`)) return;
    DBService.deleteRoast(roast.id, false);
    loadLocal();
    setSyncMessage('ローカルで削除しました。Google Sheetsへ同期中です。');
    void DBService.deleteRoastFromCloud(roast.id).then(result => {
      setSyncMessage(result.ok ? 'Google Sheetsから削除済み' : result.error || 'Google Sheetsとの同期に失敗しました。バックグラウンドで再試行します。');
    });
  };

  return (
    <div className="lab-shell flex min-h-screen flex-col">
      <header className="flex flex-col gap-4 border-b border-white/10 bg-[#080E14]/95 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div>
          <h1 className="text-xl font-bold tracking-wide">焙煎記録</h1>
          <p className="text-xs text-slate-400">ID順で追えるシンプルな焙煎ログ</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SyncStatus message={syncMessage} tone={syncMessage.includes('失敗') ? 'error' : syncMessage.includes('同期中') ? 'syncing' : 'idle'} compact />
          <button onClick={syncFromCloud} className="tap-button rounded-xl bg-white/[0.06] p-2 text-slate-300 hover:text-white" aria-label="再同期">
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link href="/roasts/new" className="tap-button flex items-center gap-1.5 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-bold text-[#080E14]">
            <Flame className="h-4 w-4" />
            新規焙煎
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-3 border-b border-white/10 bg-white/[0.025] p-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="ID、生豆名、国で検索" className="w-full rounded-xl border border-white/10 bg-[#101827] py-2 pl-9 pr-4 text-sm text-[#F4F4F6]" />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:flex md:flex-wrap">
          <select value={tastingFilter} onChange={event => setTastingFilter(event.target.value as TastingFilter)} className="rounded-xl border border-white/10 bg-[#101827] px-3 py-2 text-xs text-slate-200">
            <option value="all">すべて</option>
            <option value="tasted">tasting済み</option>
          </select>
          <select value={beanFilter} onChange={event => setBeanFilter(event.target.value)} className="rounded-xl border border-white/10 bg-[#101827] px-3 py-2 text-xs text-slate-200 md:max-w-[220px]">
            <option value="all">すべての生豆</option>
            {beans.map(bean => <option key={bean.id} value={bean.id}>[{bean.id}] {bean.name}</option>)}
          </select>
          <select value={sortBy} onChange={event => setSortBy(event.target.value as SortMode)} className="rounded-xl border border-white/10 bg-[#101827] px-3 py-2 text-xs text-slate-200">
            <option value="id-desc">ID降順 R0005 → R0001</option>
            <option value="id-asc">ID昇順 R0001 → R0005</option>
          </select>
        </div>
      </div>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-4 p-4 pb-24 md:p-6">
        {sortedRoasts.length === 0 ? (
          <EmptyState title="まだ焙煎記録がありません" message="最初の実験を保存すると、ここにプロファイル・テイスティング・比較の流れが育ちます。" actionLabel="Live Roastを開始" actionHref="/roasts/new" />
        ) : (
          sortedRoasts.map(roast => {
            const bean = beanFor(roast.beanId);
            const score = maxScore(roast.id);
            const rating = maxRating(roast.id);
            const tasted = isTasted(roast.id);
            const color = bean?.themeColor || '#00DFFF';
            return (
              <div key={roast.id} className="tap-button lab-card relative overflow-hidden rounded-xl" style={{ borderColor: `${color}33` }}>
                <button type="button" onClick={() => deleteRoast(roast)} className="absolute right-3 top-3 z-10 rounded-lg bg-[#080E14]/80 p-2 text-slate-400 transition hover:text-red-300 active:scale-90" aria-label="焙煎記録を削除">
                  <Trash2 className="h-4 w-4" />
                </button>
                <Link href={`/roasts/${roast.id}`} className="grid gap-0 sm:grid-cols-[140px_1fr_170px_44px]">
                  <div className="flex flex-row items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:flex-col sm:justify-center sm:border-b-0 sm:border-r sm:py-5">
                    <div className="text-left sm:text-center">
                      <span className="font-mono text-xl font-bold" style={{ color }}>{roast.id}</span>
                      <span className="mt-1 block rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-slate-400">{getAgingDays(roast.roastDate)}日目</span>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${tasted ? 'bg-emerald-400/10 text-emerald-200' : 'bg-white/[0.06] text-slate-400'}`}>
                      {tasted ? 'tasting済み' : '未tasting'}
                    </span>
                  </div>
                  <div className="space-y-3 p-4 pr-12 sm:p-5">
                    <div>
                      <div className="mb-1 flex items-center gap-2 text-xs text-slate-400">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="font-mono">{formatDate(roast.roastDate)}</span>
                      </div>
                      <h2 className="break-words font-bold text-[#F4F4F6]">{bean ? `[${bean.country}] ${bean.name}` : 'Unknown Bean'}</h2>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono text-slate-300 sm:grid-cols-4">
                      <Mini label="1st" value={roast.firstCrackTime || '不明'} accent />
                      <Mini label="2nd" value={roast.secondCrackTime || '不明'} />
                      <Mini label="Drop" value={roast.dropTime || '不明'} accent />
                      <div className="hidden sm:block"><Mini label="Dev" value={roast.developmentRatio === null ? '不明' : `${roast.developmentRatio}%`} /></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 p-4 sm:flex-col sm:items-start sm:justify-center sm:border-l sm:border-t-0">
                    {score > 0 ? (
                      <div className="text-left">
                        <span className="block font-mono text-lg font-bold" style={{ color }}>{score}</span>
                        <div className="mt-1 flex" style={{ color }}>{Array.from({ length: rating }).map((_, index) => <Star key={index} className="h-3 w-3 fill-current" />)}</div>
                      </div>
                    ) : <span className="text-xs text-slate-500">スコアなし</span>}
                  </div>
                  <div className="hidden items-center justify-center border-l border-white/10 sm:flex">
                    <ChevronRight className="h-5 w-5 text-slate-500" />
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
    <div className="min-w-0 rounded-lg bg-white/[0.05] p-2">
      <span className="block text-[10px] text-slate-500">{label}</span>
      <span className={`block truncate font-bold ${accent ? 'text-cyan-100' : 'text-[#F4F4F6]'}`}>{value}</span>
    </div>
  );
}
