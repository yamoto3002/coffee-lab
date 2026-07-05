'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DBService, secondsToTime, timeToSeconds, getAgingDays } from '@/lib/db';
import { analyzeRoast, AICoachResult } from '@/lib/aiCoach';
import { Bean, Roast, RoastStep, Tasting } from '@/types';
import {
  ArrowLeft, Trash2, Calendar, Clock, Star, ChevronRight,
  Plus, AlertCircle, FileText, CheckCircle2, Sparkles,
  TrendingUp, AlertTriangle, Zap, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
  RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts';

// ── Typewriter hook ─────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 18) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const idx = useRef(0);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    idx.current = 0;
    if (!text) return;

    const timer = setInterval(() => {
      idx.current++;
      setDisplayed(text.slice(0, idx.current));
      if (idx.current >= text.length) {
        clearInterval(timer);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return { displayed, done };
}

// ── AI Coach Panel ───────────────────────────────────────────────────────────
function AICoachPanel({ roast, tastings }: { roast: Roast; tastings: Tasting[] }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [result, setResult] = useState<AICoachResult | null>(null);
  const [progress, setProgress] = useState(0);

  const { displayed: summaryText } = useTypewriter(
    status === 'done' ? (result?.summary ?? '') : '',
    16
  );

  const handleAnalyze = async () => {
    setStatus('loading');
    setProgress(0);

    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 18, 90));
    }, 100);

    try {
      const res = await analyzeRoast(roast, tastings);
      clearInterval(progressInterval);
      setProgress(100);
      await new Promise(r => setTimeout(r, 300));
      setResult(res);
      setStatus('done');
    } catch {
      clearInterval(progressInterval);
      setStatus('idle');
    }
  };

  const scoreColor = result?.score === 'excellent' ? '#4ade80'
    : result?.score === 'good' ? '#D09B6A'
    : '#EF4444';

  const scoreIcon = result?.score === 'excellent' ? '✨'
    : result?.score === 'good' ? '👍'
    : '⚠️';

  const severityStyle = (s: 'info' | 'warning' | 'critical') =>
    s === 'critical'
      ? { border: 'border-red-500/30', bg: 'bg-red-900/10', icon: <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />, textColor: 'text-red-400' }
      : s === 'warning'
      ? { border: 'border-amber-500/30', bg: 'bg-amber-900/10', icon: <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />, textColor: 'text-amber-400' }
      : { border: 'border-emerald-500/30', bg: 'bg-emerald-900/10', icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />, textColor: 'text-emerald-400' };

  return (
    <div className="bg-[#131315] border border-[#232326] rounded-2xl overflow-hidden">
      {/* Panel header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-[#232326]"
        style={{ background: 'linear-gradient(135deg, rgba(208,155,106,0.08) 0%, rgba(90,50,20,0.06) 100%)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #D09B6A, #8B5A2B)' }}>
            <Sparkles className="w-4 h-4 text-[#0B0B0C]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#F4F4F6]">AI パーソナルコーチ</h3>
            <p className="text-[10px] text-[#8E8E93]">焙煎プロファイル分析 & 次回への改善提案</p>
          </div>
        </div>

        {status === 'done' && (
          <button
            onClick={() => { setStatus('idle'); setResult(null); }}
            className="p-1.5 rounded-lg hover:bg-[#232326] text-[#8E8E93] hover:text-[#F4F4F6] transition-colors"
            aria-label="再分析"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Idle state */}
      {status === 'idle' && (
        <div className="p-6 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: 'rgba(208,155,106,0.1)', border: '1px solid rgba(208,155,106,0.2)' }}>
            🤖
          </div>
          <div>
            <p className="text-sm text-[#E4E4E7] font-medium">このプロファイルをAIが分析します</p>
            <p className="text-xs text-[#8E8E93] mt-1">
              Loss Ratio・Dev比率・各フェーズ到達時間・テイスティングスコアを元に<br />
              次回焙煎への具体的な改善案を提示します
            </p>
          </div>
          <button
            onClick={handleAnalyze}
            className="flex items-center gap-2 py-3 px-6 rounded-xl font-bold text-sm transition-all active:scale-95 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #D09B6A, #B37B4D)',
              color: '#0B0B0C',
              boxShadow: '0 4px 20px rgba(208,155,106,0.3)',
            }}
          >
            <Sparkles className="w-4 h-4" />
            ✨ AIにこのプロファイルを分析させる
          </button>
        </div>
      )}

      {/* Loading state */}
      {status === 'loading' && (
        <div className="p-8 flex flex-col items-center gap-5">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-[#D09B6A]/20" />
            <div className="absolute inset-0 rounded-full border-2 border-t-[#D09B6A] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-t-transparent border-r-[#B37B4D] border-b-transparent border-l-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
            <div className="absolute inset-0 flex items-center justify-center text-lg">☕</div>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[#F4F4F6]">プロファイルを分析中...</p>
            <p className="text-xs text-[#8E8E93] mt-1">焙煎データを解析しています</p>
          </div>
          <div className="w-full max-w-xs">
            <div className="w-full h-1.5 bg-[#1E1E22] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #D09B6A, #F4C28A)',
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#555558] mt-1 font-mono">
              <span>分析中</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-xs text-[#555558] text-center">
            {progress > 20 && <p className="transition-opacity duration-500">✓ 重量減少率を評価中...</p>}
            {progress > 45 && <p className="transition-opacity duration-500">✓ Development Ratioを解析中...</p>}
            {progress > 65 && <p className="transition-opacity duration-500">✓ フェーズタイミングを検証中...</p>}
            {progress > 80 && <p className="transition-opacity duration-500">✓ テイスティングデータと照合中...</p>}
          </div>
        </div>
      )}

      {/* Done state */}
      {status === 'done' && result && (
        <div className="p-5 space-y-5">
          {/* Overall score */}
          <div className="flex items-start gap-4 p-4 rounded-2xl border"
            style={{
              background: `${scoreColor}08`,
              borderColor: `${scoreColor}30`,
            }}>
            <div className="text-3xl mt-0.5">{scoreIcon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: scoreColor }}>
                  {result.score === 'excellent' ? '優秀なプロファイル' : result.score === 'good' ? '良好なプロファイル' : '改善が必要'}
                </span>
              </div>
              <p className="text-sm text-[#E4E4E7] leading-relaxed">
                {summaryText}
                <span className={`inline-block w-0.5 h-3.5 ml-0.5 bg-[#D09B6A] ${summaryText === result.summary ? 'opacity-0' : 'opacity-100'}`} />
              </p>
            </div>
          </div>

          {/* Suggestions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              詳細分析
            </h4>
            {result.suggestions.map((s, i) => {
              const style = severityStyle(s.severity);
              return (
                <div key={i} className={`p-4 rounded-xl border ${style.border} ${style.bg} space-y-2`}>
                  <div className="flex items-start gap-2.5">
                    {style.icon}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${style.textColor}`}>{s.icon} {s.aspect}</span>
                        <div className="flex items-center gap-2 text-[10px] font-mono">
                          <span className="text-[#8E8E93]">現在: <strong className="text-[#F4F4F6]">{s.current}</strong></span>
                          <span className="text-[#555558]">→</span>
                          <span className="text-[#8E8E93]">目標: <strong className="text-[#D09B6A]">{s.target}</strong></span>
                        </div>
                      </div>
                      <p className="text-xs text-[#C4C4C7] leading-relaxed">{s.action}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Next profile tips */}
          {result.nextProfileTips.length > 0 && (
            <div className="p-4 rounded-xl bg-emerald-900/10 border border-emerald-500/20 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                次回焙煎へのアクションプラン
              </h4>
              <ul className="space-y-1.5">
                {result.nextProfileTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-emerald-300/90">
                    <span className="text-emerald-500 mt-0.5 shrink-0">▸</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RoastDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [roast, setRoast] = useState<Roast | null>(null);
  const [bean, setBean] = useState<Bean | null>(null);
  const [steps, setSteps] = useState<RoastStep[]>([]);
  const [tastings, setTastings] = useState<Tasting[]>([]);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = () => {
    const currentRoast = DBService.getRoastById(id);
    if (!currentRoast) { router.push('/roasts'); return; }
    setRoast(currentRoast);
    setBean(DBService.getBeanById(currentRoast.beanId) || null);
    setSteps(DBService.getRoastSteps(id));
    setTastings(DBService.getTastingsForRoast(id));
  };

  const handleDelete = () => {
    if (confirm('警告：この焙煎データおよび紐づくすべてのテイスティング記録・タイムラインを削除しますか？生豆在庫量は投入量分が自動で戻されます。')) {
      DBService.deleteRoast(id);
      router.push('/roasts');
    }
  };

  if (!roast) return null;

  const agingDays = getAgingDays(roast.roastDate);

  const chartData = steps.map(s => ({
    secs: timeToSeconds(s.time),
    timeStr: s.time,
    heat: s.heat,
    air: s.air,
    memo: s.memo || ''
  }));

  const getRadarData = (t: Tasting) => [
    { subject: 'Fragrance', value: t.fragrance },
    { subject: 'Aroma', value: t.aroma },
    { subject: 'Flavor', value: t.flavor },
    { subject: 'Sweetness', value: t.sweetness },
    { subject: 'Acidity', value: (t.acidityIntensity + t.acidityQuality) / 2 },
    { subject: 'Body', value: t.body },
    { subject: 'Aftertaste', value: t.aftertaste },
    { subject: 'Balance', value: t.balance },
    { subject: 'Clean Cup', value: t.cleanCup },
    { subject: 'Overall', value: t.overall },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-[#232326] bg-[#0E0E10]/95 backdrop-blur-xl px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/roasts" className="p-2 hover:bg-[#232326] rounded-xl text-[#8E8E93] hover:text-[#F4F4F6] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-wide flex items-center gap-2 flex-wrap">
              <span>バッチ: {roast.id}</span>
              <span className="text-xs bg-[#1C1C1F] text-[#D09B6A] px-2.5 py-0.5 rounded-full font-mono font-normal">
                エイジング {agingDays}日目
              </span>
            </h1>
            <p className="text-xs text-[#8E8E93]">{bean ? `[${bean.country}] ${bean.name}` : '生豆不明'}</p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-red-950/20 hover:bg-red-900/30 text-[#EF4444] border border-red-900/20 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">この記録を削除</span>
        </button>
      </header>

      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full pb-24">

        {/* Section 1: Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Bean info */}
          <div className="bg-[#131315] p-5 rounded-2xl border border-[#232326] flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider">生豆プロファイル</span>
              {bean ? (
                <div className="space-y-1.5">
                  <h3 className="font-bold text-[#F4F4F6] text-base">{bean.name}</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[#A1A1AA]">
                    <span>国: <strong className="text-[#F4F4F6]">{bean.country}</strong></span>
                    <span>精製: <strong className="text-[#F4F4F6]">{bean.process}</strong></span>
                    <span>品種: <strong className="text-[#F4F4F6]">{bean.variety || '-'}</strong></span>
                    <span>標高: <strong className="text-[#F4F4F6]">{bean.altitude}m</strong></span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#EF4444] italic">生豆データが存在しません</p>
              )}
            </div>
            <div className="border-t border-[#232326] pt-4 mt-4 flex justify-between items-center text-xs text-[#8E8E93]">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                焙煎日: <strong className="text-[#E4E4E7] font-mono ml-1">{roast.roastDate}</strong>
              </span>
              <span>ステータス: <strong className="text-[#D09B6A] uppercase font-mono">{roast.status}</strong></span>
            </div>
          </div>

          {/* Weight */}
          <div className="bg-[#131315] p-5 rounded-2xl border border-[#232326] flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider">重量・減少率</span>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#1C1C1F] p-3 rounded-xl text-center font-mono">
                  <span className="text-[10px] text-[#8E8E93] block">投入量</span>
                  <span className="text-xl font-bold text-[#F4F4F6]">{roast.greenWeight}g</span>
                </div>
                <div className="bg-[#1C1C1F] p-3 rounded-xl text-center font-mono">
                  <span className="text-[10px] text-[#8E8E93] block">焙煎後</span>
                  <span className="text-xl font-bold text-[#F4F4F6]">{roast.roastedWeight}g</span>
                </div>
              </div>
            </div>
            <div className="border-t border-[#232326] pt-4 mt-4 flex justify-between items-center font-mono text-xs">
              <span className="text-[#8E8E93]">重量減少率</span>
              <span className="text-base font-extrabold text-[#F4F4F6]">{roast.lossRatio}%</span>
            </div>
          </div>

          {/* Development */}
          <div className="bg-[#131315] p-5 rounded-2xl border border-[#232326] sm:col-span-2 lg:col-span-1 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider">開発フェーズ</span>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                {[
                  { label: 'Yellow', value: roast.yellowTime, color: '#EAB308' },
                  { label: '1st Crack', value: roast.firstCrackTime, color: '#F97316' },
                  { label: 'Drop', value: roast.dropTime, color: '#EF4444' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-[#1C1C1F] p-2 rounded-lg text-center" style={{ borderBottom: `2px solid ${color}40` }}>
                    <span className="text-[9px] text-[#8E8E93] block">{label}</span>
                    <span className="font-bold text-[#F4F4F6]">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-[#232326] pt-4 mt-4 flex justify-between items-center font-mono text-xs">
              <span className="text-[#8E8E93]">Dev時間 / 比率</span>
              <span className="text-sm font-bold text-[#D09B6A]">
                {roast.developmentTime} <span className="text-[#8E8E93] text-xs font-normal">({roast.developmentRatio}%)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Chart + Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Chart */}
          <div className="bg-[#131315] p-5 rounded-2xl border border-[#232326] space-y-4">
            <h3 className="text-sm font-semibold text-[#8E8E93] uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#D09B6A]" />
              焙煎プロファイル（火力・風量）
            </h3>
            <div className="h-64 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#232326" />
                    <XAxis dataKey="secs" type="number" domain={[0, 'dataMax + 30']}
                      tickFormatter={s => secondsToTime(s)} stroke="#8E8E93" fontSize={10} />
                    <YAxis domain={[0, 8]} ticks={[0, 2, 4, 6, 8]} stroke="#8E8E93" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#131315', borderColor: '#232326', fontSize: 11 }}
                      labelFormatter={s => `時間: ${secondsToTime(Number(s))}`} />
                    <Line type="monotone" dataKey="heat" name="火力" stroke="#D09B6A" strokeWidth={2.5} />
                    <Line type="monotone" dataKey="air" name="風量" stroke="#3B82F6" strokeWidth={2.5} />
                    {roast.yellowTime && (
                      <ReferenceLine x={timeToSeconds(roast.yellowTime)} stroke="#EAB308" strokeDasharray="4 4"
                        label={{ value: 'Yellow', fill: '#EAB308', fontSize: 9, position: 'top' }} />
                    )}
                    {roast.firstCrackTime && (
                      <ReferenceLine x={timeToSeconds(roast.firstCrackTime)} stroke="#F97316" strokeDasharray="4 4"
                        label={{ value: '1st Crack', fill: '#F97316', fontSize: 9, position: 'top' }} />
                    )}
                    {roast.dropTime && (
                      <ReferenceLine x={timeToSeconds(roast.dropTime)} stroke="#EF4444" strokeDasharray="4 4"
                        label={{ value: 'Drop', fill: '#EF4444', fontSize: 9, position: 'top' }} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#8E8E93]">
                  プロファイル情報が登録されていません
                </div>
              )}
            </div>
          </div>

          {/* Timeline list */}
          <div className="bg-[#131315] p-5 rounded-2xl border border-[#232326] flex flex-col">
            <h3 className="text-sm font-semibold text-[#8E8E93] uppercase tracking-wider mb-4">
              SY121N 操作記録タイムライン
            </h3>
            <div className="flex-1 space-y-2 overflow-y-auto max-h-64 pr-1">
              {steps.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#8E8E93]">タイムライン未登録</div>
              ) : (
                steps.map((step) => (
                  <div key={step.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#1A1A1E] border border-[#232326] text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-[#D09B6A] w-10 shrink-0">{step.time}</span>
                      <span className="bg-[#D09B6A]/10 text-[#D09B6A] px-1.5 py-0.5 rounded font-mono font-bold">H{step.heat}</span>
                      <span className="bg-blue-900/20 text-[#3B82F6] px-1.5 py-0.5 rounded font-mono font-bold">A{step.air}</span>
                      {step.memo && <span className="text-[#8E8E93] truncate max-w-[120px]">{step.memo}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Notes */}
        {roast.notes && (
          <div className="bg-[#131315] p-5 rounded-2xl border border-[#232326] space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#D09B6A]" />
              焙煎メモログ
            </h4>
            <p className="text-sm text-[#E4E4E7] leading-relaxed whitespace-pre-wrap">{roast.notes}</p>
          </div>
        )}

        {/* Section 4: AI Coach ← NEW */}
        <AICoachPanel roast={roast} tastings={tastings} />

        {/* Section 5: Tasting Timeline */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[#8E8E93] uppercase tracking-wider">
            テイスティング・エイジング進化ノート
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {[7, 10, 14].map((dayNum) => {
              const tasting = tastings.find(t => t.tastingDay === dayNum);
              const isCompleted = tasting && tasting.status === 'completed';

              return (
                <div key={dayNum}
                  className={`rounded-2xl border flex flex-col ${
                    isCompleted
                      ? 'bg-[#131315] border-[#232326]'
                      : 'bg-[#131315]/30 border-dashed border-[#232326]'
                  }`}
                >
                  {isCompleted && tasting ? (
                    <div className="p-5 flex flex-col h-full justify-between gap-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider">Day {dayNum} 評価</span>
                          <span className="text-xs text-[#8E8E93] block font-mono mt-0.5">{tasting.tastingDate}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-extrabold text-[#D09B6A] font-mono">{tasting.score}点</span>
                          <div className="flex text-[#D09B6A] justify-end mt-0.5">
                            {Array.from({ length: tasting.recommendationRating }).map((_, i) => (
                              <Star key={i} className="w-2.5 h-2.5 fill-current" />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="h-44 w-full flex items-center justify-center border-t border-b border-[#1E1E22] py-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={getRadarData(tasting)}>
                            <PolarGrid stroke="#232326" />
                            <PolarAngleAxis dataKey="subject" stroke="#8E8E93" fontSize={8} />
                            <Radar name="Taste" dataKey="value" stroke="#D09B6A" fill="#D09B6A" fillOpacity={0.2} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="space-y-2">
                        {tasting.flavors && tasting.flavors.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {tasting.flavors.map(fl => (
                              <span key={fl} className="text-[9px] bg-[#1E1E22] text-[#E4E4E7] px-2 py-0.5 rounded-full border border-[#232326]">{fl}</span>
                            ))}
                          </div>
                        )}
                        {tasting.negatives && tasting.negatives.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {tasting.negatives.map(neg => (
                              <span key={neg} className="text-[9px] bg-[#EF4444]/10 text-[#EF4444] px-2 py-0.5 rounded-full border border-[#EF4444]/20">{neg.split(' ')[0]}</span>
                            ))}
                          </div>
                        )}
                        {tasting.improvements && (
                          <div className="bg-[#1C1C1F]/60 p-2.5 rounded-lg text-xs text-[#A1A1AA] border border-[#232326]">
                            <span className="text-[10px] text-[#8E8E93] block font-semibold mb-0.5">次回への調整案</span>
                            <p className="line-clamp-2">{tasting.improvements}</p>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-[#1C1C1F] pt-3 flex justify-end">
                        <Link href={`/roasts/${id}/tasting/${dayNum}`}
                          className="text-xs text-[#8E8E93] hover:text-[#D09B6A] flex items-center gap-0.5 hover:underline">
                          テイスト評価を再編集
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col justify-between items-center h-full text-center p-6 gap-6 min-h-[280px]">
                      <div className="space-y-1">
                        <span className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider">Day {dayNum} 評価</span>
                        <div className="flex items-center gap-1.5 justify-center py-2">
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                          <span className="text-xs text-amber-500 font-semibold">評価待ち</span>
                        </div>
                        <p className="text-xs text-[#8E8E93] max-w-[200px]">
                          焙煎から {dayNum}日経過したタイミングでエイジングによるテイスト変化を記録します。
                        </p>
                      </div>
                      <Link href={`/roasts/${id}/tasting/${dayNum}`}
                        className="flex items-center justify-center gap-1 w-full py-3 rounded-xl bg-[#D09B6A]/10 hover:bg-[#D09B6A]/20 border border-[#D09B6A]/20 text-[#D09B6A] font-semibold text-xs transition-colors cursor-pointer">
                        <Plus className="w-3.5 h-3.5" />
                        テイスト入力を開始
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 6: Improvement log */}
        {tastings.some(t => t.improvements) && (
          <div className="bg-emerald-950/10 border border-emerald-900/20 p-5 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              集約された次期焙煎への改善アクション
            </h4>
            <div className="space-y-2">
              {tastings.filter(t => t.improvements).map(t => (
                <div key={t.id} className="text-xs flex gap-2">
                  <span className="font-bold text-[#D09B6A] whitespace-nowrap">Day {t.tastingDay}:</span>
                  <p className="text-[#E4E4E7]">{t.improvements}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
