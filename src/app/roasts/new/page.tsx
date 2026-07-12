'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Clock, Flame, Play, RotateCcw, Save, Square, Timer, Trash2, Wind } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bean, Roast, RoastStep } from '@/types';
import CoachInsightCard from '@/components/CoachInsightCard';
import SyncStatus from '@/components/SyncStatus';
import { getLiveRoastCoachInsight } from '@/lib/coach';
import { calculateDevRatio, calculateDevTime, calculateLossRatio, DBService, secondsToTime, timeToSeconds } from '@/lib/db';
import { todayDateString } from '@/lib/date';

type TabMode = 'live' | 'manual';
type Phase = 'idle' | 'drying' | 'crack' | 'development' | 'drop';
type MilestoneField = 'firstCrackTime' | 'secondCrackTime' | 'dropTime';

type TimelineEntry = {
  time: string;
  heat: number;
  air: number;
  memo: string;
};

type RoastDraftOverrides = {
  firstCrackTime: string;
  firstCrackStatus: Roast['firstCrackStatus'];
  secondCrackTime: string;
  dropTime: string;
};

const CONTROL_VALUES = [1, 2, 3, 4, 5, 6, 7, 8];

const PHASE_STYLE: Record<Phase, string> = {
  idle: 'radial-gradient(ellipse at 50% 20%, rgba(208,155,106,0.08), transparent 45%)',
  drying: 'radial-gradient(ellipse at 50% 20%, rgba(34,197,94,0.12), transparent 50%)',
  crack: 'radial-gradient(ellipse at 50% 20%, rgba(249,115,22,0.18), transparent 50%)',
  development: 'radial-gradient(ellipse at 50% 20%, rgba(239,68,68,0.14), transparent 50%)',
  drop: 'radial-gradient(ellipse at 50% 20%, rgba(208,155,106,0.20), transparent 55%)',
};

function NewRoastContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedBeanId = searchParams.get('beanId');

  const [beans, setBeans] = useState<Bean[]>([]);
  const [pastRoasts, setPastRoasts] = useState<Roast[]>([]);
  const [tabMode, setTabMode] = useState<TabMode>('live');
  const [syncStatus, setSyncStatus] = useState('ローカル準備完了');
  const [syncError, setSyncError] = useState('');
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showFirstCrackChoice, setShowFirstCrackChoice] = useState(false);
  const [estimatedFirstCrack, setEstimatedFirstCrack] = useState('');

  const [roastId, setRoastId] = useState('');
  const [beanId, setBeanId] = useState(preselectedBeanId || '');
  const [roastDate, setRoastDate] = useState(todayDateString());
  const [greenWeightInput, setGreenWeightInput] = useState('67');
  const [notes, setNotes] = useState('');

  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [liveHeat, setLiveHeat] = useState(8);
  const [liveAir, setLiveAir] = useState(8);
  const [firstCrackTime, setFirstCrackTime] = useState('');
  const [firstCrackStatus, setFirstCrackStatus] = useState<Roast['firstCrackStatus']>('unknown');
  const [secondCrackTime, setSecondCrackTime] = useState('');
  const [dropTime, setDropTime] = useState('');
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  const [newTime, setNewTime] = useState('02:00');
  const [newHeat, setNewHeat] = useState(8);
  const [newAir, setNewAir] = useState(8);
  const [newMemo, setNewMemo] = useState('');
  const [ghostRoastId, setGhostRoastId] = useState('');
  const [ghostSteps, setGhostSteps] = useState<TimelineEntry[]>([]);

  const intervalRef = useRef<number | null>(null);
  const latestDraftRef = useRef<Roast | null>(null);
  const latestStepsRef = useRef<TimelineEntry[]>([]);

  const selectedBean = beans.find(bean => bean.id === beanId) ?? null;
  const greenWeight = useMemo(() => {
    const parsed = Number(greenWeightInput);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [greenWeightInput]);

  const predictedRoastedWeight = useMemo(() => {
    const loss = selectedBean?.weightLossPercentage ?? 15;
    return Math.round(greenWeight * (1 - loss / 100) * 10) / 10;
  }, [greenWeight, selectedBean]);
  const currentTime = secondsToTime(elapsedSecs);
  const devTime = firstCrackTime ? calculateDevTime(firstCrackTime, dropTime || currentTime) : null;
  const devRatio = firstCrackTime ? calculateDevRatio(firstCrackTime, dropTime || currentTime) : null;
  const beanAccent = selectedBean?.themeColor || '#00DFFF';

  const loadLocalData = useCallback(() => {
    const allBeans = DBService.getBeans();
    setBeans(allBeans);
    setPastRoasts(DBService.getRoasts());
    setRoastId(current => current || DBService.generateNextRoastId());
    setHasPendingSync(DBService.getPendingSyncCount() > 0);
    setBeanId(current => {
      if (current && allBeans.some(bean => bean.id === current)) return current;
      if (preselectedBeanId && allBeans.some(bean => bean.id === preselectedBeanId)) return preselectedBeanId;
      return allBeans[0]?.id ?? '';
    });
  }, [preselectedBeanId]);

  useEffect(() => {
    const initialTimer = window.setTimeout(loadLocalData, 0);
    DBService.syncFromCloud().then(result => {
      if (result.ok) {
        loadLocalData();
        setSyncError('');
        setSyncStatus('Google Sheetsから同期済み');
      } else if (result.pending) {
        setSyncStatus('未同期の変更があります');
        setSyncError(result.error || 'Googleスプレッドシートへの保存待ちです。');
      } else {
        setSyncStatus('同期エラー');
        setSyncError(result.error || 'Googleスプレッドシートからの読み込みに失敗しました。');
      }
    });
    const timer = window.setInterval(() => {
      if (!isRunning) {
        DBService.syncFromCloud().then(result => {
          if (result.ok) {
            loadLocalData();
            setSyncError('');
          } else if (!result.pending) {
            setSyncError(result.error || 'Googleスプレッドシートからの読み込みに失敗しました。');
          }
        });
      }
    }, 7000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [isRunning, loadLocalData]);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = window.setInterval(() => setElapsedSecs(value => value + 1), 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  useEffect(() => {
    latestStepsRef.current = timeline;
  }, [timeline]);

  const buildDraftRoast = useCallback((overrides: Partial<RoastDraftOverrides> = {}): Roast => {
    const draftFirstCrackTime = overrides.firstCrackTime ?? firstCrackTime;
    const draftSecondCrackTime = overrides.secondCrackTime ?? secondCrackTime;
    const draftDropTime = overrides.dropTime ?? dropTime;
    const draftFirstCrackStatus = overrides.firstCrackStatus ?? firstCrackStatus;

    return {
      id: roastId,
      beanId,
      roastDate,
      greenWeight,
      roastedWeight: predictedRoastedWeight,
      yellowTime: '',
      firstCrackTime: draftFirstCrackTime || null,
      firstCrackStatus: draftFirstCrackStatus,
      secondCrackTime: draftSecondCrackTime || null,
      dropTime: draftDropTime,
      developmentTime: calculateDevTime(draftFirstCrackTime, draftDropTime),
      developmentRatio: calculateDevRatio(draftFirstCrackTime, draftDropTime),
      lossRatio: calculateLossRatio(greenWeight, predictedRoastedWeight),
      status: 'waiting_day7',
      notes,
      createdAt: new Date().toISOString(),
    };
  }, [beanId, dropTime, firstCrackStatus, firstCrackTime, greenWeight, notes, predictedRoastedWeight, roastDate, roastId, secondCrackTime]);

  const queueBackgroundSync = useCallback((steps: TimelineEntry[], draftOverrides: Partial<RoastDraftOverrides> = {}) => {
    void steps;
    void draftOverrides;
    if (!beanId) return;
    latestDraftRef.current = buildDraftRoast(draftOverrides);
    setSyncStatus('下書き記録中（正式保存まで在庫は変わりません）');
  }, [beanId, buildDraftRoast]);

  const upsertTimeline = useCallback((entry: TimelineEntry, draftOverrides: Partial<RoastDraftOverrides> = {}) => {
    setTimeline(previous => {
      const existingIndex = previous.findIndex(item => item.time === entry.time);
      const next = existingIndex >= 0 ? [...previous] : [...previous, entry];
      if (existingIndex >= 0) next[existingIndex] = entry;
      next.sort((a, b) => timeToSeconds(a.time) - timeToSeconds(b.time));
      latestStepsRef.current = next;
      queueBackgroundSync(next, draftOverrides);
      return next;
    });
  }, [queueBackgroundSync]);

  const startRoast = () => {
    if (!beanId) {
      alert('使用する生豆を選択してください。');
      return;
    }
    if (!hasStarted) {
      const chargeEntry = { time: '00:00', heat: liveHeat, air: liveAir, memo: 'Charge' };
      setTimeline([chargeEntry]);
      latestStepsRef.current = [chargeEntry];
      queueBackgroundSync([chargeEntry]);
      setHasStarted(true);
      setPhase('drying');
    }
    setIsRunning(true);
  };

  const pauseRoast = () => setIsRunning(false);

  const resetRoast = () => {
    setIsRunning(false);
    setHasStarted(false);
    setElapsedSecs(0);
    setPhase('idle');
    setLiveHeat(8);
    setLiveAir(8);
    setFirstCrackTime('');
    setFirstCrackStatus('unknown');
    setSecondCrackTime('');
    setDropTime('');
    setTimeline([]);
    latestStepsRef.current = [];
    setSyncStatus('リセットしました');
  };

  const changeHeat = (value: number) => {
    setLiveHeat(value);
    if (hasStarted) upsertTimeline({ time: currentTime, heat: value, air: liveAir, memo: `Heat ${value}` });
  };

  const changeAir = (value: number) => {
    setLiveAir(value);
    if (hasStarted) upsertTimeline({ time: currentTime, heat: liveHeat, air: value, memo: `Air ${value}` });
  };

  const recordMilestone = (label: string, field: MilestoneField) => {
    if (!hasStarted) return;
    if (field === 'dropTime' && !firstCrackTime) {
      setEstimatedFirstCrack(secondsToTime(Math.max(0, elapsedSecs - 90)));
      setShowFirstCrackChoice(true);
      return;
    }
    const time = currentTime;
    if (field === 'firstCrackTime') {
      setFirstCrackTime(time);
      setFirstCrackStatus('recorded');
      setPhase('crack');
    }
    if (field === 'secondCrackTime') {
      setSecondCrackTime(time);
      setPhase('development');
    }
    if (field === 'dropTime') {
      setDropTime(time);
      setPhase('drop');
      setIsRunning(false);
    }
    const draftOverrides: Partial<RoastDraftOverrides> = {};
    if (field === 'firstCrackTime') {
      draftOverrides.firstCrackTime = time;
      draftOverrides.firstCrackStatus = 'recorded';
    }
    if (field === 'secondCrackTime') draftOverrides.secondCrackTime = time;
    if (field === 'dropTime') draftOverrides.dropTime = time;

    upsertTimeline({ time, heat: liveHeat, air: liveAir, memo: label }, draftOverrides);
  };

  const completeDropWithoutFirstCrack = (status: 'not_detected' | 'estimated' | 'unknown') => {
    const drop = currentTime;
    const nextFirstCrack = status === 'estimated' ? estimatedFirstCrack : '';
    setFirstCrackTime(nextFirstCrack);
    setFirstCrackStatus(status);
    setDropTime(drop);
    setPhase('drop');
    setIsRunning(false);
    setShowFirstCrackChoice(false);
    const draftOverrides: Partial<RoastDraftOverrides> = { firstCrackTime: nextFirstCrack, firstCrackStatus: status, dropTime: drop };
    upsertTimeline({ time: drop, heat: liveHeat, air: liveAir, memo: status === 'not_detected' ? 'Drop / 1st Crack not detected' : 'Drop' }, draftOverrides);
  };

  const addManualStep = () => {
    if (!newTime.includes(':')) return;
    upsertTimeline({ time: newTime, heat: newHeat, air: newAir, memo: newMemo });
    setNewTime(secondsToTime(timeToSeconds(newTime) + 30));
    setNewMemo('');
  };

  const removeStep = (time: string) => {
    if (time === '00:00') return;
    const next = timeline.filter(step => step.time !== time);
    setTimeline(next);
    latestStepsRef.current = next;
    queueBackgroundSync(next);
  };

  const copyGhostProfile = (id: string) => {
    setGhostRoastId(id);
    if (!id) {
      setGhostSteps([]);
      return;
    }
    setGhostSteps(DBService.getRoastSteps(id).map(step => ({ time: step.time, heat: step.heat, air: step.air, memo: step.memo || '' })));
  };

  const saveRoast = async () => {
    if (!beanId) {
      alert('使用する生豆を選択してください。');
      return;
    }
    const finalRoast = buildDraftRoast();
    const finalSteps: RoastStep[] = timeline.map((step, index) => ({ ...step, id: `step_${roastId}_${index}`, roastId }));
    setIsSaving(true);
    setSyncError('');
    DBService.saveRoast(finalRoast, finalSteps, true);
    setHasPendingSync(true);
    setIsSaving(false);
    setSyncStatus('ローカル保存済み。Google Sheetsはバックグラウンドで同期します');
    router.push(`/roasts/${roastId}`);
  };

  const retryPendingSync = async () => {
    setSyncStatus('未同期データを再送中');
    const result = await DBService.retryPendingSync();
    if (result.ok) {
      setHasPendingSync(false);
      setSyncStatus('未同期データを再送しました');
      setSyncError('');
    } else {
      setHasPendingSync(true);
      setSyncStatus('再送失敗');
      setSyncError(result.error || 'Googleスプレッドシートへの再送に失敗しました。');
    }
  };

  const chartData = useMemo(() => {
    const map = new Map<number, Record<string, number | string>>();
    timeline.forEach(step => map.set(timeToSeconds(step.time), { secs: timeToSeconds(step.time), heat: step.heat, air: step.air, label: step.memo }));
    ghostSteps.forEach(step => {
      const secs = timeToSeconds(step.time);
      map.set(secs, { ...map.get(secs), secs, ghostHeat: step.heat, ghostAir: step.air });
    });
    return Array.from(map.values()).sort((a, b) => Number(a.secs) - Number(b.secs));
  }, [ghostSteps, timeline]);

  const dropCoachInsight = useMemo(() => {
    if (!dropTime) return null;
    return getLiveRoastCoachInsight(buildDraftRoast(), pastRoasts);
  }, [buildDraftRoast, dropTime, pastRoasts]);

  return (
    <div className="lab-shell min-h-screen text-[#F4F4F6]" style={{ backgroundImage: `${PHASE_STYLE[phase]}, radial-gradient(circle at 80% 0%, ${beanAccent}22, transparent 36%)` }}>
      <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-white/10 bg-[#080E14]/95 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/roasts" className="tap-button rounded-lg p-2 text-slate-400 hover:bg-white/[0.06] hover:text-[#F4F4F6]">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold md:text-xl">Live Roast</h1>
            <p className="text-xs text-[#8E8E93]">{roastId} / local-first recording</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden md:block"><SyncStatus message={syncStatus} tone={syncError ? 'error' : hasPendingSync ? 'pending' : 'idle'} onRetry={retryPendingSync} compact /></div>
          <button onClick={saveRoast} disabled={isSaving} className="tap-button flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-[#080E14] disabled:cursor-not-allowed disabled:opacity-60" style={{ backgroundColor: beanAccent }}>
          <Save className="h-4 w-4" />
          {isSaving ? '保存中' : '保存'}
        </button>
        </div>
      </header>

      {syncError && <div className="border-b border-amber-300/15 bg-amber-300/[0.06] px-4 py-2.5 md:px-6"><SyncStatus message={`${syncError} 入力内容はローカルに残っています。`} tone="error" onRetry={retryPendingSync} /></div>}

      <div className="sticky top-[98px] z-10 grid grid-cols-2 border-b border-white/10 bg-[#080E14]/95 backdrop-blur sm:top-[73px]">
        <button onClick={() => setTabMode('live')} className={`tap-button flex items-center justify-center gap-2 py-3 text-sm font-semibold ${tabMode === 'live' ? 'border-b-2 text-cyan-100' : 'text-slate-400'}`} style={{ borderColor: tabMode === 'live' ? beanAccent : undefined }}>
          <Timer className="h-4 w-4" /> Live
        </button>
        <button onClick={() => setTabMode('manual')} className={`tap-button flex items-center justify-center gap-2 py-3 text-sm font-semibold ${tabMode === 'manual' ? 'border-b-2 text-cyan-100' : 'text-slate-400'}`} style={{ borderColor: tabMode === 'manual' ? beanAccent : undefined }}>
          <Clock className="h-4 w-4" /> 手入力
        </button>
      </div>

      {tabMode === 'live' ? (
        <main className={`roast-control-grid gap-4 p-3 sm:p-4 lg:p-6 ${hasStarted ? 'is-active' : ''}`}>
          <section className={`roast-batch-panel space-y-4 ${hasStarted ? 'hidden' : ''}`}>
            <Panel title="バッチ設定">
              <label className="space-y-1 block">
                <span className="text-xs text-[#8E8E93]">使用する生豆</span>
                <select value={beanId} onChange={event => setBeanId(event.target.value)} className="w-full rounded-xl border bg-[#101827] px-3 py-3 text-sm" style={{ borderColor: `${beanAccent}66` }}>
                  {beans.map(bean => <option key={bean.id} value={bean.id}>[{bean.id}] {bean.country} - {bean.name}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1 block">
                  <span className="text-xs text-[#8E8E93]">焙煎日</span>
                  <input type="date" value={roastDate} onChange={event => setRoastDate(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#101827] px-3 py-3 text-sm" />
                </label>
                <label className="space-y-1 block">
                  <span className="text-xs text-[#8E8E93]">投入量(g)</span>
                  <input type="number" inputMode="decimal" value={greenWeightInput} onChange={event => setGreenWeightInput(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#101827] px-3 py-3 font-mono text-sm" />
                </label>
              </div>
              {selectedBean && (
                <div className="rounded-xl border bg-[#101827] p-3 text-xs text-slate-300" style={{ borderColor: `${beanAccent}44` }}>
                  <div className="flex justify-between"><span>想定Loss</span><strong className="font-mono text-[#D09B6A]">{selectedBean.weightLossPercentage}%</strong></div>
                  <div className="mt-2 flex justify-between border-t border-white/10 pt-2"><span>予想焙煎後重量</span><strong className="font-mono text-lg text-[#F4F4F6]">{predictedRoastedWeight}g</strong></div>
                </div>
              )}
            </Panel>

          </section>

          <section className="roast-primary-panel space-y-3">
            <section className="lab-card relative overflow-hidden rounded-3xl p-6 text-center md:p-8" style={{ borderColor: `${beanAccent}40` }}>
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />
              <div className="flex items-center justify-between text-left"><span className="eyebrow text-slate-500">{hasStarted ? 'Roasting in progress' : 'Ready for charge'}</span><span className="status-pill border-white/10 bg-white/[0.05]" style={{ color: beanAccent }}>{isRunning ? 'LIVE' : hasStarted ? 'PAUSED' : 'SETUP'}</span></div>
              <div className="timer-display mt-5 font-mono text-7xl font-black tracking-normal text-white sm:text-8xl lg:text-9xl">{currentTime}</div>
              <p className="mt-3 text-xs text-slate-400">{hasStarted ? `火力 ${liveHeat} / 風量 ${liveAir} · 大きなマイルストーンをタップ` : '豆・投入量・火力・風量を確認して、実験を始めます。'}</p>
              <div className="mx-auto mt-5 grid max-w-xs grid-cols-2 gap-2">
                <Stat label="Dev" value={devTime || '不明'} />
                <Stat label="Dev%" value={devRatio === null ? '不明' : `${devRatio}%`} />
              </div>
              <div className="mx-auto mt-7 grid max-w-md grid-cols-[1.45fr_1fr] gap-3">
                <button onClick={isRunning ? pauseRoast : startRoast} disabled={Boolean(dropTime)} className="tap-button flex min-h-16 items-center justify-center gap-2 rounded-2xl py-3 font-bold text-[#080E14] shadow-lg disabled:opacity-55" style={{ backgroundColor: beanAccent }}>
                  {isRunning ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}{dropTime ? 'COMPLETE' : isRunning ? 'PAUSE' : hasStarted ? 'RESUME' : 'START'}
                </button>
                <button onClick={resetRoast} className="tap-button flex min-h-16 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] py-3 text-sm font-bold text-[#E4E4E7]"><RotateCcw className="h-4 w-4" /> RESET</button>
              </div>
              {dropTime && (
                <button onClick={saveRoast} disabled={isSaving} className="tap-button mt-3 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#E8ECEF] px-4 font-bold text-[#090B0D] disabled:opacity-60">
                  <Save className="h-4 w-4" />{isSaving ? '保存中' : '実験結果を保存'}
                </button>
              )}
            </section>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <MilestoneButton label="1st Crack" time={firstCrackTime} onClick={() => recordMilestone('1st Crack', 'firstCrackTime')} disabled={!hasStarted || Boolean(dropTime)} color="orange" />
              <MilestoneButton label="2nd Crack" time={secondCrackTime} onClick={() => recordMilestone('2nd Crack', 'secondCrackTime')} disabled={!hasStarted || Boolean(dropTime)} color="red" />
              <MilestoneButton label="Drop" time={dropTime} onClick={() => recordMilestone('Drop', 'dropTime')} disabled={!hasStarted || Boolean(dropTime)} color="stone" />
            </div>

            <Panel title="火力・風量">
              <NumberControl icon={<Flame className="h-4 w-4" />} label="火力" value={liveHeat} onChange={changeHeat} color="orange" />
              <NumberControl icon={<Wind className="h-4 w-4" />} label="風量" value={liveAir} onChange={changeAir} color="blue" />
            </Panel>

            <details className="lab-card-soft rounded-2xl p-4">
              <summary className="tap-button cursor-pointer text-xs font-semibold uppercase tracking-wider text-slate-400">プロファイルを表示</summary>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#232326" />
                    <XAxis dataKey="secs" type="number" domain={[0, 'dataMax + 60']} tickFormatter={value => secondsToTime(Number(value))} stroke="#8E8E93" fontSize={10} />
                    <YAxis domain={[0, 8]} ticks={[0, 2, 4, 6, 8]} stroke="#8E8E93" fontSize={10} />
                    <Tooltip contentStyle={{ background: '#131315', borderColor: '#232326', color: '#F4F4F6' }} labelFormatter={value => secondsToTime(Number(value))} />
                    <Line type="monotone" dataKey="heat" name="火力" stroke="#F97316" strokeWidth={2.5} dot={false} connectNulls />
                    <Line type="monotone" dataKey="air" name="風量" stroke="#3B82F6" strokeWidth={2.5} dot={false} connectNulls />
                    <Line type="monotone" dataKey="ghostHeat" name="Ghost Heat" stroke="#F97316" strokeOpacity={0.3} strokeDasharray="5 5" dot={false} connectNulls />
                    <Line type="monotone" dataKey="ghostAir" name="Ghost Air" stroke="#3B82F6" strokeOpacity={0.3} strokeDasharray="5 5" dot={false} connectNulls />
                    {firstCrackTime && <ReferenceLine x={timeToSeconds(firstCrackTime)} stroke="#F97316" strokeDasharray="4 4" label={{ value: '1st', fill: '#F97316', fontSize: 10 }} />}
                    {secondCrackTime && <ReferenceLine x={timeToSeconds(secondCrackTime)} stroke="#EF4444" strokeDasharray="4 4" label={{ value: '2nd', fill: '#EF4444', fontSize: 10 }} />}
                    {dropTime && <ReferenceLine x={timeToSeconds(dropTime)} stroke="#F4F4F6" strokeDasharray="4 4" label={{ value: 'Drop', fill: '#F4F4F6', fontSize: 10 }} />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </details>
          </section>

          <section className="roast-secondary-panel space-y-4">
            {dropCoachInsight && <CoachInsightCard insight={{ ...dropCoachInsight, actionHref: undefined, actionLabel: undefined }} featured />}
            {firstCrackTime && !dropTime && (
              <p className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100">
                1st Crack後のDevは現在時刻ベースでリアルタイム計算中です。
              </p>
            )}

            <details className="lab-card-soft rounded-2xl p-4">
              <summary className="tap-button cursor-pointer text-xs font-semibold uppercase tracking-wider text-slate-400">タイムライン ({timeline.length})</summary>
              <div className="max-h-[440px] space-y-2 overflow-y-auto pr-1">
                {timeline.map(step => (
                  <TimelineRow key={step.time} step={step} onDelete={() => removeStep(step.time)} />
                ))}
                {timeline.length === 0 && <div className="rounded-xl border border-dashed border-[#232326] p-8 text-center text-sm text-[#8E8E93]">STARTで0:00が記録されます</div>}
              </div>
            </details>

            <details className="lab-card-soft rounded-2xl p-4">
              <summary className="tap-button cursor-pointer text-xs font-semibold uppercase tracking-wider text-slate-400">メモ / ゴースト</summary>
              <div className="mt-4 space-y-3">
              <textarea value={notes} onChange={event => setNotes(event.target.value)} rows={3} placeholder="香り、排気、火の入り方など" className="w-full resize-none rounded-xl border border-[#232326] bg-[#1A1A1E] px-3 py-2 text-sm" />
              <select value={ghostRoastId} onChange={event => copyGhostProfile(event.target.value)} className="w-full rounded-xl border border-[#232326] bg-[#1A1A1E] px-3 py-3 text-sm">
                <option value="">過去プロファイルを重ねない</option>
                {pastRoasts.map(roast => <option key={roast.id} value={roast.id}>{roast.id} ({roast.roastDate})</option>)}
              </select>
              </div>
            </details>
          </section>
        </main>
      ) : (
        <main className="grid gap-5 p-4 lg:grid-cols-2 lg:p-6">
          <Panel title="手入力">
            <div className="grid grid-cols-3 gap-3">
              <Field label="時刻" value={newTime} onChange={setNewTime} />
              <SelectNumber label="火力" value={newHeat} onChange={setNewHeat} />
              <SelectNumber label="風量" value={newAir} onChange={setNewAir} />
            </div>
            <div className="flex gap-2">
              <input value={newMemo} onChange={event => setNewMemo(event.target.value)} placeholder="メモ" className="flex-1 rounded-xl border border-[#232326] bg-[#1A1A1E] px-3 py-2 text-sm" />
              <button onClick={addManualStep} className="rounded-xl bg-[#D09B6A] px-4 py-2 font-bold text-[#0B0B0C]">追加</button>
            </div>
            <div className="space-y-2">
              {timeline.map(step => <TimelineRow key={step.time} step={step} onDelete={() => removeStep(step.time)} />)}
            </div>
          </Panel>

          <Panel title="保存内容">
            <div className="grid grid-cols-2 gap-3">
              <Field label="焙煎日" type="date" value={roastDate} onChange={setRoastDate} />
              <Field label="投入量(g)" type="number" value={greenWeightInput} onChange={setGreenWeightInput} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="1st Crack" value={firstCrackTime} onChange={value => { setFirstCrackTime(value); setFirstCrackStatus(value ? 'recorded' : 'unknown'); }} />
              <Field label="2nd Crack" value={secondCrackTime} onChange={setSecondCrackTime} />
              <Field label="Drop" value={dropTime} onChange={setDropTime} />
            </div>
            <div className="rounded-xl border border-[#232326] bg-[#1A1A1E] p-4">
              <div className="flex justify-between text-sm"><span className="text-[#8E8E93]">予想焙煎後重量</span><strong className="font-mono text-[#F4F4F6]">{predictedRoastedWeight}g</strong></div>
            </div>
            <button type="button" onClick={saveRoast} disabled={!beanId || !dropTime || isSaving} className="btn-primary tap-button inline-flex w-full items-center justify-center gap-2 disabled:opacity-40">
              <Save className="h-4 w-4" />手入力記録を保存
            </button>
          </Panel>
        </main>
      )}
      {showFirstCrackChoice && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/70 p-4 sm:items-center sm:justify-center">
          <div className="w-full max-w-md rounded-2xl border border-[#3A2A1E] bg-[#131315] p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-[#F4F4F6]">1st Crackが未記録です</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#A1A1AA]">
              Dev%は0ではなく「不明」として扱えます。聞こえなかった場合は、次回メモに香り・煙・色の変化も残すと比較しやすくなります。
            </p>
            <div className="mt-4 space-y-2">
              <button type="button" onClick={() => completeDropWithoutFirstCrack('not_detected')} className="w-full rounded-xl border border-[#232326] bg-[#1C1C1F] px-4 py-3 text-left text-sm font-semibold active:scale-[0.99]">
                1st Crackは聞こえなかった
              </button>
              <label className="block rounded-xl border border-[#232326] bg-[#1C1C1F] p-3">
                <span className="text-xs text-[#8E8E93]">だいたいの時刻を入力</span>
                <div className="mt-2 flex gap-2">
                  <input value={estimatedFirstCrack} onChange={event => setEstimatedFirstCrack(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-[#232326] bg-[#0B0B0C] px-3 py-2 font-mono text-sm" />
                  <button type="button" onClick={() => completeDropWithoutFirstCrack('estimated')} className="rounded-lg bg-[#D09B6A] px-3 py-2 text-sm font-bold text-[#0B0B0C]">採用</button>
                </div>
              </label>
              <button type="button" onClick={() => completeDropWithoutFirstCrack('unknown')} className="w-full rounded-xl border border-[#232326] bg-[#1C1C1F] px-4 py-3 text-left text-sm font-semibold active:scale-[0.99]">
                このまま不明として保存
              </button>
              <button type="button" onClick={() => setShowFirstCrackChoice(false)} className="w-full rounded-xl px-4 py-3 text-sm text-[#8E8E93]">
                戻る
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="lab-card-soft space-y-4 rounded-2xl p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h2>
      {children}
    </section>
  );
}

function NumberControl({ icon, label, value, onChange, color }: { icon: React.ReactNode; label: string; value: number; onChange: (value: number) => void; color: 'orange' | 'blue' }) {
  const activeClass = color === 'orange' ? 'bg-orange-500 text-white border-orange-300 shadow-orange-500/25' : 'bg-blue-500 text-white border-blue-300 shadow-blue-500/25';
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-bold text-[#E4E4E7]">{icon}{label}<span className="font-mono text-[#8E8E93]">{value}</span></div>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
        {CONTROL_VALUES.map(item => (
          <button key={item} type="button" onClick={() => onChange(item)} className={`tap-button h-11 w-11 shrink-0 rounded-xl border text-sm font-bold ${item === value ? activeClass : 'border-white/10 bg-white/[0.05] text-slate-400 hover:bg-white/[0.08]'}`}>{item}</button>
        ))}
      </div>
    </div>
  );
}

function MilestoneButton({ label, time, onClick, disabled, color }: { label: string; time: string; onClick: () => void; disabled: boolean; color: 'orange' | 'red' | 'stone' }) {
  const colorClass = color === 'orange' ? 'bg-orange-500/15 text-orange-300 border-orange-500/30' : color === 'red' ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'bg-stone-300/10 text-stone-200 border-stone-300/30';
  return (
    <button disabled={disabled} onClick={onClick} className={`tap-button min-h-[4.75rem] rounded-2xl border p-2 text-center disabled:cursor-not-allowed disabled:opacity-40 ${colorClass}`}>
      <span className="block text-xs font-bold sm:text-sm">{label}</span>
      <span className="mt-1 block font-mono text-xs opacity-80">{time || '--:--'}</span>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
      <span className="block text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      <strong className="block truncate font-mono text-lg text-cyan-100">{value}</strong>
    </div>
  );
}

function TimelineRow({ step, onDelete }: { step: TimelineEntry; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#232326] bg-[#1A1A1E] p-2.5 text-xs">
      <div className="flex min-w-0 items-center gap-2">
        <span className="w-11 shrink-0 font-mono font-bold text-[#D09B6A]">{step.time}</span>
        <span className="rounded bg-orange-500/10 px-2 py-1 font-mono font-bold text-orange-300">H{step.heat}</span>
        <span className="rounded bg-blue-500/10 px-2 py-1 font-mono font-bold text-blue-300">A{step.air}</span>
        <span className="truncate text-[#A1A1AA]">{step.memo}</span>
      </div>
      {step.time !== '00:00' && <button onClick={onDelete} className="rounded p-1 text-[#8E8E93] hover:text-[#EF4444]"><Trash2 className="h-3.5 w-3.5" /></button>}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string | number; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="space-y-1 block">
      <span className="text-xs text-[#8E8E93]">{label}</span>
      <input type={type} value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-xl border border-[#232326] bg-[#1A1A1E] px-3 py-2 text-sm" />
    </label>
  );
}

function SelectNumber({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="space-y-1 block">
      <span className="text-xs text-[#8E8E93]">{label}</span>
      <select value={value} onChange={event => onChange(Number(event.target.value))} className="w-full rounded-xl border border-[#232326] bg-[#1A1A1E] px-3 py-2 text-sm">
        {CONTROL_VALUES.map(item => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
  );
}

export default function NewRoastPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-[#8E8E93]">Loading...</div>}>
      <NewRoastContent />
    </Suspense>
  );
}





