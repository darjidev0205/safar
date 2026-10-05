'use client';

import React from 'react';
import { StarFlourish } from '../ui/botanical-ornaments';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ReactNode;
  rightAction?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  badge,
  icon,
  rightAction,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-warm-200/80 pb-3.5 ${className}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="shrink-0 text-gold-600">
          {icon || <StarFlourish className="w-3.5 h-3.5" />}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-serif font-bold text-charcoal-900 tracking-tight truncate">
              {title}
            </h2>
            {badge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-sans uppercase tracking-wider bg-warm-100 text-charcoal-700 border border-warm-300/80">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-charcoal-500 font-sans mt-0.5 line-clamp-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {rightAction && <div className="shrink-0 flex items-center gap-2">{rightAction}</div>}
    </div>
  );
}
