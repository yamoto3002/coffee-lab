'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BarChart2, Coffee, Ellipsis, Flame, Home, Plus, Settings } from 'lucide-react';
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
];

export function CoffeeLabIcon({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <Image src="/icon.svg" width={64} height={64} alt="" className={clsx('rounded-xl', className)} aria-hidden="true" priority />
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const firstMoreItemRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    window.requestAnimationFrame(() => firstMoreItemRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMoreOpen(false);
        moreButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [moreOpen]);

  return (
    <>
      <aside className="desktop-rail hidden h-screen w-60 shrink-0 flex-col border-r border-[var(--border)] px-4 py-6 md:flex">
        <div className="mb-9 flex items-center gap-3 px-2">
          <CoffeeLabIcon />
          <div>
            <div className="text-[1.05rem] font-bold tracking-[-.01em] text-[var(--foreground)]">Coffee Lab</div>
            <p className="mt-0.5 text-[.8125rem] text-[var(--muted-foreground)]">焙煎実験ノート</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5" aria-label="主要ナビゲーション">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={clsx(
                  'tap-button nav-item relative flex min-h-12 items-center gap-3 rounded-[10px] px-3 text-sm font-medium',
                  isActive ? 'nav-item-active font-semibold text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:bg-white/[0.035] hover:text-[var(--foreground)]'
                )}
              >
                <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={isActive ? 2.25 : 1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border)] pt-4">
          <p className="mb-3 px-2 text-[.8125rem] font-semibold text-[var(--muted-foreground)]">新しい実験</p>
          <Link href="/roasts/new" className="tap-button actuator-button flex min-h-12 w-full items-center justify-center gap-2 px-4 py-3 text-sm font-bold">
            <Plus className="h-4 w-4" />
            新規焙煎
          </Link>
        </div>
      </aside>

      {moreOpen && (
        <div id="mobile-more-menu" className="mobile-more-menu md:hidden" role="menu" aria-label="その他の画面">
          <Link ref={firstMoreItemRef} href="/dashboard" role="menuitem" onClick={() => setMoreOpen(false)} className="tap-button mobile-more-item">
            <BarChart2 className="h-5 w-5 text-[var(--accent)]" />
            <span><strong>分析</strong><small>記録から次の仮説を考える</small></span>
          </Link>
          <Link href="/settings" role="menuitem" onClick={() => setMoreOpen(false)} className="tap-button mobile-more-item">
            <Settings className="h-5 w-5 text-[var(--muted-foreground)]" />
            <span><strong>設定</strong><small>同期・バックアップ・レポート</small></span>
          </Link>
        </div>
      )}

      <nav className="mobile-dock bottom-nav-safe fixed inset-x-0 bottom-0 z-[var(--z-sticky)] md:hidden" aria-label="主要ナビゲーション">
        <div className="grid h-[5rem] grid-cols-5 items-stretch px-2">
          {mobileItems.map(item => <MobileItem key={item.href} item={item} pathname={pathname} />)}
          <button
            ref={moreButtonRef}
            type="button"
            aria-expanded={moreOpen}
            aria-controls="mobile-more-menu"
            onClick={() => setMoreOpen(open => !open)}
            className={clsx('tap-button mobile-nav-item', moreOpen || pathname.startsWith('/dashboard') || pathname.startsWith('/settings') ? 'is-active' : '')}
          >
            <span className="mobile-nav-icon"><Ellipsis className="h-5 w-5" /></span>
            <span>その他</span>
          </button>
        </div>
      </nav>
    </>
  );
}

function MobileItem({ item, pathname }: { item: typeof mobileItems[number]; pathname: string }) {
  const Icon = item.icon;
  const isActive = item.href === '/roasts'
    ? pathname.startsWith('/roasts') && !pathname.startsWith('/roasts/new')
    : pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
  const isPrimary = 'primary' in item && item.primary;
  return (
    <Link href={item.href} aria-current={isActive ? 'page' : undefined} className={clsx('tap-button mobile-nav-item', isPrimary ? 'is-primary' : '', isActive ? 'is-active' : '')}>
      <span className={clsx('mobile-nav-icon', isPrimary ? 'actuator-icon' : '')}>
        <Icon className={isPrimary ? 'h-6 w-6' : 'h-5 w-5'} strokeWidth={isPrimary || isActive ? 2.25 : 1.75} />
      </span>
      <span className="max-w-full truncate">{item.label}</span>
    </Link>
  );
}
