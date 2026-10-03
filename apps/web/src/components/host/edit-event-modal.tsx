'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Building, Car, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { SafarButton } from '../ui/safar-design-system';

interface EditEventModalProps {
  isOpen: boolean;
  event: any | null;
  onClose: () => void;
  onSave: (updatedEvent: any) => void;
}

export function EditEventModal({ isOpen, event, onClose, onSave }: EditEventModalProps) {
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('CUSTOM');
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [venueLatitude, setVenueLatitude] = useState('');
  const [venueLongitude, setVenueLongitude] = useState('');
  const [expectedGuestCount, setExpectedGuestCount] = useState('0');
  const [description, setDescription] = useState('');

  // Transport
  const [pickupRequired, setPickupRequired] = useState(false);
  const [dropRequired, setDropRequired] = useState(false);
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');
  const [vehicleType, setVehicleType] = useState('Sedan');
  const [numberOfVehicles, setNumberOfVehicles] = useState('1');
  const [specialInstructions, setSpecialInstructions] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      setName(event.name || '');
      setEventType(event.eventType || 'CUSTOM');
      setCity(event.city || '');
      const rawDate = event.startDate ? String(event.startDate).substring(0, 10) : '';
      setDate(rawDate);
      setStartTime(event.startTime || '18:00');
      setEndTime(event.endTime || '22:00');
      setVenueName(event.venueName || '');
      setVenueAddress(event.venueAddress || '');
      setVenueLatitude(event.venueLatitude ? String(event.venueLatitude) : '');
      setVenueLongitude(event.venueLongitude ? String(event.venueLongitude) : '');
      setExpectedGuestCount(event.expectedGuestCount ? String(event.expectedGuestCount) : '0');
      setDescription(event.description || '');

      const tr = event.transportRequirements || (Array.isArray(event.transportRequirements) ? event.transportRequirements[0] : null);
      if (tr) {
        setPickupRequired(Boolean(tr.pickupRequired));
        setDropRequired(Boolean(tr.dropRequired));
        setPickupLocation(tr.pickupLocation || '');
        setDropLocation(tr.dropLocation || '');
        setVehicleType(tr.vehicleType || 'Sedan');
        setNumberOfVehicles(String(tr.numberOfVehicles || 1));
        setSpecialInstructions(tr.specialInstructions || '');
      } else {
        setPickupRequired(false);
        setDropRequired(false);
        setPickupLocation('');
        setDropLocation('');
        setVehicleType('Sedan');
        setNumberOfVehicles('1');
        setSpecialInstructions('');
      }
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('safar_auth_token') || profile?.email || ''
          : '';

      const startDateTime = new Date(`${date}T${startTime}:00`);
      const endDateTime = new Date(`${date}T${endTime}:00`);

      const payload = {
        name: name.trim(),
        eventType,
        city: city.trim(),
        startDate: isNaN(startDateTime.getTime()) ? event.startDate : startDateTime.toISOString(),
        endDate: isNaN(endDateTime.getTime()) ? event.endDate : endDateTime.toISOString(),
        startTime,
        endTime,
        venueName: venueName.trim(),
        venueAddress: venueAddress.trim(),
        venueLatitude: venueLatitude ? parseFloat(venueLatitude) : null,
        venueLongitude: venueLongitude ? parseFloat(venueLongitude) : null,
        expectedGuestCount: parseInt(expectedGuestCount, 10) || 0,
        description: description.trim(),
        transport: {
          pickupRequired,
          dropRequired,
          pickupLocation: pickupLocation.trim(),
          dropLocation: dropLocation.trim(),
          vehicleType,
          numberOfVehicles: parseInt(numberOfVehicles, 10) || 1,
          specialInstructions: specialInstructions.trim(),
        },
      };

      const res = await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
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
        throw new Error(data?.error?.message || 'Failed to update event in database');
      }

      onSave(data.event);
      onClose();
    } catch (err: any) {
      console.error('Error updating event:', err);
      setErrorMsg(err.message || 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl border border-warm-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-warm-200 flex items-center justify-between bg-warm-50/70">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta-900 bg-terracotta-100/70 px-2.5 py-0.5 rounded-full border border-terracotta-200 font-sans">
              Ceremonial Function
            </span>
            <h2 className="text-base sm:text-lg font-serif font-bold text-charcoal-900 mt-1">
              Edit Function &amp; Transport
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-charcoal-400 hover:text-charcoal-700 rounded-xl hover:bg-warm-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-charcoal-900 font-sans">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Event / Function Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Function Type
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium bg-white focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
              >
                <option value="SANGEET">SANGEET</option>
                <option value="MEHNDI">MEHNDI</option>
                <option value="HALDI">HALDI</option>
                <option value="WEDDING">WEDDING</option>
                <option value="RECEPTION">RECEPTION</option>
                <option value="CUSTOM">CUSTOM</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Venue Name *
              </label>
              <input
                type="text"
                required
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Venue Full Address
            </label>
            <input
              type="text"
              value={venueAddress}
              onChange={(e) => setVenueAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Latitude
              </label>
              <input
                type="text"
                value={venueLatitude}
                onChange={(e) => setVenueLatitude(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Longitude
              </label>
              <input
                type="text"
                value={venueLongitude}
                onChange={(e) => setVenueLongitude(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Expected Guests
              </label>
              <input
                type="number"
                min="0"
                value={expectedGuestCount}
                onChange={(e) => setExpectedGuestCount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
            />
          </div>

          {/* Transport Requirements Section */}
          <div className="pt-3 border-t border-warm-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-700 flex items-center gap-1.5 font-sans">
              <Car className="w-4 h-4 text-terracotta-600" />
              Ceremony Transport Requirements
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-charcoal-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pickupRequired}
                  onChange={(e) => setPickupRequired(e.target.checked)}
                  className="rounded text-terracotta-600 focus:ring-terracotta-500"
                />
                <span>Guest Pickup Required</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-charcoal-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dropRequired}
                  onChange={(e) => setDropRequired(e.target.checked)}
                  className="rounded text-terracotta-600 focus:ring-terracotta-500"
                />
                <span>Guest Return / Drop Required</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Pickup Location
                </label>
                <input
                  type="text"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  placeholder="e.g. Hyatt Regency"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Vehicle Type
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium bg-white focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                >
                  <option value="Sedan">Sedan</option>
                  <option value="SUV">SUV</option>
                  <option value="Tempo Traveller">Tempo Traveller</option>
                  <option value="Mini Bus">Mini Bus</option>
                  <option value="Bus">Bus</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Number of Vehicles
                </label>
                <input
                  type="number"
                  min="1"
                  value={numberOfVehicles}
                  onChange={(e) => setNumberOfVehicles(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Special Instructions
              </label>
              <textarea
                rows={2}
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Driver notes, passenger timings, accessibility..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-warm-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-warm-200 text-xs font-semibold text-charcoal-700 hover:bg-warm-100 transition-colors"
            >
              Cancel
            </button>
            <SafarButton
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSaving}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Updating...' : 'Update Function'}</span>
            </SafarButton>
          </div>
        </form>
      </div>
    </div>
  );
}
