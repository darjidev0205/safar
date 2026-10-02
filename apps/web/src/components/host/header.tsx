'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Bell, ChevronDown, Calendar, User, LogOut } from 'lucide-react';
import { EventModel, UserRole } from '@safar/types';
import { useAuth } from '../../context/auth-context';

interface HeaderProps {
  events: EventModel[];
  selectedEvent: EventModel | null;
  onSelectEvent: (event: EventModel) => void;
  onOpenWizard: () => void;
}

export function HostHeader({
  events,
  selectedEvent,
  onSelectEvent,
  onOpenWizard,
}: HeaderProps) {
  const { profile, logout } = useAuth();

  return (
    <header className="h-16 border-b border-charcoal-200/80 bg-white px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Event Context Pill */}
      <div className="flex items-center gap-3">
        {selectedEvent ? (
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-charcoal-200 bg-warm-50 text-xs text-charcoal-800 font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-charcoal-900">{selectedEvent.name}</span>
            <span className="text-charcoal-400 font-normal">|</span>
            <span className="text-charcoal-500 font-normal">
              {new Date(selectedEvent.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} –{' '}
              {new Date(selectedEvent.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        ) : (
          <button
            onClick={onOpenWizard}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-safar-50 text-safar-700 text-xs font-semibold hover:bg-safar-100 transition-colors"
          >
            + Create Your First Event
          </button>
        )}
      </div>

      {/* Search & Actions */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
          <input
            type="text"
            placeholder="Search trips, drivers, guests..."
            className="w-64 pl-9 pr-3 py-1.5 text-xs rounded-xl border border-charcoal-200 bg-charcoal-50/50 focus:outline-none focus:ring-2 focus:ring-safar-500"
          />
        </div>

        {/* Notifications */}
        <button className="p-2 text-charcoal-500 hover:text-charcoal-800 rounded-xl hover:bg-charcoal-50 relative">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-safar-500 absolute top-1.5 right-1.5" />
        </button>

        {/* User Profile Entry Point */}
        <Link
          href="/host/profile"
          title="Edit Host Profile & Account Settings"
          className="flex items-center gap-3 pl-2 border-l border-charcoal-200 hover:opacity-85 transition-all group"
        >
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.fullName || 'Host'}
              className="w-8 h-8 rounded-full object-cover border border-safar-200"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-safar-100 text-safar-800 flex items-center justify-center font-bold text-xs group-hover:bg-safar-200 transition-colors">
              {profile?.fullName && !profile.fullName.includes('@') ? profile.fullName.charAt(0).toUpperCase() : 'H'}
            </div>
          )}
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-charcoal-900 leading-tight group-hover:text-safar-700 transition-colors">
              {profile?.fullName && !profile.fullName.includes('@') ? profile.fullName : 'Host Organizer'}
            </div>
            <div className="text-[10px] text-charcoal-500 leading-tight">Host Organizer &bull; Edit</div>
          </div>
        </Link>
      </div>
    </header>
  );
}
