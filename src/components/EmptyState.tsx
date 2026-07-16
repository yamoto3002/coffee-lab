import Link from 'next/link';
import { ArrowRight, FlaskConical } from 'lucide-react';

export default function EmptyState({ title, message, actionLabel, actionHref, icon }: { title: string; message: string; actionLabel?: string; actionHref?: string; icon?: React.ReactNode }) {
  return (
    <section className="empty-state">
      <div className="empty-state-orbit" aria-hidden="true">{icon || <FlaskConical className="h-7 w-7" />}</div>
      <h2 className="mt-5 text-lg font-semibold text-[var(--foreground)]">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">{message}</p>
      {actionLabel && actionHref && <Link href={actionHref} className="btn-primary mt-6 inline-flex items-center gap-2">{actionLabel}<ArrowRight className="h-4 w-4" /></Link>}
    </section>
  );
}
