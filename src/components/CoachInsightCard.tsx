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
      <p className={featured ? 'mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base' : 'mt-3 text-sm leading-6 text-slate-300'}>{insight.message}</p>
      {insight.reason && <p className="mt-3 border-l border-white/10 pl-3 text-xs leading-5 text-slate-500">根拠：{insight.reason}</p>}
      {insight.actionLabel && <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: insight.color }}>{insight.actionLabel}<ArrowUpRight className="h-4 w-4" /></span>}
    </>
  );

  const className = `coach-card ${featured ? 'coach-card-featured' : ''}`;
  return insight.actionHref ? <Link href={insight.actionHref} className={`${className} tap-button`}>{body}</Link> : <article className={className}>{body}</article>;
}
