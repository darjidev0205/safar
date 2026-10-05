'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Calendar, ChevronDown, Check } from 'lucide-react';
import { EventModel } from '@safar/types';
import { useAuth } from '../../context/auth-context';
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="h-16 border-b border-warm-200/80 bg-warm-50/85 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 transition-all font-sans select-none">
      {/* Left: Mobile Brand & Wedding/Event Selector */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="md:hidden shrink-0">
          <SafarLogo size="sm" />
        </div>

        {selectedEvent ? (
          <div className="relative">
            <button
              onClick={() => events.length > 1 && setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-warm-300 bg-white/95 text-xs text-charcoal-800 font-semibold shadow-2xs transition-all ${
                events.length > 1 ? 'hover:border-warm-400 hover:bg-white cursor-pointer' : 'cursor-default'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-serif font-bold text-charcoal-900 truncate max-w-[130px] sm:max-w-[220px]">
                {selectedEvent.name}
              </span>
              <span className="text-warm-300 font-light hidden sm:inline">|</span>
              <span className="text-charcoal-500 font-sans text-[11px] hidden sm:inline">
                {new Date(selectedEvent.startDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
              {events.length > 1 && (
                <ChevronDown className="w-3.5 h-3.5 text-charcoal-400 shrink-0 ml-0.5" />
              )}
            </button>

            {/* Event Switcher Dropdown */}
            {isDropdownOpen && events.length > 1 && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-1.5 w-64 rounded-2xl bg-white border border-[#E8E2D9] shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-charcoal-400 border-b border-warm-100">
                    Switch Celebration
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1">
                    {events.map((ev) => {
                      const isSelected = ev.id === selectedEvent.id;
                      return (
                        <button
                          key={ev.id}
                          onClick={() => {
                            onSelectEvent(ev);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between gap-2 hover:bg-warm-50 transition-colors ${
                            isSelected ? 'font-bold text-terracotta-700 bg-warm-50/60' : 'text-charcoal-800'
                          }`}
                        >
                          <div className="truncate">
                            <div className="font-serif font-bold truncate">{ev.name}</div>
                            <div className="text-[10px] text-charcoal-400 font-sans font-normal truncate">
                              {ev.city} &bull; {new Date(ev.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-terracotta-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenWizard}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-warm-100/90 border border-warm-300 text-charcoal-800 text-xs font-semibold hover:bg-warm-200 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-terracotta-600" />
            <span>Create Function</span>
          </button>
        )}
      </div>

      {/* Right: Date, Search, New Function, User Profile */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Current Date Display */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs text-charcoal-500 font-medium">
          <Calendar className="w-3.5 h-3.5 text-gold-600 shrink-0" />
          <span>{formattedDate}</span>
        </div>

        {/* Global Search */}
        <div className="relative hidden md:block">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
          <input
            type="text"
            placeholder="Search ceremonies, guests, rides..."
            className="w-52 lg:w-60 pl-8.5 pr-3 py-1.5 text-xs rounded-full border border-warm-300 bg-white/90 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-terracotta-500/20 focus:border-terracotta-500 transition-all font-sans"
          />
        </div>

        {/* New Function Button */}
        <button
          onClick={onOpenWizard}
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-warm-50 text-xs font-semibold shadow-2xs transition-all transform hover:-translate-y-0.5 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 text-gold-400" />
          <span>New Function</span>
        </button>

        {/* Host Avatar & Role Entry */}
        <Link
          href="/host/profile"
          title="Host Profile & Settings"
          className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-warm-200 hover:opacity-90 transition-all group"
        >
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.fullName || 'Host'}
              className="w-8 h-8 rounded-full object-cover border border-warm-300 shadow-2xs"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-warm-200/90 border border-warm-300 text-charcoal-800 flex items-center justify-center font-bold text-xs group-hover:bg-warm-300 transition-colors font-serif shadow-2xs">
              {profile?.fullName && !profile.fullName.includes('@')
                ? profile.fullName.charAt(0).toUpperCase()
                : 'H'}
            </div>
          )}
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-charcoal-900 leading-tight group-hover:text-terracotta-700 transition-colors font-sans truncate max-w-[120px]">
              {profile?.fullName && !profile.fullName.includes('@')
                ? profile.fullName
                : 'Host Organizer'}
            </div>
            <div className="text-[10px] text-charcoal-500 leading-tight font-sans">
              Host Organizer
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
}
