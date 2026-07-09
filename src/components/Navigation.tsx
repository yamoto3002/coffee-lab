'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, Coffee, FlaskConical, Flame, Home, Plus, Settings } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { href: '/', label: 'ホーム', icon: Home },
  { href: '/beans', label: '生豆', icon: Coffee },
  { href: '/roasts', label: '焙煎', icon: Flame },
  { href: '/dashboard', label: '分析', icon: BarChart2 },
  { href: '/settings', label: '設定', icon: Settings },
];

export function CoffeeLabIcon({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <div className={clsx('relative flex items-center justify-center rounded-xl bg-[#090F18] ring-1 ring-cyan-300/30 neon-ring', className)} aria-hidden="true">
      <FlaskConical className="h-5 w-5 text-cyan-200" />
      <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#FB3D71] shadow-[0_0_18px_rgba(251,61,113,0.75)]" />
      <span className="absolute -bottom-1 left-2 h-2 w-2 rounded-full bg-[#FF8A3D] shadow-[0_0_14px_rgba(255,138,61,0.75)]" />
    </div>
  );
}

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-[#080E14]/95 px-4 py-6 backdrop-blur-xl md:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <CoffeeLabIcon />
          <div>
            <h1 className="text-lg font-bold tracking-normal text-[#F4F4F6]">Coffee Lab</h1>
            <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200/70">Roast Journal</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'tap-button relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium',
                  isActive ? 'bg-cyan-300/10 text-cyan-200 neon-ring' : 'text-slate-400 hover:bg-white/[0.04] hover:text-[#F4F4F6]'
                )}
              >
                {isActive && <span className="absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-r-full bg-cyan-300" />}
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 pt-4">
          <Link href="/roasts/new" className="tap-button flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-[#FF8A3D] px-4 py-3 text-sm font-bold text-[#080E14] shadow-lg shadow-cyan-500/15">
            <Plus className="h-4 w-4" />
            新規焙煎
          </Link>
        </div>
      </aside>

      <nav className="bottom-nav-safe fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#080E14]/92 shadow-2xl shadow-black/50 backdrop-blur md:hidden">
        <div className="grid h-16 grid-cols-6 items-end px-1">
          {navItems.slice(0, 2).map(item => <MobileItem key={item.href} item={item} pathname={pathname} />)}
          <div className="relative flex h-full flex-col items-center justify-center">
            <Link href="/roasts/new" className="tap-button -translate-y-3 rounded-2xl bg-gradient-to-r from-cyan-300 to-fuchsia-400 p-3 shadow-lg shadow-cyan-500/25" aria-label="新規焙煎">
              <Plus className="h-6 w-6 text-[#080E14]" />
            </Link>
            <span className="-translate-y-1 text-[9px] text-slate-400">新規</span>
          </div>
          {navItems.slice(2).map(item => <MobileItem key={item.href} item={item} pathname={pathname} />)}
        </div>
      </nav>
    </>
  );
}

function MobileItem({ item, pathname }: { item: typeof navItems[number]; pathname: string }) {
  const Icon = item.icon;
  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
  return (
    <Link href={item.href} className={clsx('tap-button flex h-full min-w-0 flex-col items-center justify-center gap-0.5 pt-1 text-[10px] font-medium', isActive ? 'text-cyan-200' : 'text-slate-500')}>
      <div className={clsx('flex h-6 w-6 items-center justify-center rounded-lg', isActive ? 'bg-cyan-300/15' : '')}>
        <Icon className="h-4 w-4" />
      </div>
      <span className="max-w-full truncate">{item.label}</span>
    </Link>
  );
}
