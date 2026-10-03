'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Bell, Calendar, User, Sparkles, Plus } from 'lucide-react';
import { EventModel } from '@safar/types';
import { useAuth } from '../../context/auth-context';
import { StarFlourish } from '../ui/botanical-ornaments';
import { SafarLogo } from '../ui/safar-logo';

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
  const { profile } = useAuth();

  return (
    <header className="h-16 border-b border-warm-200/80 bg-warm-50/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-all">
      {/* Mobile Brand / Event Context */}
      <div className="flex items-center gap-3">
        <div className="md:hidden">
          <SafarLogo size="sm" />
        </div>

        {selectedEvent ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-warm-300 bg-white/90 text-xs text-charcoal-800 font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-sage-600 animate-pulse" />
            <span className="font-serif font-bold text-charcoal-900 truncate max-w-[120px] sm:max-w-[200px]">
              {selectedEvent.name}
            </span>
            <span className="text-warm-400 font-light hidden sm:inline">|</span>
            <span className="text-charcoal-500 font-sans text-[11px] hidden sm:inline">
              {new Date(selectedEvent.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        ) : (
          <button
            onClick={onOpenWizard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warm-100/90 border border-warm-300 text-charcoal-800 text-xs font-semibold hover:bg-warm-200 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-terracotta-600" />
            <span>Create Function</span>
          </button>
        )}
      </div>

      {/* Search & Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden lg:block">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
          <input
            type="text"
            placeholder="Search ceremonies, guests, rides..."
            className="w-56 pl-9 pr-3 py-1.5 text-xs rounded-full border border-warm-300 bg-white/80 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-terracotta-500/30 focus:border-terracotta-500 transition-all font-sans"
          />
        </div>

        {/* Create Event CTA Header Button */}
        <button
          onClick={onOpenWizard}
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white text-xs font-semibold shadow-2xs transition-all"
        >
          <Plus className="w-3.5 h-3.5 text-gold-400" />
          <span>New Function</span>
        </button>

        {/* User Profile Entry Point */}
        <Link
          href="/host/profile"
          title="Host Profile & Settings"
          className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-warm-200 hover:opacity-85 transition-all group"
        >
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.fullName || 'Host'}
              className="w-8 h-8 rounded-full object-cover border border-warm-300"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-warm-200/90 border border-warm-300 text-charcoal-800 flex items-center justify-center font-bold text-xs group-hover:bg-warm-300 transition-colors font-serif">
              {profile?.fullName && !profile.fullName.includes('@') ? profile.fullName.charAt(0).toUpperCase() : 'H'}
            </div>
          )}
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-charcoal-900 leading-tight group-hover:text-terracotta-700 transition-colors font-sans truncate max-w-[120px]">
              {profile?.fullName && !profile.fullName.includes('@') ? profile.fullName : 'Host Organizer'}
            </div>
            <div className="text-[10px] text-charcoal-500 leading-tight">Host Organizer</div>
          </div>
        </Link>
      </div>
    </header>
  );
}
