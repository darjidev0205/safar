'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SafarLogo } from '../../components/ui/safar-logo';
import { Bell, Home, Car, Bookmark, Calendar, LogOut } from 'lucide-react';
import { AuthGuard } from '../../components/auth/auth-guard';
import { UserRole } from '@safar/types';
import { useAuth } from '../../context/auth-context';

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, logout } = useAuth();

  const NAV_ITEMS = [
    { href: '/guest', label: 'Home', icon: Home },
    { href: '/guest/book', label: 'Book', icon: Car },
    { href: '/guest/rides', label: 'My Rides', icon: Bookmark },
    { href: '/guest/event', label: 'Event', icon: Calendar },
  ];

  const guestInitial = profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'G';

  return (
    <AuthGuard allowedRoles={[UserRole.GUEST]}>
      <div className="min-h-screen bg-warm-50 text-charcoal-900 flex flex-col font-sans pb-20">
        {/* Top Header */}
        <header className="h-16 border-b border-charcoal-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-40 px-5 flex items-center justify-between">
          <Link href="/guest">
            <SafarLogo size="sm" />
          </Link>

          <div className="flex items-center gap-3">
            <button className="p-2 text-charcoal-500 hover:text-charcoal-800 rounded-full hover:bg-charcoal-50 relative">
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-safar-500 absolute top-1.5 right-1.5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-safar-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {guestInitial}
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 text-charcoal-400 hover:text-charcoal-700 rounded-lg hover:bg-charcoal-100"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Container - Responsive */}
        <main className="flex-1 w-full max-w-xl mx-auto p-4 sm:p-6">
          {children}
        </main>

        {/* Bottom PWA Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-charcoal-200 z-50 py-2.5 px-6">
          <div className="max-w-md mx-auto flex items-center justify-between">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 transition-colors ${
                    isActive ? 'text-safar-600 font-bold' : 'text-charcoal-400 hover:text-charcoal-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px]">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </AuthGuard>
  );
}
