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
  Image as ImageIcon,
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

const FUNCTION_PRESETS = [
  {
    type: 'SANGEET',
    name: 'Sangeet Night',
    desc: 'Musical evening, dance performances, and family dinner celebration',
    defaultStart: '19:00',
    defaultEnd: '23:00',
    badge: 'bg-gold-100 text-gold-900 border border-gold-200',
  },
  {
    type: 'MEHNDI',
    name: 'Mehndi Ceremony',
    desc: 'Traditional henna application ceremony with lunch and folk singing',
    defaultStart: '11:00',
    defaultEnd: '15:00',
    badge: 'bg-sage-100 text-sage-900 border border-sage-200',
  },
  {
    type: 'HALDI',
    name: 'Haldi Function',
    desc: 'Auspicious turmeric ceremony with close family rituals',
    defaultStart: '09:00',
    defaultEnd: '12:00',
    badge: 'bg-amber-100 text-amber-900 border border-amber-200',
  },
  {
    type: 'WEDDING',
    name: 'Wedding Ceremony',
    desc: 'Grand wedding rituals, varmala, and reception of baraat',
    defaultStart: '18:00',
    defaultEnd: '23:30',
    badge: 'bg-terracotta-100 text-terracotta-900 border border-terracotta-200',
  },
  {
    type: 'RECEPTION',
    name: 'Wedding Reception',
    desc: 'Formal banquet, photography session, and greetings with attendees',
    defaultStart: '20:00',
    defaultEnd: '00:00',
    badge: 'bg-burgundy-100 text-burgundy-900 border border-burgundy-200',
  },
  {
    type: 'CUSTOM',
    name: 'Custom Function',
    desc: 'Bespoke event, pool party, cocktail night, or conference',
    defaultStart: '16:00',
    defaultEnd: '20:00',
    badge: 'bg-warm-100 text-charcoal-800 border border-warm-300',
  },
];

