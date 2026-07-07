'use client';

import Link from 'next/link';
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
    <div className={clsx('relative flex items-center justify-center rounded-xl bg-[#17110D] ring-1 ring-[#D09B6A]/30', className)} aria-hidden="true">
      <svg viewBox="0 0 44 44" className="h-full w-full">
        <path d="M22 7c6 5 10 10 10 17a10 10 0 0 1-20 0c0-7 4-12 10-17Z" fill="#D09B6A" opacity="0.95" />
        <path d="M22 10c-2 7-1 14 5 22" fill="none" stroke="#17110D" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M11 31c6-7 11 5 22-3" fill="none" stroke="#F4C28A" strokeWidth="2" strokeLinecap="round" />
        <path d="M29 11c2 3 4 5 4 8" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden h-screen w-64 flex-col border-r border-[#232326] bg-[#0E0E10]/95 px-4 py-6 backdrop-blur-xl md:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <CoffeeLabIcon />
          <div>
            <h1 className="text-lg font-bold tracking-normal text-[#F4F4F6]">Coffee Lab</h1>
            <p className="text-[10px] uppercase tracking-widest text-[#8E8E93]">Roast Journal</p>
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
                  'relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition',
                  isActive ? 'bg-[#D09B6A]/10 text-[#D09B6A]' : 'text-[#8E8E93] hover:bg-[#131315] hover:text-[#F4F4F6]'
                )}
              >
                {isActive && <span className="absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-r-full bg-[#D09B6A]" />}
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#232326] pt-4">
          <Link href="/roasts/new" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D09B6A] px-4 py-3 text-sm font-semibold text-[#0B0B0C] transition active:scale-[0.98]">
            <Plus className="h-4 w-4" />
            新規焙煎
          </Link>
        </div>
      </aside>

      <nav className="bottom-nav-safe fixed bottom-0 left-0 right-0 z-50 border-t border-[#232326] bg-[#0E0E10]/95 backdrop-blur md:hidden">
        <div className="flex h-16 items-end justify-around px-2">
          {navItems.slice(0, 2).map(item => <MobileItem key={item.href} item={item} pathname={pathname} />)}
          <div className="relative flex h-full w-16 flex-none flex-col items-center justify-center">
            <Link href="/roasts/new" className="-translate-y-3 rounded-2xl bg-[#D09B6A] p-3 shadow-lg shadow-[#D09B6A]/25 active:scale-90" aria-label="新規焙煎">
              <Plus className="h-6 w-6 text-[#0B0B0C]" />
            </Link>
            <span className="-translate-y-1 text-[9px] text-[#555558]">焙煎</span>
          </div>
          {navItems.slice(3).map(item => <MobileItem key={item.href} item={item} pathname={pathname} />)}
        </div>
      </nav>
    </>
  );
}

function MobileItem({ item, pathname }: { item: typeof navItems[number]; pathname: string }) {
  const Icon = item.icon;
  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
  return (
    <Link href={item.href} className={clsx('flex h-full flex-1 flex-col items-center justify-center gap-0.5 pt-1 text-[10px] font-medium transition active:scale-90', isActive ? 'text-[#D09B6A]' : 'text-[#555558]')}>
      <div className={clsx('flex h-6 w-6 items-center justify-center rounded-lg', isActive ? 'bg-[#D09B6A]/15' : '')}>
        <Icon className="h-4 w-4" />
      </div>
      <span>{item.label}</span>
    </Link>
  );
}
