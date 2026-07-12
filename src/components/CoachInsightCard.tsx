import Link from 'next/link';
import { ArrowUpRight, Beaker, BookOpen, Bot, Coffee, FlaskConical, Lightbulb, TriangleAlert } from 'lucide-react';
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
        <span className="coach-insight-icon" style={{ color: insight.color, backgroundColor: `${insight.color}18`, borderColor: `${insight.color}33` }}>
          {featured ? <Bot className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="eyebrow" style={{ color: insight.color }}>AI Roast Coach</span>
            {insight.priority === 'high' && <span className="status-pill border-white/10 bg-white/[0.05] text-slate-300">NEXT</span>}
          </div>
          <h2 className={featured ? 'mt-2 text-xl font-semibold tracking-tight text-white md:text-2xl' : 'mt-2 text-base font-semibold leading-snug text-white'}>{insight.title}</h2>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        <InsightSection label="Observation" body={observation || '利用できる記録を確認しています。'} />
        <InsightSection label="Interpretation" body={interpretation} />
        <InsightSection label="Next Experiment" body={nextExperiment} accent={insight.color} />
      </div>
      {insight.actionLabel && <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: insight.color }}>{insight.actionLabel}<ArrowUpRight className="h-4 w-4" /></span>}
    </>
  );

  const className = `coach-card ${featured ? 'coach-card-featured' : ''}`;
  return insight.actionHref ? <Link href={insight.actionHref} className={`${className} tap-button`}>{body}</Link> : <article className={className}>{body}</article>;
}

function InsightSection({ label, body, accent }: { label: string; body: string; accent?: string }) {
  return (
    <div className="grid gap-1 border-l border-white/[0.09] py-1 pl-3 sm:grid-cols-[8.5rem_1fr] sm:items-start sm:gap-3">
      <span className="block text-[9px] font-bold uppercase tracking-[.16em] text-slate-500" style={accent ? { color: accent } : undefined}>{label}</span>
      <p className="text-xs leading-5 text-slate-300">{body}</p>
    </div>
  );
}
