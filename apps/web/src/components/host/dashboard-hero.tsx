'use client';

import React from 'react';
import { CalendarPlus, FileSpreadsheet } from 'lucide-react';
import { StarFlourish, OliveBranch } from '../ui/botanical-ornaments';
import { formatHostGreeting } from '../../lib/time-greeting';

interface DashboardHeroProps {
  hostName?: string | null;
  currentDate: Date;
  hasEvents: boolean;
  onUploadExcel?: () => void;
  onCreateFunction?: () => void;
  className?: string;
}

export function DashboardHero({
  hostName,
  currentDate,
  hasEvents,
  onUploadExcel,
  onCreateFunction,
  className = '',
}: DashboardHeroProps) {
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className={`p-6 sm:p-7 md:p-8 rounded-3xl bg-white border border-[#E8E2D9] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden font-sans ${className}`}
    >
      {/* Decorative Botanical Flourish Background Accent */}
      <div className="absolute right-3 -bottom-8 pointer-events-none opacity-15 select-none">
        <OliveBranch className="w-36 h-36 text-sage-600" />
      </div>

      <div className="relative z-10 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-warm-100/90 text-charcoal-800 border border-warm-300/80 shadow-2xs">
            <StarFlourish className="w-2.5 h-2.5 text-gold-600" />
            <span>SAFAR Host Control</span>
          </span>
          <span className="text-xs text-charcoal-400 font-medium font-sans">
            {formattedDate}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-charcoal-900 tracking-tight font-serif leading-tight">
          {formatHostGreeting(hostName, currentDate)}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-charcoal-600 max-w-xl font-sans leading-relaxed">
          Plan and manage every journey for your celebration with bespoke hospitality and live fleet control.
        </p>
      </div>

      {/* Hero CTA Actions */}
      <div className="flex items-center gap-2.5 shrink-0 relative z-10 flex-wrap sm:flex-nowrap">
        {hasEvents && onUploadExcel && (
          <button
            onClick={onUploadExcel}
            className="px-4 py-2.5 rounded-full border border-warm-300 bg-warm-50/80 hover:bg-warm-100 text-xs font-bold text-charcoal-800 flex items-center gap-2 shadow-2xs transition-all transform hover:-translate-y-0.5 active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-terracotta-600" />
            <span>Upload Guest Excel</span>
          </button>
        )}

        {onCreateFunction && (
          <button
            onClick={onCreateFunction}
            className="px-5 py-2.5 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-warm-50 hover:text-white text-xs sm:text-sm font-bold shadow-xs flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:scale-95"
          >
            <CalendarPlus className="w-4 h-4 text-gold-400" />
            <span>Create Function</span>
          </button>
        )}
      </div>
    </div>
  );
}