export function EventWizardModal({
  isOpen,
  onClose,
  onCreated,
  parentEventId,
}: EventWizardModalProps) {
  const { profile } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // STEP 1: Event Details
  const [eventType, setEventType] = useState('SANGEET');
  const [name, setName] = useState('Sangeet');
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().substring(0, 10);
  });
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('23:00');
  const [venueName, setVenueName] = useState('Grand Bhagwati');
  const [venueAddress, setVenueAddress] = useState('SG Highway, Bodakdev');
  const [city, setCity] = useState('Ahmedabad');
  const [venueLatitude, setVenueLatitude] = useState('23.0489');
  const [venueLongitude, setVenueLongitude] = useState('72.5085');
  const [expectedGuestCount, setExpectedGuestCount] = useState('128');
  const [description, setDescription] = useState(
    'Celebration evening with family musical performances and dinner banquet.'
  );
  const [bannerUrl, setBannerUrl] = useState('');

  // STEP 2: Event Transport Requirements
  const [pickupRequired, setPickupRequired] = useState(true);
  const [dropRequired, setDropRequired] = useState(true);
  const [pickupLocation, setPickupLocation] = useState('Hyatt Regency & Airport');
  const [dropLocation, setDropLocation] = useState('Grand Bhagwati, SG Highway');
  const [pickupDate, setPickupDate] = useState(date);
  const [pickupTime, setPickupTime] = useState('17:30');
  const [vehicleType, setVehicleType] = useState('Sedan');
  const [numberOfVehicles, setNumberOfVehicles] = useState('6');
  const [specialInstructions, setSpecialInstructions] = useState(
    'Coordinate shuttles for elderly guests directly to banquet hall entrance.'
  );

  // Real Fleet Availability
  const [fleetData, setFleetData] = useState<{
    totalVehicles: number;
    totalDrivers: number;
    availableVehiclesCount: number;
    availableDriversCount: number;
    vehicles: any[];
    drivers: any[];
  } | null>(null);
  const [loadingFleet, setLoadingFleet] = useState(false);

  // Fetch real fleet availability from host database
  useEffect(() => {
    if (isOpen) {
      setLoadingFleet(true);
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('safar_auth_token') || profile?.email || ''
          : '';

      fetch('/api/host/fleet', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-user-email': profile?.email || '',
        },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.success && data.fleet) {
            setFleetData(data.fleet);
          }
        })
        .catch((err) => console.warn('Could not load fleet:', err))
        .finally(() => setLoadingFleet(false));
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: (typeof FUNCTION_PRESETS)[0]) => {
    setEventType(preset.type);
    setName(preset.name);
    setStartTime(preset.defaultStart);
    setEndTime(preset.defaultEnd);
    setDescription(preset.desc);
  };

  const handleNext = () => {
    setErrorMsg(null);
    if (currentStep === 1) {
      if (!name.trim()) {
        setErrorMsg('Please provide an Event or Function Name.');
        return;
      }
      if (!date) {
        setErrorMsg('Please choose the event date.');
        return;
      }
      if (!venueName.trim()) {
        setErrorMsg('Please enter the venue name.');
        return;
      }
      if (!city.trim()) {
        setErrorMsg('Please specify the city.');
        return;
      }
      // sync transport pickup date with event date
      setPickupDate(date);
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handleCreateFunction = async () => {
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('safar_auth_token') || profile?.email || ''
          : '';

      const payload = {
        name: name.trim(),
        type: eventType,
        date,
        startTime,
        endTime,
        venueName: venueName.trim(),
        venueAddress: venueAddress.trim(),
        city: city.trim(),
        venueLatitude: venueLatitude ? parseFloat(venueLatitude) : null,
        venueLongitude: venueLongitude ? parseFloat(venueLongitude) : null,
        expectedGuestCount: parseInt(expectedGuestCount, 10) || 0,
        description: description.trim(),
        bannerUrl: bannerUrl.trim() || undefined,
        parentEventId: parentEventId || undefined,
        transportRequirements: {
          pickupRequired,
          dropRequired,
          pickupLocation: pickupLocation.trim(),
          dropLocation: dropLocation.trim(),
          pickupDate,
          pickupTime,
          vehicleType,
          numberOfVehicles: parseInt(numberOfVehicles, 10) || 1,
          specialInstructions: specialInstructions.trim(),
        },
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
      console.error('Error creating function:', err);
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
                Ceremonial Planning
              </span>
              <span className="text-xs text-charcoal-400 font-sans">
                Step {currentStep} of 3
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-serif font-bold text-charcoal-900 mt-1">
              {currentStep === 1 && 'Function Details & Venue'}
              {currentStep === 2 && 'Ceremonial Transport Strategy'}
              {currentStep === 3 && 'Review & Confirm Function'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-charcoal-400 hover:text-charcoal-700 rounded-xl hover:bg-warm-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar with SAFAR Terracotta gradient */}
        <div className="w-full bg-warm-100 h-1">
          <div
            className="bg-terracotta-600 h-1 transition-all duration-300"
            style={{ width: `${(currentStep / 3) * 100}%` }}
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

          {/* STEP 1: Function Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Function Presets */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-600 mb-2 font-sans">
                  Select Function Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {FUNCTION_PRESETS.map((preset) => {
                    const isSelected = eventType === preset.type;
                    return (
                      <button
                        key={preset.type}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-terracotta-600 bg-terracotta-50/50 ring-2 ring-terracotta-500/20 shadow-2xs'
                            : 'border-warm-200 hover:border-warm-300 bg-white hover:bg-warm-50/50'
                        }`}
                      >
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-block w-fit mb-1 ${preset.badge}`}>
                          {preset.type}
                        </span>
                        <div className="font-serif font-bold text-sm text-charcoal-900 truncate">
                          {preset.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Event Name & City */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Event / Function Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sangeet Celebration"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 focus:outline-none"
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
                    placeholder="e.g. Ahmedabad"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Date & Times */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Venue Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Venue Name *
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-charcoal-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                      placeholder="e.g. Grand Bhagwati"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Expected Guest Count
                  </label>
                  <div className="relative">
                    <Users className="w-4 h-4 text-charcoal-400 absolute left-3 top-3" />
                    <input
                      type="number"
                      min="1"
                      value={expectedGuestCount}
                      onChange={(e) => setExpectedGuestCount(e.target.value)}
                      placeholder="128"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Venue Location Search (Google Places) */}
              <div>
                <PlaceAutocomplete
                  label="Venue Address (Google Places Search) *"
                  placeholder="Search venue, hotel, banquet hall…"
                  defaultValue={venueAddress}
                  icon={<MapPin className="w-4 h-4" />}
                  onPlaceSelect={(place: PlaceResult) => {
                    setVenueAddress(place.address);
                    setVenueLatitude(String(place.latitude));
                    setVenueLongitude(String(place.longitude));
                    if (!venueName.trim() || venueName === 'Grand Bhagwati') {
                      setVenueName(place.name);
                    }
                  }}
                  onClear={() => {
                    setVenueAddress('');
                    setVenueLatitude('');
                    setVenueLongitude('');
                  }}
                />
                {venueLatitude && venueLongitude && (
                  <p className="text-[10px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Coordinates saved: {parseFloat(venueLatitude).toFixed(4)}° N, {parseFloat(venueLongitude).toFixed(4)}° E
                  </p>
                )}
              </div>

              {/* Description & Cover Image */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Event Description
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add details, instructions for guests, or program schedule..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Cover Image URL (Optional)
                  </label>
                  <div className="relative">
                    <ImageIcon className="w-4 h-4 text-charcoal-400 absolute left-3 top-3" />
                    <input
                      type="url"
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Transport Requirements */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Real Fleet Availability Status Banner */}
              <div className="p-4 rounded-2xl bg-warm-100/70 border border-warm-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-terracotta-600 text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-charcoal-900">
                      Host Fleet Verification
                    </h4>
                    <p className="text-[11px] text-charcoal-600">
                      {loadingFleet
                        ? 'Checking host vehicle and driver roster in database...'
                        : fleetData && fleetData.totalVehicles > 0
                        ? `${fleetData.totalVehicles} vehicle(s) & ${fleetData.totalDrivers} driver(s) registered in your host account`
                        : 'No vehicles added yet. You can still set requirements and assign vehicles later.'}
                    </p>
                  </div>
                </div>
                {fleetData && fleetData.totalVehicles > 0 && (
                  <span className="text-[11px] font-bold text-terracotta-900 bg-white/90 px-2.5 py-1 rounded-lg border border-warm-200">
                    Active Fleet Ready
                  </span>
                )}
              </div>

              {/* Pickup & Drop Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setPickupRequired(!pickupRequired)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    pickupRequired
                      ? 'border-terracotta-600 bg-terracotta-50/40 ring-1 ring-terracotta-500'
                      : 'border-warm-200 hover:border-warm-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${pickupRequired ? 'bg-terracotta-600 text-white' : 'bg-warm-100 text-charcoal-500'}`}>
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-charcoal-900">Guest Pickup Required</div>
                      <div className="text-[11px] text-charcoal-500">Pick up guests from airport, hotels, or residences</div>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pickupRequired ? 'bg-terracotta-600 text-white' : 'bg-warm-200 text-charcoal-600'}`}>
                    {pickupRequired ? 'YES' : 'NO'}
                  </span>
                </div>

                <div
                  onClick={() => setDropRequired(!dropRequired)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    dropRequired
                      ? 'border-terracotta-600 bg-terracotta-50/40 ring-1 ring-terracotta-500'
                      : 'border-warm-200 hover:border-warm-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dropRequired ? 'bg-terracotta-600 text-white' : 'bg-warm-100 text-charcoal-500'}`}>
                      <Navigation className="w-4 h-4 rotate-180" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-charcoal-900">Guest Return / Drop Required</div>
                      <div className="text-[11px] text-charcoal-500">Drop guests back to hotel, airport, or stations</div>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${dropRequired ? 'bg-terracotta-600 text-white' : 'bg-warm-200 text-charcoal-600'}`}>
                    {dropRequired ? 'YES' : 'NO'}
                  </span>
                </div>
              </div>

              {/* Pickup & Drop Locations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Pickup Location
                  </label>
                  <input
                    type="text"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    placeholder="e.g. Hyatt Regency, Airport Terminal 1"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Drop Location
                  </label>
                  <input
                    type="text"
                    value={dropLocation}
                    onChange={(e) => setDropLocation(e.target.value)}
                    placeholder="e.g. Grand Bhagwati Banquet"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Pickup Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Pickup Date
                  </label>
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Pickup Time
                  </label>
                  <input
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Vehicle Type & Count */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Preferred Vehicle Type
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium bg-white focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                  >
                    <option value="Sedan">Sedan (4 Seater)</option>
                    <option value="SUV">SUV (6-7 Seater)</option>
                    <option value="Tempo Traveller">Tempo Traveller (12-17 Seater)</option>
                    <option value="Mini Bus">Mini Bus (20-30 Seater)</option>
                    <option value="Bus">Large Bus (40+ Seater)</option>
                    <option value="Other">Other / VIP Luxury</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Number of Vehicles Required
                  </label>
                  <div className="relative">
                    <Car className="w-4 h-4 text-charcoal-400 absolute left-3 top-3" />
                    <input
                      type="number"
                      min="1"
                      value={numberOfVehicles}
                      onChange={(e) => setNumberOfVehicles(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Special Transportation Instructions */}
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Special Transportation Instructions
                </label>
                <textarea
                  rows={2}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g. VIP guest arrival timings, luggage van requirements, specific driver assignments..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Review & Confirm */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-warm-50 border border-warm-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-warm-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta-900 bg-terracotta-100/70 px-2 py-0.5 rounded-md">
                      {eventType}
                    </span>
                    <h3 className="font-serif font-bold text-base text-charcoal-900 mt-1">{name}</h3>
                  </div>
                  <div className="text-right text-xs text-charcoal-600">
                    <span className="font-semibold text-charcoal-900">{date}</span>
                    <div>{startTime} – {endTime}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[11px] font-semibold text-charcoal-400 block uppercase">Venue</span>
                    <span className="font-bold text-charcoal-900">{venueName}</span>
                    <div className="text-charcoal-500 truncate">{venueAddress || city}</div>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-charcoal-400 block uppercase">Expected Guests</span>
                    <span className="font-bold text-charcoal-900">{expectedGuestCount || '0'} Guests</span>
                    <div className="text-charcoal-500">Separate function record</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-warm-200 space-y-3">
                <h4 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider flex items-center gap-2">
                  <Car className="w-4 h-4 text-terracotta-600" />
                  Transportation Strategy
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-warm-50 border border-warm-100">
                    <span className="text-[10px] text-charcoal-400 font-semibold block">PICKUP</span>
                    <span className="font-bold text-charcoal-800">{pickupRequired ? 'Required' : 'None'}</span>
                    <div className="text-[11px] text-charcoal-500 truncate">{pickupLocation || '-'}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-warm-50 border border-warm-100">
                    <span className="text-[10px] text-charcoal-400 font-semibold block">DROP</span>
                    <span className="font-bold text-charcoal-800">{dropRequired ? 'Required' : 'None'}</span>
                    <div className="text-[11px] text-charcoal-500 truncate">{dropLocation || '-'}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-warm-50 border border-warm-100">
                    <span className="text-[10px] text-charcoal-400 font-semibold block">FLEET ALLOCATION</span>
                    <span className="font-bold text-charcoal-800">{numberOfVehicles}x {vehicleType}</span>
                    <div className="text-[11px] text-sage-800 font-medium">From Real Host Fleet</div>
                  </div>
                </div>

                {specialInstructions && (
                  <div className="text-xs text-charcoal-600 italic bg-warm-50 p-2.5 rounded-xl border border-warm-200">
                    &ldquo;{specialInstructions}&rdquo;
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-sage-50 border border-sage-200 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-sage-600 shrink-0" />
                <p className="text-xs text-sage-900 font-medium">
                  This function will be created as an independent event record scoped exclusively to your authenticated host account and real database.
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

          {currentStep < 3 ? (
            <SafarButton
              type="button"
              variant="primary"
              size="sm"
              onClick={handleNext}
            >
              <span>Continue to {currentStep === 1 ? 'Transportation' : 'Review'}</span>
              <ChevronRight className="w-4 h-4" />
            </SafarButton>
          ) : (
            <SafarButton
              type="button"
              variant="primary"
              size="sm"
              disabled={submitting}
              onClick={handleCreateFunction}
            >
              {submitting ? 'Creating Function...' : 'Create Function Record'}
            </SafarButton>
          )}
        </div>
      </div>
    </div>
  );
}
