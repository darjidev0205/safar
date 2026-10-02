import React from 'react';

interface SafarLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export function SafarLogo({ className = '', size = 'md', showTagline = false }: SafarLogoProps) {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Refined Teal 'S' swoosh icon */}
      <div className={`relative ${iconSizes[size]} flex items-center justify-center`}>
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
        >
          <path
            d="M38 12C38 7.58172 34.4183 4 30 4H14C9.58172 4 6 7.58172 6 12C6 16.4183 9.58172 20 14 20H34C38.4183 20 42 23.5817 42 28C42 32.4183 38.4183 36 34 36H16C11.5817 36 8 39.5817 8 44"
            stroke="#0d9488"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="38" cy="12" r="3.5" fill="#14b8a6" />
          <circle cx="8" cy="44" r="3.5" fill="#0f766e" />
        </svg>
      </div>

      <div className="flex flex-col">
        <span
          className={`font-black tracking-wider text-charcoal-900 font-sans ${textSizes[size]} leading-none`}
        >
          SAFAR
        </span>
        {showTagline && (
          <span className="text-[11px] font-medium tracking-normal text-charcoal-500 mt-0.5">
            Seamless Rides. Unforgettable Events.
          </span>
        )}
      </div>
    </div>
  );
}
