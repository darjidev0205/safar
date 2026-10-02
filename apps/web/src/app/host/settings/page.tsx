'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Settings, Save, Shield, Bell, Globe, Check, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../../../context/auth-context';

export default function HostSettingsPage() {
  const { profile } = useAuth();
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    orgName: 'Elite Celebrations & Logistics',
    defaultCity: 'Ahmedabad',
    defaultTimezone: 'Asia/Kolkata (IST +5:30)',
    smsNotifications: true,
    autoDispatch: true,
    emergencyPhone: '+91 98765 00000',
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal-900 tracking-tight">Organization Settings</h1>
        <p className="text-xs text-charcoal-500 mt-0.5">
          Configure tenant identity, default operational rules, and notification gateways.
        </p>
      </div>

      {/* Host Profile Quick Access */}
      <div className="p-5 rounded-3xl bg-white border border-charcoal-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-safar-50 text-safar-700 flex items-center justify-center font-bold text-base border border-safar-200">
            {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'H'}
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-safar-700">Personal Organizer Account</div>
            <div className="text-base font-bold text-charcoal-900">{profile?.fullName || 'Host Organizer'}</div>
            <div className="text-xs text-charcoal-500">{profile?.email || 'Authenticated User'}</div>
          </div>
        </div>

        <Link
          href="/host/profile"
          className="px-4.5 py-2.5 rounded-xl bg-safar-50 hover:bg-safar-100 text-safar-800 text-xs font-bold transition-all border border-safar-200 flex items-center justify-center gap-1.5 shrink-0"
        >
          <User className="w-3.5 h-3.5" />
          <span>Edit Profile &amp; Name</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="p-6 rounded-3xl bg-white border border-charcoal-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-charcoal-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-safar-600" /> Organization &amp; Region
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">Company / Host Name</label>
              <input
                type="text"
                value={settings.orgName}
                onChange={(e) => setSettings({ ...settings, orgName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">Primary Operational Hub</label>
              <input
                type="text"
                value={settings.defaultCity}
                onChange={(e) => setSettings({ ...settings, defaultCity: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">Default Timezone</label>
            <select
              value={settings.defaultTimezone}
              onChange={(e) => setSettings({ ...settings, defaultTimezone: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
            >
              <option value="Asia/Kolkata (IST +5:30)">Asia/Kolkata (IST +5:30)</option>
              <option value="Asia/Dubai (GST +4:00)">Asia/Dubai (GST +4:00)</option>
              <option value="Europe/London (GMT/BST)">Europe/London (GMT/BST)</option>
              <option value="America/New_York (EST)">America/New_York (EST)</option>
            </select>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-charcoal-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-charcoal-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-safar-600" /> Notifications &amp; Automated Dispatch
          </h3>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-2.5 text-charcoal-800 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={settings.smsNotifications}
                onChange={(e) => setSettings({ ...settings, smsNotifications: e.target.checked })}
                className="rounded text-safar-600 focus:ring-safar-500"
              />
              <span>Send automated SMS booking reminders and driver arrival updates</span>
            </label>
            <label className="flex items-center gap-2.5 text-charcoal-800 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoDispatch}
                onChange={(e) => setSettings({ ...settings, autoDispatch: e.target.checked })}
                className="rounded text-safar-600 focus:ring-safar-500"
              />
              <span>Auto-dispatch backup shuttles when vehicle reaches 85% capacity</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">Emergency Operations Hotline</label>
            <input
              type="text"
              value={settings.emergencyPhone}
              onChange={(e) => setSettings({ ...settings, emergencyPhone: e.target.value })}
              className="w-full sm:w-1/2 px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <Check className="w-4 h-4" /> Preferences saved!
            </span>
          )}
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-safar-600 hover:bg-safar-700 text-white font-bold text-xs shadow-sm flex items-center gap-2 active:scale-[0.98]"
          >
            <Save className="w-3.5 h-3.5" /> Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
