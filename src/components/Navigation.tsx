'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { BarChart2, Coffee, Flame, Home, Plus, Settings } from 'lucide-react';
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
    <Image src="/icon.svg" width={64} height={64} alt="" className={clsx('rounded-xl', className)} aria-hidden="true" priority />
  );
}

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-[#dca66c]/10 bg-[#0b0908]/92 px-4 py-6 backdrop-blur-xl md:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <CoffeeLabIcon />
          <div>
            <h1 className="text-lg font-bold tracking-normal text-[#F4F4F6]">Coffee Lab</h1>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#dca66c]/75">Roast Journal</p>
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
                  isActive ? 'bg-[#dca66c]/10 text-[#efc18e] neon-ring' : 'text-slate-400 hover:bg-white/[0.035] hover:text-[#F4F0EA]'
                )}
              >
                {isActive && <span className="absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-r-full bg-[#dca66c]" />}
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 pt-4">
          <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">New experiment</p>
          <Link href="/roasts/new" className="tap-button flex w-full items-center justify-center gap-2 rounded-full bg-[#dca66c] px-4 py-3 text-sm font-bold text-[#160f09] shadow-lg shadow-black/20">
            <Plus className="h-4 w-4" />
            新規焙煎
          </Link>
        </div>
      </aside>

      <nav className="bottom-nav-safe fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#080b14]/88 shadow-2xl shadow-black/50 backdrop-blur-xl md:hidden">
        <div className="grid h-[4.25rem] grid-cols-6 items-end px-1">
          {navItems.slice(0, 2).map(item => <MobileItem key={item.href} item={item} pathname={pathname} />)}
          <div className="relative flex h-full flex-col items-center justify-center">
            <Link href="/roasts/new" className="tap-button -translate-y-4 rounded-2xl border border-white/30 bg-gradient-to-br from-cyan-200 via-cyan-300 to-fuchsia-400 p-3 shadow-lg shadow-cyan-500/30" aria-label="新規焙煎">
              <Plus className="h-6 w-6 text-[#080E14]" />
            </Link>
            <span className="-translate-y-1 text-[9px] font-medium text-slate-300">焙煎</span>
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
    <Link href={item.href} className={clsx('tap-button relative flex h-full min-w-0 flex-col items-center justify-center gap-0.5 pt-1 text-[10px] font-medium', isActive ? 'text-cyan-200' : 'text-slate-500')}>
      <div className={clsx('flex h-6 w-6 items-center justify-center rounded-lg', isActive ? 'bg-cyan-300/15' : '')}>
        <Icon className="h-4 w-4" />
      </div>
      <span className="max-w-full truncate">{item.label}</span>
      {isActive && <span className="absolute bottom-1 h-0.5 w-4 rounded-full bg-cyan-200 shadow-[0_0_8px_rgba(0,240,255,.8)]" />}
    </Link>
  );
}
