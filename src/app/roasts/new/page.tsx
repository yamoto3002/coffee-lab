'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DBService, timeToSeconds, secondsToTime, calculateDevTime, calculateDevRatio, calculateLossRatio } from '@/lib/db';
import { Bean, Roast, RoastStep } from '@/types';
import {
  Flame, Clock, Plus, Trash2, ArrowLeft, Save, AlertTriangle,
  Play, Square, RotateCcw, Zap, ChevronUp, ChevronDown, Coffee, Timer
} from 'lucide-react';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabMode = 'form' | 'live';
type RoastPhase = 'idle' | 'green' | 'yellow' | 'crack' | 'drop';

interface TimelineEntry {
  time: string;
  heat: number;
  air: number;
  memo: string;
}

// ─── Phase gradient mapping ───────────────────────────────────────────────────

const PHASE_GRADIENTS: Record<RoastPhase, string> = {
  idle:   'radial-gradient(ellipse at center, rgba(10,10,12,0) 0%, transparent 70%)',
  green:  'radial-gradient(ellipse at 50% 30%, rgba(20,45,15,0.45) 0%, transparent 65%)',
  yellow: 'radial-gradient(ellipse at 50% 30%, rgba(70,55,5,0.50) 0%, transparent 65%)',
  crack:  'radial-gradient(ellipse at 50% 30%, rgba(90,45,5,0.55) 0%, transparent 65%)',
  drop:   'radial-gradient(ellipse at 50% 30%, rgba(55,22,5,0.60) 0%, transparent 65%)',
};

const PHASE_LABELS: Record<RoastPhase, string> = {
  idle:   '焙煎前',
  green:  '🟢 ドライングフェーズ',
  yellow: '🟡 Yellowポイント通過',
  crack:  '🔥 1st Crack!',
  drop:   '⬇️ ドロップ完了',
};

// ─── Sub-component: HeatAirControl ───────────────────────────────────────────

