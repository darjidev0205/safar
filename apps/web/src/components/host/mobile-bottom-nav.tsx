'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Navigation,
  MoreHorizontal,
  Car,
  Route,
  BookMarked,
  BarChart3,
  Settings,
  User,
  X,
  Plus,
} from 'lucide-react';
import { StarFlourish } from '../ui/botanical-ornaments';

interface MobileBottomNavProps {
  onOpenWizard: () => void;
}

export function MobileBottomNav({ onOpenWizard }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const navItems = [
    { label: 'Home', href: '/host', icon: LayoutDashboard },
    { label: 'Events', href: '/host/events', icon: Calendar },
    { label: 'Guests', href: '/host/guests', icon: Users },
    { label: 'Live', href: '/host/live', icon: Navigation },
  ];

  const moreItems = [
    { label: 'Fleet & Drivers', href: '/host/fleet', icon: Car },
    { label: 'Trips & Shuttles', href: '/host/trips', icon: Route },
    { label: 'Ride Bookings', href: '/host/bookings', icon: BookMarked },
    { label: 'Transport Costs & Reports', href: '/host/reports', icon: BarChart3 },
    { label: 'Host Profile', href: '/host/profile', icon: User },
    { label: 'Event Settings', href: '/host/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Floating Bottom Bar */}
      <div className="fixed bottom-3 inset-x-3 z-40 md:hidden pb-safe">
        <div className="apple-glass-floating rounded-full px-3 py-2 border border-warm-300/80 shadow-lg flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/host'
                ? pathname === '/host'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-1 px-3 rounded-full text-[10px] font-semibold transition-all ${
                  isActive
                    ? 'text-charcoal-900 font-bold'
                    : 'text-charcoal-500 hover:text-charcoal-800'
                }`}
              >
                <div
                  className={`p-1 rounded-full transition-all ${
                    isActive ? 'bg-terracotta-50 text-terracotta-700' : ''
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="mt-0.5">{item.label}</span>
              </Link>
            );
          })}

          {/* More Sheet Trigger */}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center py-1 px-3 rounded-full text-[10px] font-semibold transition-all ${
              moreOpen ? 'text-terracotta-700 font-bold' : 'text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            <div className="p-1 rounded-full">
              <MoreHorizontal className="w-4 h-4" />
            </div>
            <span className="mt-0.5">More</span>
          </button>
        </div>
      </div>

      {/* More Options Drawer Sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-charcoal-900/40 backdrop-blur-xs animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setMoreOpen(false)}
          />

          <div className="relative bg-warm-50 rounded-t-3xl border-t border-warm-300 p-5 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto pb-safe">
            <div className="flex items-center justify-between pb-3 border-b border-warm-200">
              <div className="flex items-center gap-1.5 font-serif font-bold text-charcoal-900 text-base">
                <StarFlourish className="w-3 h-3 text-gold-600" />
                <span>Host Operations Menu</span>
              </div>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-1 rounded-full bg-warm-200 text-charcoal-600 hover:text-charcoal-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-white border-warm-400 text-charcoal-900 shadow-2xs font-bold'
                        : 'bg-white/80 border-warm-200 text-charcoal-700 hover:bg-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-terracotta-600 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <button
              onClick={() => {
                setMoreOpen(false);
                onOpenWizard();
              }}
              className="w-full py-3 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
            >
              <Plus className="w-4 h-4 text-gold-400" />
              <span>Create New Ceremony</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
