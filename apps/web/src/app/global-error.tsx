'use client';

import React from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FAF7F2] text-[#0F172A] flex flex-col items-center justify-center p-6 font-sans antialiased">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-[#E8E2D9] shadow-md text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-200">
            <AlertCircle className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-600">
              Application Error
            </span>
            <h1 className="text-xl font-bold font-serif text-[#0F172A] tracking-tight">
              Something went wrong
            </h1>
            <p className="text-xs text-[#5A6578] leading-relaxed">
              {error?.message || 'An unexpected error occurred while rendering the page.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => reset()}
              className="py-2.5 rounded-full border border-[#E8E2D9] text-xs font-semibold text-[#0F172A] hover:bg-[#FAF7F2] flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Try Again
            </button>
            <Link
              href="/"
              className="py-2.5 rounded-full bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              SAFAR Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
