import Link from 'next/link';
import { ArrowUpRight, Beaker, BookOpen, Coffee, Compass, FlaskConical, Lightbulb, TriangleAlert } from 'lucide-react';
import { CoachInsight } from '@/lib/coach';

const icons = {
  roast: FlaskConical,
  tasting: Coffee,
  inventory: Beaker,
  learning: BookOpen,
  warning: TriangleAlert,
  experiment: Lightbulb,
};

export default function CoachInsightCard({ insight, featured = false }: { insight: CoachInsight; featured?: boolean }) {
  const Icon = icons[insight.type];
  const observation = insight.observation || insight.reason;
  const interpretation = insight.interpretation || insight.message;
  const nextExperiment = insight.nextExperiment || (insight.actionLabel ? `${insight.actionLabel}から、次の比較材料を増やしましょう。` : '次回も同じ観点を記録し、比較できる材料を増やしましょう。');
  const body = (
    <>
      <div className="flex items-start gap-3">
        <span className="coach-insight-icon border-[var(--border)] bg-[var(--surface-raised)] text-[var(--primary)]">
          {featured ? <Compass className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="eyebrow text-[var(--muted-foreground)]">比較メモ</span>
            {insight.priority === 'high' && <span className="status-pill border-[var(--border)] bg-[var(--surface-raised)] text-slate-200">次に確認</span>}
          </div>
          <h2 className={featured ? 'mt-1 text-lg font-semibold text-[var(--foreground)]' : 'mt-1 text-base font-semibold leading-snug text-[var(--foreground)]'}>{insight.title}</h2>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        <InsightSection label="観察" body={observation || '利用できる記録を確認しています。'} />
        <InsightSection label="読み取り" body={interpretation} />
        <InsightSection label="次の実験" body={nextExperiment} accent />
      </div>
      {insight.actionLabel && <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--primary)]">{insight.actionLabel}<ArrowUpRight className="h-4 w-4" /></span>}
    </>
  );

  const className = `coach-card ${featured ? 'coach-card-featured' : ''}`;
  return insight.actionHref ? <Link href={insight.actionHref} className={`${className} tap-button`}>{body}</Link> : <article className={className}>{body}</article>;
}

function InsightSection({ label, body, accent = false }: { label: string; body: string; accent?: boolean }) {
  return (
    <div className="grid gap-1 border-t border-[var(--border)] py-2.5 first:border-t-0 sm:grid-cols-[6rem_1fr] sm:items-start sm:gap-3">
      <span className={accent ? 'text-sm font-semibold text-[var(--primary)]' : 'text-sm font-semibold text-[var(--muted-foreground)]'}>{label}</span>
      <p className="text-sm leading-6 text-slate-200">{body}</p>
    </div>
  );
}
