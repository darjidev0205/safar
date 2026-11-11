'use client';

import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Loader2,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';

interface AddFunctionModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  defaultDate?: string;
  defaultVenueName?: string;
  defaultVenueAddress?: string;
  onFunctionAdded: () => void;
}

const CEREMONY_PRESETS = [
  { type: 'MEHENDI', label: 'Mehendi', defaultTime: '11:00', endDefault: '15:00', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { type: 'SANGEET', label: 'Sangeet Evening', defaultTime: '19:00', endDefault: '23:30', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  { type: 'HALDI', label: 'Haldi Rituals', defaultTime: '09:30', endDefault: '12:30', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  { type: 'WEDDING', label: 'Wedding & Varmala', defaultTime: '18:00', endDefault: '23:30', color: 'bg-rose-50 text-rose-800 border-rose-200' },
  { type: 'RECEPTION', label: 'Reception Gala', defaultTime: '19:30', endDefault: '00:00', color: 'bg-purple-50 text-purple-800 border-purple-200' },
  { type: 'CUSTOM', label: 'Custom Ceremony', defaultTime: '16:00', endDefault: '20:00', color: 'bg-neutral-50 text-neutral-800 border-neutral-200' },
];

export function AddFunctionModal({
  isOpen,
  onClose,
  eventId,
  eventName,
  defaultDate,
  defaultVenueName,
  defaultVenueAddress,
  onFunctionAdded,
}: AddFunctionModalProps) {
  const { profile, firebaseUser } = useAuth();
  const [selectedType, setSelectedType] = useState('SANGEET');
  const [name, setName] = useState('Sangeet Celebration');
  const [date, setDate] = useState(() => defaultDate || new Date().toISOString().substring(0, 10));
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('23:30');
  const [venueName, setVenueName] = useState(defaultVenueName || '');
  const [venueAddress, setVenueAddress] = useState(defaultVenueAddress || '');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof CEREMONY_PRESETS[0]) => {
    setSelectedType(preset.type);
    setName(preset.label);
    setStartTime(preset.defaultTime);
    setEndTime(preset.endDefault);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Ceremony name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      let token = '';
      try {
        if (firebaseUser) {
          token = await firebaseUser.getIdToken();
        } else if (typeof window !== 'undefined') {
          token = localStorage.getItem('safar_auth_token') || '';
        }
      } catch {
        token = typeof window !== 'undefined' ? localStorage.getItem('safar_auth_token') || '' : '';
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (profile?.id && /^[0-9a-fA-F]{24}$/.test(profile.id)) {
        headers['x-user-id'] = profile.id;
      }
      if (profile?.email) headers['x-user-email'] = profile.email;

      const res = await fetch(`/api/events/${eventId}/functions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: name.trim(),
          type: selectedType,
          date,
          startTime,
          endTime,
          venueName: venueName.trim() || undefined,
          venueAddress: venueAddress.trim() || undefined,
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to add ceremony.');
      }

      onFunctionAdded();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while adding this ceremony.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl border border-[#E8E2D9] shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5DACB]/80 flex items-center justify-between bg-warm-50/70">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gold-700">
              <Sparkles className="w-3 h-3 text-gold-600" />
              <span>Ceremony Architecture</span>
            </div>
            <h2 className="text-lg font-serif font-bold text-charcoal-900 mt-0.5">
              Add Ceremony to {eventName}
            </h2>
            <p className="text-[11px] text-charcoal-500">
              This function uses the parent event&apos;s existing access codes. No new codes are created.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-charcoal-400 hover:text-charcoal-700 rounded-xl hover:bg-warm-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* Ceremony Presets */}
          <div>
            <label className="block text-[11px] font-bold text-charcoal-700 uppercase tracking-wider mb-2">
              Ceremony Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CEREMONY_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.type}
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                    selectedType === preset.type
                      ? 'border-terracotta-600 bg-terracotta-50/60 text-terracotta-900 shadow-2xs'
                      : 'border-[#E8E2D9] bg-[#FDFBF7] text-charcoal-700 hover:border-warm-300'
                  }`}
                >
                  <span className="block truncate">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Function Name */}
          <div>
            <label className="block text-[11px] font-bold text-charcoal-700 uppercase tracking-wider mb-1.5">
              Ceremony Title *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sangeet Evening & Musical Night"
              className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-300 bg-warm-50 text-xs text-charcoal-900 font-medium focus:outline-none focus:ring-2 focus:ring-terracotta-500"
              required
            />
          </div>

          {/* Schedule: Date & Times */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-charcoal-500 uppercase tracking-wider mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl border border-charcoal-300 bg-warm-50 text-xs text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-terracotta-500"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-charcoal-500 uppercase tracking-wider mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl border border-charcoal-300 bg-warm-50 text-xs text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-terracotta-500"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-charcoal-500 uppercase tracking-wider mb-1">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl border border-charcoal-300 bg-warm-50 text-xs text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-terracotta-500"
                required
              />
            </div>
          </div>

          {/* Venue Details */}
          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                Venue Name
              </label>
              <input
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="e.g. Hyatt Regency Poolside"
                className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-300 bg-warm-50 text-xs text-charcoal-900 font-medium focus:outline-none focus:ring-2 focus:ring-terracotta-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                Venue Address
              </label>
              <input
                type="text"
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
                placeholder="e.g. Ashram Road, Ahmedabad"
                className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-300 bg-warm-50 text-xs text-charcoal-900 font-medium focus:outline-none focus:ring-2 focus:ring-terracotta-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold text-charcoal-700 uppercase tracking-wider mb-1">
              Ceremony Notes / Dress Code
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Traditional attire, cocktail banquet and family musical performances."
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl border border-charcoal-300 bg-warm-50 text-xs text-charcoal-900 font-medium focus:outline-none focus:ring-2 focus:ring-terracotta-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-warm-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-full border border-warm-300 text-xs font-semibold text-charcoal-700 hover:bg-warm-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-6 py-2.5 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-warm-50 font-bold text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 disabled:opacity-50 transition-all active:scale-[0.985]"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Add Ceremony</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

