'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { UserRole } from '@safar/types';
import { SafarLogo } from '../ui/safar-logo';
import { AuthModal } from '../ui/auth-modal';
import { ShieldAlert, Lock, ArrowRight, Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const { authStatus, role, profile } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loadTimeout, setLoadTimeout] = useState(false);

  // Safety timeout on AuthGuard loading display (3.5s)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (authStatus === 'AUTH_LOADING') {
      timer = setTimeout(() => {
        setLoadTimeout(true);
      }, 3500);
    } else {
      setLoadTimeout(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [authStatus]);

  // If unauthenticated, redirect to login cleanly with redirect target
  useEffect(() => {
    if (authStatus === 'UNAUTHENTICATED') {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/host';
      router.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
    }
  }, [authStatus, router]);

  // If loading authentication state, show branded SAFAR loading screen
  if (authStatus === 'AUTH_LOADING') {
    return (
      <div className="min-h-screen bg-warm-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="space-y-4 max-w-xs w-full flex flex-col items-center">
          <SafarLogo size="md" />
          <div className="flex items-center gap-2 text-xs font-semibold text-charcoal-500 pt-2">
            <Loader2 className="w-4 h-4 text-safar-600 animate-spin" />
            <span>Verifying secure session...</span>
          </div>

          {loadTimeout && (
            <div className="pt-4 space-y-2 animate-in fade-in duration-300">
              <p className="text-[11px] text-charcoal-500">
                Session verification is taking longer than usual.
              </p>
              <Link
                href="/login?redirect=/host"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-charcoal-900 text-white text-xs font-semibold hover:bg-charcoal-800 transition-colors shadow-2xs"
              >
                Go to Sign In <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If unauthenticated, render clean redirecting / sign-in screen
  if (authStatus === 'UNAUTHENTICATED') {
    return (
      <div className="min-h-screen bg-[#FAF7F2] paper-texture flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white/90 border border-[#E5DACB] shadow-sm invitation-frame space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-warm-100 text-terracotta-700 mx-auto flex items-center justify-center border border-[#E5DACB]">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h2 className="font-serif text-2xl font-bold text-charcoal-900 tracking-tight">
              Authentication Required
            </h2>
            <p className="text-xs text-charcoal-600 leading-relaxed">
              Redirecting to secure login...
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <Link
              href="/login?redirect=/host"
              className="w-full py-3 rounded-full bg-gradient-to-r from-terracotta-600 to-terracotta-700 hover:from-terracotta-700 hover:to-terracotta-800 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              Sign In to SAFAR <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="block w-full py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider text-charcoal-600 hover:bg-warm-100 transition-colors"
            >
              Return to Landing Page
            </Link>
          </div>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    );
  }

  // If authenticated, check role authorization
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const getDestination = (userRole: UserRole) => {
      switch (userRole) {
        case UserRole.DRIVER:
          return '/driver';
        case UserRole.GUEST:
          return '/guest';
        case UserRole.EVENT_ORGANIZER:
        case UserRole.ACCOUNT_OWNER:
        default:
          return '/host';
      }
    };

    return (
      <div className="min-h-screen bg-warm-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-rose-200 shadow-sm space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600">
              Access Restricted (403)
            </span>
            <h2 className="text-xl font-bold text-charcoal-900 tracking-tight">
              Unauthorized Role Workspace
            </h2>
            <p className="text-xs text-charcoal-500 leading-relaxed">
              You are signed in as <strong className="text-charcoal-800">{role.replace('_', ' ')}</strong>. You do not have permissions to access this specific area.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href={getDestination(role)}
              className="w-full py-3 rounded-2xl bg-charcoal-900 hover:bg-charcoal-800 text-white font-bold text-xs shadow-sm inline-flex items-center justify-center gap-2 transition-all"
            >
              Go to Your Authorized Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
