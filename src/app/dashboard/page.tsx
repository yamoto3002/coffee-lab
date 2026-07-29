'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, RefreshCw } from 'lucide-react';
import { DBService } from '@/lib/db';
import { addDateDays, diffDateDays, parseDateOnly, todayDateString } from '@/lib/date';
import { Roast, Tasting } from '@/types';

type CalendarItem = {
  id: string;
  roastId: string;
  label: '焙煎' | '1w' | '2w';
  href: string;
};

type CalendarDay = {
  key: string;
  day: number;
  current: boolean;
  today: boolean;
  items: CalendarItem[];
};

export default function TastingIndexPage() {
  const [roasts, setRoasts] = useState<Roast[]>([]);
  const [tastings, setTastings] = useState<Tasting[]>([]);
  const [syncing, setSyncing] = useState(false);

  const loadLocal = useCallback(() => {
    setRoasts(DBService.getRoasts());
    setTastings(DBService.getTastings());
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      await DBService.syncFromCloud();
      loadLocal();
    } finally {
      setSyncing(false);
    }
  }, [loadLocal]);

  useEffect(() => {
    const timer = window.setTimeout(loadLocal, 0);
    return () => window.clearTimeout(timer);
  }, [loadLocal]);

  const completedTastings = useMemo(
    () => tastings.filter(tasting => tasting.status === 'completed'),
    [tastings],
  );

  const orderedRoasts = useMemo(
    () => [...roasts].sort((a, b) => b.roastDate.localeCompare(a.roastDate) || b.id.localeCompare(a.id)),
    [roasts],
  );

  const tastingCount = useCallback(
    (roastId: string) => completedTastings.filter(tasting => tasting.roastId === roastId).length,
    [completedTastings],
  );

  const calendar = useMemo(() => buildCalendar(roasts), [roasts]);

  return (
    <div className="lab-shell min-h-dvh" data-surface="tasting">
      <header className="page-header px-5 py-5 md:px-8 md:py-7">
        <div className="mx-auto flex max-w-6xl items-end justify-between gap-4">
          <div>
            <h1 className="page-title">テイスティング</h1>
            <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">焙煎を選んで味見を記録</p>
          </div>
          <button
            type="button"
            onClick={() => void sync()}
            disabled={syncing}
            className="tap-button inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-[var(--muted-foreground)] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{syncing ? '同期中' : '同期'}</span>
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-6 md:px-8 md:py-8">
        <section aria-labelledby="roast-picker-title">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 id="roast-picker-title" className="section-heading">味見する焙煎</h2>
            <span className="font-mono text-xs text-[var(--text-faint)]">{orderedRoasts.length}件</span>
          </div>

          {orderedRoasts.length === 0 ? (
            <div className="empty-line">焙煎記録がありません。</div>
          ) : (
            <div className="tasting-roast-list">
              <div className="tasting-roast-head" aria-hidden="true">
                <span>焙煎</span><span>経過</span><span>味見</span><span />
              </div>
              {orderedRoasts.map(roast => (
                <Link
                  key={roast.id}
                  href={`/roasts/${roast.id}/tasting/new`}
                  className="tap-button tasting-roast-row"
                  data-testid={`tasting-roast-${roast.id}`}
                >
                  <strong className="font-mono">{roast.id}</strong>
                  <span className="font-mono">{Math.max(0, diffDateDays(roast.roastDate))}日</span>
                  <span className="font-mono">{tastingCount(roast.id)}回</span>
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="tasting-calendar-section" aria-labelledby="calendar-title">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 id="calendar-title" className="section-heading">味見の目安</h2>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">焙煎日・1週間後・2週間後</p>
            </div>
            <CalendarDays className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </div>
          <CalendarGrid monthLabel={calendar.monthLabel} days={calendar.days} />
        </section>
      </main>
    </div>
  );
}

function CalendarGrid({ days, monthLabel }: { days: CalendarDay[]; monthLabel: string }) {
  return (
    <div className="calendar-shell">
      <div className="mb-3 flex items-center justify-between gap-3">
        <strong className="font-mono text-sm">{monthLabel}</strong>
        <span className="text-xs text-[var(--text-faint)]">横にスクロールできます</span>
      </div>
      <div className="calendar-scroll">
        <div className="tasting-calendar">
          {['日', '月', '火', '水', '木', '金', '土'].map(label => (
            <span key={label} className="calendar-weekday">{label}</span>
          ))}
          {days.map(day => (
            <div
              key={day.key}
              className={`calendar-day ${day.current ? '' : 'is-outside'} ${day.today ? 'is-today' : ''}`}
            >
              <span className="calendar-date">{day.day}</span>
              <div className="calendar-events">
                {day.items.map(item => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="tap-button calendar-event"
                    aria-label={`${item.roastId} ${item.label}のテイスティング`}
                  >
                    <strong>{item.roastId}</strong>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildCalendar(roasts: Roast[]) {
  const now = parseDateOnly(todayDateString()) || new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const first = new Date(start);
  first.setDate(first.getDate() - start.getDay());
  const itemsByDate = new Map<string, CalendarItem[]>();

  const add = (date: string, item: CalendarItem) => {
    itemsByDate.set(date, [...(itemsByDate.get(date) || []), item]);
  };

  roasts.forEach(roast => {
    const href = `/roasts/${roast.id}/tasting/new`;
    add(roast.roastDate, { id: `${roast.id}-roast`, roastId: roast.id, label: '焙煎', href });
    add(addDateDays(roast.roastDate, 7), { id: `${roast.id}-1w`, roastId: roast.id, label: '1w', href });
    add(addDateDays(roast.roastDate, 14), { id: `${roast.id}-2w`, roastId: roast.id, label: '2w', href });
  });

  const days: CalendarDay[] = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return {
      key,
      day: date.getDate(),
      current: date.getMonth() === now.getMonth(),
      today: key === todayDateString(),
      items: (itemsByDate.get(key) || []).sort((a, b) => a.roastId.localeCompare(b.roastId)),
    };
  });

  return {
    monthLabel: `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`,
    days,
  };
}
