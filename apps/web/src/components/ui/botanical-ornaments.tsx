'use client';

import React from 'react';

export function StarFlourish({ className = 'w-3 h-3 text-gold-500' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
    </svg>
  );
}

export function MarigoldFlower({ className = 'w-6 h-6 text-terracotta-500' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Central disc */}
      <circle cx="20" cy="20" r="5" fill="#C49E64" opacity="0.9" />
      <circle cx="20" cy="20" r="3.2" fill="#8A3B26" opacity="0.8" />
      {/* Hand-drawn organic overlapping petals */}
      <path
        d="M20 5C18.5 10 16 13 20 15C24 13 21.5 10 20 5Z"
        fill="#C86D51"
        opacity="0.85"
      />
      <path
        d="M35 20C30 18.5 27 16 25 20C27 24 30 21.5 35 20Z"
        fill="#C86D51"
        opacity="0.85"
      />
      <path
        d="M20 35C21.5 30 24 27 20 25C16 27 18.5 30 20 35Z"
        fill="#C86D51"
        opacity="0.85"
      />
      <path
        d="M5 20C10 21.5 13 24 15 20C13 16 10 18.5 5 20Z"
        fill="#C86D51"
        opacity="0.85"
      />
      {/* Diagonal petals */}
      <path
        d="M30.6 9.4C26.5 13 23.5 14 23.5 17C26.5 17 27 14 30.6 9.4Z"
        fill="#D9A85C"
        opacity="0.9"
      />
      <path
        d="M30.6 30.6C27 26.5 26 23.5 23 23.5C23 26.5 26 27 30.6 30.6Z"
        fill="#D9A85C"
        opacity="0.9"
      />
      <path
        d="M9.4 30.6C13 27 14 24 17 24C17 27 14 27.5 9.4 30.6Z"
        fill="#D9A85C"
        opacity="0.9"
      />
      <path
        d="M9.4 9.4C13.5 13 16.5 13.5 16.5 16.5C13.5 16.5 13 13.5 9.4 9.4Z"
        fill="#D9A85C"
        opacity="0.9"
      />
    </svg>
  );
}

export function OliveBranch({ className = 'w-8 h-8 text-sage-600' }: { className?: string }) {
  return (
    <svg viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Delicate curved twig stem */}
      <path
        d="M5 45C14 36 24 24 45 5"
        stroke="#546F5C"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.75"
      />
      {/* Hand-painted organic leaves */}
      <path
        d="M16 34C14 28 17 24 23 26C21 32 18 34 16 34Z"
        fill="#7E9A86"
        opacity="0.8"
      />
      <path
        d="M26 24C28 18 34 18 35 23C30 25 27 26 26 24Z"
        fill="#688571"
        opacity="0.85"
      />
      <path
        d="M26 34C31 35 34 32 33 27C28 28 26 31 26 34Z"
        fill="#7E9A86"
        opacity="0.75"
      />
      <path
        d="M36 14C35 8 41 8 43 13C38 16 36 15 36 14Z"
        fill="#688571"
        opacity="0.9"
      />
      <path
        d="M45 5C41 3 39 8 41 10C44 10 46 8 45 5Z"
        fill="#546F5C"
        opacity="0.85"
      />
    </svg>
  );
}

export function JasmineBloom({ className = 'w-5 h-5 text-warm-100' }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="15" cy="15" r="2.5" fill="#C49E64" />
      <path d="M15 3C13 8 13 12 15 13C17 12 17 8 15 3Z" fill="#FDFBF7" stroke="#D4C4B0" strokeWidth="0.75" />
      <path d="M27 15C22 13 18 13 17 15C18 17 22 17 27 15Z" fill="#FDFBF7" stroke="#D4C4B0" strokeWidth="0.75" />
      <path d="M15 27C17 22 17 18 15 17C13 18 13 22 15 27Z" fill="#FDFBF7" stroke="#D4C4B0" strokeWidth="0.75" />
      <path d="M3 15C8 17 12 17 13 15C12 13 8 13 3 15Z" fill="#FDFBF7" stroke="#D4C4B0" strokeWidth="0.75" />
    </svg>
  );
}

export function FloralDivider({ className = 'w-48 text-gold-500' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`} aria-hidden="true">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold-400/50 to-gold-500/70" />
      <StarFlourish className="w-2.5 h-2.5 text-gold-600" />
      <div className="w-1.5 h-1.5 rounded-full bg-terracotta-600/70" />
      <StarFlourish className="w-2.5 h-2.5 text-gold-600" />
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gold-400/50 to-gold-500/70" />
    </div>
  );
}

export function IndianArchOutline({ className = 'w-6 h-6 text-gold-600' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path
        d="M5 38V16C5 16 9 8 20 2C31 8 35 16 35 16V38"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M9 38V18C12 14 16 11 20 7C24 11 28 14 31 18V38"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeDasharray="2 2"
        opacity="0.6"
      />
      <circle cx="20" cy="2" r="1.5" fill="currentColor" />
    </svg>
  );
}
