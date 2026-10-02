import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 md:p-12 text-center bg-white rounded-2xl border border-charcoal-200/80 shadow-sm ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-safar-50 text-safar-600 flex items-center justify-center mb-4 ring-8 ring-safar-50/50">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-semibold text-charcoal-900 mb-1.5">{title}</h3>
      <p className="text-sm text-charcoal-500 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-medium text-sm text-white bg-safar-600 hover:bg-safar-700 active:scale-[0.98] transition-all shadow-sm shadow-safar-600/20"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
