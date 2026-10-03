'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  Eye,
  EyeOff,
  AlertTriangle,
  Users,
  Heart,
  Car,
  Loader2,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { UserRole } from '@safar/types';
import { SafarLogo } from '../ui/safar-logo';
import {
  StarFlourish,
  MarigoldFlower,
  OliveBranch,
  JasmineBloom,
  IndianArchOutline,
} from '../ui/botanical-ornaments';

export interface AuthViewProps {
  defaultRole?: UserRole;
  initialMode?: 'signin' | 'signup';
  targetRedirect?: string;
  onSuccess?: () => void;
  isModal?: boolean;
}

export function AuthView({
  defaultRole = UserRole.EVENT_ORGANIZER,
  initialMode = 'signin',
  targetRedirect,
  onSuccess,
  isModal = false,
}: AuthViewProps) {
  const router = useRouter();
  const { signInGoogle, signInEmail, signUpEmail } = useAuth();

  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [selectedRole, setSelectedRole] = useState<UserRole>(defaultRole);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states & errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const getDestination = (role: UserRole | string) => {
    if (targetRedirect) return targetRedirect;
    const r = String(role).toUpperCase();
    if (r === 'DRIVER') return '/driver';
    if (r === 'GUEST') return '/guest';
    return '/host';
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    if (isSignUp) {
      if (!name.trim()) {
        errors.name = 'Full name is required.';
      }
      if (!phone.trim()) {
        errors.phone = 'Mobile number is required.';
      } else if (!/^[0-9+() -]{7,15}$/.test(phone.trim())) {
        errors.phone = 'Please enter a valid contact number.';
      }
      if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await signInGoogle(selectedRole);
      if (onSuccess) onSuccess();
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

    if (!validateForm()) return;

    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      // STEP 1: VALIDATE ONE-EMAIL = ONE-ROLE AT DATABASE LEVEL
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

      // STEP 2: REGISTRATION OR SIGN IN
      let userRole: UserRole = selectedRole;

      if (isSignUp) {
        const regRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            fullName: name.trim(),
            role: selectedRole,
            phoneNumber: phone.trim(),
          }),
        });

        const regData = await regRes.json();
        if (!regRes.ok || !regData.success) {
          throw new Error(regData.error?.message || 'Failed to register account in database.');
        }

        const res = await signUpEmail(cleanEmail, password, name.trim(), selectedRole);
        userRole = (regData.user?.role as UserRole) || res.role || selectedRole;
      } else {
        const res = await signInEmail(cleanEmail, password);
        if (validateData.user?.role) {
          userRole = validateData.user.role as UserRole;
        } else {
          userRole = res.role || selectedRole;
        }
      }

      if (onSuccess) onSuccess();
      router.push(getDestination(userRole));
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Helper for role details
  const getRoleDescription = (r: UserRole) => {
    if (r === UserRole.EVENT_ORGANIZER) {
      return 'Event hosts, wedding families & authorized planners';
    }
    if (r === UserRole.DRIVER) {
      return 'Assigned fleet chauffeurs & convoy transport drivers';
    }
    return 'Invited wedding guests & registered attendees';
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 overflow-hidden rounded-3xl bg-white border border-[#E8E2D9] shadow-xl selection:bg-terracotta-100 selection:text-terracotta-900">
      {/* ========================================================================= */}
      {/* LEFT SECTION: BRANDED VISUAL SHOWCASE (DESKTOP ONLY)                      */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex lg:col-span-5 bg-[#FAF7F2] p-8 lg:p-10 flex-col justify-between relative border-r border-[#E8E2D9] paper-texture overflow-hidden">
        {/* Subtle Decorative Background Motifs */}
        <div className="absolute top-4 right-4 opacity-25 pointer-events-none">
          <IndianArchOutline className="w-20 h-20 text-gold-600" />
        </div>
        <div className="absolute -bottom-8 -left-8 opacity-20 pointer-events-none">
          <OliveBranch className="w-28 h-28 text-sage-600 rotate-12" />
        </div>

        {/* Top: Brand Eyebrow & Logo */}
        <div className="space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-terracotta-700 bg-terracotta-50/90 px-3.5 py-1.5 rounded-full border border-terracotta-200/60 shadow-2xs">
            <StarFlourish className="w-2.5 h-2.5 text-terracotta-600" />
            <span>Synchronized Event Mobility</span>
            <StarFlourish className="w-2.5 h-2.5 text-terracotta-600" />
          </div>

          <div className="space-y-3">
            <h2 className="font-serif text-3xl xl:text-4xl text-charcoal-900 leading-[1.12] tracking-tight font-normal">
              Move together. <br />
              <span className="italic font-light text-terracotta-600">Arrive together.</span>
            </h2>
            <p className="text-xs text-charcoal-600 font-sans leading-relaxed max-w-sm">
              Thoughtfully coordinated transportation for grand celebrations. From airport welcomes and baraat convoys to midnight banquet departures.
            </p>
          </div>
        </div>

        {/* Center: Ceremony Schedule Card (Mirroring Landing Page Deckled Invitation Card) */}
        <div className="relative my-6 z-10">
          {/* Botanical Accents */}
          <div className="absolute -top-3 -right-3 z-20 pointer-events-none">
            <MarigoldFlower className="w-7 h-7 text-gold-500 drop-shadow-xs" />
          </div>

          <div className="bg-white/95 rounded-2xl p-4 border border-[#C49E64]/35 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#F0ECE1] pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-charcoal-500">
              <span className="flex items-center gap-1.5 text-gold-700">
                <StarFlourish className="w-2 h-2" />
                Live Wedding Dispatch
              </span>
              <span className="inline-flex items-center gap-1 text-[#087F76]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#087F76] animate-pulse" />
                Active
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 px-2.5 rounded-xl bg-warm-50 border border-warm-200/60">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-terracotta-600 shrink-0" />
                  <span className="font-semibold text-charcoal-900">Sangeet Shuttles</span>
                </div>
                <span className="text-[11px] font-medium text-charcoal-600">19:00 – Late</span>
              </div>

              <div className="flex items-center justify-between py-1 px-2.5 rounded-xl bg-warm-50 border border-warm-200/60">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-sage-600 shrink-0" />
                  <span className="font-semibold text-charcoal-900">Mandap Procession</span>
                </div>
                <span className="text-[11px] font-medium text-charcoal-600">VIP Fleet</span>
              </div>
            </div>

            <div className="pt-1 flex items-center gap-2 text-[11px] text-charcoal-500 italic">
              <CheckCircle2 className="w-3.5 h-3.5 text-sage-600 shrink-0" />
              <span>No frantic phone calls to the family. Just dignified arrivals.</span>
            </div>
          </div>
        </div>

        {/* Bottom: Dignity statement */}
        <div className="relative z-10 pt-2 border-t border-[#E8E2D9]/70 flex items-center justify-between text-[11px] text-charcoal-500 font-sans">
          <span>Enterprise Fleet Isolation</span>
          <span className="font-semibold text-[#087F76]">SAFAR 2.0</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT SECTION: AUTHENTICATION PANEL (MOBILE & DESKTOP)                    */}
      {/* ========================================================================= */}
      <div className="lg:col-span-7 p-6 sm:p-8 md:p-10 flex flex-col justify-center bg-white space-y-6">
        {/* Brand Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <SafarLogo size="md" variant="editorial" showTagline={false} />
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#087F76] uppercase pl-2.5 border-l border-[#E2DDD2]">
                AUTHENTICATION
              </span>
            </div>

            {/* Mobile Badge */}
            <div className="lg:hidden">
              <span className="text-[10px] font-bold tracking-wider uppercase bg-warm-100 text-charcoal-600 px-2.5 py-1 rounded-full border border-warm-200">
                {selectedRole === UserRole.EVENT_ORGANIZER
                  ? 'Host Portal'
                  : selectedRole === UserRole.DRIVER
                  ? 'Chauffeur'
                  : 'Guest Pass'}
              </span>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal-900 tracking-tight">
              {isSignUp ? 'Create your SAFAR Account' : 'Welcome back to SAFAR'}
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-500 font-sans">
              {isSignUp
                ? 'Register your designated role for synchronized event mobility.'
                : 'Sign in to access your synchronized transportation dashboard.'}
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROLE SELECTOR (Host | Guest | Driver)                                      */}
        {/* ========================================================================= */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-charcoal-700">Select Your Role</label>
            <span className="text-[11px] text-charcoal-500">1 Email = 1 Permanent Role</span>
          </div>

          <div
            role="tablist"
            aria-label="User Roles"
            className="p-1.5 bg-[#FAF7F2] border border-[#E8E2D9] rounded-2xl grid grid-cols-3 gap-1.5"
          >
            {/* Host Button */}
            <button
              type="button"
              role="tab"
              aria-selected={selectedRole === UserRole.EVENT_ORGANIZER}
              onClick={() => {
                setSelectedRole(UserRole.EVENT_ORGANIZER);
                setError(null);
                setFieldErrors({});
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${
                selectedRole === UserRole.EVENT_ORGANIZER
                  ? 'bg-[#087F76] text-white shadow-xs font-bold'
                  : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-white/80'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>Host</span>
            </button>

            {/* Guest Button */}
            <button
              type="button"
              role="tab"
              aria-selected={selectedRole === UserRole.GUEST}
              onClick={() => {
                setSelectedRole(UserRole.GUEST);
                setError(null);
                setFieldErrors({});
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${
                selectedRole === UserRole.GUEST
                  ? 'bg-[#087F76] text-white shadow-xs font-bold'
                  : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-white/80'
              }`}
            >
              <Heart className="w-3.5 h-3.5 shrink-0" />
              <span>Guest</span>
            </button>

            {/* Driver Button */}
            <button
              type="button"
              role="tab"
              aria-selected={selectedRole === UserRole.DRIVER}
              onClick={() => {
                setSelectedRole(UserRole.DRIVER);
                setError(null);
                setFieldErrors({});
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${
                selectedRole === UserRole.DRIVER
                  ? 'bg-[#087F76] text-white shadow-xs font-bold'
                  : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-white/80'
              }`}
            >
              <Car className="w-3.5 h-3.5 shrink-0" />
              <span>Driver</span>
            </button>
          </div>

          <p className="text-[11px] text-charcoal-500 font-sans italic px-1">
            {getRoleDescription(selectedRole)}
          </p>
        </div>

        {/* ========================================================================= */}
        {/* GOOGLE SSO                                                                */}
        {/* ========================================================================= */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl border border-[#D4C4B0]/80 bg-white hover:bg-warm-50 text-xs sm:text-sm font-semibold text-charcoal-800 transition-all flex items-center justify-center gap-3 shadow-2xs disabled:opacity-60 hover:border-charcoal-300 min-h-[44px] active:scale-[0.99]"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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

        {/* Divider */}
        <div className="relative flex items-center justify-center my-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E8E2D9]" />
          </div>
          <span className="relative bg-white px-3 text-[10px] uppercase tracking-[0.2em] font-bold text-charcoal-400 font-sans">
            OR CONTINUE WITH EMAIL
          </span>
        </div>

        {/* Server-side Error Notice */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="space-y-0.5 flex-1">
              <span className="font-bold block">Access Restricted</span>
              <span className="leading-relaxed block">{error}</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* EMAIL & PASSWORD FORM                                                     */}
        {/* ========================================================================= */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Sign Up Specific: Full Name */}
          {isSignUp && (
            <div className="space-y-1">
              <label
                htmlFor="auth-fullname"
                className="block text-xs font-semibold text-charcoal-800"
              >
                Full Name <span className="text-terracotta-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 pointer-events-none">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="auth-fullname"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' });
                  }}
                  placeholder={
                    selectedRole === UserRole.EVENT_ORGANIZER
                      ? 'e.g. Vikram Sharma'
                      : selectedRole === UserRole.DRIVER
                      ? 'e.g. Ramesh Kumar'
                      : 'e.g. Priya Patel'
                  }
                  className={`w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl bg-warm-50/50 border text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-[#087F76]/25 focus:border-[#087F76] transition-all min-h-[44px] ${
                    fieldErrors.name ? 'border-rose-400 bg-rose-50/20' : 'border-[#D4C4B0]/80'
                  }`}
                />
              </div>
              {fieldErrors.name && (
                <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.name}</p>
              )}
            </div>
          )}

          {/* Email Address */}
          <div className="space-y-1">
            <label
              htmlFor="auth-email"
              className="block text-xs font-semibold text-charcoal-800"
            >
              Email Address <span className="text-terracotta-600">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 pointer-events-none">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                }}
                placeholder="name@example.com"
                className={`w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl bg-warm-50/50 border text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-[#087F76]/25 focus:border-[#087F76] transition-all min-h-[44px] ${
                  fieldErrors.email ? 'border-rose-400 bg-rose-50/20' : 'border-[#D4C4B0]/80'
                }`}
              />
            </div>
            {fieldErrors.email && (
              <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.email}</p>
            )}
          </div>

          {/* Sign Up Specific: Mobile Number */}
          {isSignUp && (
            <div className="space-y-1">
              <label
                htmlFor="auth-phone"
                className="block text-xs font-semibold text-charcoal-800"
              >
                Mobile Number <span className="text-terracotta-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 pointer-events-none">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="auth-phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: '' });
                  }}
                  placeholder="+91 98765 43210"
                  className={`w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl bg-warm-50/50 border text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-[#087F76]/25 focus:border-[#087F76] transition-all min-h-[44px] ${
                    fieldErrors.phone ? 'border-rose-400 bg-rose-50/20' : 'border-[#D4C4B0]/80'
                  }`}
                />
              </div>
              {fieldErrors.phone && (
                <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.phone}</p>
              )}
            </div>
          )}

          {/* Password */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="auth-password"
                className="block text-xs font-semibold text-charcoal-800"
              >
                Password <span className="text-terracotta-600">*</span>
              </label>
              {!isSignUp && (
                <span className="text-[11px] text-charcoal-400 italic">
                  Min. 6 characters
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 pointer-events-none">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                }}
                placeholder="••••••••"
                className={`w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl bg-warm-50/50 border text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-[#087F76]/25 focus:border-[#087F76] transition-all min-h-[44px] ${
                  fieldErrors.password ? 'border-rose-400 bg-rose-50/20' : 'border-[#D4C4B0]/80'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700 transition-colors p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.password}</p>
            )}
          </div>

          {/* Sign Up Specific: Confirm Password */}
          {isSignUp && (
            <div className="space-y-1">
              <label
                htmlFor="auth-confirm-password"
                className="block text-xs font-semibold text-charcoal-800"
              >
                Confirm Password <span className="text-terracotta-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="auth-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword)
                      setFieldErrors({ ...fieldErrors, confirmPassword: '' });
                  }}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl bg-warm-50/50 border text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-[#087F76]/25 focus:border-[#087F76] transition-all min-h-[44px] ${
                    fieldErrors.confirmPassword
                      ? 'border-rose-400 bg-rose-50/20'
                      : 'border-[#D4C4B0]/80'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700 transition-colors p-1"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-[11px] text-rose-600 font-medium">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>
          )}

          {/* Primary CTA Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-full bg-[#087F76] hover:bg-[#06635c] text-white text-xs sm:text-sm font-bold uppercase tracking-[0.14em] shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-60 active:scale-[0.99] min-h-[46px] mt-2 cursor-pointer"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isSignUp ? 'Creating Account...' : 'Authenticating...'}</span>
              </div>
            ) : isSignUp ? (
              <>
                <span>
                  Register as{' '}
                  {selectedRole === UserRole.EVENT_ORGANIZER
                    ? 'Host'
                    : selectedRole === UserRole.DRIVER
                    ? 'Driver'
                    : 'Guest'}
                </span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        {/* Toggle between Sign In and Sign Up */}
        <div className="text-center pt-2 border-t border-[#F0ECE1]">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setFieldErrors({});
            }}
            className="text-xs text-charcoal-600 hover:text-[#087F76] font-semibold transition-colors py-1 px-2 rounded-lg"
          >
            {isSignUp ? (
              <span>
                Already have an account?{' '}
                <strong className="text-[#087F76] underline underline-offset-2">Sign In</strong>
              </span>
            ) : (
              <span>
                Don&apos;t have an account?{' '}
                <strong className="text-[#087F76] underline underline-offset-2">Sign Up</strong>
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
