'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SafarLogo } from '../../components/ui/safar-logo';
import { Home, Calendar, Car, User, LogOut, Sparkles } from 'lucide-react';
import { AuthGuard } from '../../components/auth/auth-guard';
import { UserRole } from '@safar/types';
import { useAuth } from '../../context/auth-context';

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, role, logout } = useAuth();

  const NAV_ITEMS = [
    { href: '/guest', label: 'Home', icon: Home },
    { href: '/guest/events', label: 'Events', icon: Calendar },
    { href: '/guest/rides', label: 'My Ride', icon: Car },
    { href: '/guest/profile', label: 'Profile', icon: User },
  ];

  const guestInitial = profile?.fullName
    ? profile.fullName.trim().charAt(0).toUpperCase()
    : 'G';

  return (
    <AuthGuard allowedRoles={[UserRole.GUEST, UserRole.EVENT_ORGANIZER, UserRole.ACCOUNT_OWNER]}>
      <div className="min-h-screen bg-[#FAF7F2] text-[#1F2421] flex flex-col font-sans selection:bg-terracotta-100 selection:text-terracotta-900 paper-texture pb-28 md:pb-12 overflow-x-hidden min-w-0">
        {/* ========================================================================= */}
        {/* TOP EDITORIAL MASTHEAD                                                    */}
        {/* ========================================================================= */}
        <header
          role="banner"
          className="sticky top-0 z-30 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#E5DACB]/80 px-4 sm:px-6 py-3 sm:py-3.5 transition-all"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            {/* Left: SAFAR Brand */}
            <Link href="/guest" className="group flex items-center gap-2">
              <SafarLogo size="sm" variant="editorial" showTagline={false} />
            </Link>

            {/* Desktop Navigation Links (Visible on md+) */}
            <nav aria-label="Desktop Guest Navigation" className="hidden md:flex items-center gap-6">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href === '/guest/events' && pathname === '/guest/event');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all ${
                      isActive
                        ? 'text-terracotta-700 bg-white/80 shadow-2xs'
                        : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-white/40'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right: Guest Profile & Sign Out */}
            <div className="flex items-center gap-2.5">
              <Link
                href="/guest/profile"
                className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/70 border border-[#E5DACB] hover:bg-white transition-all shadow-2xs group"
                title="View Profile"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-terracotta-600 to-burgundy-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {guestInitial}
                </div>
                <span className="hidden sm:inline-block text-xs font-semibold text-charcoal-800 max-w-[120px] truncate">
                  {profile?.fullName || 'Guest'}
                </span>
              </Link>

              <button
                onClick={logout}
                title="Sign out of Safar"
                className="p-2 rounded-full text-charcoal-500 hover:text-charcoal-900 hover:bg-white/60 transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* MAIN RESPONSIVE CONTENT AREA                                              */}
        {/* ========================================================================= */}
        <main className="flex-1 w-full max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7 min-w-0">
          {children}
        </main>

        {/* ========================================================================= */}
        {/* MOBILE FLOATING APPLE-INSPIRED BOTTOM NAVIGATION CAPSULE                  */}
        {/* ========================================================================= */}
        <nav
          aria-label="Mobile Bottom Navigation"
          className="fixed inset-x-0 z-40 flex justify-center pointer-events-none md:hidden"
          style={{
            bottom: 'max(env(safe-area-inset-bottom, 0px) + 10px, 14px)',
          }}
        >
          <div className="pointer-events-auto w-[calc(100%-2rem)] max-w-sm px-3 py-2 rounded-full apple-glass-floating shadow-[0_12px_36px_-6px_rgba(31,36,33,0.12),0_2px_8px_0_rgba(31,36,33,0.03),inset_0_1px_1px_0_rgba(255,255,255,0.95)] flex items-center justify-around">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href === '/guest/events' && pathname === '/guest/event');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center py-1 px-3 rounded-full min-w-[56px] transition-all duration-300 relative ${
                    isActive
                      ? 'text-terracotta-700 font-bold scale-105'
                      : 'text-charcoal-500 hover:text-charcoal-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] tracking-wider uppercase font-semibold mt-0.5">
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-terracotta-600 mt-0.5 shadow-2xs" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </AuthGuard>
  );
}
