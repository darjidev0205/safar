import React from 'react';

interface SafarLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  variant?: 'modern' | 'editorial';
}

export function SafarLogo({
  className = '',
  size = 'md',
  showTagline = false,
  variant = 'editorial',
}: SafarLogoProps) {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  if (variant === 'editorial') {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        {/* Editorial Handcrafted Sun/Lotus Emblem */}
        <div className={`relative ${iconSizes[size]} flex items-center justify-center shrink-0`}>
          <svg
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full text-terracotta-600"
          >
            <circle cx="18" cy="18" r="14.5" stroke="#C49E64" strokeWidth="1" strokeDasharray="1.5 1.5" />
            <path
              d="M18 6V10M18 26V30M6 18H10M26 18H30"
              stroke="#B85D43"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <path
              d="M9.5 9.5L12.5 12.5M23.5 23.5L26.5 26.5M26.5 9.5L23.5 12.5M12.5 23.5L9.5 26.5"
              stroke="#C49E64"
              strokeWidth="0.9"
            />
            <circle cx="18" cy="18" r="3.5" fill="#B85D43" />
          </svg>
        </div>

        <div className="flex flex-col">
          <span
            className={`font-serif tracking-[0.25em] text-charcoal-900 font-bold ${textSizes[size]} leading-none`}
          >
            SAFAR
          </span>
          {showTagline && (
            <span className="text-[10px] tracking-[0.15em] uppercase text-charcoal-500 font-sans mt-0.5">
              Wedding Mobility
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
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
