'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { DBService } from '@/lib/db';
import { formatDate, todayDateString } from '@/lib/date';
import { Bean, Roast, Tasting } from '@/types';

export default function ReportPage() {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [roasts, setRoasts] = useState<Roast[]>([]);
  const [tastings, setTastings] = useState<Tasting[]>([]);

  const load = useCallback(() => {
    setBeans(DBService.getBeans());
    setRoasts(DBService.getRoasts());
    setTastings(DBService.getTastings());
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const completedTastings = tastings.filter(tasting => tasting.status === 'completed');
  const totalPurchaseWeight = beans.reduce((sum, bean) => sum + bean.initialWeight, 0);
  const avgScore = useMemo(() => {
    if (completedTastings.length === 0) return null;
    return Math.round((completedTastings.reduce((sum, tasting) => sum + tasting.score, 0) / completedTastings.length) * 10) / 10;
  }, [completedTastings]);

  const beanName = (id: string) => {
    const bean = beans.find(item => item.id === id);
    return bean ? `${bean.country} / ${bean.name}` : id;
  };

  return (
    <div className="lab-shell min-h-screen print:bg-white print:text-black">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#080b14]/88 px-5 py-4 backdrop-blur-xl print:hidden md:px-8">
        <Link href="/settings" className="tap-button flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-cyan-100">
          <ArrowLeft className="h-4 w-4" />
          設定へ戻る
        </Link>
        <button onClick={() => window.print()} className="btn-primary tap-button flex items-center gap-2">
          <Printer className="h-4 w-4" />
          印刷 / PDF保存
        </button>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-5 py-9 pb-28 print:px-0 md:px-8">
        <section className="space-y-3">
          <p className="eyebrow text-cyan-200 print:text-slate-600">Coffee Lab Report</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-.04em] text-white print:text-black">焙煎記録レポート</h1>
          <p className="mt-2 text-sm text-slate-400 print:text-slate-600">出力日: {formatDate(todayDateString())}</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-4">
          <Metric label="生豆" value={`${beans.length}件`} />
          <Metric label="購入量合計" value={`${totalPurchaseWeight.toLocaleString()}g`} />
          <Metric label="焙煎ログ" value={`${roasts.length}件`} />
          <Metric label="平均評価" value={avgScore === null ? '-' : `${avgScore}点`} />
        </section>

        <ReportSection title="生豆一覧">
          {beans.length === 0 ? (
            <Empty text="生豆データがありません。" />
          ) : (
            <table className="report-table">
              <thead>
                <tr><th>ID</th><th>生豆</th><th>精製</th><th>購入日</th><th>購入量</th></tr>
              </thead>
              <tbody>
                {beans.map(bean => (
                  <tr key={bean.id}>
                    <td>{bean.id}</td>
                    <td>{bean.country} / {bean.name}</td>
                    <td>{bean.process}</td>
                    <td>{formatDate(bean.purchaseDate)}</td>
                    <td>{bean.initialWeight}g</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ReportSection>

        <ReportSection title="焙煎ログ">
          {roasts.length === 0 ? (
            <Empty text="焙煎記録がありません。" />
          ) : (
            <table className="report-table">
              <thead>
                <tr><th>ID</th><th>日付</th><th>生豆</th><th>投入</th><th>焙煎後</th><th>Loss</th><th>1st</th><th>2nd</th><th>Drop</th><th>Dev</th></tr>
              </thead>
              <tbody>
                {roasts.map(roast => (
                  <tr key={roast.id}>
                    <td>{roast.id}</td>
                    <td>{formatDate(roast.roastDate)}</td>
                    <td>{beanName(roast.beanId)}</td>
                    <td>{roast.greenWeight}g</td>
                    <td>{roast.roastedWeight}g</td>
                    <td>{roast.lossRatio}%</td>
                    <td>{roast.firstCrackTime || '-'}</td>
                    <td>{roast.secondCrackTime || '-'}</td>
                    <td>{roast.dropTime || '-'}</td>
                    <td>{roast.developmentRatio === null ? '不明' : `${roast.developmentRatio}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ReportSection>

        <ReportSection title="テイスティング">
          {completedTastings.length === 0 ? (
            <Empty text="テイスティング記録がありません。" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {completedTastings.map(tasting => (
                <div key={tasting.id} className="lab-card-soft rounded-2xl p-4 print:border-slate-200 print:bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-bold">{tasting.roastId} / Day {tasting.dayAfterRoast}</p>
                      <p className="text-xs text-slate-400 print:text-slate-600">{formatDate(tasting.tastingDate)}{tasting.doseGrams > 0 ? ` / ${tasting.doseGrams}g` : ''}</p>
                    </div>
                    <strong className="font-mono text-2xl" style={{ color: tasting.impressionColor }}>{tasting.score}</strong>
                  </div>
                  {tasting.flavors.length > 0 && <p className="mt-3 text-sm text-slate-200 print:text-slate-800">{tasting.flavors.join(', ')}</p>}
                  {tasting.notes && <p className="mt-2 text-xs leading-relaxed text-slate-400 print:text-slate-600">{tasting.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </ReportSection>
      </main>

      <style jsx global>{`
        .report-table {
          width: 100%;
          border-collapse: collapse;
          background: rgba(255,255,255,.035);
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 16px;
          overflow: hidden;
          font-size: 12px;
        }
        .report-table th,
        .report-table td {
          border-bottom: 1px solid rgba(255,255,255,.08);
          padding: 10px;
          text-align: left;
          vertical-align: top;
        }
        .report-table th {
          color: #b9c2d1;
          background: rgba(255,255,255,.065);
          font-weight: 700;
        }
        @media print {
          .report-table { background: white; border-color: #d7dce5; color: #111827; }
          .report-table th, .report-table td { border-color: #e5e7eb; }
          .report-table th { color: #4b5563; background: #f3f4f6; }
        }
      `}</style>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="lab-card-soft rounded-2xl p-4 print:border-slate-200 print:bg-white">
      <span className="text-xs text-slate-400 print:text-slate-600">{label}</span>
      <strong className="mt-1 block font-mono text-2xl text-white print:text-black">{value}</strong>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-white print:text-black">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400 print:border-slate-300 print:text-slate-600">{text}</div>;
}
