'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  Car,
  Users,
  CheckCircle2,
  Sparkles,
  Info,
  ShieldCheck,
  Building,
  Navigation,
  FileText,
  Copy,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  Key,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { SafarButton } from '../ui/safar-design-system';
import { PlaceAutocomplete, PlaceResult } from '../ui/place-autocomplete';

interface EventWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (event: any) => void;
  parentEventId?: string | null;
}

export interface WizardFunctionItem {
  id: string;
  name: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  venueName: string;
  venueAddress: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
  description: string;
}

const PREDEFINED_FUNCTION_TYPES = [
  { type: 'MEHENDI', label: 'Mehendi', defaultTime: '11:00', endDefault: '15:00', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { type: 'HALDI', label: 'Haldi', defaultTime: '09:30', endDefault: '12:30', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
  { type: 'SANGEET', label: 'Sangeet', defaultTime: '19:00', endDefault: '23:30', badge: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  { type: 'WEDDING', label: 'Wedding Ceremony', defaultTime: '18:00', endDefault: '23:30', badge: 'bg-rose-50 text-rose-800 border-rose-200' },
  { type: 'RECEPTION', label: 'Reception', defaultTime: '19:30', endDefault: '00:00', badge: 'bg-purple-50 text-purple-800 border-purple-200' },
  { type: 'ENGAGEMENT', label: 'Engagement', defaultTime: '17:00', endDefault: '21:00', badge: 'bg-blue-50 text-blue-800 border-blue-200' },
  { type: 'PHERAS', label: 'Pheras', defaultTime: '23:00', endDefault: '03:00', badge: 'bg-red-50 text-red-800 border-red-200' },
  { type: 'VIDAAI', label: 'Vidaai', defaultTime: '04:00', endDefault: '06:00', badge: 'bg-orange-50 text-orange-800 border-orange-200' },
  { type: 'BRUNCH', label: 'Family Brunch', defaultTime: '10:00', endDefault: '13:00', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
  { type: 'DINNER', label: 'Welcome Dinner', defaultTime: '20:00', endDefault: '23:00', badge: 'bg-stone-50 text-stone-800 border-stone-200' },
  { type: 'CUSTOM', label: 'Custom Function', defaultTime: '16:00', endDefault: '20:00', badge: 'bg-neutral-50 text-neutral-800 border-neutral-200' },
];

function generateRandomCode(prefix: string = ''): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = prefix;
  while (result.length < 6) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function EventWizardModal({
  isOpen,
  onClose,
  onCreated,
  parentEventId,
}: EventWizardModalProps) {
  const { profile } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // STEP 1: Event Details
  const [name, setName] = useState('Rahul & Priya Wedding');
  const [description, setDescription] = useState(
    'Celebration of holy matrimony with family ceremonies, hospitality, and coordinated guest transportation.'
  );
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().substring(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 17);
    return d.toISOString().substring(0, 10);
  });
  const [city, setCity] = useState('Ahmedabad');
  const [venueName, setVenueName] = useState('The Grand Bhagwati & Hyatt Regency');
  const [venueAddress, setVenueAddress] = useState('SG Highway, Bodakdev, Ahmedabad');
  const [venueLatitude, setVenueLatitude] = useState<number | undefined>(23.0395);
  const [venueLongitude, setVenueLongitude] = useState<number | undefined>(72.5085);
  const [venuePlaceId, setVenuePlaceId] = useState<string | undefined>('ChIJ_SG_Hwy');

  // STEP 2: Functions
  const [functions, setFunctions] = useState<WizardFunctionItem[]>([
    {
      id: 'fn-1',
      name: 'Mehendi Ceremony',
      type: 'MEHENDI',
      date: startDate,
      startTime: '11:00',
      endTime: '15:00',
      venueName: 'Hyatt Regency Poolside',
      venueAddress: 'Ashram Road, Ahmedabad',
      description: 'Henna ceremony, folk music, and lunch banquet.',
    },
    {
      id: 'fn-2',
      name: 'Sangeet Evening',
      type: 'SANGEET',
      date: startDate,
      startTime: '19:00',
      endTime: '23:30',
      venueName: 'The Grand Bhagwati Grand Ballroom',
      venueAddress: 'SG Highway, Bodakdev, Ahmedabad',
      description: 'Musical performances, family dance, and dinner celebration.',
    },
    {
      id: 'fn-3',
      name: 'Haldi Rituals',
      type: 'HALDI',
      date: endDate,
      startTime: '09:30',
      endTime: '12:30',
      venueName: 'Hyatt Regency Terrace Lawn',
      venueAddress: 'Ashram Road, Ahmedabad',
      description: 'Turmeric ceremony with close family.',
    },
    {
      id: 'fn-4',
      name: 'Wedding Ceremony & Varmala',
      type: 'WEDDING',
      date: endDate,
      startTime: '18:00',
      endTime: '23:30',
      venueName: 'The Celebration Lawn',
      venueAddress: 'Sindhu Bhavan Road, Ahmedabad',
      description: 'Baraat arrival, varmala, and reception banquet.',
    },
  ]);

  // Adding Function Drawer / Inline Form State
  const [isAddingFunction, setIsAddingFunction] = useState(false);
  const [newFnType, setNewFnType] = useState('CUSTOM');
  const [newFnName, setNewFnName] = useState('');
  const [newFnDate, setNewFnDate] = useState(startDate);
  const [newFnStartTime, setNewFnStartTime] = useState('16:00');
  const [newFnEndTime, setNewFnEndTime] = useState('20:00');
  const [newFnVenue, setNewFnVenue] = useState('');
  const [newFnAddress, setNewFnAddress] = useState('');
  const [newFnLatitude, setNewFnLatitude] = useState<number | undefined>(undefined);
  const [newFnLongitude, setNewFnLongitude] = useState<number | undefined>(undefined);
  const [newFnPlaceId, setNewFnPlaceId] = useState<string | undefined>(undefined);
  const [newFnDescription, setNewFnDescription] = useState('');

  // STEP 3: Access Codes (1 Guest Code + 1 Driver Code)
  const [guestCode, setGuestCode] = useState(() => generateRandomCode('RP'));
  const [driverCode, setDriverCode] = useState(() => generateRandomCode('DR'));
  const [copiedGuest, setCopiedGuest] = useState(false);
  const [copiedDriver, setCopiedDriver] = useState(false);

  useEffect(() => {
    if (newFnDate < startDate) setNewFnDate(startDate);
  }, [startDate]);

  if (!isOpen) return null;

  const handleCopy = (text: string, type: 'guest' | 'driver') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === 'guest') {
        setCopiedGuest(true);
        setTimeout(() => setCopiedGuest(false), 2000);
      } else {
        setCopiedDriver(true);
        setTimeout(() => setCopiedDriver(false), 2000);
      }
    }
  };

  const handleAddFunctionSubmit = () => {
    if (!newFnName.trim()) {
      setErrorMsg('Please enter a name for the function.');
      return;
    }
    setErrorMsg(null);

    const newItem: WizardFunctionItem = {
      id: `fn-${Date.now()}`,
      name: newFnName.trim(),
      type: newFnType,
      date: newFnDate || startDate,
      startTime: newFnStartTime || '18:00',
      endTime: newFnEndTime || '22:00',
      venueName: newFnVenue.trim() || venueName,
      venueAddress: newFnAddress.trim() || venueAddress,
      latitude: newFnLatitude || venueLatitude,
      longitude: newFnLongitude || venueLongitude,
      placeId: newFnPlaceId || venuePlaceId,
      description: newFnDescription.trim(),
    };

    setFunctions((prev) => [...prev, newItem]);
    setIsAddingFunction(false);
    setNewFnName('');
    setNewFnVenue('');
    setNewFnAddress('');
    setNewFnLatitude(undefined);
    setNewFnLongitude(undefined);
    setNewFnPlaceId(undefined);
    setNewFnDescription('');
  };

  const handleRemoveFunction = (id: string) => {
    if (functions.length <= 1) {
      setErrorMsg('An event must have at least one function.');
      return;
    }
    setFunctions((prev) => prev.filter((f) => f.id !== id));
  };

  const handleNext = () => {
    setErrorMsg(null);
    if (currentStep === 1) {
      if (!name.trim()) {
        setErrorMsg('Please provide an Event Name.');
        return;
      }
      if (!startDate || !endDate) {
        setErrorMsg('Please specify start and end dates.');
        return;
      }
      if (new Date(endDate) < new Date(startDate)) {
        setErrorMsg('End date cannot precede start date.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (functions.length === 0) {
        setErrorMsg('Please configure at least one function for this event.');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handleCreateEvent = async () => {
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('safar_auth_token') || profile?.email || ''
          : '';

      const payload = {
        name: name.trim(),
        description: description.trim(),
        startDate,
        endDate,
        city: city.trim(),
        venueName: venueName.trim(),
        venueAddress: venueAddress.trim(),
        venueLatitude: venueLatitude || undefined,
        venueLongitude: venueLongitude || undefined,
        guestAccessCode: guestCode.trim().toUpperCase(),
        driverAccessCode: driverCode.trim().toUpperCase(),
        parentEventId: parentEventId || undefined,
        functions: functions.map((f) => ({
          name: f.name,
          type: f.type,
          date: f.date,
          startTime: f.startTime,
          endTime: f.endTime,
          venueName: f.venueName,
          venueAddress: f.venueAddress,
          latitude: f.latitude || venueLatitude || undefined,
          longitude: f.longitude || venueLongitude || undefined,
          description: f.description,
        })),
      };

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-user-id': profile?.id || '',
          'x-user-email': profile?.email || '',
          'x-user-uid': profile?.firebaseUid || '',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || 'Failed to create event in database');
      }

      onCreated(data.event);
      onClose();
    } catch (err: any) {
      console.error('Error creating master event:', err);
      setErrorMsg(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl border border-warm-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-warm-200 flex items-center justify-between bg-warm-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta-900 bg-terracotta-100/70 px-2.5 py-0.5 rounded-full border border-terracotta-200 font-sans">
                Event Architecture
              </span>
              <span className="text-xs text-charcoal-400 font-sans">
                Step {currentStep} of 4
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-serif font-bold text-charcoal-900 mt-1">
              {currentStep === 1 && 'Step 1: Event Details & Schedule'}
              {currentStep === 2 && 'Step 2: Functions & Ceremonies'}
              {currentStep === 3 && 'Step 3: Event Access Credentials'}
              {currentStep === 4 && 'Step 4: Review & Launch Event'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-charcoal-400 hover:text-charcoal-700 rounded-xl hover:bg-warm-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-warm-100 h-1">
          <div
            className="bg-terracotta-600 h-1 transition-all duration-300"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-charcoal-900 font-sans">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Event Details */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-600 mb-1 font-sans">
                  Event Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul & Priya Wedding"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-sm font-medium focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summary of the grand celebration and guest hospitality instructions..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ahmedabad"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Primary Venue / Hotel Hub
                  </label>
                  <input
                    type="text"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="e.g. Grand Bhagwati / Hyatt"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                  />
                </div>
                <div>
                  <PlaceAutocomplete
                    label="Venue Address (Google Maps)"
                    placeholder="Search hotel, resort, palace, or address…"
                    defaultValue={venueAddress}
                    onPlaceSelect={(place) => {
                      setVenueAddress(place.address || place.name);
                      if (place.name && (!venueName || venueName === 'The Grand Bhagwati & Hyatt Regency')) {
                        setVenueName(place.name);
                      }
                      setVenueLatitude(place.latitude);
                      setVenueLongitude(place.longitude);
                      setVenuePlaceId(place.placeId);
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Functions & Ceremonies */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-700">
                    Ceremonies & Functions ({functions.length})
                  </h3>
                  <p className="text-[11px] text-charcoal-500">
                    Each function has its own schedule and venue. All belong to this single master event.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingFunction(!isAddingFunction)}
                  className="px-3 py-1.5 rounded-xl bg-terracotta-50 text-terracotta-900 border border-terracotta-200 text-xs font-bold flex items-center gap-1.5 hover:bg-terracotta-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Function
                </button>
              </div>

              {/* Add Function Drawer/Form */}
              {isAddingFunction && (
                <div className="p-4 rounded-2xl bg-warm-50 border border-warm-300 space-y-3.5 animate-in fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-warm-200">
                    <span className="text-xs font-bold text-charcoal-900 uppercase tracking-wider">
                      New Function Configuration
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingFunction(false)}
                      className="text-xs text-charcoal-400 hover:text-charcoal-600"
                    >
                      Cancel
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-charcoal-600 mb-1.5">
                      Function Type
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {PREDEFINED_FUNCTION_TYPES.map((pt) => (
                        <button
                          key={pt.type}
                          type="button"
                          onClick={() => {
                            setNewFnType(pt.type);
                            if (!newFnName || PREDEFINED_FUNCTION_TYPES.some((p) => p.label === newFnName)) {
                              setNewFnName(pt.label);
                            }
                            setNewFnStartTime(pt.defaultTime);
                            setNewFnEndTime(pt.endDefault);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                            newFnType === pt.type
                              ? 'bg-terracotta-600 text-white border-terracotta-600 shadow-2xs'
                              : 'bg-white text-charcoal-700 border-warm-200 hover:border-warm-300'
                          }`}
                        >
                          {pt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">
                        Function Name *
                      </label>
                      <input
                        type="text"
                        value={newFnName}
                        onChange={(e) => setNewFnName(e.target.value)}
                        placeholder="e.g. Sangeet Celebration"
                        className="w-full px-3 py-2 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={newFnDate}
                        onChange={(e) => setNewFnDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={newFnStartTime}
                        onChange={(e) => setNewFnStartTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={newFnEndTime}
                        onChange={(e) => setNewFnEndTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">
                        Venue Name
                      </label>
                      <input
                        type="text"
                        value={newFnVenue}
                        onChange={(e) => setNewFnVenue(e.target.value)}
                        placeholder={venueName || 'Banquet / Lawn'}
                        className="w-full px-3 py-2 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <PlaceAutocomplete
                        label="Venue Address (Google Maps)"
                        placeholder="Search ceremony lawn, banquet, or address…"
                        defaultValue={newFnAddress}
                        onPlaceSelect={(place) => {
                          setNewFnAddress(place.address || place.name);
                          if (place.name && !newFnVenue) {
                            setNewFnVenue(place.name);
                          }
                          setNewFnLatitude(place.latitude);
                          setNewFnLongitude(place.longitude);
                          setNewFnPlaceId(place.placeId);
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleAddFunctionSubmit}
                      className="px-4 py-2 rounded-xl bg-terracotta-600 text-white text-xs font-bold hover:bg-terracotta-700 transition-colors shadow-2xs"
                    >
                      Add Ceremony to Event
                    </button>
                  </div>
                </div>
              )}

              {/* Function Cards List */}
              <div className="space-y-2.5 max-h-[38vh] overflow-y-auto pr-1">
                {functions.map((fn, idx) => {
                  const pt = PREDEFINED_FUNCTION_TYPES.find((p) => p.type === fn.type);
                  return (
                    <div
                      key={fn.id}
                      className="p-3.5 rounded-2xl border border-warm-200 bg-white hover:border-warm-300 transition-all flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-warm-100 flex items-center justify-center shrink-0 font-serif font-bold text-xs text-charcoal-800">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-serif font-bold text-sm text-charcoal-900 truncate">
                              {fn.name}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${pt?.badge || 'bg-warm-100 text-charcoal-700 border-warm-200'}`}>
                              {fn.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-charcoal-500 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-terracotta-600" />
                              {fn.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-terracotta-600" />
                              {fn.startTime} – {fn.endTime}
                            </span>
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 text-terracotta-600 shrink-0" />
                              <span className="truncate">{fn.venueName}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFunction(fn.id)}
                        className="p-2 text-charcoal-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors shrink-0"
                        title="Remove Function"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Access Credentials */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-950">
                  <span className="font-bold block mb-0.5">
                    Fundamental Rule: One Event, Exactly Two Access Codes
                  </span>
                  Your event has unlimited functions, but only <strong>one Guest Code</strong> and <strong>one Driver Code</strong>. Functions never have their own access codes.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Guest Access Code */}
                <div className="p-5 rounded-2xl border border-warm-200 bg-white space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500">
                      Guest Access Credential
                    </span>
                    <button
                      type="button"
                      onClick={() => setGuestCode(generateRandomCode('RP'))}
                      className="p-1 text-charcoal-400 hover:text-charcoal-700 rounded-md hover:bg-warm-100"
                      title="Regenerate Guest Code"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <div className="font-mono text-2xl font-bold tracking-widest text-terracotta-900 bg-warm-50 py-3 px-4 rounded-xl border border-warm-200 text-center select-all">
                      {guestCode}
                    </div>
                    <p className="text-[11px] text-charcoal-500 mt-1.5 text-center">
                      Guests enter this code once to join the entire event and view their assigned ceremonies.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(guestCode, 'guest')}
                    className="w-full py-2 rounded-xl border border-warm-200 text-xs font-bold text-charcoal-700 hover:bg-warm-50 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedGuest ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Guest Code</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Driver Access Code */}
                <div className="p-5 rounded-2xl border border-warm-200 bg-white space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500">
                      Driver Access Credential
                    </span>
                    <button
                      type="button"
                      onClick={() => setDriverCode(generateRandomCode('DR'))}
                      className="p-1 text-charcoal-400 hover:text-charcoal-700 rounded-md hover:bg-warm-100"
                      title="Regenerate Driver Code"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <div className="font-mono text-2xl font-bold tracking-widest text-navy-900 bg-warm-50 py-3 px-4 rounded-xl border border-warm-200 text-center select-all">
                      {driverCode}
                    </div>
                    <p className="text-[11px] text-charcoal-500 mt-1.5 text-center">
                      Drivers enter this code to request event access. Host approval is required before trips can be seen.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(driverCode, 'driver')}
                    className="w-full py-2 rounded-xl border border-warm-200 text-xs font-bold text-charcoal-700 hover:bg-warm-50 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedDriver ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Driver Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Create */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-warm-50 border border-warm-200 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-warm-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta-900 bg-terracotta-100/70 px-2 py-0.5 rounded-md">
                      Master Event
                    </span>
                    <h3 className="font-serif font-bold text-lg text-charcoal-900 mt-1">{name}</h3>
                  </div>
                  <div className="text-right text-xs text-charcoal-600">
                    <span className="font-semibold text-charcoal-900">{startDate} – {endDate}</span>
                    <div>{city}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white border border-warm-200">
                    <span className="text-[10px] uppercase font-bold text-charcoal-400 block">Guest Code</span>
                    <span className="font-mono text-base font-bold text-terracotta-800">{guestCode}</span>
                    <div className="text-[11px] text-charcoal-500">Universal guest access</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-warm-200">
                    <span className="text-[10px] uppercase font-bold text-charcoal-400 block">Driver Code</span>
                    <span className="font-mono text-base font-bold text-navy-800">{driverCode}</span>
                    <div className="text-[11px] text-charcoal-500">Universal driver access (Pending Approval)</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider">
                  Included Ceremonies ({functions.length})
                </h4>
                <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                  {functions.map((fn) => (
                    <div
                      key={fn.id}
                      className="p-3 rounded-xl bg-white border border-warm-200 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-charcoal-900">{fn.name}</div>
                        <div className="text-[11px] text-charcoal-500">
                          {fn.date} · {fn.startTime} – {fn.endTime} · {fn.venueName}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-warm-100 text-charcoal-700">
                        {fn.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-xs text-emerald-900 font-medium">
                  Ready to launch! This will create the master event with its child functions, database indexes, and access credentials.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-warm-200 flex items-center justify-between bg-warm-50/50">
          {currentStep > 1 ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
              className="px-4 py-2.5 rounded-xl border border-warm-200 text-xs font-semibold text-charcoal-700 hover:bg-warm-100 flex items-center gap-1.5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-warm-200 text-xs font-semibold text-charcoal-700 hover:bg-warm-100 transition-colors"
            >
              Cancel
            </button>
          )}

          {currentStep < 4 ? (
            <SafarButton
              type="button"
              variant="primary"
              size="sm"
              onClick={handleNext}
            >
              <span>Continue</span>
              <ChevronRight className="w-4 h-4" />
            </SafarButton>
          ) : (
            <SafarButton
              type="button"
              variant="primary"
              size="sm"
              isLoading={submitting}
              onClick={handleCreateEvent}
            >
              <span>Create Event & Launch Mobility</span>
              <Sparkles className="w-4 h-4" />
            </SafarButton>
          )}
        </div>
      </div>
    </div>
  );
}
