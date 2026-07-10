import Link from 'next/link';
import { ArrowRight, FlaskConical } from 'lucide-react';

export default function EmptyState({ title, message, actionLabel, actionHref, icon }: { title: string; message: string; actionLabel?: string; actionHref?: string; icon?: React.ReactNode }) {
  return (
    <section className="empty-state">
      <div className="empty-state-orbit" aria-hidden="true">{icon || <FlaskConical className="h-7 w-7" />}</div>
      <h2 className="mt-6 text-xl font-semibold text-white">{title}</h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">{message}</p>
      {actionLabel && actionHref && <Link href={actionHref} className="btn-primary mt-6 inline-flex items-center gap-2">{actionLabel}<ArrowRight className="h-4 w-4" /></Link>}
    </section>
  );
}
