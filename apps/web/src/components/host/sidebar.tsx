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
} from 'lucide-react';
import { SafarLogo } from '../ui/safar-logo';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'profile', label: 'Host Profile', icon: User },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'guests', label: 'Guests', icon: Users },
  { id: 'fleet', label: 'Fleet & Drivers', icon: Car },
  { id: 'trips', label: 'Trips', icon: Route },
  { id: 'live', label: 'Live Tracking', icon: Navigation },
  { id: 'bookings', label: 'Bookings', icon: BookMarked },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function HostSidebar({ currentTab, onTabChange }: SidebarProps) {
  return (
    <aside className="w-64 border-r border-charcoal-200/80 bg-white flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-charcoal-100 flex items-center">
        <SafarLogo size="md" />
      </div>

      {/* Nav Menu */}
      <nav className="p-3 space-y-1 flex-1">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-safar-600 text-white shadow-sm shadow-safar-600/30'
                  : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-charcoal-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-charcoal-400'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom Tenant badge */}
      <div className="p-4 border-t border-charcoal-100 bg-warm-50 text-[11px] text-charcoal-500">
        <div className="font-semibold text-charcoal-800">SAFAR Operations</div>
        <div className="text-charcoal-400">Multi-tenant Workspace</div>
      </div>
    </aside>
  );
}
