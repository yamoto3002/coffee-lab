'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, FileText, Star, Trash2 } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DBService, getAgingDays, secondsToTime, timeToSeconds } from '@/lib/db';
import { Bean, Roast, RoastStep, Tasting } from '@/types';

export default function RoastDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [roast, setRoast] = useState<Roast | null>(null);
  const [bean, setBean] = useState<Bean | null>(null);
  const [steps, setSteps] = useState<RoastStep[]>([]);
  const [tastings, setTastings] = useState<Tasting[]>([]);

  useEffect(() => {
    const currentRoast = DBService.getRoastById(id);
    if (!currentRoast) {
      router.push('/roasts');
      return;
    }
    setRoast(currentRoast);
    setBean(DBService.getBeanById(currentRoast.beanId) || null);
    setSteps(DBService.getRoastSteps(id));
    setTastings(DBService.getTastingsForRoast(id));
  }, [id, router]);

  const handleDelete = () => {
    if (!roast) return;
    if (!confirm(`焙煎記録 ${roast.id} を削除しますか？削除すると投入量 ${roast.greenWeight}g を生豆在庫へ戻します。`)) return;
    DBService.deleteRoast(id);
    router.push('/roasts');
  };

  if (!roast) return null;

  const chartData = steps.map(step => ({
    secs: timeToSeconds(step.time),
    time: step.time,
    heat: step.heat,
    air: step.air,
    memo: step.memo || '',
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#232326] bg-[#0E0E10]/95 px-4 py-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/roasts" className="rounded-xl p-2 text-[#8E8E93] hover:bg-[#232326] hover:text-[#F4F4F6]">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-lg font-bold tracking-wide md:text-xl">
              <span>焙煎 {roast.id}</span>
              <span className="rounded-full bg-[#1C1C1F] px-2.5 py-0.5 font-mono text-xs font-normal text-[#D09B6A]">{getAgingDays(roast.roastDate)}日経過</span>
            </h1>
            <p className="text-xs text-[#8E8E93]">{bean ? `[${bean.country}] ${bean.name}` : '生豆不明'}</p>
          </div>
        </div>
        <button onClick={handleDelete} className="flex items-center gap-1.5 rounded-xl border border-red-900/20 bg-red-950/20 px-3.5 py-2.5 text-xs font-semibold text-[#EF4444]">
          <Trash2 className="h-3.5 w-3.5" />
          削除
        </button>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 pb-24 md:p-6">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Panel title="生豆">
            {bean ? (
              <div className="space-y-2">
                <h2 className="text-base font-bold">{bean.name}</h2>
                <div className="grid grid-cols-2 gap-2 text-xs text-[#A1A1AA]">
                  <span>国: <strong className="text-[#F4F4F6]">{bean.country}</strong></span>
                  <span>精製: <strong className="text-[#F4F4F6]">{bean.process}</strong></span>
                  <span>品種: <strong className="text-[#F4F4F6]">{bean.variety || '-'}</strong></span>
                  <span>在庫: <strong className="text-[#F4F4F6]">{bean.currentWeight}g</strong></span>
                </div>
              </div>
            ) : <p className="text-sm text-[#EF4444]">生豆データが見つかりません。</p>}
          </Panel>

          <Panel title="重量">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="投入量" value={`${roast.greenWeight}g`} />
              <Metric label="焙煎後" value={`${roast.roastedWeight}g`} />
            </div>
            <div className="mt-4 flex justify-between border-t border-[#232326] pt-3 font-mono text-sm">
              <span className="text-[#8E8E93]">Loss</span>
              <strong>{roast.lossRatio}%</strong>
            </div>
          </Panel>

          <Panel title="時間">
            <div className="grid grid-cols-3 gap-2">
              <Metric label="Yellow" value={roast.yellowTime || '-'} />
              <Metric label="1st" value={roast.firstCrackTime || '-'} />
              <Metric label="Drop" value={roast.dropTime || '-'} />
            </div>
            <div className="mt-4 flex justify-between border-t border-[#232326] pt-3 font-mono text-sm">
              <span className="text-[#8E8E93]">Dev</span>
              <strong className="text-[#D09B6A]">{roast.developmentTime} / {roast.developmentRatio}%</strong>
            </div>
          </Panel>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="焙煎プロファイル">
            <div className="h-72">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#232326" />
                    <XAxis dataKey="secs" type="number" domain={[0, 'dataMax + 30']} tickFormatter={value => secondsToTime(Number(value))} stroke="#8E8E93" fontSize={10} />
                    <YAxis domain={[0, 8]} ticks={[0, 2, 4, 6, 8]} stroke="#8E8E93" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#131315', borderColor: '#232326' }} labelFormatter={value => secondsToTime(Number(value))} />
                    <Line type="monotone" dataKey="heat" name="火力" stroke="#D09B6A" strokeWidth={2.5} />
                    <Line type="monotone" dataKey="air" name="風量" stroke="#3B82F6" strokeWidth={2.5} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <Empty text="プロファイル情報がありません。" />}
            </div>
          </Panel>

          <Panel title="タイムライン">
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {steps.length === 0 ? <Empty text="タイムライン未登録" /> : steps.map(step => (
                <div key={step.id} className="flex items-center gap-3 rounded-xl border border-[#232326] bg-[#1A1A1E] p-2.5 text-xs">
                  <span className="w-11 font-mono font-bold text-[#D09B6A]">{step.time}</span>
                  <span className="rounded bg-[#D09B6A]/10 px-1.5 py-0.5 font-mono font-bold text-[#D09B6A]">H{step.heat}</span>
                  <span className="rounded bg-blue-900/20 px-1.5 py-0.5 font-mono font-bold text-[#3B82F6]">A{step.air}</span>
                  <span className="truncate text-[#8E8E93]">{step.memo}</span>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        {roast.notes && (
          <Panel title="メモ">
            <div className="flex gap-2 text-sm text-[#E4E4E7]">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#D09B6A]" />
              <p className="whitespace-pre-wrap leading-relaxed">{roast.notes}</p>
            </div>
          </Panel>
        )}

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8E8E93]">テイスティング</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {([7, 10, 14] as const).map(day => {
              const tasting = tastings.find(item => item.tastingDay === day);
              const completed = tasting?.status === 'completed';
              return (
                <div key={day} className="rounded-2xl border border-[#232326] bg-[#131315] p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-[#8E8E93]">Day {day}</span>
                      <p className="mt-1 flex items-center gap-1 text-xs text-[#8E8E93]"><Calendar className="h-3.5 w-3.5" />{tasting?.tastingDate || '未記録'}</p>
                    </div>
                    {completed && tasting ? <strong className="font-mono text-2xl text-[#D09B6A]">{tasting.score}</strong> : <span className="text-xs text-[#8E8E93]">待機中</span>}
                  </div>
                  {completed && tasting ? (
                    <div className="mt-4 space-y-3">
                      <div className="flex text-[#D09B6A]">{Array.from({ length: tasting.recommendationRating }).map((_, index) => <Star key={index} className="h-3 w-3 fill-current" />)}</div>
                      {tasting.flavors.length > 0 && <p className="text-xs text-[#A1A1AA]">{tasting.flavors.join(', ')}</p>}
                      <Link href={`/roasts/${id}/tasting/${day}`} className="inline-flex text-xs font-semibold text-[#D09B6A]">編集する</Link>
                    </div>
                  ) : (
                    <Link href={`/roasts/${id}/tasting/${day}`} className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-[#D09B6A]/20 bg-[#D09B6A]/10 py-3 text-xs font-semibold text-[#D09B6A]">テイスティングを記録</Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#232326] bg-[#131315] p-5">
      <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">
        <Clock className="h-3.5 w-3.5 text-[#D09B6A]" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#1C1C1F] p-3 text-center">
      <span className="block text-[10px] text-[#8E8E93]">{label}</span>
      <strong className="font-mono text-lg">{value}</strong>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex h-full min-h-32 items-center justify-center rounded-xl border border-dashed border-[#232326] text-sm text-[#8E8E93]">{text}</div>;
}
