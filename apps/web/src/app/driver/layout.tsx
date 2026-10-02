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
  ShieldAlert,
  Car,
  LogOut,
  Radio,
} from 'lucide-react';

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, logout } = useAuth();

  const navItems = [
    { href: '/driver', label: 'Console', icon: Home },
    { href: '/driver/duty', label: 'Duty & Vehicle', icon: Car },
    { href: '/driver/trips', label: 'My Trips', icon: Route },
    { href: '/driver/navigation', label: 'Navigation', icon: Navigation },
    { href: '/driver/verification', label: 'Verify Code', icon: CheckSquare },
    { href: '/driver/profile', label: 'Profile', icon: User },
  ];

  const driverName = profile?.fullName || 'Driver';

  return (
    <AuthGuard allowedRoles={[UserRole.DRIVER, UserRole.DISPATCHER]}>
      <div className="min-h-screen bg-warm-50 text-charcoal-900 flex flex-col font-sans pb-20 md:pb-6">
        {/* Top Header */}
        <header className="h-16 border-b border-charcoal-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/driver">
              <SafarLogo size="sm" />
            </Link>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-safar-50 text-safar-800 text-[10px] font-bold uppercase tracking-wider border border-safar-200">
              Driver Console
            </span>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    isActive
                      ? 'bg-safar-50 text-safar-800 font-bold'
                      : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-charcoal-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-charcoal-900">{driverName}</div>
              <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 justify-end">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Verified Driver
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-2 rounded-xl border border-charcoal-200 text-charcoal-600 hover:bg-charcoal-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Content Area (Responsive container) */}
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-charcoal-200 px-3 py-2 flex items-center justify-around z-40 shadow-lg">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 transition-colors py-1 px-2 rounded-lg ${
                  isActive ? 'text-safar-700 font-bold' : 'text-charcoal-400 hover:text-charcoal-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[9px]">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </AuthGuard>
  );
}
