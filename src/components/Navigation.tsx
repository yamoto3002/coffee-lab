'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Bean, ClipboardList, Flame, Plus, Settings, TestTube2 } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { href: '/beans', label: '生豆', icon: Bean },
  { href: '/roasts', label: '焙煎', icon: ClipboardList },
  { href: '/roasts/new', label: '新規焙煎', icon: Plus, primary: true },
  { href: '/dashboard', label: '味見', desktopLabel: 'テイスティング', icon: TestTube2 },
  { href: '/settings', label: '設定', icon: Settings },
];

export function CoffeeLabIcon({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <Image
      src="/icon.svg"
      width={64}
      height={64}
      alt=""
      className={clsx('rounded-[10px]', className)}
      aria-hidden="true"
      priority
    />
  );
}

function isItemActive(pathname: string, href: string) {
  if (href === '/roasts/new') return pathname.startsWith('/roasts/new');
  if (href === '/roasts') return pathname.startsWith('/roasts') && !pathname.startsWith('/roasts/new');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      <aside className="desktop-rail hidden h-dvh w-56 shrink-0 flex-col lg:flex">
        <div className="flex items-center gap-3 px-5 pb-8 pt-6">
          <CoffeeLabIcon />
          <div>
            <div className="text-[1.02rem] font-bold tracking-[-.015em] text-[var(--foreground)]">Coffee Lab</div>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">SY-121N log</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3" aria-label="主要ナビゲーション">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = isItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'tap-button nav-item relative flex min-h-12 items-center gap-3 rounded-[10px] px-3 text-sm',
                  item.primary && 'nav-item-primary',
                  active ? 'nav-item-active font-semibold' : 'text-[var(--muted-foreground)]',
                )}
              >
                <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                <span>{item.desktopLabel || item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-5 pb-6 text-[.6875rem] leading-5 text-[var(--text-faint)]">SY-121N</div>
      </aside>

      <nav className="mobile-dock lg:hidden" aria-label="主要ナビゲーション">
        <div className="mobile-dock-grid">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = isItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'tap-button mobile-nav-item',
                  item.primary && 'is-primary',
                  active && 'is-active',
                )}
              >
                <span className="mobile-nav-icon">
                  {item.primary ? <Flame className="h-[1.35rem] w-[1.35rem]" /> : <Icon className="h-[1.18rem] w-[1.18rem]" />}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
