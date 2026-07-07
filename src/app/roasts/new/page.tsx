'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Clock, Flame, Play, RotateCcw, Save, Square, Timer, Trash2, Wind } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bean, Roast, RoastStep } from '@/types';
import { calculateDevRatio, calculateDevTime, calculateLossRatio, DBService, secondsToTime, timeToSeconds } from '@/lib/db';

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

  const [beans, setBeans] = useState<Bean[]>(() => DBService.getBeans());
  const [pastRoasts, setPastRoasts] = useState<Roast[]>(() => DBService.getRoasts());
  const [tabMode, setTabMode] = useState<TabMode>('live');
  const [syncStatus, setSyncStatus] = useState('ローカル準備完了');
  const [syncError, setSyncError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [roastId] = useState(() => DBService.generateNextRoastId());
  const [beanId, setBeanId] = useState(() => preselectedBeanId || DBService.getBeans()[0]?.id || '');
  const [roastDate, setRoastDate] = useState(new Date().toISOString().split('T')[0]);
  const [greenWeightInput, setGreenWeightInput] = useState('200');
  const [notes, setNotes] = useState('');

  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [liveHeat, setLiveHeat] = useState(7);
  const [liveAir, setLiveAir] = useState(2);
  const [firstCrackTime, setFirstCrackTime] = useState('');
  const [secondCrackTime, setSecondCrackTime] = useState('');
  const [dropTime, setDropTime] = useState('');
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  const [newTime, setNewTime] = useState('02:00');
  const [newHeat, setNewHeat] = useState(7);
  const [newAir, setNewAir] = useState(2);
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
  const lossRatio = calculateLossRatio(greenWeight, predictedRoastedWeight);
  const devTime = calculateDevTime(firstCrackTime, dropTime);
  const devRatio = calculateDevRatio(firstCrackTime, dropTime);
  const isOverStock = !!selectedBean && greenWeight > selectedBean.currentWeight;
  const currentTime = secondsToTime(elapsedSecs);

  const loadLocalData = useCallback(() => {
    const allBeans = DBService.getBeans();
    setBeans(allBeans);
    setPastRoasts(DBService.getRoasts());
    setBeanId(current => {
      if (current && allBeans.some(bean => bean.id === current)) return current;
      if (preselectedBeanId && allBeans.some(bean => bean.id === preselectedBeanId)) return preselectedBeanId;
      return allBeans[0]?.id ?? '';
    });
  }, [preselectedBeanId]);

  useEffect(() => {
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
    return () => window.clearInterval(timer);
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

    return {
      id: roastId,
      beanId,
      roastDate,
      greenWeight,
      roastedWeight: predictedRoastedWeight,
      yellowTime: '',
      firstCrackTime: draftFirstCrackTime,
      dropTime: draftDropTime,
      developmentTime: calculateDevTime(draftFirstCrackTime, draftDropTime),
      developmentRatio: calculateDevRatio(draftFirstCrackTime, draftDropTime),
      lossRatio: calculateLossRatio(greenWeight, predictedRoastedWeight),
      status: 'waiting_day7',
      notes: [notes, draftSecondCrackTime ? `2nd Crack: ${draftSecondCrackTime}` : ''].filter(Boolean).join('\n'),
      createdAt: new Date().toISOString(),
    };
  }, [beanId, dropTime, firstCrackTime, greenWeight, notes, predictedRoastedWeight, roastDate, roastId, secondCrackTime]);

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
    setLiveHeat(7);
    setLiveAir(2);
    setFirstCrackTime('');
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
    const time = currentTime;
    if (field === 'firstCrackTime') {
      setFirstCrackTime(time);
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
    if (field === 'firstCrackTime') draftOverrides.firstCrackTime = time;
    if (field === 'secondCrackTime') draftOverrides.secondCrackTime = time;
    if (field === 'dropTime') draftOverrides.dropTime = time;

    upsertTimeline({ time, heat: liveHeat, air: liveAir, memo: label }, draftOverrides);
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
    if (isOverStock && !confirm(`投入量 ${greenWeight}g が在庫 ${selectedBean!.currentWeight}g を超えています。保存しますか？`)) return;

    const finalRoast = buildDraftRoast();
    const finalSteps: RoastStep[] = timeline.map((step, index) => ({ ...step, id: `step_${roastId}_${index}`, roastId }));
    setIsSaving(true);
    setSyncError('');
    DBService.saveRoast(finalRoast, finalSteps, false);
    const result = await DBService.saveRoastToCloud(finalRoast, finalSteps);
    const updatedBean = DBService.getBeanById(beanId);
    const beanResult = updatedBean ? await DBService.saveBeanToCloud(updatedBean) : { ok: true };
    setIsSaving(false);

    if (result.ok && beanResult.ok) {
      setSyncStatus('Google Sheetsへ保存済み');
      router.push(`/roasts/${roastId}`);
      return;
    }

    setSyncStatus('保存失敗（ローカルには保持）');
    setSyncError(result.error || beanResult.error || 'Googleスプレッドシートへの保存に失敗しました。通信環境を確認してください。');
  };

  const retryPendingSync = async () => {
    setSyncStatus('未同期データを再送中');
    const result = await DBService.retryPendingSync();
    if (result.ok) {
      setSyncStatus('未同期データを再送しました');
      setSyncError('');
    } else {
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

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-[#F4F4F6]" style={{ backgroundImage: PHASE_STYLE[phase] }}>
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#232326] bg-[#0E0E10]/95 px-4 py-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/roasts" className="rounded-lg p-2 text-[#8E8E93] hover:bg-[#232326] hover:text-[#F4F4F6]">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold md:text-xl">Live Roast</h1>
            <p className="text-xs text-[#8E8E93]">{roastId} / {syncStatus}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {DBService.getPendingSyncCount() > 0 && (
            <button onClick={retryPendingSync} className="hidden rounded-xl border border-[#D09B6A]/40 px-3 py-2 text-xs font-bold text-[#D09B6A] md:block">
              未同期を再送
            </button>
          )}
        <button onClick={saveRoast} disabled={isSaving} className="flex items-center gap-2 rounded-xl bg-[#D09B6A] px-4 py-2 text-sm font-bold text-[#0B0B0C] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60">
          <Save className="h-4 w-4" />
          {isSaving ? '保存中' : '保存'}
        </button>
        </div>
      </header>

      {syncError && (
        <div className="border-b border-[#7F1D1D] bg-[#450A0A] px-4 py-3 text-sm text-red-100 md:px-6">
          {syncError}
        </div>
      )}

      <div className="sticky top-[73px] z-10 grid grid-cols-2 border-b border-[#232326] bg-[#0E0E10]/95 backdrop-blur">
        <button onClick={() => setTabMode('live')} className={`flex items-center justify-center gap-2 py-3 text-sm font-semibold ${tabMode === 'live' ? 'border-b-2 border-[#D09B6A] text-[#D09B6A]' : 'text-[#8E8E93]'}`}>
          <Timer className="h-4 w-4" /> Live
        </button>
        <button onClick={() => setTabMode('manual')} className={`flex items-center justify-center gap-2 py-3 text-sm font-semibold ${tabMode === 'manual' ? 'border-b-2 border-[#D09B6A] text-[#D09B6A]' : 'text-[#8E8E93]'}`}>
          <Clock className="h-4 w-4" /> 手入力
        </button>
      </div>

      {tabMode === 'live' ? (
        <main className="grid gap-5 p-4 lg:grid-cols-[360px_1fr_360px] lg:p-6">
          <section className="space-y-4">
            <Panel title="バッチ設定">
              <label className="space-y-1 block">
                <span className="text-xs text-[#8E8E93]">使用する生豆</span>
                <select value={beanId} onChange={event => setBeanId(event.target.value)} className="w-full rounded-xl border border-[#232326] bg-[#1A1A1E] px-3 py-3 text-sm">
                  {beans.map(bean => <option key={bean.id} value={bean.id}>[{bean.id}] {bean.country} - {bean.name}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 block">
                  <span className="text-xs text-[#8E8E93]">焙煎日</span>
                  <input type="date" value={roastDate} onChange={event => setRoastDate(event.target.value)} className="w-full rounded-xl border border-[#232326] bg-[#1A1A1E] px-3 py-3 text-sm" />
                </label>
                <label className="space-y-1 block">
                  <span className="text-xs text-[#8E8E93]">投入量(g)</span>
                  <input type="number" inputMode="decimal" value={greenWeightInput} onChange={event => setGreenWeightInput(event.target.value)} className={`w-full rounded-xl border bg-[#1A1A1E] px-3 py-3 font-mono text-sm ${isOverStock ? 'border-[#EF4444]' : 'border-[#232326]'}`} />
                </label>
              </div>
              {selectedBean && (
                <div className="rounded-xl border border-[#232326] bg-[#1A1A1E] p-3 text-xs text-[#A1A1AA]">
                  <div className="flex justify-between"><span>在庫</span><strong className="font-mono text-[#F4F4F6]">{selectedBean.currentWeight}g</strong></div>
                  <div className="flex justify-between"><span>減耗率</span><strong className="font-mono text-[#D09B6A]">{selectedBean.weightLossPercentage}%</strong></div>
                  <div className="mt-2 flex justify-between border-t border-[#232326] pt-2"><span>予想焙煎後重量</span><strong className="font-mono text-lg text-[#F4F4F6]">{predictedRoastedWeight}g</strong></div>
                </div>
              )}
              {isOverStock && <p className="flex items-center gap-1 text-xs text-[#EF4444]"><AlertTriangle className="h-3 w-3" />在庫を超えています</p>}
            </Panel>

            <Panel title="タイマー">
              <div className="rounded-2xl bg-[#050506] p-6 text-center shadow-inner">
                <div className="timer-display font-mono text-6xl font-black tracking-normal text-[#F4F4F6] md:text-7xl">{currentTime}</div>
                <p className="mt-2 text-xs text-[#8E8E93]">START前でも火力・風量を事前設定できます</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={isRunning ? pauseRoast : startRoast} className="flex items-center justify-center gap-2 rounded-xl bg-[#D09B6A] py-3 font-bold text-[#0B0B0C] active:scale-95">
                  {isRunning ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isRunning ? 'PAUSE' : 'START'}
                </button>
                <button onClick={resetRoast} className="flex items-center justify-center gap-2 rounded-xl bg-[#1C1C1F] py-3 font-bold text-[#E4E4E7] active:scale-95">
                  <RotateCcw className="h-4 w-4" /> RESET
                </button>
                <button onClick={saveRoast} className="flex items-center justify-center gap-2 rounded-xl bg-[#1C1C1F] py-3 font-bold text-[#E4E4E7] active:scale-95">
                  <Save className="h-4 w-4" /> SAVE
                </button>
              </div>
            </Panel>
          </section>

          <section className="space-y-4">
            <Panel title="火力・風量">
              <NumberControl icon={<Flame className="h-4 w-4" />} label="火力" value={liveHeat} onChange={changeHeat} color="orange" />
              <NumberControl icon={<Wind className="h-4 w-4" />} label="風量" value={liveAir} onChange={changeAir} color="blue" />
            </Panel>

            <div className="grid grid-cols-3 gap-3">
              <MilestoneButton label="1st Crack" time={firstCrackTime} onClick={() => recordMilestone('1st Crack', 'firstCrackTime')} disabled={!hasStarted} color="orange" />
              <MilestoneButton label="2nd Crack" time={secondCrackTime} onClick={() => recordMilestone('2nd Crack', 'secondCrackTime')} disabled={!hasStarted} color="red" />
              <MilestoneButton label="Drop" time={dropTime} onClick={() => recordMilestone('Drop', 'dropTime')} disabled={!hasStarted} color="stone" />
            </div>

            <Panel title="プロファイル">
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
            </Panel>
          </section>

          <section className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Loss" value={`${lossRatio}%`} />
              <Stat label="Dev" value={devTime} />
              <Stat label="Dev%" value={`${devRatio}%`} />
            </div>

            <Panel title="タイムライン">
              <div className="max-h-[440px] space-y-2 overflow-y-auto pr-1">
                {timeline.map(step => (
                  <TimelineRow key={step.time} step={step} onDelete={() => removeStep(step.time)} />
                ))}
                {timeline.length === 0 && <div className="rounded-xl border border-dashed border-[#232326] p-8 text-center text-sm text-[#8E8E93]">STARTで0:00が記録されます</div>}
              </div>
            </Panel>

            <Panel title="メモ / ゴースト">
              <textarea value={notes} onChange={event => setNotes(event.target.value)} rows={3} placeholder="香り、排気、火の入り方など" className="w-full resize-none rounded-xl border border-[#232326] bg-[#1A1A1E] px-3 py-2 text-sm" />
              <select value={ghostRoastId} onChange={event => copyGhostProfile(event.target.value)} className="w-full rounded-xl border border-[#232326] bg-[#1A1A1E] px-3 py-3 text-sm">
                <option value="">過去プロファイルを重ねない</option>
                {pastRoasts.map(roast => <option key={roast.id} value={roast.id}>{roast.id} ({roast.roastDate})</option>)}
              </select>
            </Panel>
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
            <div className="rounded-xl border border-[#232326] bg-[#1A1A1E] p-4">
              <div className="flex justify-between text-sm"><span className="text-[#8E8E93]">予想焙煎後重量</span><strong className="font-mono text-[#F4F4F6]">{predictedRoastedWeight}g</strong></div>
            </div>
          </Panel>
        </main>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-[#232326] bg-[#131315]/85 p-4 shadow-lg shadow-black/20">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">{title}</h2>
      {children}
    </section>
  );
}

function NumberControl({ icon, label, value, onChange, color }: { icon: React.ReactNode; label: string; value: number; onChange: (value: number) => void; color: 'orange' | 'blue' }) {
  const activeClass = color === 'orange' ? 'bg-orange-500 text-white border-orange-300 shadow-orange-500/25' : 'bg-blue-500 text-white border-blue-300 shadow-blue-500/25';
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-bold text-[#E4E4E7]">{icon}{label}<span className="font-mono text-[#8E8E93]">{value}</span></div>
      <div className="grid grid-cols-8 gap-1.5">
        {CONTROL_VALUES.map(item => (
          <button key={item} type="button" onClick={() => onChange(item)} className={`aspect-square min-h-11 rounded-lg border text-sm font-bold transition active:scale-95 ${item === value ? activeClass : 'border-[#232326] bg-[#1A1A1E] text-[#A1A1AA] hover:bg-[#232326]'}`}>{item}</button>
        ))}
      </div>
    </div>
  );
}

function MilestoneButton({ label, time, onClick, disabled, color }: { label: string; time: string; onClick: () => void; disabled: boolean; color: 'orange' | 'red' | 'stone' }) {
  const colorClass = color === 'orange' ? 'bg-orange-500/15 text-orange-300 border-orange-500/30' : color === 'red' ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'bg-stone-300/10 text-stone-200 border-stone-300/30';
  return (
    <button disabled={disabled} onClick={onClick} className={`rounded-2xl border p-4 text-center transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${colorClass}`}>
      <span className="block text-sm font-bold">{label}</span>
      <span className="mt-1 block font-mono text-xs opacity-80">{time || '--:--'}</span>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#232326] bg-[#131315] p-3 text-center">
      <span className="block text-[10px] uppercase tracking-wider text-[#8E8E93]">{label}</span>
      <strong className="font-mono text-lg text-[#D09B6A]">{value}</strong>
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





