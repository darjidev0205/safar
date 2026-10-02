'use client';

import React from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-warm-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-charcoal-200/90 shadow-sm space-y-5">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h1 className="text-lg font-bold text-charcoal-900 tracking-tight">
            Unexpected System Error
          </h1>
          <p className="text-xs text-charcoal-500">
            {error?.message || 'A transient error occurred while loading this view.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            onClick={() => reset()}
            className="py-2.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-700 hover:bg-charcoal-50 flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Try Again
          </button>
          <Link
            href="/"
            className="py-2.5 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            SAFAR Home
          </Link>
        </div>
      </div>
    </div>
  );
}
