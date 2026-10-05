'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { UserRole } from '@safar/types';
import { SafarLogo } from '../../components/ui/safar-logo';
import { AuthView } from '../../components/auth/auth-view';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import {
  OliveBranch,
  IndianArchOutline,
} from '../../components/ui/botanical-ornaments';

function SignupPageContent() {
  const searchParams = useSearchParams();
  const roleParam = searchParams?.get('role')?.toUpperCase();
  const redirectParam = searchParams?.get('redirect') || undefined;

  let initialRole = UserRole.EVENT_ORGANIZER;
  if (roleParam === 'DRIVER') initialRole = UserRole.DRIVER;
  else if (roleParam === 'GUEST') initialRole = UserRole.GUEST;

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1F2421] flex flex-col font-sans paper-texture selection:bg-terracotta-100 selection:text-terracotta-900">
      {/* Top Floating Mini Header */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-charcoal-600 hover:text-charcoal-900 transition-colors py-2 px-3.5 rounded-full bg-white/70 border border-[#E8E2D9] shadow-2xs hover:bg-white"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1 text-terracotta-600" />
          <span>Back to Home</span>
        </Link>

        <Link href="/" aria-label="SAFAR Home">
          <SafarLogo size="sm" variant="editorial" showTagline={false} />
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 relative overflow-hidden">
        {/* Background Motifs */}
        <div className="absolute top-12 left-12 opacity-25 pointer-events-none hidden xl:block">
          <IndianArchOutline className="w-32 h-32 text-gold-600" />
        </div>
        <div className="absolute bottom-8 right-10 opacity-20 pointer-events-none hidden xl:block">
          <OliveBranch className="w-36 h-36 text-sage-600 -rotate-12" />
        </div>

        <div className="w-full max-w-lg lg:max-w-4xl xl:max-w-5xl z-10">
          <AuthView
            defaultRole={initialRole}
            initialMode="signup"
            targetRedirect={redirectParam}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-xs text-charcoal-500 font-sans border-t border-[#E8E2D9]/60 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#087F76]" />
          <span>Strict Role Isolation & End-to-End Fleet Security</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-charcoal-400">
          <span>SAFAR Event Transportation Platform</span>
          <span>•</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-6 text-center font-sans">
          <SafarLogo size="md" variant="editorial" />
        </div>
      }
    >
      <SignupPageContent />
    </Suspense>
  );
}
