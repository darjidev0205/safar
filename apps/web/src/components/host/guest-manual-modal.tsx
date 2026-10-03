'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, User, Users, Phone, Mail, Home, MapPin, Building, FileText, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { SafarButton } from '../ui/safar-design-system';

interface GuestManualModalProps {
  isOpen: boolean;
  eventId: string;
  guest?: any | null; // If provided, edit mode
  onClose: () => void;
  onSaved: (guest: any) => void;
}

export function GuestManualModal({
  isOpen,
  eventId,
  guest,
  onClose,
  onSaved,
}: GuestManualModalProps) {
  const { profile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [relation, setRelation] = useState('Groom Family');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [memberCount, setMemberCount] = useState('1');
  const [category, setCategory] = useState('Family');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');
  const [hotelRoom, setHotelRoom] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('CONFIRMED');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isEditing = Boolean(guest?.id);

  useEffect(() => {
    if (guest) {
      setFullName(guest.fullName || '');
      setFamilyName(guest.familyName || '');
      setRelation(guest.relation || 'Family');
      setPhoneNumber(guest.phoneNumber || '');
      setEmail(guest.email || '');
      setMemberCount(String(guest.memberCount || 1));
      setCategory(guest.category || 'Family');
      setPickupLocation(guest.pickupLocation || '');
      setDropLocation(guest.dropLocation || '');
      setHotelRoom(guest.hotelRoom || '');
      setSpecialRequirements(guest.specialRequirements || '');
      setNotes(guest.notes || '');
      setStatus(guest.status || 'CONFIRMED');
    } else {
      setFullName('');
      setFamilyName('');
      setRelation('Groom Family');
      setPhoneNumber('');
      setEmail('');
      setMemberCount('1');
      setCategory('Family');
      setPickupLocation('');
      setDropLocation('');
      setHotelRoom('');
      setSpecialRequirements('');
      setNotes('');
      setStatus('CONFIRMED');
    }
  }, [guest, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Guest Full Name is required.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('safar_auth_token') || profile?.email || ''
          : '';

      const payload = {
        fullName: fullName.trim(),
        familyName: familyName.trim() || 'Independent',
        relation: relation.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim() || null,
        memberCount: parseInt(memberCount, 10) || 1,
        category: category.trim(),
        pickupLocation: pickupLocation.trim(),
        dropLocation: dropLocation.trim(),
        hotelRoom: hotelRoom.trim(),
        specialRequirements: specialRequirements.trim(),
        notes: notes.trim(),
        status,
      };

      const url = isEditing
        ? `/api/events/${eventId}/guests/${guest.id}`
        : `/api/events/${eventId}/guests`;

      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-user-email': profile?.email || '',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || 'Failed to save guest');
      }

      onSaved(data.guest);
      onClose();
    } catch (err: any) {
      console.error('Error saving guest:', err);
      setErrorMsg(err.message || 'Error occurred while saving guest.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl border border-warm-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-warm-200 flex items-center justify-between bg-warm-50/70">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta-900 bg-terracotta-100/70 px-2.5 py-0.5 rounded-full border border-terracotta-200 font-sans">
              Guest Management
            </span>
            <h2 className="text-base sm:text-lg font-serif font-bold text-charcoal-900 mt-1">
              {isEditing ? 'Edit Guest Details' : 'Add Guest Manually'}
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
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* Full Name & Family Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Guest Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-charcoal-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Raj Shah"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Family Name *
              </label>
              <div className="relative">
                <Home className="w-4 h-4 text-charcoal-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="e.g. Shah Family"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Relation, Category, Members */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Relation
              </label>
              <input
                type="text"
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                placeholder="e.g. Groom Family, Cousin"
                className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Guest Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium bg-white focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
              >
                <option value="Family">Family</option>
                <option value="VIP">VIP</option>
                <option value="Friend">Friend</option>
                <option value="Colleague">Colleague</option>
                <option value="Vendor">Vendor</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Number of Members
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-charcoal-400 absolute left-3 top-3" />
                <input
                  type="number"
                  min="1"
                  value={memberCount}
                  onChange={(e) => setMemberCount(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Mobile & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-charcoal-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-charcoal-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="guest@example.com"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Pickup, Drop, Hotel */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Pickup Location
              </label>
              <input
                type="text"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                placeholder="e.g. Airport T1"
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
                placeholder="e.g. Grand Bhagwati"
                className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Hotel / Room Number
              </label>
              <input
                type="text"
                value={hotelRoom}
                onChange={(e) => setHotelRoom(e.target.value)}
                placeholder="e.g. Hyatt Regency, #402"
                className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Special Requirements & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Special Requirements (Wheelchair, Child Seat)
              </label>
              <input
                type="text"
                value={specialRequirements}
                onChange={(e) => setSpecialRequirements(e.target.value)}
                placeholder="e.g. Wheelchair assistance required"
                className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Organizer Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. VIP guest, arriving with family on evening flight"
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
              disabled={saving}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving Guest...' : isEditing ? 'Update Guest' : 'Save Guest'}</span>
            </SafarButton>
          </div>
        </form>
      </div>
    </div>
  );
}
