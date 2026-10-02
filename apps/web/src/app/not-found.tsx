'use client';

import React from 'react';
import Link from 'next/link';
import { SafarLogo } from '../components/ui/safar-logo';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-warm-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-charcoal-200/90 shadow-sm space-y-5">
        <SafarLogo size="md" />
        
        <div className="space-y-2 pt-2">
          <span className="text-4xl font-black text-safar-700 font-mono">404</span>
          <h1 className="text-xl font-bold text-charcoal-900 tracking-tight">
            Page Not Found
          </h1>
          <p className="text-xs text-charcoal-500">
            The requested transportation resource or page could not be located in this event workspace.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="w-full py-2.5 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <Home className="w-4 h-4" />
            Return to SAFAR Home
          </Link>
        </div>
      </div>
    </div>
  );
}
