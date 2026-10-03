'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/auth-context';
import { formatHostGreeting } from '../../../lib/time-greeting';
import {
  User,
  Mail,
  Phone,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Sparkles,
  Lock,
} from 'lucide-react';
import { SafarButton } from '../../../components/ui/safar-design-system';

export default function HostProfilePage() {
  const { profile, updateUserProfile, authStatus } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync form state when profile loads or updates
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setPhoneNumber(profile.phoneNumber || '');
      setAvatarUrl(profile.avatarUrl || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    const cleanName = fullName.trim();
    if (!cleanName) {
      setErrorMessage('Full name is required and cannot be empty.');
      return;
    }

    if (cleanName.length < 2) {
      setErrorMessage('Full name must be at least 2 characters long.');
      return;
    }

    if (cleanName.length > 80) {
      setErrorMessage('Full name cannot exceed 80 characters.');
      return;
    }

    if (phoneNumber.trim()) {
      const cleanPhone = phoneNumber.trim();
      if (!/^\+?[0-9\s\-()]{7,20}$/.test(cleanPhone)) {
        setErrorMessage('Please enter a valid mobile number with country code (e.g. +91 98765 43210).');
        return;
      }
    }

    setSaving(true);
    try {
      await updateUserProfile({
        fullName: cleanName,
        phoneNumber: phoneNumber.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });

      setSuccessMessage('Profile updated successfully');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error('Profile update error:', err);
      setErrorMessage(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (authStatus === 'AUTH_LOADING' && !profile) {
    return (
      <div className="max-w-3xl mx-auto py-12 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-6 h-6 text-terracotta-600 animate-spin" />
        <span className="text-xs font-semibold text-charcoal-500">Loading host profile...</span>
      </div>
    );
  }

  const liveGreetingPreview = formatHostGreeting(fullName.trim() || profile?.fullName);
  const initials = (fullName.trim() || profile?.fullName || 'H')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Editorial Header */}
      <div className="border-b border-warm-200/80 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-gold-100/70 text-gold-900 border border-gold-200/60 font-sans">
            Organizer Account
          </span>
          <span className="text-xs text-charcoal-400 font-sans">Personal Credentials</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal-900 tracking-tight">
          Host Profile &amp; Settings
        </h1>
        <p className="text-xs text-charcoal-500 mt-1 font-sans leading-relaxed">
          Manage your personal organizer identity, contact numbers for driver escalations, and dashboard greeting.
        </p>
      </div>

      {/* Live Greeting Preview Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-warm-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-terracotta-50 text-terracotta-700 border border-terracotta-200 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-terracotta-600" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-terracotta-800">
              Dashboard Greeting Preview
            </div>
            <div className="text-base sm:text-lg font-serif font-bold text-charcoal-900">
              {liveGreetingPreview}
            </div>
          </div>
        </div>
        <span className="text-[11px] text-charcoal-400 font-sans self-start sm:self-center">
          Updates live across your SAFAR workspace
        </span>
      </div>

      {/* Feedback Messages */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Profile Card Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-warm-200 shadow-2xs space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-warm-200">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName || 'Host'}
                  className="w-20 h-20 rounded-2xl object-cover border border-warm-200 shadow-2xs"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-terracotta-50 text-terracotta-800 flex items-center justify-center font-serif font-bold text-2xl shadow-2xs border border-terracotta-200">
                  {initials || 'H'}
                </div>
              )}
            </div>

            <div className="space-y-1.5 flex-1">
              <label className="block text-xs font-bold text-charcoal-800">Profile Photo URL</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://images.unsplash.com/... or paste image URL"
                className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 placeholder:text-charcoal-400"
              />
              <p className="text-[11px] text-charcoal-400">
                Optional: Enter a direct image URL for your profile photo.
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-charcoal-800">
                Full Name / Display Name <span className="text-terracotta-600">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Priya Shah"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-semibold text-charcoal-900 focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500"
                />
              </div>
              <p className="text-[11px] text-charcoal-400">
                This name appears on the dashboard greeting and event invitations.
              </p>
            </div>

            {/* Mobile Number */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-charcoal-800">Mobile Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-semibold text-charcoal-900 focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500"
                />
              </div>
              <p className="text-[11px] text-charcoal-400">
                For fleet emergency escalations and dispatch broadcasts.
              </p>
            </div>

            {/* Email (Read-Only) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-charcoal-800">Email Address</label>
                <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Read-only
                </span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input
                  type="email"
                  readOnly
                  disabled
                  value={profile?.email || 'N/A'}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-warm-200 bg-warm-50 text-xs font-medium text-charcoal-600 cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-charcoal-400">
                Primary authentication identity (ONE EMAIL = ONE ROLE).
              </p>
            </div>

            {/* Role & Access (Read-Only) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-charcoal-800">Assigned Workspace Role</label>
                <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-terracotta-600" /> Protected
                </span>
              </div>
              <div className="px-3.5 py-2.5 rounded-xl border border-warm-200 bg-warm-50 text-xs font-bold text-charcoal-800 flex items-center justify-between">
                <span>{profile?.role ? profile.role.replace('_', ' ') : 'EVENT ORGANIZER'}</span>
                <span className="px-2 py-0.5 rounded-md bg-gold-100/70 border border-gold-200 text-gold-900 text-[10px] font-black uppercase tracking-wider">
                  Host
                </span>
              </div>
              <p className="text-[11px] text-charcoal-400">
                Roles are managed by SAFAR tenancy security.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-warm-200 flex items-center justify-end gap-3">
            <SafarButton type="submit" variant="primary" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </SafarButton>
          </div>
        </div>
      </form>
    </div>
  );
}
