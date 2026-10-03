'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Mail,
  Users,
  Shield,
  Check,
  AlertCircle,
  Loader2,
  Heart,
  Save,
  LogOut,
} from 'lucide-react';
import {
  MarigoldFlower,
  OliveBranch,
  StarFlourish,
  FloralDivider,
} from '../../../components/ui/botanical-ornaments';
import { useAuth } from '../../../context/auth-context';

export default function GuestProfilePage() {
  const { profile, logout, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [familyName, setFamilyName] = useState('Shah Family');
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setPhoneNumber(profile.phoneNumber || '');
      setEmail(profile.email || '');
    }

    // Load family context from dashboard API
    async function loadFamilyData() {
      try {
        const res = await fetch('/api/guest/dashboard', {
          headers: {
            ...(profile?.id ? { 'x-user-id': profile.id } : {}),
            ...(profile?.email ? { 'x-user-email': profile.email } : {}),
          },
        });
        const json = await res.json();
        if (json.success && json.family) {
          setFamilyName(json.family.name || 'Honored Family');
          if (json.family.members && json.family.members.length > 0) {
            setFamilyMembers(json.family.members);
          }
        }
      } catch (err) {
        // ignore
      }
    }

    loadFamilyData();
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(profile?.id ? { 'x-user-id': profile.id } : {}),
          ...(profile?.email ? { 'x-user-email': profile.email } : {}),
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Your guest profile has been successfully saved.');
        if (refreshProfile) {
          await refreshProfile();
        }
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(data.error?.message || 'Failed to update profile.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error updating profile.');
    } finally {
      setLoading(false);
    }
  };

  const guestInitial = fullName ? fullName.trim().charAt(0).toUpperCase() : 'G';

  return (
    <div className="space-y-6 max-w-md md:max-w-xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white/80 rounded-3xl p-5 sm:p-7 border border-[#E5DACB] shadow-xs invitation-frame relative overflow-hidden text-center sm:text-left flex flex-col sm:flex-row items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-terracotta-600 to-burgundy-700 text-white flex items-center justify-center font-bold text-2xl shadow-md border-2 border-white shrink-0">
          {guestInitial}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center sm:justify-start gap-1.5">
            <StarFlourish className="w-3 h-3 text-gold-600" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-terracotta-700">
              Honored Guest Profile
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl text-charcoal-900 font-semibold">
            {fullName || 'Guest Profile'}
          </h1>
          <p className="text-xs text-charcoal-600 flex items-center justify-center sm:justify-start gap-1.5">
            <Users className="w-3.5 h-3.5 text-charcoal-400" />
            <span>{familyName}</span>
          </p>
        </div>
      </div>

      {/* Profile Form */}
      <form
        onSubmit={handleSave}
        className="bg-white/85 rounded-3xl p-5 sm:p-7 border border-[#E5DACB] shadow-xs space-y-5"
      >
        <div className="pb-3 border-b border-[#E5DACB]/60">
          <h2 className="font-serif text-xl text-charcoal-900 font-bold">Personal Information</h2>
          <p className="text-xs text-charcoal-500">
            Chauffeurs and coordinators use these details for airport pickups and ceremony shuttles.
          </p>
        </div>

        {successMsg && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700 block">
            Full Name
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Priya Shah"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-charcoal-300/80 bg-warm-50 text-xs font-semibold text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-terracotta-500"
            />
          </div>
        </div>

        {/* Mobile Number */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700 block">
            Mobile Number (for Driver WhatsApp & Calls)
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-3.5" />
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-charcoal-300/80 bg-warm-50 text-xs font-semibold text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-terracotta-500"
            />
          </div>
        </div>

        {/* Email Address */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700 block">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-3.5" />
            <input
              type="email"
              disabled
              value={email}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-charcoal-200 bg-charcoal-50 text-xs font-medium text-charcoal-500 cursor-not-allowed"
            />
          </div>
          <span className="text-[11px] text-charcoal-400">Authenticated via SAFAR identity system</span>
        </div>

        {/* Emergency Contact */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700 block">
            Emergency Family Contact (Optional)
          </label>
          <div className="relative">
            <Shield className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="e.g. Father / Sibling (+91 98765 00000)"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-charcoal-300/80 bg-warm-50 text-xs font-semibold text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-terracotta-500"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-terracotta-600 to-terracotta-700 hover:from-terracotta-700 hover:to-terracotta-800 text-white font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Profile Updates</span>
          </button>
        </div>
      </form>

      {/* Family Manifest Card */}
      {familyMembers.length > 0 && (
        <div className="bg-white/80 rounded-3xl p-5 sm:p-6 border border-[#E5DACB] shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-terracotta-600" />
            <h3 className="font-serif text-lg font-bold text-charcoal-900">
              {familyName} Members
            </h3>
          </div>
          <div className="divide-y divide-[#E5DACB]/50">
            {familyMembers.map((member: any) => (
              <div key={member.id} className="py-2.5 flex items-center justify-between text-xs">
                <span className="font-bold text-charcoal-900">{member.fullName}</span>
                <span className="text-charcoal-500">{member.relation || 'Family Member'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sign Out Card */}
      <div className="p-4 rounded-2xl bg-white/70 border border-[#E5DACB] flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-charcoal-800">Switch Account / Sign Out</h4>
          <p className="text-[11px] text-charcoal-500">End your current SAFAR session safely</p>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 rounded-full border border-charcoal-300 text-xs font-bold uppercase tracking-wider text-charcoal-800 hover:bg-warm-100 transition-colors flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="pt-2 pb-4">
        <FloralDivider className="w-full max-w-xs mx-auto text-gold-500/80" />
      </div>
    </div>
  );
}
