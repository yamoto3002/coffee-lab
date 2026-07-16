import { Bean, Roast, RoastStep, Tasting } from '@/types';

type TapeEvent = { key: string; time: string; label: string; kind: string };

export default function RoastTape({ roast, steps = [], tastings = [], bean, compact = false }: { roast: Roast; steps?: RoastStep[]; tastings?: Tasting[]; bean?: Bean | null; compact?: boolean }) {
  const events: TapeEvent[] = [
    { key: 'charge', time: '00:00', label: '投入', kind: 'charge' },
    ...steps.filter(step => step.time !== '00:00').map(step => ({ key: step.id, time: step.time, label: step.memo || `火力${step.heat} / 風量${step.air}`, kind: /風量/.test(step.memo || '') ? 'air' : 'heat' })),
    ...(roast.yellowTime ? [{ key: 'yellow', time: roast.yellowTime, label: 'Yellow', kind: 'yellow' }] : []),
    ...(roast.firstCrackTime ? [{ key: 'first', time: roast.firstCrackTime, label: '1st Crack', kind: 'crack' }] : []),
    ...(roast.secondCrackTime ? [{ key: 'second', time: roast.secondCrackTime, label: '2nd Crack', kind: 'crack2' }] : []),
    ...(roast.dropTime ? [{ key: 'drop', time: roast.dropTime, label: 'Drop', kind: 'drop' }] : []),
    ...tastings.filter(t => t.status === 'completed').map(t => ({ key: t.id, time: `Day ${t.dayAfterRoast}`, label: `${t.score || '—'}点 ${t.flavors[0] || '味見'}`, kind: 'tasting' })),
  ];
  return <div className={`roast-tape ${compact ? 'is-compact' : ''}`} aria-label={`${bean?.name || roast.id}の実験記録`}>
    {events.map(event => <div key={event.key} className={`roast-tape-event is-${event.kind}`}><span className="roast-tape-dot" /><span className="roast-tape-time">{event.time}</span><strong>{event.label}</strong></div>)}
  </div>;
}