function HeatAirControl({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  const dec = () => onChange(Math.max(1, value - 1));
  const inc = () => onChange(Math.min(8, value + 1));

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>
        {label}
      </span>
      <button
        type="button"
        onClick={inc}
        className="btn-roast-control w-16 h-16 rounded-2xl border-2 active:scale-90"
        style={{ borderColor: color, color, background: `${color}18` }}
        aria-label={`${label}を上げる`}
      >
        <ChevronUp className="w-7 h-7" />
      </button>
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-extrabold font-mono timer-display"
        style={{ background: `${color}22`, color, border: `2px solid ${color}55` }}
      >
        {value}
      </div>
      <button
        type="button"
        onClick={dec}
        className="btn-roast-control w-16 h-16 rounded-2xl border-2 active:scale-90"
        style={{ borderColor: color, color, background: `${color}18` }}
        aria-label={`${label}を下げる`}
      >
        <ChevronDown className="w-7 h-7" />
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function NewRoastContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedBeanId = searchParams.get('beanId');

  // ── App / DB state ──────────────────────────────────────────────────────────
  const [beans, setBeans] = useState<Bean[]>([]);
  const [pastRoasts, setPastRoasts] = useState<Roast[]>([]);

  // ── Tab mode ────────────────────────────────────────────────────────────────
  const [tabMode, setTabMode] = useState<TabMode>('live');

  // ── Shared form state ───────────────────────────────────────────────────────
  const [beanId, setBeanId] = useState('');
  const [roastDate, setRoastDate] = useState(new Date().toISOString().split('T')[0]);
  const [greenWeight, setGreenWeight] = useState<number>(200);
  const [roastedWeight, setRoastedWeight] = useState<number>(170);
  const [yellowTime, setYellowTime] = useState('');
  const [firstCrackTime, setFirstCrackTime] = useState('');
  const [dropTime, setDropTime] = useState('');
  const [notes, setNotes] = useState('');
  const [steps, setSteps] = useState<TimelineEntry[]>([
    { time: '00:00', heat: 7, air: 2, memo: '投入 (Charge)' },
  ]);

  // ── Form mode: manual step entry ────────────────────────────────────────────
  const [newTime, setNewTime] = useState('02:00');
  const [newHeat, setNewHeat] = useState<number>(7);
  const [newAir, setNewAir] = useState<number>(3);
  const [newMemo, setNewMemo] = useState('');

  // ── Ghost line (profile copy) ───────────────────────────────────────────────
  const [ghostRoastId, setGhostRoastId] = useState('');
  const [ghostSteps, setGhostSteps] = useState<TimelineEntry[]>([]);
  const [ghostRoast, setGhostRoast] = useState<Roast | null>(null);

  // ── Live Roast mode ─────────────────────────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [liveHeat, setLiveHeat] = useState(7);
  const [liveAir, setLiveAir] = useState(2);
  const [phase, setPhase] = useState<RoastPhase>('idle');
  const [milestoneLog, setMilestoneLog] = useState<{ label: string; time: string }[]>([]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevHeatRef = useRef(liveHeat);
  const prevAirRef = useRef(liveAir);

  // ── Derived values ──────────────────────────────────────────────────────────
  const lossRatio = calculateLossRatio(greenWeight, roastedWeight);
  const devTime = calculateDevTime(firstCrackTime, dropTime);
  const devRatio = calculateDevRatio(firstCrackTime, dropTime);
  const selectedBeanDetails = beans.find(b => b.id === beanId);
  const isOverStock = !!(selectedBeanDetails && greenWeight > selectedBeanDetails.currentWeight);

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const allBeans = DBService.getBeans();
    setBeans(allBeans);
    setPastRoasts(DBService.getRoasts());

    if (preselectedBeanId && allBeans.some(b => b.id === preselectedBeanId)) {
      setBeanId(preselectedBeanId);
    } else if (allBeans.length > 0) {
      setBeanId(allBeans[0].id);
    }
  }, [preselectedBeanId]);

  // ── Timer logic ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSecs(s => s + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const handleStartStop = () => {
    if (!isRunning && elapsedSecs === 0) {
      // First start: set phase to green
      setPhase('green');
    }
    setIsRunning(r => !r);
  };

  const handleReset = () => {
    setIsRunning(false);
    setElapsedSecs(0);
    setPhase('idle');
    setMilestoneLog([]);
    setLiveHeat(7);
    setLiveAir(2);
    setSteps([{ time: '00:00', heat: 7, air: 2, memo: '投入 (Charge)' }]);
    setYellowTime('');
    setFirstCrackTime('');
    setDropTime('');
    prevHeatRef.current = 7;
    prevAirRef.current = 2;
  };

  const currentTimeStr = secondsToTime(elapsedSecs);

  // ── Auto-push step on heat/air change ────────────────────────────────────────
  const pushStep = useCallback((heat: number, air: number, memo: string) => {
    if (!isRunning) return;
    const timeStr = secondsToTime(elapsedSecs);
    setSteps(prev => {
      const existingIdx = prev.findIndex(s => s.time === timeStr);
      const newEntry: TimelineEntry = { time: timeStr, heat, air, memo };
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = newEntry;
        return updated.sort((a, b) => timeToSeconds(a.time) - timeToSeconds(b.time));
      }
      return [...prev, newEntry].sort((a, b) => timeToSeconds(a.time) - timeToSeconds(b.time));
    });
  }, [isRunning, elapsedSecs]);

  const handleHeatChange = (v: number) => {
    setLiveHeat(v);
    if (isRunning && v !== prevHeatRef.current) {
      pushStep(v, liveAir, `火力 → ${v}`);
      prevHeatRef.current = v;
    }
  };

  const handleAirChange = (v: number) => {
    setLiveAir(v);
    if (isRunning && v !== prevAirRef.current) {
      pushStep(liveHeat, v, `風量 → ${v}`);
      prevAirRef.current = v;
    }
  };

  // ── Milestone buttons ─────────────────────────────────────────────────────────
  const recordMilestone = (label: string, field: 'yellow' | 'crack' | 'drop') => {
    const t = secondsToTime(elapsedSecs);
    if (field === 'yellow') { setYellowTime(t); setPhase('yellow'); }
    if (field === 'crack')  { setFirstCrackTime(t); setPhase('crack'); }
    if (field === 'drop')   { setDropTime(t); setPhase('drop'); setIsRunning(false); }

    setMilestoneLog(prev => [...prev, { label, time: t }]);
    pushStep(liveHeat, liveAir, label);
  };

  // ── Profile copy (ghost) ──────────────────────────────────────────────────────
  const handleCopyProfile = (pastRoastId: string) => {
    setGhostRoastId(pastRoastId);
    const pastSteps = DBService.getRoastSteps(pastRoastId);
    const r = pastRoasts.find(pr => pr.id === pastRoastId);
    if (pastSteps.length > 0) {
      const mapped = pastSteps.map(s => ({ time: s.time, heat: s.heat, air: s.air, memo: s.memo || '' }));
      setGhostSteps(mapped);
      setGhostRoast(r || null);

      // Also copy into current steps
      setSteps(mapped);
      if (r) {
        setYellowTime(r.yellowTime);
        setFirstCrackTime(r.firstCrackTime);
        setDropTime(r.dropTime);
        setGreenWeight(r.greenWeight);
        setNotes(`プロファイルをコピー: ${r.id} `);
      }
    }
  };

  // ── Form mode: manual step add ───────────────────────────────────────────────
  const handleAddStep = () => {
    if (!newTime.includes(':') || newTime.length < 4) return;
    const existingIndex = steps.findIndex(s => s.time === newTime);
    if (existingIndex >= 0) {
      const updated = [...steps];
      updated[existingIndex] = { time: newTime, heat: newHeat, air: newAir, memo: newMemo };
      setSteps(updated.sort((a, b) => timeToSeconds(a.time) - timeToSeconds(b.time)));
    } else {
      const updated = [...steps, { time: newTime, heat: newHeat, air: newAir, memo: newMemo }];
      setSteps(updated.sort((a, b) => timeToSeconds(a.time) - timeToSeconds(b.time)));
    }
    const secs = timeToSeconds(newTime);
    setNewTime(secondsToTime(secs + 30));
    setNewMemo('');
  };

  const handleRemoveStep = (idx: number) => {
    if (steps[idx].time === '00:00') return;
    setSteps(steps.filter((_, i) => i !== idx));
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!beanId) { alert('生豆を選択してください。'); return; }
    if (isOverStock) {
      if (!confirm(`警告: 投入量 (${greenWeight}g) が在庫 (${selectedBeanDetails!.currentWeight}g) を超えています。続けますか？`)) return;
    }

    const roastId = DBService.generateNextRoastId();
    const newRoast: Roast = {
      id: roastId, beanId, roastDate, greenWeight, roastedWeight,
      yellowTime, firstCrackTime, dropTime,
      developmentTime: devTime, developmentRatio: devRatio, lossRatio,
      status: 'waiting_day7', notes,
      createdAt: new Date().toISOString(),
    };
    const finalSteps: RoastStep[] = steps.map((s, idx) => ({
      ...s, id: `step_${roastId}_${idx}`, roastId
    }));
    DBService.saveRoast(newRoast, finalSteps);
    router.push(`/roasts/${roastId}`);
  };

  // ── Chart data ────────────────────────────────────────────────────────────────
  const chartData = steps.map(s => ({
    secs: timeToSeconds(s.time), timeStr: s.time, heat: s.heat, air: s.air, label: s.memo
  }));

  const ghostChartData = ghostSteps.map(s => ({
    secs: timeToSeconds(s.time), ghostHeat: s.heat, ghostAir: s.air
  }));

  // Merge ghost data into chart (for recharts we need a unified domain)
  const mergedChartData = (() => {
    const map = new Map<number, Record<string, number>>();
    chartData.forEach(d => {
      map.set(d.secs, { ...map.get(d.secs), secs: d.secs, heat: d.heat, air: d.air });
    });
    ghostChartData.forEach(d => {
      map.set(d.secs, { ...map.get(d.secs), secs: d.secs, ghostHeat: d.ghostHeat, ghostAir: d.ghostAir });
    });
    return Array.from(map.values()).sort((a, b) => a.secs - b.secs);
  })();

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col min-h-screen transition-all duration-[3000ms]"
      style={{ backgroundImage: PHASE_GRADIENTS[phase] }}
    >
      {/* ── Header ── */}
      <header className="border-b border-[#232326] glass-strong px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/roasts" className="p-2 hover:bg-[#232326] rounded-xl text-[#8E8E93] hover:text-[#F4F4F6] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-wide">焙煎バッチ登録</h1>
            <p className="text-xs text-[#8E8E93]">ID: {DBService.generateNextRoastId()}</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D09B6A] to-[#B37B4D] hover:from-[#E0AB7A] hover:to-[#C38B5D] text-[#0B0B0C] font-bold text-sm transition-all active:scale-95 cursor-pointer shadow-md shadow-[#D09B6A]/20"
        >
          <Save className="w-4 h-4" />
          保存
        </button>
      </header>

      {/* ── Tab switcher ── */}
      <div className="flex border-b border-[#232326] glass-strong sticky top-[73px] z-10">
        <button
          type="button"
          onClick={() => setTabMode('live')}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all border-b-2 ${
            tabMode === 'live'
              ? 'border-[#D09B6A] text-[#D09B6A]'
              : 'border-transparent text-[#8E8E93] hover:text-[#F4F4F6]'
          }`}
        >
          <Timer className="w-4 h-4" />
          Live Roastモード
        </button>
        <button
          type="button"
          onClick={() => setTabMode('form')}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all border-b-2 ${
            tabMode === 'form'
              ? 'border-[#D09B6A] text-[#D09B6A]'
              : 'border-transparent text-[#8E8E93] hover:text-[#F4F4F6]'
          }`}
        >
          <Coffee className="w-4 h-4" />
          手動入力モード
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          LIVE ROAST MODE
      ══════════════════════════════════════════════════ */}
      {tabMode === 'live' && (
        <div className="flex-1 flex flex-col">
          {/* Phase indicator banner */}
          <div
            className="text-center py-1.5 text-xs font-semibold tracking-wider transition-all duration-1000"
            style={{
              background: phase === 'idle' ? 'transparent' :
                phase === 'green' ? 'rgba(20,80,20,0.25)' :
                phase === 'yellow' ? 'rgba(120,100,10,0.25)' :
                phase === 'crack' ? 'rgba(160,80,10,0.25)' :
                'rgba(80,30,10,0.25)',
              color: phase === 'idle' ? '#555558' :
                phase === 'green' ? '#4ade80' :
                phase === 'yellow' ? '#facc15' :
                phase === 'crack' ? '#fb923c' :
                '#d09b6a',
            }}
          >
            {PHASE_LABELS[phase]}
          </div>

          <div className="flex-1 flex flex-col lg:flex-row">
            {/* Left: Timer + Controls */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-start p-6 gap-6">

              {/* ── Bean selector (compact) ── */}
              <div className="w-full glass-card p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#D09B6A]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">使用する生豆</span>
                </div>
                <select
                  value={beanId}
                  onChange={e => setBeanId(e.target.value)}
                  className="w-full bg-[#1A1A1E] border border-[#232326] rounded-xl px-4 py-3 text-sm text-[#F4F4F6] font-medium"
                >
                  {beans.map(b => (
                    <option key={b.id} value={b.id}>
                      [{b.id}] {b.country} - {b.name} (在庫: {b.currentWeight}g)
                    </option>
                  ))}
                </select>

                <div className="flex gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-[#8E8E93]">投入量 (g)</label>
                    <input
                      type="number"
                      value={greenWeight}
                      onChange={e => setGreenWeight(Number(e.target.value))}
                      className={`w-full bg-[#1A1A1E] border rounded-xl px-3 py-2.5 text-sm text-[#F4F4F6] font-mono transition-colors ${
                        isOverStock ? 'border-red-500 bg-red-900/10' : 'border-[#232326]'
                      }`}
                    />
                    {isOverStock && (
                      <p className="text-xs text-red-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        在庫 ({selectedBeanDetails!.currentWeight}g) を超えています
                      </p>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-[#8E8E93]">焙煎後 (g)</label>
                    <input
                      type="number"
                      value={roastedWeight}
                      onChange={e => setRoastedWeight(Number(e.target.value))}
                      className="w-full bg-[#1A1A1E] border border-[#232326] rounded-xl px-3 py-2.5 text-sm text-[#F4F4F6] font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* ── Giant Timer ── */}
              <div className="w-full glass-card p-6 rounded-2xl flex flex-col items-center gap-5">
                {/* Time display */}
                <div
                  className="text-8xl md:text-9xl font-extrabold timer-display tabular-nums tracking-tight"
                  style={{
                    color: isRunning ? '#D09B6A' : '#F4F4F6',
                    textShadow: isRunning ? '0 0 40px rgba(208,155,106,0.4)' : 'none',
                    transition: 'color 0.5s, text-shadow 0.5s',
                  }}
                >
                  {secondsToTime(elapsedSecs)}
                </div>

                {/* Control buttons */}
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handleStartStop}
                    className="flex items-center gap-2 py-3.5 px-8 rounded-2xl font-bold text-base transition-all active:scale-95 cursor-pointer"
                    style={{
                      background: isRunning
                        ? 'rgba(239,68,68,0.15)'
                        : 'linear-gradient(135deg, #D09B6A, #B37B4D)',
                      color: isRunning ? '#EF4444' : '#0B0B0C',
                      border: isRunning ? '2px solid rgba(239,68,68,0.4)' : 'none',
                      boxShadow: isRunning ? 'none' : '0 4px 20px rgba(208,155,106,0.3)',
                    }}
                    aria-label={isRunning ? '停止' : '開始'}
                  >
                    {isRunning ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    {isRunning ? 'STOP' : 'START'}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={isRunning}
                    className="flex items-center gap-2 py-3.5 px-5 rounded-2xl font-bold text-sm bg-[#1E1E22] hover:bg-[#2A2A2F] text-[#8E8E93] transition-all active:scale-95 cursor-pointer disabled:opacity-30"
                  >
                    <RotateCcw className="w-4 h-4" />
                    RESET
                  </button>
                </div>
              </div>

              {/* ── Heat / Air Controls ── */}
              <div className="w-full glass-card p-5 rounded-2xl">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93] mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#D09B6A]" />
                  SY121N コントローラー
                </h3>
                <div className="flex items-start justify-around gap-6">
                  <HeatAirControl
                    label="火力 (Heat)"
                    value={liveHeat}
                    onChange={handleHeatChange}
                    color="#D09B6A"
                  />
                  <div className="flex flex-col items-center justify-center pt-8 text-[#232326] text-2xl font-thin">
                    |
                  </div>
                  <HeatAirControl
                    label="風量 (Air)"
                    value={liveAir}
                    onChange={handleAirChange}
                    color="#3B82F6"
                  />
                </div>
                <p className="text-[10px] text-[#555558] text-center mt-3">
                  {isRunning ? '▶ タイマー稼働中 — 数値変更時に自動記録されます' : '▶ STARTを押してから操作してください'}
                </p>
              </div>

              {/* ── Milestone Buttons ── */}
              <div className="w-full glass-card p-4 rounded-2xl space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#D09B6A]" />
                  マイルストーン記録
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => recordMilestone('🟡 Yellow', 'yellow')}
                    disabled={!isRunning}
                    className="py-4 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
                    style={{
                      background: 'rgba(234,179,8,0.15)',
                      border: '2px solid rgba(234,179,8,0.4)',
                      color: '#EAB308',
                    }}
                  >
                    🟡
                    <span className="block text-xs font-medium mt-0.5">Yellow</span>
                    {yellowTime && <span className="block text-[10px] font-mono opacity-80">{yellowTime}</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => recordMilestone('💥 1st Crack', 'crack')}
                    disabled={!isRunning}
                    className="py-4 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
                    style={{
                      background: 'rgba(249,115,22,0.15)',
                      border: '2px solid rgba(249,115,22,0.4)',
                      color: '#F97316',
                    }}
                  >
                    💥
                    <span className="block text-xs font-medium mt-0.5">1st Crack</span>
                    {firstCrackTime && <span className="block text-[10px] font-mono opacity-80">{firstCrackTime}</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => recordMilestone('⬇️ Drop', 'drop')}
                    disabled={!isRunning}
                    className="py-4 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
                    style={{
                      background: 'rgba(239,68,68,0.15)',
                      border: '2px solid rgba(239,68,68,0.4)',
                      color: '#EF4444',
                    }}
                  >
                    ⬇️
                    <span className="block text-xs font-medium mt-0.5">Drop</span>
                    {dropTime && <span className="block text-[10px] font-mono opacity-80">{dropTime}</span>}
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Graph + Timeline */}
            <div className="w-full lg:w-1/2 p-6 space-y-5">

              {/* ── Profile graph with ghost line ── */}
              <div className="glass-card p-5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#8E8E93] uppercase tracking-wider">
                    リアルタイム プロファイル
                  </h3>
                  {/* Ghost profile selector */}
                  {pastRoasts.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#8E8E93]">ゴーストライン:</span>
                      <select
                        value={ghostRoastId}
                        onChange={e => {
                          if (e.target.value) handleCopyProfile(e.target.value);
                          else { setGhostRoastId(''); setGhostSteps([]); setGhostRoast(null); }
                        }}
                        className="bg-[#1A1A1E] border border-[#232326] rounded-lg px-2 py-1 text-[10px] text-[#D09B6A] cursor-pointer"
                      >
                        <option value="">なし</option>
                        {pastRoasts.map(r => (
                          <option key={r.id} value={r.id}>{r.id} ({r.roastDate})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {ghostRoast && (
                  <div className="flex gap-4 text-[10px] font-mono">
                    <span className="text-[#8E8E93]">Ghost: <span className="text-[#D09B6A]/50">{ghostRoast.id}</span></span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-6 h-0.5 border-t-2 border-dashed border-[#D09B6A]/40" />
                      <span className="text-[#8E8E93]">火力 (Ghost)</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-6 h-0.5 border-t-2 border-dashed border-blue-400/40" />
                      <span className="text-[#8E8E93]">風量 (Ghost)</span>
                    </span>
                  </div>
                )}

                <div className="h-56 w-full">
                  {mergedChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mergedChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#232326" />
                        <XAxis
                          dataKey="secs"
                          type="number"
                          domain={[0, 'dataMax + 60']}
                          tickFormatter={s => secondsToTime(s)}
                          stroke="#8E8E93"
                          fontSize={10}
                        />
                        <YAxis domain={[0, 8]} ticks={[0, 2, 4, 6, 8]} stroke="#8E8E93" fontSize={10} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#131315', borderColor: '#232326', fontSize: 11 }}
                          labelFormatter={s => `時間: ${secondsToTime(Number(s))}`}
                        />
                        {/* Current profile */}
                        <Line type="monotone" dataKey="heat" name="火力" stroke="#D09B6A" strokeWidth={2.5} dot={false} connectNulls />
                        <Line type="monotone" dataKey="air" name="風量" stroke="#3B82F6" strokeWidth={2.5} dot={false} connectNulls />
                        {/* Ghost lines (semi-transparent dashed) */}
                        {ghostSteps.length > 0 && (
                          <>
                            <Line type="monotone" dataKey="ghostHeat" name="Ghost 火力" stroke="#D09B6A" strokeWidth={1.5} strokeDasharray="5 4" strokeOpacity={0.35} dot={false} connectNulls />
                            <Line type="monotone" dataKey="ghostAir" name="Ghost 風量" stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="5 4" strokeOpacity={0.35} dot={false} connectNulls />
                          </>
                        )}
                        {/* Phase reference lines */}
                        {yellowTime && (
                          <ReferenceLine x={timeToSeconds(yellowTime)} stroke="#EAB308" strokeDasharray="4 4"
                            label={{ value: 'Yellow', fill: '#EAB308', fontSize: 9, position: 'top' }} />
                        )}
                        {firstCrackTime && (
                          <ReferenceLine x={timeToSeconds(firstCrackTime)} stroke="#F97316" strokeDasharray="4 4"
                            label={{ value: '1st Crack', fill: '#F97316', fontSize: 9, position: 'top' }} />
                        )}
                        {dropTime && (
                          <ReferenceLine x={timeToSeconds(dropTime)} stroke="#EF4444" strokeDasharray="4 4"
                            label={{ value: 'Drop', fill: '#EF4444', fontSize: 9, position: 'top' }} />
                        )}
                        {/* Ghost phase references */}
                        {ghostRoast && ghostRoast.yellowTime && (
                          <ReferenceLine x={timeToSeconds(ghostRoast.yellowTime)} stroke="#EAB308" strokeDasharray="2 6" strokeOpacity={0.3}
                            label={{ value: 'G:Y', fill: '#EAB30860', fontSize: 8, position: 'insideTopLeft' }} />
                        )}
                        {ghostRoast && ghostRoast.firstCrackTime && (
                          <ReferenceLine x={timeToSeconds(ghostRoast.firstCrackTime)} stroke="#F97316" strokeDasharray="2 6" strokeOpacity={0.3} />
                        )}
                        {ghostRoast && ghostRoast.dropTime && (
                          <ReferenceLine x={timeToSeconds(ghostRoast.dropTime)} stroke="#EF4444" strokeDasharray="2 6" strokeOpacity={0.3} />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-[#555558]">
                      STARTを押して焙煎を開始してください
                    </div>
                  )}
                </div>
              </div>

              {/* ── Dev stats ── */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Loss Ratio', value: `${lossRatio}%`, color: '#F4F4F6' },
                  { label: 'Dev Time', value: devTime, color: '#D09B6A' },
                  { label: 'Dev Ratio', value: `${devRatio}%`, color: '#D09B6A' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="glass-card p-3 rounded-xl text-center">
                    <span className="text-[9px] text-[#8E8E93] block uppercase tracking-wider">{label}</span>
                    <span className="text-base font-extrabold font-mono" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* ── Auto timeline log ── */}
              <div className="glass-card p-4 rounded-2xl space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">
                  自動記録タイムライン
                </h3>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {steps.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#555558]">まだ記録がありません</div>
                  ) : (
                    steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#1A1A1E] border border-[#232326] text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-[#D09B6A] w-10 shrink-0">{step.time}</span>
                          <span className="bg-[#D09B6A]/10 text-[#D09B6A] px-2 py-0.5 rounded-lg font-mono font-bold">H{step.heat}</span>
                          <span className="bg-blue-900/20 text-[#3B82F6] px-2 py-0.5 rounded-lg font-mono font-bold">A{step.air}</span>
                          {step.memo && <span className="text-[#8E8E93] truncate max-w-[100px]">{step.memo}</span>}
                        </div>
                        {step.time !== '00:00' && (
                          <button
                            type="button"
                            onClick={() => handleRemoveStep(idx)}
                            className="p-1 text-[#555558] hover:text-[#EF4444] transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ── Notes ── */}
              <div className="glass-card p-4 rounded-2xl space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">焙煎メモ</label>
                <textarea
                  rows={2}
                  placeholder="ハゼの強さ、香り、冷却時間など..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-[#1A1A1E] border border-[#232326] rounded-xl px-3 py-2.5 text-sm text-[#F4F4F6] resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          MANUAL FORM MODE (従来の手動入力)
      ══════════════════════════════════════════════════ */}
      {tabMode === 'form' && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto">
          {/* Left: General params */}
          <div className="w-full lg:w-1/2 p-6 border-b lg:border-b-0 lg:border-r border-[#232326] space-y-5">
            {/* Bean Select */}
            <div className="glass-card p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-semibold text-[#8E8E93] uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#D09B6A]" />
                使用する生豆
              </h3>
              <div className="space-y-2">
                <select
                  value={beanId}
                  onChange={e => setBeanId(e.target.value)}
                  className="w-full bg-[#1A1A1E] border border-[#232326] rounded-xl px-4 py-3 text-sm text-[#F4F4F6]"
                >
                  {beans.map(b => (
                    <option key={b.id} value={b.id}>
                      [{b.id}] {b.country} - {b.name} (在庫: {b.currentWeight}g)
                    </option>
                  ))}
                </select>
                {selectedBeanDetails && (
                  <div className="flex justify-between items-center text-xs text-[#8E8E93] bg-[#1E1E22] p-2.5 rounded-xl border border-[#232326]">
                    <span>精製: <strong className="text-[#F4F4F6]">{selectedBeanDetails.process}</strong></span>
                    <span>品種: <strong className="text-[#F4F4F6]">{selectedBeanDetails.variety || '-'}</strong></span>
                    <span>推奨: <strong className="text-[#D09B6A]">{selectedBeanDetails.recommendedRoastDegree}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Weight */}
            <div className="glass-card p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-semibold text-[#8E8E93] uppercase tracking-wider">重量・収率</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-[#8E8E93]">投入量 (g)</label>
                  <input
                    type="number"
                    value={greenWeight}
                    onChange={e => setGreenWeight(Number(e.target.value))}
                    className={`w-full bg-[#1A1A1E] border rounded-xl px-3 py-3 text-sm text-[#F4F4F6] font-mono transition-colors ${
                      isOverStock ? 'border-red-500 bg-red-900/10' : 'border-[#232326]'
                    }`}
                  />
                  {isOverStock && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      在庫超過 ({selectedBeanDetails!.currentWeight}g)
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-[#8E8E93]">焙煎後 (g)</label>
                  <input
                    type="number"
                    value={roastedWeight}
                    onChange={e => setRoastedWeight(Number(e.target.value))}
                    className="w-full bg-[#1A1A1E] border border-[#232326] rounded-xl px-3 py-3 text-sm text-[#F4F4F6] font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center bg-[#1E1E22] p-3 rounded-xl border border-[#232326] font-mono text-sm">
                <span className="text-[#8E8E93]">重量減少率</span>
                <span className="text-lg font-bold text-[#F4F4F6]">{lossRatio}%</span>
              </div>
            </div>

            {/* Phase times */}
            <div className="glass-card p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-semibold text-[#8E8E93] uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#D09B6A]" />
                主要フェーズ到達時間
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Yellow (MM:SS)', value: yellowTime, setter: setYellowTime, placeholder: '04:30' },
                  { label: '1st Crack (MM:SS)', value: firstCrackTime, setter: setFirstCrackTime, placeholder: '08:00' },
                  { label: 'Drop (MM:SS)', value: dropTime, setter: setDropTime, placeholder: '09:30' },
                ].map(({ label, value, setter, placeholder }) => (
                  <div key={label} className="space-y-1.5">
                    <label className="text-xs text-[#8E8E93]">{label}</label>
                    <input
                      type="text"
                      placeholder={placeholder}
                      value={value}
                      onChange={e => setter(e.target.value)}
                      className="w-full bg-[#1A1A1E] border border-[#232326] rounded-xl px-3 py-3 text-sm text-[#F4F4F6] font-mono text-center"
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1E1E22] p-3 rounded-xl border border-[#232326] text-center font-mono">
                  <span className="text-[10px] text-[#8E8E93] block">Development Time</span>
                  <span className="text-base font-bold text-[#F4F4F6]">{devTime}</span>
                </div>
                <div className="bg-[#1E1E22] p-3 rounded-xl border border-[#232326] text-center font-mono">
                  <span className="text-[10px] text-[#8E8E93] block">Development Ratio</span>
                  <span className="text-base font-bold text-[#D09B6A]">{devRatio}%</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="glass-card p-5 rounded-2xl space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">焙煎ログ・メモ</label>
              <textarea
                rows={3}
                placeholder="ハゼの強さ、排気温度、冷却にかかった時間など..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-[#1A1A1E] border border-[#232326] rounded-xl px-3 py-2.5 text-sm text-[#F4F4F6] resize-none"
              />
            </div>
          </div>

          {/* Right: Timeline + Graph */}
          <div className="w-full lg:w-1/2 p-6 space-y-5">
            {/* Profile graph */}
            <div className="glass-card p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#8E8E93] uppercase tracking-wider">プロファイルグラフ</h3>
                {ghostSteps.length > 0 && (
                  <span className="text-[10px] text-[#D09B6A]/60 font-mono">ゴーストライン表示中</span>
                )}
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mergedChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#232326" />
                    <XAxis dataKey="secs" type="number" domain={[0, 'dataMax + 60']}
                      tickFormatter={s => secondsToTime(s)} stroke="#8E8E93" fontSize={10} />
                    <YAxis domain={[0, 8]} ticks={[0, 2, 4, 6, 8]} stroke="#8E8E93" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#131315', borderColor: '#232326', fontSize: 11 }}
                      labelFormatter={s => `時間: ${secondsToTime(Number(s))}`} />
                    <Line type="monotone" dataKey="heat" name="火力" stroke="#D09B6A" strokeWidth={2.5} dot={false} connectNulls />
                    <Line type="monotone" dataKey="air" name="風量" stroke="#3B82F6" strokeWidth={2.5} dot={false} connectNulls />
                    {ghostSteps.length > 0 && (
                      <>
                        <Line type="monotone" dataKey="ghostHeat" name="Ghost 火力" stroke="#D09B6A" strokeWidth={1.5} strokeDasharray="5 4" strokeOpacity={0.35} dot={false} connectNulls />
                        <Line type="monotone" dataKey="ghostAir" name="Ghost 風量" stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="5 4" strokeOpacity={0.35} dot={false} connectNulls />
                      </>
                    )}
                    {yellowTime && <ReferenceLine x={timeToSeconds(yellowTime)} stroke="#EAB308" strokeDasharray="4 4" label={{ value: 'Yellow', fill: '#EAB308', fontSize: 9, position: 'top' }} />}
                    {firstCrackTime && <ReferenceLine x={timeToSeconds(firstCrackTime)} stroke="#F97316" strokeDasharray="4 4" label={{ value: '1st Crack', fill: '#F97316', fontSize: 9, position: 'top' }} />}
                    {dropTime && <ReferenceLine x={timeToSeconds(dropTime)} stroke="#EF4444" strokeDasharray="4 4" label={{ value: 'Drop', fill: '#EF4444', fontSize: 9, position: 'top' }} />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Timeline editor */}
            <div className="glass-card p-5 rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-[#8E8E93] uppercase tracking-wider">SY121N タイムライン</h3>
                {pastRoasts.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[#8E8E93]">プロファイル複製 / ゴースト:</span>
                    <select
                      value={ghostRoastId}
                      onChange={e => {
                        if (e.target.value) handleCopyProfile(e.target.value);
                        else { setGhostRoastId(''); setGhostSteps([]); setGhostRoast(null); }
                      }}
                      className="bg-[#1A1A1E] border border-[#232326] rounded-lg px-1.5 py-1 text-[10px] text-[#D09B6A] cursor-pointer"
                    >
                      <option value="">選択...</option>
                      {pastRoasts.map(r => (
                        <option key={r.id} value={r.id}>{r.id} ({r.roastDate})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Step add form */}
              <div className="bg-[#1A1A1E] p-3 rounded-xl border border-[#232326] space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-0.5">
                    <label className="text-[10px] text-[#8E8E93]">時間 (MM:SS)</label>
                    <input type="text" value={newTime} onChange={e => setNewTime(e.target.value)}
                      className="w-full bg-[#131315] border border-[#232326] rounded-lg px-2 py-2 text-xs text-[#F4F4F6] font-mono text-center" />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] text-[#8E8E93]">火力 (1-8)</label>
                    <select value={newHeat} onChange={e => setNewHeat(Number(e.target.value))}
                      className="w-full bg-[#131315] border border-[#232326] rounded-lg px-2 py-2 text-xs text-[#F4F4F6] font-mono">
                      {[1,2,3,4,5,6,7,8].map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] text-[#8E8E93]">風量 (1-8)</label>
                    <select value={newAir} onChange={e => setNewAir(Number(e.target.value))}
                      className="w-full bg-[#131315] border border-[#232326] rounded-lg px-2 py-2 text-xs text-[#F4F4F6] font-mono">
                      {[1,2,3,4,5,6,7,8].map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="メモ（例: 黄変化、1ハゼ）" value={newMemo}
                    onChange={e => setNewMemo(e.target.value)}
                    className="flex-1 bg-[#131315] border border-[#232326] rounded-lg px-3 py-2 text-xs text-[#F4F4F6]" />
                  <button type="button" onClick={handleAddStep}
                    className="flex items-center gap-1.5 py-2 px-4 rounded-lg bg-[#D09B6A] hover:bg-[#B37B4D] text-[#0B0B0C] font-bold text-xs transition-all cursor-pointer">
                    <Plus className="w-3.5 h-3.5" />
                    追加
                  </button>
                </div>
              </div>

              {/* Steps list */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#1A1A1E] border border-[#232326] text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-[#D09B6A] w-10 shrink-0">{step.time}</span>
                      <span className="bg-[#D09B6A]/10 text-[#D09B6A] px-1.5 py-0.5 rounded font-mono font-bold">H{step.heat}</span>
                      <span className="bg-blue-900/20 text-[#3B82F6] px-1.5 py-0.5 rounded font-mono font-bold">A{step.air}</span>
                      {step.memo && <span className="text-[#8E8E93] truncate max-w-[120px]">{step.memo}</span>}
                    </div>
                    {step.time !== '00:00' ? (
                      <button type="button" onClick={() => handleRemoveStep(idx)}
                        className="p-1 text-[#8E8E93] hover:text-[#EF4444] transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-[10px] text-[#555558] uppercase font-mono px-2">Charge</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewRoastPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center text-[#8E8E93]">
        <div className="space-y-3 text-center">
          <div className="w-8 h-8 border-2 border-[#D09B6A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm">ローディング中...</p>
        </div>
      </div>
    }>
      <NewRoastContent />
    </Suspense>
  );
}
