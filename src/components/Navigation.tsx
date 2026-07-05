'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Coffee, Flame, BarChart2, Settings, Plus } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { href: '/', label: 'ホーム', icon: Home },
  { href: '/beans', label: '生豆', icon: Coffee },
  { href: '/roasts', label: '焙煎', icon: Flame },
  { href: '/dashboard', label: '分析', icon: BarChart2 },
  { href: '/settings', label: '設定', icon: Settings },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[#232326] bg-[#0E0E10]/95 backdrop-blur-xl h-screen sticky top-0 px-4 py-6">
        {/* Logo */}
        <div className="mb-8 px-2 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D09B6A] to-[#8B5A2B] flex items-center justify-center font-bold text-[#0B0B0C] shadow-lg shadow-[#D09B6A]/20 text-sm">
            CL
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-wider text-[#F4F4F6]">Coffee Lab</h1>
            <p className="text-[10px] text-[#8E8E93] tracking-widest uppercase">Research DB</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                  isActive
                    ? "bg-[#D09B6A]/10 text-[#D09B6A]"
                    : "text-[#8E8E93] hover:text-[#F4F4F6] hover:bg-[#131315]"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] bg-gradient-to-b from-[#D09B6A] to-[#B37B4D] rounded-r-full" />
                )}
                <Icon className={clsx(
                  "w-4.5 h-4.5 transition-colors flex-shrink-0",
                  isActive ? "text-[#D09B6A]" : "text-[#8E8E93] group-hover:text-[#F4F4F6]"
                )} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-[#232326]">
          <Link
            href="/roasts/new"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#D09B6A] to-[#B37B4D] hover:from-[#E0AB7A] hover:to-[#C38B5D] text-[#0B0B0C] font-semibold text-sm transition-all duration-200 shadow-md shadow-[#D09B6A]/20 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            新規焙煎登録
          </Link>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bottom-nav-safe"
        style={{
          background: 'rgba(14, 14, 16, 0.95)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="flex items-end justify-around px-2 h-16">
          {/* First 2 nav items */}
          {navItems.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex flex-col items-center justify-center flex-1 h-full pt-1 gap-0.5 text-[10px] font-medium transition-all duration-200 active:scale-90",
                  isActive ? "text-[#D09B6A]" : "text-[#555558]"
                )}
              >
                <div className={clsx(
                  "w-6 h-6 flex items-center justify-center rounded-lg transition-all duration-200",
                  isActive ? "bg-[#D09B6A]/15" : ""
                )}>
                  <Icon className={clsx("w-4.5 h-4.5", isActive ? "text-[#D09B6A]" : "text-[#555558]")} />
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Center FAB for new roast */}
          <div className="flex flex-col items-center justify-center flex-none w-16 h-full relative">
            <Link
              href="/roasts/new"
              className="flex items-center justify-center w-12 h-12 rounded-2xl shadow-lg shadow-[#D09B6A]/30 active:scale-90 transition-all duration-150 -translate-y-3"
              style={{
                background: 'linear-gradient(135deg, #D09B6A 0%, #B37B4D 100%)',
              }}
              aria-label="新規焙煎登録"
            >
              <Plus className="w-6 h-6 text-[#0B0B0C]" />
            </Link>
            <span className="text-[9px] text-[#555558] -translate-y-1">焙煎</span>
          </div>

          {/* Last 3 nav items (skip roasts since FAB covers it) */}
          {navItems.slice(2).filter(i => i.href !== '/roasts').map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex flex-col items-center justify-center flex-1 h-full pt-1 gap-0.5 text-[10px] font-medium transition-all duration-200 active:scale-90",
                  isActive ? "text-[#D09B6A]" : "text-[#555558]"
                )}
              >
                <div className={clsx(
                  "w-6 h-6 flex items-center justify-center rounded-lg transition-all duration-200",
                  isActive ? "bg-[#D09B6A]/15" : ""
                )}>
                  <Icon className={clsx("w-4.5 h-4.5", isActive ? "text-[#D09B6A]" : "text-[#555558]")} />
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
