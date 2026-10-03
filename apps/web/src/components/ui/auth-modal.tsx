'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Mail, Lock, User, ArrowRight, ShieldCheck, Sparkles, AlertCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { UserRole } from '@safar/types';
import { SafarLogo } from './safar-logo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: UserRole;
  targetRedirect?: string;
}

export function AuthModal({ isOpen, onClose, defaultRole = UserRole.EVENT_ORGANIZER, targetRedirect }: AuthModalProps) {
  const router = useRouter();
  const { signInGoogle, signInEmail, signUpEmail } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(defaultRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getDestination = (role: UserRole | string) => {
    if (targetRedirect) return targetRedirect;
    const r = String(role).toUpperCase();
    if (r === 'DRIVER') return '/driver';
    if (r === 'GUEST') return '/guest';
    return '/host';
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await signInGoogle(selectedRole);
      onClose();
      router.push(getDestination(res.role || selectedRole));
    } catch (err: any) {
      setError(err?.message || 'Google sign in could not be completed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      // STEP 1: DATABASE LEVEL "ONE EMAIL = ONE ROLE" VALIDATION
      const validateRes = await fetch('/api/auth/validate-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          requestedRole: selectedRole,
        }),
      });

      const validateData = await validateRes.json();
      if (!validateRes.ok || !validateData.success) {
        throw new Error(
          validateData.error?.message ||
            'Security Policy: One email is associated with exactly ONE role. Please sign in to your authorized dashboard.'
        );
      }

      // STEP 2: AUTHENTICATION / REGISTRATION WITH POSTGRESQL PERSISTENCE
      let userRole: UserRole = selectedRole;

      if (isSignUp) {
        if (!name.trim()) throw new Error('Please enter your full name');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');

        // Create in PostgreSQL database first
        const regRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            fullName: name.trim(),
            role: selectedRole,
          }),
        });

        const regData = await regRes.json();
        if (!regRes.ok || !regData.success) {
          throw new Error(regData.error?.message || 'Failed to register account in database');
        }

        // Firebase Auth sign up / session
        const res = await signUpEmail(cleanEmail, password, name.trim(), selectedRole);
        userRole = (regData.user?.role as UserRole) || res.role || selectedRole;
      } else {
        // Sign in
        const res = await signInEmail(cleanEmail, password);
        // Ensure role from database takes precedence
        if (validateData.user?.role) {
          userRole = validateData.user.role as UserRole;
        } else {
          userRole = res.role || selectedRole;
        }
      }

      onClose();
      router.push(getDestination(userRole));
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-charcoal-200/80 shadow-2xl max-w-md w-full overflow-hidden flex flex-col relative">
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-[#F0ECE1] flex items-center justify-between bg-[#FDFBF7]">
          <div className="flex items-center gap-2">
            <SafarLogo size="sm" />
            <span className="text-[10px] font-bold tracking-widest text-[#0D9488] uppercase pl-2 border-l border-[#E2DDD2]">
              MOVE TOGETHER
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close authentication modal"
            className="p-2 rounded-full text-charcoal-400 hover:text-charcoal-800 hover:bg-charcoal-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 space-y-5 bg-white">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-black text-[#111827] tracking-tight">
              {isSignUp ? 'Create your SAFAR Account' : 'Welcome back to SAFAR'}
            </h2>
            <p className="text-xs text-charcoal-500">
              {isSignUp
                ? 'Register your role workspace under SAFAR unified event mobility.'
                : 'Sign in to access your synchronized transportation dashboard.'}
            </p>
          </div>

          {/* Role Selector Tabs (Pill style) */}
          <div className="p-1 bg-[#F5F2EB] rounded-full grid grid-cols-3 gap-1 text-xs font-semibold text-charcoal-600">
            <button
              type="button"
              onClick={() => {
                setSelectedRole(UserRole.EVENT_ORGANIZER);
                setError(null);
              }}
              className={`py-2 px-3 rounded-full transition-all text-center ${
                selectedRole === UserRole.EVENT_ORGANIZER || selectedRole === UserRole.ACCOUNT_OWNER
                  ? 'bg-[#0D9488] text-white shadow-xs font-bold'
                  : 'hover:text-charcoal-900'
              }`}
            >
              Host
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole(UserRole.GUEST);
                setError(null);
              }}
              className={`py-2 px-3 rounded-full transition-all text-center ${
                selectedRole === UserRole.GUEST
                  ? 'bg-[#0D9488] text-white shadow-xs font-bold'
                  : 'hover:text-charcoal-900'
              }`}
            >
              Guest
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole(UserRole.DRIVER);
                setError(null);
              }}
              className={`py-2 px-3 rounded-full transition-all text-center ${
                selectedRole === UserRole.DRIVER
                  ? 'bg-[#0D9488] text-white shadow-xs font-bold'
                  : 'hover:text-charcoal-900'
              }`}
            >
              Driver
            </button>
          </div>

          {/* Google Single Sign-On Button (Pill style) */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-full border border-charcoal-200 bg-white hover:bg-charcoal-50 text-xs font-semibold text-charcoal-800 transition-all flex items-center justify-center gap-3 shadow-xs disabled:opacity-60 hover:border-charcoal-300"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-charcoal-200" />
            </div>
            <span className="relative bg-white px-3 text-[10px] uppercase tracking-wider font-bold text-charcoal-400">
              OR CONTINUE WITH EMAIL
            </span>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">Access Restricted</span>
                <span className="leading-relaxed block">{error}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-charcoal-200 text-xs font-medium focus:ring-2 focus:ring-[#0D9488] focus:border-[#0D9488] focus:outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-charcoal-200 text-xs font-medium focus:ring-2 focus:ring-[#0D9488] focus:border-[#0D9488] focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-charcoal-200 text-xs font-medium focus:ring-2 focus:ring-[#0D9488] focus:border-[#0D9488] focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-xs shadow-md shadow-teal-700/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99]"
            >
              {loading ? (
                'Verifying Credentials...'
              ) : isSignUp ? (
                <>
                  Register as {selectedRole === UserRole.EVENT_ORGANIZER ? 'Host' : selectedRole === UserRole.DRIVER ? 'Driver' : 'Guest'} <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Sign Up / Sign In */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-xs text-charcoal-500 hover:text-[#0D9488] font-semibold transition-colors"
            >
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
