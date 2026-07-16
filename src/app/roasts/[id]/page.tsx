'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, FileText, Plus, RefreshCw, Star, Trash2 } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import CoachInsightCard from '@/components/CoachInsightCard';
import SyncStatus from '@/components/SyncStatus';
import BatchBalance from '@/components/BatchBalance';
import RoastTape from '@/components/RoastTape';
import ConfirmDialog from '@/components/ConfirmDialog';
import { getInsightsForRoast, getLiveRoastCoachInsight } from '@/lib/coach';
import { DBService, getAgingDays, getRoastBatchBalance, secondsToTime, timeToSeconds } from '@/lib/db';
import { formatDate } from '@/lib/date';
import { Bean, Roast, RoastStep, Tasting } from '@/types';

export default function RoastDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);
  const [roast, setRoast] = useState<Roast | null>(null);
  const [bean, setBean] = useState<Bean | null>(null);
  const [steps, setSteps] = useState<RoastStep[]>([]);
  const [tastings, setTastings] = useState<Tasting[]>([]);
  const [allBeans, setAllBeans] = useState<Bean[]>([]);
  const [allRoasts, setAllRoasts] = useState<Roast[]>([]);
  const [allTastings, setAllTastings] = useState<Tasting[]>([]);
  const [syncMessage, setSyncMessage] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'roast' } | { type: 'tasting'; tasting: Tasting } | { type: 'step'; step: RoastStep } | null>(null);

  const load = useCallback(() => {
    const currentRoast = DBService.getRoastById(id);
    if (!currentRoast) {
      router.push('/roasts');
      return;
    }
    setRoast(currentRoast);
    setBean(DBService.getBeanById(currentRoast.beanId) || null);
    setSteps(DBService.getRoastSteps(id));
    setTastings(DBService.getTastingsForRoast(id));
    setAllBeans(DBService.getBeans());
    setAllRoasts(DBService.getRoasts());
    setAllTastings(DBService.getTastings());
  }, [id, router]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const syncFromCloud = async () => {
    setSyncMessage('同期中');
    const result = await DBService.syncFromCloud();
    load();
    setSyncMessage(result.ok ? '同期済み' : result.error || 'Google Sheetsとの同期に失敗しました。');
  };

  const updateRoastDate = (value: string) => {
    if (!roast) return;
    const next = { ...roast, roastDate: value, updatedAt: new Date().toISOString() };
    DBService.saveRoast(next, steps, true);
    setRoast(next);
    setSyncMessage('焙煎日をローカル保存しました。Google Sheetsはバックグラウンドで同期します。');
  };

  const handleDelete = () => {
    if (!roast) return;
    setDeleteTarget({ type: 'roast' });
  };

  const deleteTasting = (tasting: Tasting) => {
    setDeleteTarget({ type: 'tasting', tasting });
  };

  const deleteStep = (step: RoastStep) => {
    if (!roast || step.time === '00:00') return;
    setDeleteTarget({ type: 'step', step });
  };

  const confirmDelete = () => {
    if (!roast || !deleteTarget) return;
    if (deleteTarget.type === 'roast') {
      DBService.deleteRoast(id, false);
      void DBService.deleteRoastFromCloud(id);
      router.push('/roasts');
      return;
    }
    if (deleteTarget.type === 'tasting') {
      DBService.deleteTasting(deleteTarget.tasting.id, false);
      void DBService.deleteTastingFromCloud(deleteTarget.tasting.id);
      setDeleteTarget(null);
      load();
      return;
    }
    const next = steps.filter(item => item.id !== deleteTarget.step.id);
    setSteps(next);
    DBService.saveRoast(roast, next, true);
    setSyncMessage('タイムラインを更新しました。Google Sheetsはバックグラウンドで同期します。');
    setDeleteTarget(null);
  };

  const chartData = useMemo(() => steps.map(step => ({
    secs: timeToSeconds(step.time),
    time: step.time,
    heat: step.heat,
    air: step.air,
    memo: step.memo || '',
  })), [steps]);

  if (!roast) return null;

  const devText = roast.developmentTime && roast.developmentRatio !== null
    ? `${roast.developmentTime} / ${roast.developmentRatio}%`
    : '不明';
  const accent = bean?.themeColor || '#D9A066';
  const coachInsight = getInsightsForRoast({ beans: allBeans, roasts: allRoasts, tastings: allTastings }, id)[0]
    || getLiveRoastCoachInsight(roast, allRoasts);

  return (
    <div className="lab-shell flex min-h-screen flex-col">
      <header className="sticky top-0 z-[var(--z-sticky)] flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--background)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/roasts" className="tap-button rounded-xl p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-lg font-bold tracking-wide md:text-xl">
              <span>焙煎 {roast.id}</span>
              <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 font-mono text-xs font-normal" style={{ color: accent }}>焙煎から{getAgingDays(roast.roastDate)}日目</span>
            </h1>
            <p className="truncate text-xs text-slate-400">{bean ? `[${bean.country}] ${bean.name}` : '生豆不明'} / {formatDate(roast.roastDate)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={syncFromCloud} className="tap-button rounded-xl bg-white/[0.06] p-2 text-slate-300 hover:text-white" aria-label="再同期">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={handleDelete} className="tap-button flex items-center gap-1.5 rounded-xl border border-red-300/20 bg-red-400/10 px-3.5 py-2.5 text-xs font-semibold text-red-200">
            <Trash2 className="h-3.5 w-3.5" />
            削除
          </button>
        </div>
      </header>

      {syncMessage && <div className="border-b border-white/10 bg-white/[0.025] px-4 py-2 md:px-6"><SyncStatus message={syncMessage} tone={syncMessage.includes('失敗') ? 'error' : 'success'} compact /></div>}

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 pb-28 md:p-6">
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[.72fr_1.28fr]">
          <Panel title="重量">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="投入" value={`${roast.greenWeight}g`} />
              <Metric label="焙煎後" value={`${roast.roastedWeight}g`} />
            </div>
            <div className="mt-4 flex justify-between border-t border-white/10 pt-3 font-mono text-sm">
              <span className="text-slate-500">Loss</span>
              <strong>{roast.lossRatio}%</strong>
            </div>
          </Panel>

          <Panel title="Crack / Drop">
            <div className="grid grid-cols-3 gap-2">
              <Metric label="1st" value={roast.firstCrackTime || '不明'} />
              <Metric label="2nd" value={roast.secondCrackTime || '不明'} />
              <Metric label="Drop" value={roast.dropTime || '不明'} />
            </div>
            <div className="mt-4 flex justify-between border-t border-white/10 pt-3 font-mono text-sm">
              <span className="text-slate-500">Dev</span>
              <strong style={{ color: accent }}>{devText}</strong>
            </div>
          </Panel>
        </section>

        <section aria-label="焙煎から味見までの記録">
          <RoastTape roast={roast} steps={steps} tastings={tastings} bean={bean} />
        </section>

        <section aria-label="記録から導いた比較メモ"><CoachInsightCard insight={{ ...coachInsight, actionHref: undefined, actionLabel: undefined }} featured /></section>

        {(!roast.firstCrackTime || roast.firstCrackStatus === 'not_detected' || roast.firstCrackStatus === 'unknown') && (
          <section className="rounded-xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">
            <strong>1st Crackが未記録です。</strong>
            <p className="mt-1 leading-relaxed">Dev%は不明として扱います。次回は音だけでなく、香り・煙・色の変化もタイムラインに残すと比較しやすくなります。</p>
          </section>
        )}

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CollapsiblePanel title="焙煎プロファイル">
            <div className="h-72">
              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="secs" type="number" domain={[0, 'dataMax + 30']} tickFormatter={value => secondsToTime(Number(value))} stroke="#94A3B8" fontSize={10} />
                    <YAxis domain={[0, 8]} ticks={[0, 2, 4, 6, 8]} stroke="#94A3B8" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#243149', color: '#F4F4F6' }} labelFormatter={value => secondsToTime(Number(value))} />
                    <Line type="monotone" dataKey="heat" name="火力" stroke="#FF8A3D" strokeWidth={2.5} />
                    <Line type="monotone" dataKey="air" name="風量" stroke="#00DFFF" strokeWidth={2.5} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <Empty text="プロファイル記録がまだ少ないです" />}
            </div>
          </CollapsiblePanel>

          <CollapsiblePanel title="タイムライン">
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {steps.length === 0 ? <Empty text="タイムライン未登録" /> : steps.map(step => (
                <div key={step.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-xs">
                  <span className="w-11 shrink-0 font-mono font-bold" style={{ color: accent }}>{step.time}</span>
                  <span className="rounded bg-orange-400/10 px-1.5 py-0.5 font-mono font-bold text-orange-200">H{step.heat}</span>
                  <span className="rounded bg-cyan-300/10 px-1.5 py-0.5 font-mono font-bold text-cyan-100">A{step.air}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-400">{step.memo}</span>
                  {step.time !== '00:00' && (
                    <button type="button" onClick={() => deleteStep(step)} className="tap-button rounded p-1 text-slate-400 hover:text-red-300" aria-label="イベント削除">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </CollapsiblePanel>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {roast.notes && (
            <Panel title="メモ">
              <div className="flex gap-2 text-sm text-slate-200">
                <FileText className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accent }} />
                <p className="whitespace-pre-wrap break-words leading-relaxed">{roast.notes}</p>
              </div>
            </Panel>
          )}
          <CollapsiblePanel title="記録の設定">
            <label className="block space-y-1">
              <span className="text-xs text-slate-500">焙煎日</span>
              <input type="date" value={roast.roastDate} onChange={event => updateRoastDate(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#101827] px-3 py-2 text-sm" />
            </label>
          </CollapsiblePanel>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-300">味見の記録</h2>
            <Link href={`/roasts/${id}/tasting/new`} className="btn-primary tap-button inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              追加
            </Link>
          </div>
          <BatchBalance roast={roast} tastings={tastings} bean={bean} />
          {tastings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
              <p className="text-sm text-slate-400">まだ味見の記録がありません。必要な日に、ここから追加できます。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {tastings.map((tasting, tastingIndex) => {
                const balanceAfter = getRoastBatchBalance(roast, tastings.slice(0, tastingIndex + 1), bean);
                return (
                <div key={tasting.id} className="lab-card-soft rounded-2xl p-5" style={{ borderColor: `${tasting.impressionColor}44` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-slate-500">#{tasting.tastingIndex} / Day {tasting.dayAfterRoast}</span>
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Calendar className="h-3.5 w-3.5" />{formatDate(tasting.tastingDate)}</p>
                    </div>
                    <span className="h-8 w-8 rounded-full border border-white/10" style={{ backgroundColor: tasting.impressionColor }} />
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <strong className="font-mono text-3xl" style={{ color: tasting.impressionColor }}>{tasting.score}</strong>
                    <span className="text-xs text-slate-500">{tasting.doseGramsRecorded === false ? '使用量未入力' : `使用 ${tasting.doseGrams}g`}</span>
                  </div>
                  <div className="mt-3 flex" style={{ color: tasting.impressionColor }}>{Array.from({ length: tasting.recommendationRating }).map((_, index) => <Star key={index} className="h-3 w-3 fill-current" />)}</div>
                  {tasting.flavors.length > 0 && <p className="mt-3 line-clamp-2 text-xs text-slate-300">{tasting.flavors.join(', ')}</p>}
                  {tasting.notes && <p className="mt-2 line-clamp-2 text-xs text-slate-500">{tasting.notes}</p>}
                  <p className="mt-3 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted-foreground)]">この記録後の予想残量 <strong className="font-mono text-[var(--foreground)]">{balanceAfter.remainingGrams.toFixed(1)}g</strong></p>
                  <div className="mt-4 flex gap-2">
                    <Link href={`/roasts/${id}/tasting/${tasting.dayAfterRoast}`} className="tap-button flex-1 rounded-lg border border-cyan-300/20 bg-cyan-300/10 py-2 text-center text-xs font-semibold text-cyan-100">編集</Link>
                    <button type="button" onClick={() => deleteTasting(tasting)} className="tap-button rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-red-200" aria-label={`テイスティング #${tasting.tastingIndex} を削除`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} title={deleteTarget?.type === 'roast' ? '焙煎記録を削除しますか？' : deleteTarget?.type === 'tasting' ? 'テイスティング記録を削除しますか？' : 'タイムラインイベントを削除しますか？'} description={deleteTarget?.type === 'roast' ? `${roast.id} と紐付く${tastings.length}件のテイスティングを削除します。` : deleteTarget?.type === 'tasting' ? `#${deleteTarget.tasting.tastingIndex} の味見記録を削除します。` : `${deleteTarget?.type === 'step' ? deleteTarget.step.time : ''} のイベントを削除します。`} consequence={deleteTarget?.type === 'roast' ? '関連する味見とタイムラインも削除され、復元できません。' : '削除後に残量とコーチの仮説が再計算されます。この操作は復元できません。'} />
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="lab-card-soft rounded-2xl p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-300">
        <Clock className="h-3.5 w-3.5 text-[var(--accent)]" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function CollapsiblePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="lab-card-soft rounded-2xl p-5">
      <summary className="tap-button cursor-pointer text-sm font-semibold text-slate-300">{title}</summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-white/[0.05] p-3 text-center">
      <span className="block text-xs text-slate-400">{label}</span>
      <strong className="block truncate font-mono text-lg">{value}</strong>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex h-full min-h-32 items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-slate-500">{text}</div>;
}
