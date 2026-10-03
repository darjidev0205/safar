'use client';

import React, { useState } from 'react';
import { X, Calendar, MapPin, Clock, Save, AlertCircle } from 'lucide-react';
import { EventModel } from '@safar/types';

interface EditEventModalProps {
  isOpen: boolean;
  event: EventModel | null;
  onClose: () => void;
  onSave: (updatedEvent: EventModel) => void;
}

export function EditEventModal({ isOpen, event, onClose, onSave }: EditEventModalProps) {
  const [name, setName] = useState(event?.name || '');
  const [city, setCity] = useState(event?.city || '');
  const [startDate, setStartDate] = useState(event?.startDate ? event.startDate.substring(0, 10) : '2026-11-14');
  const [endDate, setEndDate] = useState(event?.endDate ? event.endDate.substring(0, 10) : '2026-11-17');
  const [description, setDescription] = useState(event?.description || '');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (event) {
      setName(event.name || '');
      setCity(event.city || '');
      setStartDate(event.startDate ? event.startDate.substring(0, 10) : '2026-11-14');
      setEndDate(event.endDate ? event.endDate.substring(0, 10) : '2026-11-17');
      setDescription(event.description || '');
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const updated: EventModel = {
      ...event,
      name,
      city,
      startDate: `${startDate}T09:00:00.000Z`,
      endDate: `${endDate}T23:00:00.000Z`,
      description,
      updatedAt: new Date().toISOString(),
    };

    setTimeout(() => {
      onSave(updated);
      setIsSaving(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl border border-charcoal-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-charcoal-100 flex items-center justify-between bg-warm-50/70">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-safar-700">
              Event Management
            </span>
            <h2 className="text-base font-bold text-charcoal-900">Edit Event Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-charcoal-400 hover:text-charcoal-700 rounded-xl hover:bg-charcoal-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Event Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs font-medium focus:ring-2 focus:ring-safar-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Host Destination / City
            </label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs font-medium focus:ring-2 focus:ring-safar-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs font-medium focus:ring-2 focus:ring-safar-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs font-medium focus:ring-2 focus:ring-safar-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Event Description &amp; Mobility Notes
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-charcoal-200 text-xs font-medium focus:ring-2 focus:ring-safar-500 focus:outline-none"
            />
          </div>

          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              Updating event dates or times validates against assigned trips and notifies drivers and booked guests.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-600 hover:bg-charcoal-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-safar-600 hover:bg-safar-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
