'use client';

import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Car,
  Route,
  Navigation,
  BookMarked,
  BarChart3,
  Settings,
  User,
  Sparkles,
} from 'lucide-react';
import { SafarLogo } from '../ui/safar-logo';
import { StarFlourish } from '../ui/botanical-ornaments';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

const MENU_GROUPS = [
  {
    label: 'Celebration Planning',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'events', label: 'Functions & Events', icon: Calendar },
      { id: 'guests', label: 'Guest Roster', icon: Users },
    ],
  },
  {
    label: 'Fleet Operations',
    items: [
      { id: 'fleet', label: 'Fleet & Drivers', icon: Car },
      { id: 'trips', label: 'Trips & Shuttles', icon: Route },
      { id: 'live', label: 'Live GPS Tracking', icon: Navigation },
      { id: 'bookings', label: 'Ride Bookings', icon: BookMarked },
    ],
  },
  {
    label: 'Host Administration',
    items: [
      { id: 'reports', label: 'Transport Costs & Reports', icon: BarChart3 },
      { id: 'profile', label: 'Host Profile', icon: User },
      { id: 'settings', label: 'Event Settings', icon: Settings },
    ],
  },
];

export function HostSidebar({ currentTab, onTabChange, className = '' }: SidebarProps) {
  return (
    <aside
      className={`w-64 border-r border-warm-200/80 bg-warm-50/90 paper-texture flex flex-col shrink-0 h-screen sticky top-0 font-sans select-none ${className}`}
    >
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-warm-200/80 flex items-center justify-between bg-warm-50/80 backdrop-blur-md">
        <SafarLogo size="md" />
        <StarFlourish className="w-3 h-3 text-gold-600/70" />
      </div>

      {/* Nav Menu Items */}
      <nav className="p-3.5 space-y-5 flex-1 overflow-y-auto">
        {MENU_GROUPS.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-charcoal-400 font-sans flex items-center gap-1.5">
              <span>{group.label}</span>
            </div>

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-charcoal-900 border border-warm-300/80 shadow-2xs font-bold'
                        : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-warm-100/70 border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-terracotta-600' : 'text-charcoal-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-terracotta-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Hospitality Badge */}
      <div className="p-3.5 border-t border-warm-200/80 bg-white/70 m-3 rounded-2xl border border-warm-200/90 text-xs shadow-2xs">
        <div className="flex items-center gap-1.5 font-serif font-bold text-charcoal-900">
          <Sparkles className="w-3.5 h-3.5 text-gold-600" />
          <span>Wedding Mobility Suite</span>
        </div>
        <div className="text-[11px] text-charcoal-500 mt-0.5 font-sans">
          Bespoke Curated Transport
        </div>
      </div>
    </aside>
  );
}
