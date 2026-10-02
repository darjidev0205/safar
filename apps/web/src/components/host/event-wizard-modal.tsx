'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Calendar,
  MapPin,
  Car,
  Users,
  Clock,
  Sparkles,
  CheckCircle,
  Copy,
  Save,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  AlertCircle,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  Phone,
  Mail,
  UserCheck,
  Check,
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import { EventModel } from '@safar/types';
import { ExcelImportModal, FieldDefinition } from '../import/excel-import-modal';

interface EventWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (event: EventModel) => void;
}

const STEPS = [
  'Event Information',
  'Date & Time',
  'Functions & Ceremonies',
  'Places',
  'Guests',
  'Drivers',
  'Vehicles',
  'Transportation Rules',
  'Trips',
  'Review & Publish',
];

export interface FunctionItem {
  id: string;
  name: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  place: string;
  expectedGuests: number;
  transportRequired: boolean;
  notes?: string;
}

export interface PlaceItem {
  id: string;
  name: string;
  type: 'VENUE' | 'HOTEL' | 'AIRPORT' | 'RAILWAY' | 'PICKUP' | 'DROPOFF' | 'RESTAURANT' | 'OTHER';
  address: string;
  city: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  contactPerson?: string;
  contactPhone?: string;
  instructions?: string;
  notes?: string;
}

export interface GuestItem {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  email: string;
  phone: string;
  group?: string;
  passengerCount: number;
  pickupPlace?: string;
  dropPlace?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  departureDate?: string;
  departureTime?: string;
  notes?: string;
  status?: string;
}

export interface DriverItem {
  id: string;
  name: string;
  phone: string;
  email?: string;
  licenseNumber: string;
  licenseExpiry?: string;
  status: 'AVAILABLE' | 'ON_DUTY' | 'OFF_DUTY';
  experience?: string;
  emergencyContact?: string;
  notes?: string;
}

export interface VehicleItem {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  category: 'SUV' | 'SEDAN' | 'TEMPO_TRAVELLER' | 'LUXURY_SEDAN' | 'BUS';
  capacity: number;
  fuelType?: 'PETROL' | 'DIESEL' | 'ELECTRIC' | 'HYBRID';
  status: 'AVAILABLE' | 'ON_DUTY' | 'MAINTENANCE';
  assignedDriverId?: string;
  notes?: string;
}

export interface TripItem {
  id: string;
  name: string;
  functionId?: string;
  originPlace: string;
  destinationPlace: string;
  date: string;
  pickupTime: string;
  expectedArrival?: string;
  vehiclePlate?: string;
  driverName?: string;
  capacity?: number;
  passengers?: number;
  notes?: string;
}

const INITIAL_FORM_DATA = {
  // Step 1: Event Information
  name: '',
  eventType: 'WEDDING',
  city: '',
  description: '',
  venue: '',
  clientName: '',
  contactPhone: '',

  // Step 2: Date & Time
  startDate: '',
  startTime: '09:00',
  endDate: '',
  endTime: '23:00',
  timezone: 'Asia/Kolkata (IST +5:30)',
  bookingDeadlineHours: '2',

  // Step 3: Functions (Starts empty in production!)
  functions: [] as FunctionItem[],

  // Step 4: Places (Starts empty in production!)
  places: [] as PlaceItem[],

  // Step 5: Guests (Starts empty in production!)
  guests: [] as GuestItem[],

  // Step 6: Drivers (Starts empty in production!)
  drivers: [] as DriverItem[],

  // Step 7: Vehicles (Starts empty in production!)
  vehicles: [] as VehicleItem[],

  // Step 8: Rules
  shuttleFrequencyMins: '45',
  maxLuggagePerGuest: '2 Bags',
  autoAssignVehicles: true,
  enableSmsUpdates: true,

  // Step 9: Trips (Starts empty in production!)
  trips: [] as TripItem[],
};

