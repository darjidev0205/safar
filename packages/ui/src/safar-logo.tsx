import React from 'react';
import { cn } from './utils';

export function SafarLogo({
  size = 'md',
  showTagline = false,
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}) {
  const sizes = {
    sm: { box: 'w-7 h-7 text-xs rounded-lg', text: 'text-base', sub: 'text-[9px]' },
    md: { box: 'w-8 h-8 text-sm rounded-xl', text: 'text-lg', sub: 'text-[10px]' },
    lg: { box: 'w-10 h-10 text-base rounded-xl', text: 'text-2xl', sub: 'text-xs' },
  };

  const s = sizes[size];

  return (
    <div className={cn('flex items-center gap-2.5 select-none', className)}>
      <div
        className={cn(
          'bg-gradient-to-br from-teal-700 to-teal-900 text-white font-black flex items-center justify-center shadow-xs',
          s.box
        )}
      >
        S
      </div>
      <div className="flex flex-col">
        <span className={cn('font-black tracking-tight text-gray-950 font-sans leading-none', s.text)}>
          SAFAR
        </span>
        {showTagline && (
          <span className={cn('font-medium text-gray-400 uppercase tracking-widest mt-0.5', s.sub)}>
            Event Mobility
          </span>
        )}
      </div>
    </div>
  );
}
