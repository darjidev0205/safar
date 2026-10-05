'use client';

import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionText,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`p-8 sm:p-10 rounded-3xl bg-white border border-[#E8E2D9] text-center shadow-card flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-warm-100/80 border border-warm-300/80 flex items-center justify-center text-charcoal-700 mb-3.5 shadow-2xs">
        {icon}
      </div>
      <h3 className="text-base font-serif font-bold text-charcoal-900 tracking-tight">
        {title}
      </h3>
      <p className="mt-1 text-xs text-charcoal-600 max-w-md font-sans leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-5 py-2 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-warm-50 text-xs font-semibold shadow-2xs transition-all transform hover:-translate-y-0.5 active:scale-95 font-sans"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
