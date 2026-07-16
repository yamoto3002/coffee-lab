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

const mobileItems = [
  navItems[0],
  navItems[1],
  { href: '/roasts/new', label: '焙煎開始', icon: Flame, primary: true },
  navItems[2],
  navItems[3],
  navItems[4],
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
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--background)] px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <CoffeeLabIcon />
          <div>
            <div className="text-lg font-bold tracking-normal text-[#F4F4F6]">Coffee Lab</div>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">焙煎実験ノート</p>
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
                aria-current={isActive ? 'page' : undefined}
                className={clsx(
                  'tap-button relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium',
                  isActive ? 'bg-[#dca66c]/10 font-semibold text-[#efc18e]' : 'text-[var(--muted-foreground)] hover:bg-white/[0.035] hover:text-[var(--foreground)]'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 pt-4">
          <p className="mb-3 px-2 text-xs font-semibold text-[var(--muted-foreground)]">新しい実験</p>
          <Link href="/roasts/new" className="tap-button flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--primary)] px-4 py-3 text-sm font-bold text-[var(--primary-foreground)]">
            <Plus className="h-4 w-4" />
            新規焙煎
          </Link>
        </div>
      </aside>

      <nav className="bottom-nav-safe fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t border-[var(--border)] bg-[var(--background)] md:hidden" aria-label="主要ナビゲーション">
        <div className="grid h-[4.5rem] grid-cols-6 items-stretch px-1">
          {mobileItems.map(item => <MobileItem key={item.href} item={item} pathname={pathname} />)}
        </div>
      </nav>
    </>
  );
}

function MobileItem({ item, pathname }: { item: typeof mobileItems[number]; pathname: string }) {
  const Icon = item.icon;
  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
  return (
    <Link href={item.href} aria-current={isActive ? 'page' : undefined} className={clsx('tap-button relative flex h-full min-w-0 flex-col items-center justify-center gap-1 pt-1 text-[.65rem] font-medium', 'primary' in item && item.primary ? 'text-[var(--primary)]' : isActive ? 'font-semibold text-[var(--primary)]' : 'text-[var(--muted-foreground)]')}>
      <div className={clsx('flex h-7 w-7 items-center justify-center rounded-md', ('primary' in item && item.primary) || isActive ? 'bg-[color-mix(in_oklab,var(--primary)_14%,transparent)]' : '')}>
        <Icon className="h-4 w-4" />
      </div>
      <span className="max-w-full truncate">{item.label}</span>
      {isActive && <span className="absolute bottom-0 h-0.5 w-5 rounded-full bg-[var(--primary)]" />}
    </Link>
  );
}
