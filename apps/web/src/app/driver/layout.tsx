'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SafarLogo } from '../../components/ui/safar-logo';
import { useAuth } from '../../context/auth-context';
import { AuthGuard } from '../../components/auth/auth-guard';
import { UserRole } from '@safar/types';
import {
  Home,
  Route,
  Navigation,
  CheckSquare,
  User,
  Car,
  LogOut,
} from 'lucide-react';

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, logout } = useAuth();

  const navItems = [
    { href: '/driver', label: 'Console', icon: Home },
    { href: '/driver/duty', label: 'Duty', icon: Car },
    { href: '/driver/trips', label: 'Trips', icon: Route },
    { href: '/driver/navigation', label: 'Navigation', icon: Navigation },
    { href: '/driver/verification', label: 'Verify', icon: CheckSquare },
    { href: '/driver/profile', label: 'Profile', icon: User },
  ];

  const driverName = profile?.fullName || 'Driver';

  const isNavActive = (href: string) => {
    if (href === '/driver') {
      return pathname === '/driver';
    }
    return pathname.startsWith(href);
  };

  return (
    <AuthGuard allowedRoles={[UserRole.DRIVER, UserRole.DISPATCHER]}>
      <div className="min-h-screen bg-[#FDFBF7] text-charcoal-900 flex flex-col font-sans overflow-x-hidden min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-[#E8E2D9] bg-white/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-[0_2px_12px_rgba(40,30,20,0.03)]">
          <div className="flex items-center gap-3">
            <Link href="/driver" className="hover:opacity-90 transition-opacity">
              <SafarLogo size="sm" />
            </Link>
            <div className="hidden sm:flex items-center gap-2">
              <span className="h-4 w-px bg-[#E8E2D9]" />
              <span className="px-2.5 py-0.5 rounded-full bg-warm-100 text-terracotta-700 text-[10px] font-bold uppercase tracking-wider border border-[#E8E2D9]">
                Driver Console
              </span>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1 bg-warm-50/80 p-1 rounded-2xl border border-[#E8E2D9]/70">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-200 active:scale-[0.98] ${
                    active
                      ? 'bg-white text-emerald-800 font-bold shadow-xs border border-emerald-200/60'
                      : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-white/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-emerald-700' : 'text-charcoal-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-charcoal-900">{driverName}</div>
              <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1.5 justify-end">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Verified Chauffeur
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
              className="p-2.5 rounded-xl border border-[#E8E2D9] text-charcoal-600 hover:bg-warm-100 hover:text-charcoal-900 transition-colors active:scale-[0.96]"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Content Area (With bottom padding for floating dock) */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-32 sm:pb-36 min-w-0">
          {children}
        </main>

        {/* Floating Glassmorphic Bottom Navigation Bar (Mobile / Tablet) */}
        <nav
          aria-label="Driver Navigation"
          className="md:hidden fixed bottom-3 left-3 right-3 max-w-lg mx-auto z-40 bg-[#FDFBF7]/90 backdrop-blur-xl border border-[#E8E2D9] shadow-[0_12px_36px_rgba(40,30,20,0.12),0_2px_8px_rgba(40,30,20,0.06)] rounded-[26px] p-1.5 transition-all"
        >
          <div className="grid grid-cols-6 gap-1 items-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  className={`min-h-[50px] flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 active:scale-[0.93] ${
                    active
                      ? 'bg-emerald-50/95 text-emerald-800 border border-emerald-200/80 shadow-xs'
                      : 'text-charcoal-500 hover:text-charcoal-800 hover:bg-warm-100/60'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-transform ${
                      active ? 'text-emerald-700 stroke-[2.4] scale-105' : 'stroke-[1.8]'
                    }`}
                  />
                  <span
                    className={`text-[9px] leading-tight tracking-tight mt-1 truncate max-w-full ${
                      active ? 'font-bold text-emerald-900' : 'font-medium'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </AuthGuard>
  );
}