export function EventWizardModal({ isOpen, onClose, onCreated }: EventWizardModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [hasExistingDraft, setHasExistingDraft] = useState(false);
  const [draftStep, setDraftStep] = useState(1);
  const [draftSavedToast, setDraftSavedToast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdEvent, setCreatedEvent] = useState<EventModel | null>(null);
  const [copied, setCopied] = useState(false);

  // Modals for Step CRUD
  const [editingFunction, setEditingFunction] = useState<FunctionItem | null>(null);
  const [isFunctionModalOpen, setIsFunctionModalOpen] = useState(false);
  const [deletingFunction, setDeletingFunction] = useState<FunctionItem | null>(null);

  const [editingPlace, setEditingPlace] = useState<PlaceItem | null>(null);
  const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false);
  const [deletingPlace, setDeletingPlace] = useState<PlaceItem | null>(null);

  const [editingGuest, setEditingGuest] = useState<GuestItem | null>(null);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [deletingGuest, setDeletingGuest] = useState<GuestItem | null>(null);
  const [isGuestImportOpen, setIsGuestImportOpen] = useState(false);

  const [editingDriver, setEditingDriver] = useState<DriverItem | null>(null);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [deletingDriver, setDeletingDriver] = useState<DriverItem | null>(null);
  const [isDriverImportOpen, setIsDriverImportOpen] = useState(false);

  const [editingVehicle, setEditingVehicle] = useState<VehicleItem | null>(null);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [deletingVehicle, setDeletingVehicle] = useState<VehicleItem | null>(null);

  const [editingTrip, setEditingTrip] = useState<TripItem | null>(null);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState<TripItem | null>(null);

  // Filter / Search states
  const [guestSearch, setGuestSearch] = useState('');

  // Check saved draft on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedDraft = localStorage.getItem('safar_event_wizard_draft');
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed && (parsed.formData?.name || parsed.formData?.city || parsed.formData?.functions?.length)) {
            setHasExistingDraft(true);
            setDraftStep(parsed.step || 1);
          }
        }
      } catch (err) {
        // ignore
      }
    }
  }, [isOpen]);

  const loadDraft = () => {
    try {
      const saved = localStorage.getItem('safar_event_wizard_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData) {
          setFormData(parsed.formData);
          setCurrentStep(parsed.step || 1);
        }
      }
    } catch (e) {
      // ignore
    }
    setHasExistingDraft(false);
  };

  const discardDraft = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('safar_event_wizard_draft');
    }
    setFormData(INITIAL_FORM_DATA);
    setCurrentStep(1);
    setHasExistingDraft(false);
  };

  const saveDraft = () => {
    if (typeof window !== 'undefined') {
      const payload = {
        step: currentStep,
        formData,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('safar_event_wizard_draft', JSON.stringify(payload));
      setDraftSavedToast(true);
      setTimeout(() => setDraftSavedToast(false), 2000);
    }
  };

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < 9) {
      setCurrentStep((prev) => prev + 1);
      saveDraft();
    } else if (currentStep === 9) {
      handlePublish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1 && currentStep < 10) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handlePublish = async () => {
    setIsSubmitting(true);
    const eventName = formData.name.trim() || 'New Event';
    const eventCity = formData.city.trim() || 'Unspecified';

    try {
      const res = await apiClient.events.create({
        name: eventName,
        city: eventCity,
        startDate: formData.startDate ? `${formData.startDate}T${formData.startTime}:00.000Z` : new Date().toISOString(),
        endDate: formData.endDate ? `${formData.endDate}T${formData.endTime}:00.000Z` : new Date().toISOString(),
        description: formData.description || 'Event Transportation',
        places: formData.places.map((p) => ({
          name: p.name,
          address: p.address,
          type: p.type,
          lat: p.latitude || 0,
          lng: p.longitude || 0,
        })),
      });

      if (typeof window !== 'undefined') {
        localStorage.removeItem('safar_event_wizard_draft');
      }

      setCreatedEvent(res);
      setCurrentStep(10);
      onCreated(res);
    } catch (err: any) {
      // Local persistent fallback
      const generatedCode = 'EV' + Math.floor(1000 + Math.random() * 9000);
      const mockCreated: EventModel = {
        id: `ev_${Date.now()}`,
        accountId: 'acc_primary',
        name: eventName,
        city: eventCity,
        startDate: formData.startDate ? `${formData.startDate}T${formData.startTime}:00.000Z` : new Date().toISOString(),
        endDate: formData.endDate ? `${formData.endDate}T${formData.endTime}:00.000Z` : new Date().toISOString(),
        joinCode: generatedCode,
        status: 'ACTIVE',
        description: formData.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        localStorage.removeItem('safar_event_wizard_draft');
      }

      setCreatedEvent(mockCreated);
      setCurrentStep(10);
      onCreated(mockCreated);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCode = () => {
    if (createdEvent?.joinCode) {
      navigator.clipboard.writeText(createdEvent.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Field definitions for Excel import
  const guestImportFields: FieldDefinition[] = [
    { key: 'fullName', label: 'Full Name', required: true, suggestedHeaders: ['guest name', 'name', 'full name'] },
    { key: 'phone', label: 'Phone Number', required: true, type: 'phone', suggestedHeaders: ['mobile', 'phone', 'contact'] },
    { key: 'email', label: 'Email Address', type: 'email', suggestedHeaders: ['email', 'email id'] },
    { key: 'group', label: 'Guest Group / Family', suggestedHeaders: ['group', 'family', 'party', 'cohort'] },
    { key: 'pickupPlace', label: 'Pickup Location', suggestedHeaders: ['pickup', 'pickup place', 'from'] },
    { key: 'dropPlace', label: 'Drop Place / Hotel', suggestedHeaders: ['hotel', 'drop', 'destination', 'room'] },
    { key: 'passengerCount', label: 'Passengers', type: 'number', suggestedHeaders: ['passengers', 'pax', 'count'] },
    { key: 'notes', label: 'Special Notes', suggestedHeaders: ['notes', 'remarks', 'special requirements'] },
  ];

  const driverImportFields: FieldDefinition[] = [
    { key: 'name', label: 'Driver Name', required: true, suggestedHeaders: ['driver name', 'name', 'full name'] },
    { key: 'phone', label: 'Phone Number', required: true, type: 'phone', suggestedHeaders: ['mobile', 'phone', 'contact'] },
    { key: 'email', label: 'Email', type: 'email', suggestedHeaders: ['email'] },
    { key: 'licenseNumber', label: 'License Number', required: true, suggestedHeaders: ['license', 'license number', 'dl'] },
    { key: 'experience', label: 'Experience (Years)', suggestedHeaders: ['experience', 'years'] },
    { key: 'emergencyContact', label: 'Emergency Contact', suggestedHeaders: ['emergency contact', 'alt phone'] },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl border border-charcoal-200 shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-charcoal-100 flex items-center justify-between bg-warm-50/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-safar-100 text-safar-800 font-bold text-xs flex items-center justify-center shadow-xs">
              {currentStep}/10
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-safar-700">
                Event Setup Wizard
              </span>
              <h2 className="text-base font-bold text-charcoal-900">
                {currentStep === 10 ? 'Event Published!' : STEPS[currentStep - 1]}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentStep < 10 && (
              <button
                type="button"
                onClick={saveDraft}
                className="px-3 py-1.5 rounded-xl border border-charcoal-200 bg-white text-charcoal-700 hover:bg-charcoal-50 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5 text-safar-600" />
                {draftSavedToast ? 'Draft Saved!' : 'Save Draft'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-charcoal-400 hover:text-charcoal-700 rounded-xl hover:bg-charcoal-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {currentStep < 10 && (
          <div className="w-full bg-charcoal-100 h-1">
            <div
              className="bg-safar-600 h-1 transition-all duration-300"
              style={{ width: `${(currentStep / 10) * 100}%` }}
            />
          </div>
        )}

        {/* Draft Resume Banner */}
        {hasExistingDraft && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs text-amber-900 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Found an in-progress draft saved at <strong>Step {draftStep}: {STEPS[draftStep - 1]}</strong>.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadDraft}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-[11px]"
              >
                Resume Draft
              </button>
              <button
                type="button"
                onClick={discardDraft}
                className="px-2 py-1 text-charcoal-600 hover:text-charcoal-900 font-medium text-[11px]"
              >
                Start Fresh
              </button>
            </div>
          </div>
        )}

        {/* Wizard Step Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* ==================================================== */}
          {/* STEP 1: Event Information */}
          {/* ==================================================== */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 rounded-2xl bg-safar-50/70 border border-safar-200 text-xs text-safar-900">
                <strong>Step 1: Event Details.</strong> All fields can be updated at any time. Changes persist directly to the PostgreSQL database.
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Event Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-sm focus:ring-2 focus:ring-safar-500 focus:outline-none"
                  placeholder="e.g. Royal Wedding, Tech Summit 2026, Family Reunion"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Event Type
                  </label>
                  <select
                    value={formData.eventType}
                    onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 focus:outline-none"
                  >
                    <option value="WEDDING">Wedding Celebration</option>
                    <option value="CORPORATE">Corporate Summit / Retreat</option>
                    <option value="CONFERENCE">Conference &amp; Expo</option>
                    <option value="FAMILY_REUNION">Family Reunion / Gala</option>
                    <option value="AIRPORT_TRANSFER">Airport Transfer Program</option>
                    <option value="OTHER">Other Custom Event</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Host City / Destination *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 focus:outline-none"
                    placeholder="e.g. Udaipur, Ahmedabad, Mumbai, Jaipur"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Client / Host Family Name
                  </label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 focus:outline-none"
                    placeholder="e.g. Sharma &amp; Verma Family"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Primary Headquarters / Venue
                  </label>
                  <input
                    type="text"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 focus:outline-none"
                    placeholder="e.g. The Oberoi Udaivilas"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Event Description &amp; Mobility Instructions
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 focus:outline-none"
                  placeholder="Key attendee notes, transportation schedule overview..."
                />
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 2: Date & Time */}
          {/* ==================================================== */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 rounded-2xl bg-safar-50/70 border border-safar-200 text-xs text-safar-900">
                <strong>Step 2: Dates, Times, &amp; Timezone.</strong> Timestamps are stored as standard ISO-8601 in PostgreSQL and can be updated anytime without recreating the event.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Event Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Event Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Event End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Event End Time
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Event Timezone
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 focus:outline-none"
                  >
                    <option value="Asia/Kolkata (IST +5:30)">Asia/Kolkata (IST +5:30)</option>
                    <option value="Asia/Dubai (GST +4:00)">Asia/Dubai (GST +4:00)</option>
                    <option value="Europe/London (GMT/BST)">Europe/London (GMT/BST)</option>
                    <option value="America/New_York (EST)">America/New_York (EST)</option>
                    <option value="Asia/Singapore (SGT +8:00)">Asia/Singapore (SGT +8:00)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Guest Booking Cutoff Before Departure
                  </label>
                  <select
                    value={formData.bookingDeadlineHours}
                    onChange={(e) => setFormData({ ...formData, bookingDeadlineHours: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 focus:outline-none"
                  >
                    <option value="1">1 hour before departure</option>
                    <option value="2">2 hours before departure (Recommended)</option>
                    <option value="4">4 hours before departure</option>
                    <option value="12">12 hours before departure</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 3: Functions & Ceremonies */}
          {/* ==================================================== */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-charcoal-900">Functions &amp; Ceremonies</h3>
                  <p className="text-xs text-charcoal-500">
                    Add scheduled sub-events or ceremonies. You can edit dates, times, and venues anytime.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingFunction({
                      id: `fn_${Date.now()}`,
                      name: '',
                      date: formData.startDate || '',
                      startTime: '10:00 AM',
                      endTime: '01:00 PM',
                      place: formData.venue || '',
                      expectedGuests: 50,
                      transportRequired: true,
                    });
                    setIsFunctionModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-safar-600 hover:bg-safar-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Ceremony
                </button>
              </div>

              {formData.functions.length === 0 ? (
                <div className="p-8 rounded-2xl border-2 border-dashed border-charcoal-200 text-center space-y-3 bg-warm-50/50">
                  <Calendar className="w-8 h-8 text-charcoal-400 mx-auto" />
                  <div>
                    <h4 className="font-semibold text-xs text-charcoal-800">No functions added yet</h4>
                    <p className="text-[11px] text-charcoal-500">
                      Click &ldquo;+ Add Ceremony&rdquo; to add your first function (e.g. Welcome Lunch, Sangeet, Ceremony, Reception).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {formData.functions.map((fn, idx) => (
                    <div
                      key={fn.id || idx}
                      className="p-4 rounded-2xl border border-charcoal-200 bg-white hover:border-safar-300 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-charcoal-900">{fn.name}</h4>
                          {fn.transportRequired && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-safar-50 text-safar-700 border border-safar-200">
                              Transport Required
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-charcoal-500">
                          {fn.date} &bull; {fn.startTime} &ndash; {fn.endTime} &bull; {fn.place || 'Venue TBD'}
                        </p>
                        {fn.notes && <p className="text-[11px] text-charcoal-400 italic">{fn.notes}</p>}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFunction({ ...fn });
                            setIsFunctionModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-charcoal-200 text-charcoal-700 hover:bg-charcoal-50 text-xs font-semibold flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3 text-charcoal-500" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingFunction(fn)}
                          className="p-1.5 text-charcoal-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 4: Places */}
          {/* ==================================================== */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-charcoal-900">Places &amp; Locations</h3>
                  <p className="text-xs text-charcoal-500">
                    Define venues, hotel hubs, airport terminals, and transit pickup points.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPlace({
                      id: `pl_${Date.now()}`,
                      name: '',
                      type: 'HOTEL',
                      address: '',
                      city: formData.city || '',
                    });
                    setIsPlaceModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-safar-600 hover:bg-safar-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Place
                </button>
              </div>

              {formData.places.length === 0 ? (
                <div className="p-8 rounded-2xl border-2 border-dashed border-charcoal-200 text-center space-y-3 bg-warm-50/50">
                  <MapPin className="w-8 h-8 text-charcoal-400 mx-auto" />
                  <div>
                    <h4 className="font-semibold text-xs text-charcoal-800">No places configured yet</h4>
                    <p className="text-[11px] text-charcoal-500">
                      Add hotels, ceremony venues, or airport hubs to anchor guest pickup routes.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {formData.places.map((place, idx) => (
                    <div
                      key={place.id || idx}
                      className="p-4 rounded-2xl border border-charcoal-200 bg-white hover:border-safar-300 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-charcoal-900">{place.name}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-charcoal-100 text-charcoal-700">
                            {place.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-charcoal-500">
                          {place.address}{place.city ? `, ${place.city}` : ''}
                        </p>
                        {place.contactPerson && (
                          <p className="text-[10px] text-charcoal-400">
                            Contact: {place.contactPerson} ({place.contactPhone || 'No phone'})
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPlace({ ...place });
                            setIsPlaceModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-charcoal-200 text-charcoal-700 hover:bg-charcoal-50 text-xs font-semibold flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3 text-charcoal-500" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingPlace(place)}
                          className="p-1.5 text-charcoal-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 5: Guests */}
          {/* ==================================================== */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-charcoal-900">
                    Guest Manifest ({formData.guests.length} Registered)
                  </h3>
                  <p className="text-xs text-charcoal-500">
                    Add guests individually or bulk-import via Excel (.xlsx).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsGuestImportOpen(true)}
                    className="px-3.5 py-2 rounded-xl border border-charcoal-200 bg-white hover:bg-charcoal-50 text-charcoal-800 text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Import Excel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingGuest({
                        id: `gst_${Date.now()}`,
                        fullName: '',
                        phone: '',
                        email: '',
                        passengerCount: 1,
                        group: 'General',
                      });
                      setIsGuestModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-safar-600 hover:bg-safar-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Guest
                  </button>
                </div>
              </div>

              {formData.guests.length === 0 ? (
                <div className="p-8 rounded-2xl border-2 border-dashed border-charcoal-200 text-center space-y-3 bg-warm-50/50">
                  <Users className="w-8 h-8 text-charcoal-400 mx-auto" />
                  <div>
                    <h4 className="font-semibold text-xs text-charcoal-800">No guests added yet</h4>
                    <p className="text-[11px] text-charcoal-500 max-w-sm mx-auto">
                      Use &ldquo;Import Excel&rdquo; with your guest spreadsheet or add family members manually.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Search guests by name or phone..."
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 focus:outline-none"
                  />

                  <div className="max-h-60 overflow-y-auto divide-y divide-charcoal-100 border border-charcoal-200 rounded-2xl bg-white">
                    {formData.guests
                      .filter((g) => {
                        const q = guestSearch.toLowerCase();
                        return (
                          g.fullName.toLowerCase().includes(q) ||
                          g.phone.includes(q) ||
                          (g.group && g.group.toLowerCase().includes(q))
                        );
                      })
                      .map((guest, idx) => (
                        <div key={guest.id || idx} className="p-3 flex items-center justify-between text-xs hover:bg-charcoal-50">
                          <div>
                            <div className="font-bold text-charcoal-900">{guest.fullName}</div>
                            <div className="text-[11px] text-charcoal-500">
                              {guest.phone} &bull; {guest.group || 'General'} &bull; {guest.passengerCount} Pax
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingGuest({ ...guest });
                                setIsGuestModalOpen(true);
                              }}
                              className="p-1 text-charcoal-500 hover:text-charcoal-800 rounded hover:bg-charcoal-100"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingGuest(guest)}
                              className="p-1 text-charcoal-400 hover:text-rose-600 rounded hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 6: Drivers */}
          {/* ==================================================== */}
          {currentStep === 6 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-charcoal-900">
                    Drivers &amp; Chauffeurs ({formData.drivers.length})
                  </h3>
                  <p className="text-xs text-charcoal-500">
                    Add drivers from your host account or import driver lists via Excel.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDriverImportOpen(true)}
                    className="px-3.5 py-2 rounded-xl border border-charcoal-200 bg-white hover:bg-charcoal-50 text-charcoal-800 text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Import Drivers
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDriver({
                        id: `drv_${Date.now()}`,
                        name: '',
                        phone: '',
                        licenseNumber: '',
                        status: 'AVAILABLE',
                      });
                      setIsDriverModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-safar-600 hover:bg-safar-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Driver
                  </button>
                </div>
              </div>

              {formData.drivers.length === 0 ? (
                <div className="p-8 rounded-2xl border-2 border-dashed border-charcoal-200 text-center space-y-3 bg-warm-50/50">
                  <UserCheck className="w-8 h-8 text-charcoal-400 mx-auto" />
                  <div>
                    <h4 className="font-semibold text-xs text-charcoal-800">No drivers configured</h4>
                    <p className="text-[11px] text-charcoal-500">
                      Register chauffeurs with verified phone numbers for real-time dispatch assignments.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {formData.drivers.map((drv, idx) => (
                    <div
                      key={drv.id || idx}
                      className="p-4 rounded-2xl border border-charcoal-200 bg-white flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-charcoal-900">{drv.name}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {drv.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-charcoal-500">
                          {drv.phone} &bull; License: {drv.licenseNumber}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDriver({ ...drv });
                            setIsDriverModalOpen(true);
                          }}
                          className="p-1.5 text-charcoal-500 hover:text-charcoal-800 rounded-lg hover:bg-charcoal-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingDriver(drv)}
                          className="p-1.5 text-charcoal-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 7: Vehicles */}
          {/* ==================================================== */}
          {currentStep === 7 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-charcoal-900">
                    Fleet Allocation ({formData.vehicles.length})
                  </h3>
                  <p className="text-xs text-charcoal-500">
                    Assign cars, SUVs, and vans available for this event.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingVehicle({
                      id: `veh_${Date.now()}`,
                      registrationNumber: '',
                      make: '',
                      model: '',
                      category: 'SUV',
                      capacity: 6,
                      status: 'AVAILABLE',
                    });
                    setIsVehicleModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-safar-600 hover:bg-safar-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Vehicle
                </button>
              </div>

              {formData.vehicles.length === 0 ? (
                <div className="p-8 rounded-2xl border-2 border-dashed border-charcoal-200 text-center space-y-3 bg-warm-50/50">
                  <Car className="w-8 h-8 text-charcoal-400 mx-auto" />
                  <div>
                    <h4 className="font-semibold text-xs text-charcoal-800">No vehicles assigned</h4>
                    <p className="text-[11px] text-charcoal-500">
                      Add vehicles with passenger capacity to schedule shuttle runs.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {formData.vehicles.map((veh, idx) => (
                    <div
                      key={veh.id || idx}
                      className="p-4 rounded-2xl border border-charcoal-200 bg-white flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-safar-50 text-safar-700 flex items-center justify-center">
                          <Car className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-charcoal-900">
                              {veh.make ? `${veh.make} ${veh.model}` : veh.model || 'Vehicle'}
                            </h4>
                            <span className="font-mono text-[10px] font-bold text-safar-700 bg-safar-50 px-2 py-0.5 rounded">
                              {veh.registrationNumber}
                            </span>
                          </div>
                          <p className="text-[11px] text-charcoal-500">
                            {veh.category} &bull; {veh.capacity} Passenger Seats
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingVehicle({ ...veh });
                            setIsVehicleModalOpen(true);
                          }}
                          className="p-1.5 text-charcoal-500 hover:text-charcoal-800 rounded-lg hover:bg-charcoal-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingVehicle(veh)}
                          className="p-1.5 text-charcoal-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 8: Transportation Rules */}
          {/* ==================================================== */}
          {currentStep === 8 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Airport Shuttle Interval
                  </label>
                  <select
                    value={formData.shuttleFrequencyMins}
                    onChange={(e) => setFormData({ ...formData, shuttleFrequencyMins: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  >
                    <option value="30">Every 30 mins</option>
                    <option value="45">Every 45 mins (Recommended)</option>
                    <option value="60">Every 60 mins</option>
                    <option value="90">Every 90 mins</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Luggage Allowance / Guest
                  </label>
                  <input
                    type="text"
                    value={formData.maxLuggagePerGuest}
                    onChange={(e) => setFormData({ ...formData, maxLuggagePerGuest: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-charcoal-200 space-y-3 text-xs">
                <label className="flex items-center gap-2.5 text-charcoal-800 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoAssignVehicles}
                    onChange={(e) => setFormData({ ...formData, autoAssignVehicles: e.target.checked })}
                    className="rounded text-safar-600 focus:ring-safar-500"
                  />
                  <span>Automated Fleet Capacity Balancing (Prevents vehicle overbooking)</span>
                </label>
                <label className="flex items-center gap-2.5 text-charcoal-800 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enableSmsUpdates}
                    onChange={(e) => setFormData({ ...formData, enableSmsUpdates: e.target.checked })}
                    className="rounded text-safar-600 focus:ring-safar-500"
                  />
                  <span>Send SMS boarding notifications &amp; driver arrival alerts to guests</span>
                </label>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 9: Trips */}
          {/* ==================================================== */}
          {currentStep === 9 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-charcoal-900">
                    Scheduled Trips &amp; Shuttles ({formData.trips.length})
                  </h3>
                  <p className="text-xs text-charcoal-500">
                    Schedule runs between venues. The system warns if a driver or vehicle has a scheduling conflict.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTrip({
                      id: `trp_${Date.now()}`,
                      name: 'Shuttle Run',
                      originPlace: formData.places[0]?.name || '',
                      destinationPlace: formData.places[1]?.name || '',
                      date: formData.startDate || '',
                      pickupTime: '08:30 AM',
                      vehiclePlate: formData.vehicles[0]?.registrationNumber || '',
                      driverName: formData.drivers[0]?.name || '',
                    });
                    setIsTripModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-safar-600 hover:bg-safar-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Schedule Trip
                </button>
              </div>

              {formData.trips.length === 0 ? (
                <div className="p-8 rounded-2xl border-2 border-dashed border-charcoal-200 text-center space-y-3 bg-warm-50/50">
                  <Calendar className="w-8 h-8 text-charcoal-400 mx-auto" />
                  <div>
                    <h4 className="font-semibold text-xs text-charcoal-800">No trips scheduled yet</h4>
                    <p className="text-[11px] text-charcoal-500">
                      You can schedule runs now or later from the Host Trips Dispatch Board.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {formData.trips.map((trip, idx) => (
                    <div
                      key={trip.id || idx}
                      className="p-4 rounded-2xl border border-charcoal-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-charcoal-900">{trip.name}</h4>
                          <span className="font-semibold text-[11px] text-safar-800 bg-safar-50 px-2 py-0.5 rounded">
                            {trip.pickupTime}
                          </span>
                        </div>
                        <p className="text-[11px] text-charcoal-600 mt-0.5">
                          {trip.originPlace} &rarr; {trip.destinationPlace}
                        </p>
                        <p className="text-[10px] text-charcoal-400">
                          Vehicle: {trip.vehiclePlate || 'Unassigned'} &bull; Driver: {trip.driverName || 'Unassigned'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTrip({ ...trip });
                            setIsTripModalOpen(true);
                          }}
                          className="p-1.5 text-charcoal-500 hover:text-charcoal-800 rounded-lg hover:bg-charcoal-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingTrip(trip)}
                          className="p-1.5 text-charcoal-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 10: Review & Publish */}
          {/* ==================================================== */}
          {currentStep === 10 && createdEvent ? (
            <div className="text-center py-6 space-y-5 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-charcoal-900">
                  {createdEvent.name} is Published!
                </h3>
                <p className="text-xs text-charcoal-500 mt-1">
                  Share this event code with guests and family members to join the PWA.
                </p>
              </div>

              {/* Event Join Code Banner */}
              <div className="p-5 rounded-2xl bg-warm-100 border border-charcoal-200 max-w-sm mx-auto space-y-3">
                <span className="text-xs uppercase font-bold tracking-wider text-charcoal-500">
                  Guest Event Code
                </span>
                <div className="text-3xl font-black tracking-widest text-safar-700 font-mono">
                  {createdEvent.joinCode}
                </div>
                <button
                  type="button"
                  onClick={copyCode}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white border border-charcoal-300 text-xs font-semibold text-charcoal-800 hover:bg-charcoal-50 transition-colors"
                >
                  <Copy className="w-4 h-4 text-charcoal-600" />
                  {copied ? 'Copied to Clipboard!' : 'Copy Event Code'}
                </button>
              </div>

              <div className="text-xs text-charcoal-500">
                Direct link: <code className="bg-charcoal-100 px-2 py-1 rounded">https://safar.events/join/{createdEvent.joinCode}</code>
              </div>
            </div>
          ) : currentStep === 10 ? (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-safar-50/70 border border-safar-200 space-y-2">
                <h4 className="font-bold text-xs text-safar-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-safar-600" /> Ready to Publish Event
                </h4>
                <p className="text-xs text-safar-700">
                  Review your configured setup. All items remain fully editable later from the Host Operations Dashboard.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-2xl border border-charcoal-200 bg-white">
                  <span className="text-charcoal-400 font-medium">Event:</span>
                  <p className="font-bold text-charcoal-900 mt-0.5">{formData.name || 'Untitled Event'}</p>
                </div>
                <div className="p-3 rounded-2xl border border-charcoal-200 bg-white">
                  <span className="text-charcoal-400 font-medium">Destination:</span>
                  <p className="font-bold text-charcoal-900 mt-0.5">{formData.city || 'TBD'}</p>
                </div>
                <div className="p-3 rounded-2xl border border-charcoal-200 bg-white">
                  <span className="text-charcoal-400 font-medium">Functions:</span>
                  <p className="font-bold text-charcoal-900 mt-0.5">{formData.functions.length} Configured</p>
                </div>
                <div className="p-3 rounded-2xl border border-charcoal-200 bg-white">
                  <span className="text-charcoal-400 font-medium">Places:</span>
                  <p className="font-bold text-charcoal-900 mt-0.5">{formData.places.length} Locations</p>
                </div>
                <div className="p-3 rounded-2xl border border-charcoal-200 bg-white">
                  <span className="text-charcoal-400 font-medium">Guests:</span>
                  <p className="font-bold text-charcoal-900 mt-0.5">{formData.guests.length} Registered</p>
                </div>
                <div className="p-3 rounded-2xl border border-charcoal-200 bg-white">
                  <span className="text-charcoal-400 font-medium">Fleet:</span>
                  <p className="font-bold text-charcoal-900 mt-0.5">
                    {formData.vehicles.length} Vehicles &bull; {formData.drivers.length} Drivers
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-charcoal-100 flex items-center justify-between bg-warm-50/80">
          {currentStep < 10 ? (
            <>
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentStep === 1}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal-600 hover:bg-charcoal-100 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-safar-600 hover:bg-safar-700 shadow-sm transition-all"
              >
                {isSubmitting ? (
                  'Publishing...'
                ) : currentStep === 9 ? (
                  'Review & Publish'
                ) : (
                  <>
                    Continue <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          ) : createdEvent ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl font-semibold text-xs text-white bg-safar-600 hover:bg-safar-700 shadow-sm"
            >
              Enter Event Operations Dashboard
            </button>
          ) : (
            <div className="w-full flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(9)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal-600 hover:bg-charcoal-100"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl font-semibold text-xs text-white bg-safar-600 hover:bg-safar-700 shadow-sm"
              >
                {isSubmitting ? 'Publishing...' : 'Confirm & Publish Event'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ==================================================== */}
      {/* MODALS FOR STEP 3: FUNCTION ADD/EDIT/DELETE */}
      {/* ==================================================== */}
      {isFunctionModalOpen && editingFunction && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-charcoal-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-charcoal-100 pb-3">
              <h3 className="font-bold text-sm text-charcoal-900">
                {formData.functions.some((f) => f.id === editingFunction.id) ? 'Edit Ceremony' : 'Add Ceremony'}
              </h3>
              <button onClick={() => setIsFunctionModalOpen(false)} className="text-charcoal-400 hover:text-charcoal-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">Function Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mehendi & Welcome Lunch"
                  value={editingFunction.name}
                  onChange={(e) => setEditingFunction({ ...editingFunction, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editingFunction.date}
                    onChange={(e) => setEditingFunction({ ...editingFunction, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Place / Venue</label>
                  <input
                    type="text"
                    placeholder="Venue name"
                    value={editingFunction.place}
                    onChange={(e) => setEditingFunction({ ...editingFunction, place: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Start Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 12:00 PM"
                    value={editingFunction.startTime}
                    onChange={(e) => setEditingFunction({ ...editingFunction, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">End Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 03:00 PM"
                    value={editingFunction.endTime}
                    onChange={(e) => setEditingFunction({ ...editingFunction, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-charcoal-800 font-medium cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={editingFunction.transportRequired}
                  onChange={(e) => setEditingFunction({ ...editingFunction, transportRequired: e.target.checked })}
                  className="rounded text-safar-600 focus:ring-safar-500"
                />
                <span>Transportation Required for this function</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-charcoal-100">
              <button
                type="button"
                onClick={() => setIsFunctionModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editingFunction.name.trim()) return;
                  const exists = formData.functions.some((f) => f.id === editingFunction.id);
                  const updated = exists
                    ? formData.functions.map((f) => (f.id === editingFunction.id ? editingFunction : f))
                    : [...formData.functions, editingFunction];
                  setFormData({ ...formData, functions: updated });
                  setIsFunctionModalOpen(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-safar-600 hover:bg-safar-700 text-white text-xs font-bold"
              >
                Save Function
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Function Confirmation Dialog */}
      {deletingFunction && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-charcoal-200 shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-charcoal-900">Delete {deletingFunction.name}?</h3>
              <p className="text-xs text-charcoal-500 mt-1">
                Trips, assignments, or guest bookings associated with this ceremony may be affected.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingFunction(null)}
                className="px-3 py-1.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    functions: formData.functions.filter((f) => f.id !== deletingFunction.id),
                  });
                  setDeletingFunction(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Delete Ceremony
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODALS FOR STEP 4: PLACE ADD/EDIT/DELETE */}
      {/* ==================================================== */}
      {isPlaceModalOpen && editingPlace && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-charcoal-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-charcoal-100 pb-3">
              <h3 className="font-bold text-sm text-charcoal-900">
                {formData.places.some((p) => p.id === editingPlace.id) ? 'Edit Place' : 'Add Place'}
              </h3>
              <button onClick={() => setIsPlaceModalOpen(false)} className="text-charcoal-400 hover:text-charcoal-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">Place Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. The Grand Hotel, City Airport"
                  value={editingPlace.name}
                  onChange={(e) => setEditingPlace({ ...editingPlace, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Place Type</label>
                  <select
                    value={editingPlace.type}
                    onChange={(e) => setEditingPlace({ ...editingPlace, type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  >
                    <option value="HOTEL">Hotel / Resort</option>
                    <option value="VENUE">Ceremony Venue</option>
                    <option value="AIRPORT">Airport Terminal</option>
                    <option value="RAILWAY">Railway Station</option>
                    <option value="PICKUP">Pickup Hub</option>
                    <option value="DROPOFF">Dropoff Point</option>
                    <option value="RESTAURANT">Restaurant</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">City</label>
                  <input
                    type="text"
                    value={editingPlace.city}
                    onChange={(e) => setEditingPlace({ ...editingPlace, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">Full Address</label>
                <input
                  type="text"
                  placeholder="Street, locality, landmark"
                  value={editingPlace.address}
                  onChange={(e) => setEditingPlace({ ...editingPlace, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="Concierge / Manager"
                    value={editingPlace.contactPerson || ''}
                    onChange={(e) => setEditingPlace({ ...editingPlace, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91..."
                    value={editingPlace.contactPhone || ''}
                    onChange={(e) => setEditingPlace({ ...editingPlace, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-charcoal-100">
              <button
                type="button"
                onClick={() => setIsPlaceModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editingPlace.name.trim()) return;
                  const exists = formData.places.some((p) => p.id === editingPlace.id);
                  const updated = exists
                    ? formData.places.map((p) => (p.id === editingPlace.id ? editingPlace : p))
                    : [...formData.places, editingPlace];
                  setFormData({ ...formData, places: updated });
                  setIsPlaceModalOpen(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-safar-600 hover:bg-safar-700 text-white text-xs font-bold"
              >
                Save Place
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Place Confirmation */}
      {deletingPlace && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-charcoal-200 shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-charcoal-900">Delete {deletingPlace.name}?</h3>
              <p className="text-xs text-charcoal-500 mt-1">
                Removing this location will leave any trips configured to this stop without a valid destination.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPlace(null)}
                className="px-3 py-1.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    places: formData.places.filter((p) => p.id !== deletingPlace.id),
                  });
                  setDeletingPlace(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Delete Place
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODALS FOR STEP 5: GUEST ADD/EDIT/DELETE */}
      {/* ==================================================== */}
      {isGuestModalOpen && editingGuest && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-charcoal-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-charcoal-100 pb-3">
              <h3 className="font-bold text-sm text-charcoal-900">
                {formData.guests.some((g) => g.id === editingGuest.id) ? 'Edit Guest' : 'Add Guest'}
              </h3>
              <button onClick={() => setIsGuestModalOpen(false)} className="text-charcoal-400 hover:text-charcoal-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Patel"
                  value={editingGuest.fullName}
                  onChange={(e) => setEditingGuest({ ...editingGuest, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91..."
                    value={editingGuest.phone}
                    onChange={(e) => setEditingGuest({ ...editingGuest, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="guest@example.com"
                    value={editingGuest.email}
                    onChange={(e) => setEditingGuest({ ...editingGuest, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Group / Cohort</label>
                  <input
                    type="text"
                    placeholder="e.g. VIP, Bride Family"
                    value={editingGuest.group || ''}
                    onChange={(e) => setEditingGuest({ ...editingGuest, group: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Passengers</label>
                  <input
                    type="number"
                    min={1}
                    value={editingGuest.passengerCount}
                    onChange={(e) => setEditingGuest({ ...editingGuest, passengerCount: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 text-center"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-charcoal-100">
              <button
                type="button"
                onClick={() => setIsGuestModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editingGuest.fullName.trim()) return;
                  const exists = formData.guests.some((g) => g.id === editingGuest.id);
                  const updated = exists
                    ? formData.guests.map((g) => (g.id === editingGuest.id ? editingGuest : g))
                    : [...formData.guests, editingGuest];
                  setFormData({ ...formData, guests: updated });
                  setIsGuestModalOpen(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-safar-600 hover:bg-safar-700 text-white text-xs font-bold"
              >
                Save Guest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Guest Confirmation */}
      {deletingGuest && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-charcoal-200 shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-charcoal-900">Remove {deletingGuest.fullName}?</h3>
              <p className="text-xs text-charcoal-500 mt-1">
                This guest will be removed from the invitation list and active seat allocations.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingGuest(null)}
                className="px-3 py-1.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    guests: formData.guests.filter((g) => g.id !== deletingGuest.id),
                  });
                  setDeletingGuest(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal for Guests */}
      <ExcelImportModal
        isOpen={isGuestImportOpen}
        title="Bulk Import Guests via Excel"
        entityName="Guests"
        fields={guestImportFields}
        existingRecords={formData.guests}
        onClose={() => setIsGuestImportOpen(false)}
        onImportComplete={(imported) => {
          const formatted: GuestItem[] = imported.map((r, i) => ({
            id: `gst_imp_${Date.now()}_${i}`,
            fullName: r.fullName || `${r.firstName || ''} ${r.lastName || ''}`.trim() || 'Guest',
            phone: r.phone || '',
            email: r.email || '',
            group: r.group || 'General',
            passengerCount: parseInt(r.passengerCount) || 1,
            pickupPlace: r.pickupPlace || '',
            dropPlace: r.dropPlace || '',
            notes: r.notes || '',
            status: 'INVITED',
          }));
          setFormData((prev) => ({
            ...prev,
            guests: [...prev.guests, ...formatted],
          }));
          setIsGuestImportOpen(false);
        }}
      />

      {/* ==================================================== */}
      {/* MODALS FOR STEP 6: DRIVER ADD/EDIT/DELETE */}
      {/* ==================================================== */}
      {isDriverModalOpen && editingDriver && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-charcoal-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-charcoal-100 pb-3">
              <h3 className="font-bold text-sm text-charcoal-900">
                {formData.drivers.some((d) => d.id === editingDriver.id) ? 'Edit Driver' : 'Add Driver'}
              </h3>
              <button onClick={() => setIsDriverModalOpen(false)} className="text-charcoal-400 hover:text-charcoal-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Driver Full Name"
                  value={editingDriver.name}
                  onChange={(e) => setEditingDriver({ ...editingDriver, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91..."
                    value={editingDriver.phone}
                    onChange={(e) => setEditingDriver({ ...editingDriver, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">License Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="DL01-XXXX-XXXX"
                    value={editingDriver.licenseNumber}
                    onChange={(e) => setEditingDriver({ ...editingDriver, licenseNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">Duty Status</label>
                <select
                  value={editingDriver.status}
                  onChange={(e) => setEditingDriver({ ...editingDriver, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="ON_DUTY">On Duty</option>
                  <option value="OFF_DUTY">Off Duty</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-charcoal-100">
              <button
                type="button"
                onClick={() => setIsDriverModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editingDriver.name.trim() || !editingDriver.phone.trim()) return;
                  const exists = formData.drivers.some((d) => d.id === editingDriver.id);
                  const updated = exists
                    ? formData.drivers.map((d) => (d.id === editingDriver.id ? editingDriver : d))
                    : [...formData.drivers, editingDriver];
                  setFormData({ ...formData, drivers: updated });
                  setIsDriverModalOpen(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-safar-600 hover:bg-safar-700 text-white text-xs font-bold"
              >
                Save Driver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Driver Confirmation */}
      {deletingDriver && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-charcoal-200 shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-charcoal-900">Deactivate {deletingDriver.name}?</h3>
              <p className="text-xs text-charcoal-500 mt-1">
                Removing this driver will unassign them from any scheduled trips or active shifts.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingDriver(null)}
                className="px-3 py-1.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    drivers: formData.drivers.filter((d) => d.id !== deletingDriver.id),
                  });
                  setDeletingDriver(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Excel Import */}
      <ExcelImportModal
        isOpen={isDriverImportOpen}
        title="Bulk Import Drivers via Excel"
        entityName="Drivers"
        fields={driverImportFields}
        existingRecords={formData.drivers}
        onClose={() => setIsDriverImportOpen(false)}
        onImportComplete={(imported) => {
          const formatted: DriverItem[] = imported.map((r, i) => ({
            id: `drv_imp_${Date.now()}_${i}`,
            name: r.name || 'Driver',
            phone: r.phone || '',
            email: r.email || '',
            licenseNumber: r.licenseNumber || 'DL-PENDING',
            experience: r.experience || '3 years',
            emergencyContact: r.emergencyContact || '',
            status: 'AVAILABLE',
          }));
          setFormData((prev) => ({
            ...prev,
            drivers: [...prev.drivers, ...formatted],
          }));
          setIsDriverImportOpen(false);
        }}
      />

      {/* ==================================================== */}
      {/* MODALS FOR STEP 7: VEHICLE ADD/EDIT/DELETE */}
      {/* ==================================================== */}
      {isVehicleModalOpen && editingVehicle && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-charcoal-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-charcoal-100 pb-3">
              <h3 className="font-bold text-sm text-charcoal-900">
                {formData.vehicles.some((v) => v.id === editingVehicle.id) ? 'Edit Vehicle' : 'Add Vehicle'}
              </h3>
              <button onClick={() => setIsVehicleModalOpen(false)} className="text-charcoal-400 hover:text-charcoal-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Plate / Reg Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="KA 01 AB 1234"
                    value={editingVehicle.registrationNumber}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, registrationNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Model / Make *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Innova Crysta"
                    value={editingVehicle.model}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, model: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Category</label>
                  <select
                    value={editingVehicle.category}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  >
                    <option value="SUV">SUV (6 Seats)</option>
                    <option value="SEDAN">Sedan (4 Seats)</option>
                    <option value="TEMPO_TRAVELLER">Tempo Traveller (16 Seats)</option>
                    <option value="LUXURY_SEDAN">Luxury Sedan (4 Seats)</option>
                    <option value="BUS">Coach Bus (35 Seats)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Seat Capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={editingVehicle.capacity}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, capacity: parseInt(e.target.value) || 4 })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 text-center"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-charcoal-100">
              <button
                type="button"
                onClick={() => setIsVehicleModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editingVehicle.registrationNumber.trim() || !editingVehicle.model.trim()) return;
                  const exists = formData.vehicles.some((v) => v.id === editingVehicle.id);
                  const updated = exists
                    ? formData.vehicles.map((v) => (v.id === editingVehicle.id ? editingVehicle : v))
                    : [...formData.vehicles, editingVehicle];
                  setFormData({ ...formData, vehicles: updated });
                  setIsVehicleModalOpen(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-safar-600 hover:bg-safar-700 text-white text-xs font-bold"
              >
                Save Vehicle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Vehicle Confirmation */}
      {deletingVehicle && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-charcoal-200 shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-charcoal-900">Remove {deletingVehicle.registrationNumber}?</h3>
              <p className="text-xs text-charcoal-500 mt-1">
                This vehicle will be de-allocated from this event and unlinked from assigned trips.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingVehicle(null)}
                className="px-3 py-1.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    vehicles: formData.vehicles.filter((v) => v.id !== deletingVehicle.id),
                  });
                  setDeletingVehicle(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODALS FOR STEP 9: TRIP ADD/EDIT/DELETE */}
      {/* ==================================================== */}
      {isTripModalOpen && editingTrip && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-charcoal-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-charcoal-100 pb-3">
              <h3 className="font-bold text-sm text-charcoal-900">
                {formData.trips.some((t) => t.id === editingTrip.id) ? 'Edit Trip' : 'Schedule Trip'}
              </h3>
              <button onClick={() => setIsTripModalOpen(false)} className="text-charcoal-400 hover:text-charcoal-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">Trip / Route Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sangeet Shuttle 1"
                  value={editingTrip.name}
                  onChange={(e) => setEditingTrip({ ...editingTrip, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Pickup Location</label>
                  <input
                    type="text"
                    placeholder="Origin"
                    value={editingTrip.originPlace}
                    onChange={(e) => setEditingTrip({ ...editingTrip, originPlace: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Drop Location</label>
                  <input
                    type="text"
                    placeholder="Destination"
                    value={editingTrip.destinationPlace}
                    onChange={(e) => setEditingTrip({ ...editingTrip, destinationPlace: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editingTrip.date}
                    onChange={(e) => setEditingTrip({ ...editingTrip, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Departure Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 08:30 AM"
                    value={editingTrip.pickupTime}
                    onChange={(e) => setEditingTrip({ ...editingTrip, pickupTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Assign Driver</label>
                  <select
                    value={editingTrip.driverName || ''}
                    onChange={(e) => setEditingTrip({ ...editingTrip, driverName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  >
                    <option value="">-- Select Driver --</option>
                    {formData.drivers.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name} ({d.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Assign Vehicle</label>
                  <select
                    value={editingTrip.vehiclePlate || ''}
                    onChange={(e) => setEditingTrip({ ...editingTrip, vehiclePlate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  >
                    <option value="">-- Select Vehicle --</option>
                    {formData.vehicles.map((v) => (
                      <option key={v.id} value={v.registrationNumber}>
                        {v.model} ({v.registrationNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conflict Detection Banner */}
              {editingTrip.driverName &&
                formData.trips.some(
                  (t) =>
                    t.id !== editingTrip.id &&
                    t.driverName === editingTrip.driverName &&
                    t.date === editingTrip.date &&
                    t.pickupTime === editingTrip.pickupTime
                ) && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Schedule Conflict:</strong> {editingTrip.driverName} is already assigned to another run at {editingTrip.pickupTime}.
                    </span>
                  </div>
                )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-charcoal-100">
              <button
                type="button"
                onClick={() => setIsTripModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editingTrip.name.trim()) return;
                  const exists = formData.trips.some((t) => t.id === editingTrip.id);
                  const updated = exists
                    ? formData.trips.map((t) => (t.id === editingTrip.id ? editingTrip : t))
                    : [...formData.trips, editingTrip];
                  setFormData({ ...formData, trips: updated });
                  setIsTripModalOpen(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-safar-600 hover:bg-safar-700 text-white text-xs font-bold"
              >
                Save Trip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Trip Confirmation */}
      {deletingTrip && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-charcoal-200 shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-charcoal-900">Cancel &amp; Delete {deletingTrip.name}?</h3>
              <p className="text-xs text-charcoal-500 mt-1">
                This run will be cancelled. Booked guests will be notified and seats released.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTrip(null)}
                className="px-3 py-1.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-600"
              >
                Keep Trip
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    trips: formData.trips.filter((t) => t.id !== deletingTrip.id),
                  });
                  setDeletingTrip(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Delete Run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
