'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { DBService } from '@/lib/db';
import { Bean, Roast, Tasting } from '@/types';

export default function ReportPage() {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [roasts, setRoasts] = useState<Roast[]>([]);
  const [tastings, setTastings] = useState<Tasting[]>([]);

  useEffect(() => {
    setBeans(DBService.getBeans());
    setRoasts(DBService.getRoasts());
    setTastings(DBService.getTastings());
  }, []);

  const completedTastings = tastings.filter(tasting => tasting.status === 'completed');
  const totalStock = beans.reduce((sum, bean) => sum + bean.currentWeight, 0);
  const avgScore = useMemo(() => {
    if (completedTastings.length === 0) return null;
    return Math.round((completedTastings.reduce((sum, tasting) => sum + tasting.score, 0) / completedTastings.length) * 10) / 10;
  }, [completedTastings]);

  const beanName = (id: string) => {
    const bean = beans.find(item => item.id === id);
    return bean ? `${bean.country} / ${bean.name}` : id;
  };

  return (
    <div className="min-h-screen bg-[#F7F3EE] text-[#1C1713] print:bg-white">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#D8CFC5] bg-[#F7F3EE]/95 px-6 py-4 print:hidden">
        <Link href="/settings" className="flex items-center gap-2 text-sm font-semibold text-[#5B4533]">
          <ArrowLeft className="h-4 w-4" />
          設定へ戻る
        </Link>
        <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-[#1C1713] px-4 py-2 text-sm font-semibold text-white">
          <Printer className="h-4 w-4" />
          印刷 / PDF保存
        </button>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10 print:px-0">
        <section className="space-y-3">
          <p className="text-sm uppercase tracking-[0.2em] text-[#8B6B51]">Coffee Lab Report</p>
          <h1 className="text-4xl font-bold tracking-normal">焙煎記録レポート</h1>
          <p className="text-sm text-[#6E625A]">出力日: {new Date().toLocaleDateString('ja-JP')}</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-4">
          <Metric label="登録生豆" value={`${beans.length} 件`} />
          <Metric label="総在庫" value={`${totalStock.toLocaleString()}g`} />
          <Metric label="焙煎ログ" value={`${roasts.length} 件`} />
          <Metric label="平均評価" value={avgScore === null ? '-' : `${avgScore}点`} />
        </section>

        <ReportSection title="生豆一覧">
          {beans.length === 0 ? (
            <Empty text="生豆データがありません。" />
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#D8CFC5] text-left text-[#6E625A]">
                  <th className="py-2">ID</th>
                  <th>名前</th>
                  <th>国</th>
                  <th>精製</th>
                  <th>Crop</th>
                  <th className="text-right">在庫</th>
                </tr>
              </thead>
              <tbody>
                {beans.map(bean => (
                  <tr key={bean.id} className="border-b border-[#E8DED4]">
                    <td className="py-2 font-mono">{bean.id}</td>
                    <td>{bean.name}</td>
                    <td>{bean.country}</td>
                    <td>{bean.process}</td>
                    <td>{bean.cropYear || '-'}</td>
                    <td className="text-right font-mono">{bean.currentWeight}g</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ReportSection>

        <ReportSection title="焙煎ログ">
          {roasts.length === 0 ? (
            <Empty text="焙煎ログがありません。" />
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#D8CFC5] text-left text-[#6E625A]">
                  <th className="py-2">ID</th>
                  <th>焙煎日</th>
                  <th>生豆</th>
                  <th className="text-right">投入</th>
                  <th className="text-right">焙煎後</th>
                  <th className="text-right">Dev</th>
                  <th className="text-right">Loss</th>
                </tr>
              </thead>
              <tbody>
                {roasts.map(roast => (
                  <tr key={roast.id} className="border-b border-[#E8DED4]">
                    <td className="py-2 font-mono">{roast.id}</td>
                    <td>{roast.roastDate}</td>
                    <td>{beanName(roast.beanId)}</td>
                    <td className="text-right font-mono">{roast.greenWeight}g</td>
                    <td className="text-right font-mono">{roast.roastedWeight}g</td>
                    <td className="text-right font-mono">{roast.developmentRatio}%</td>
                    <td className="text-right font-mono">{roast.lossRatio}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ReportSection>

        <ReportSection title="テイスティング">
          {completedTastings.length === 0 ? (
            <Empty text="テイスティング結果がありません。" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {completedTastings.map(tasting => (
                <div key={tasting.id} className="rounded-lg border border-[#D8CFC5] bg-white/60 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-sm text-[#8B6B51]">{tasting.roastId} / Day {tasting.tastingDay}</p>
                      <p className="text-xs text-[#6E625A]">{tasting.tastingDate}</p>
                    </div>
                    <strong className="font-mono text-xl">{tasting.score}点</strong>
                  </div>
                  {tasting.flavors.length > 0 && <p className="mt-3 text-sm">Flavor: {tasting.flavors.join(', ')}</p>}
                  {tasting.improvements && <p className="mt-2 text-sm text-[#6E625A]">{tasting.improvements}</p>}
                </div>
              ))}
            </div>
          )}
        </ReportSection>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#D8CFC5] bg-white/60 p-4">
      <span className="block text-xs text-[#6E625A]">{label}</span>
      <strong className="mt-1 block font-mono text-2xl">{value}</strong>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border border-[#D8CFC5] bg-white/50 p-5 print:border-[#BBBBBB]">
      <h2 className="text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-[#D8CFC5] p-6 text-center text-sm text-[#6E625A]">{text}</p>;
}
