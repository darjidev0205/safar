'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface SummaryCardProps {
  label: string;
  value: string | number;
  supportingText: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  className?: string;
}

export function SummaryCard({
  label,
  value,
  supportingText,
  icon: Icon,
  iconColor = 'text-charcoal-700',
  iconBgColor = 'bg-warm-100 border-warm-300/80',
  className = '',
}: SummaryCardProps) {
  return (
    <div
      className={`p-4 rounded-2xl bg-white border border-[#E8E2D9] shadow-card hover:shadow-md hover:border-gold-400/40 transition-all duration-200 flex flex-col justify-between h-[116px] select-none active:scale-[0.99] ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-charcoal-500 uppercase tracking-wider font-sans truncate">
          {label}
        </span>
        <div
          className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${iconBgColor} ${iconColor}`}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>

      <div>
        <div className="text-xl sm:text-2xl font-serif font-bold text-charcoal-900 tracking-tight leading-none">
          {value}
        </div>
        <div className="mt-1 text-[11px] text-charcoal-500 truncate font-sans font-medium">
          {supportingText}
        </div>
      </div>
    </div>
  );
}
