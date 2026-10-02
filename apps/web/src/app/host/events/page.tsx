'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  MapPin,
  Users,
  Car,
  KeyRound,
  ExternalLink,
  CalendarPlus,
  Edit2,
  Trash2,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { EventWizardModal } from '../../../components/host/event-wizard-modal';
import { EditEventModal } from '../../../components/host/edit-event-modal';
import { EmptyState } from '../../../components/ui/empty-state';
import Link from 'next/link';
import { EventModel } from '@safar/types';

export default function HostEventsPage() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [editingEvent, setEditingEvent] = useState<EventModel | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('safar_host_events');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEvents(parsed);
            return;
          }
        } catch (e) {
          // ignore
        }
      }

      if (isDemoMode) {
        setEvents([
          {
            id: 'ev_1',
            name: 'Aarav & Diya Wedding',
            city: 'Ahmedabad',
            dates: '14–17 Nov 2026',
            startDate: '2026-11-14T09:00:00.000Z',
            endDate: '2026-11-17T23:00:00.000Z',
            joinCode: 'ADW26X',
            status: 'ACTIVE',
            guestsCount: 186,
            vehiclesCount: 12,
            tripsCount: 24,
          },
        ]);
      }
    }
  }, [isDemoMode]);

  const saveEvents = (updated: any[]) => {
    setEvents(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('safar_host_events', JSON.stringify(updated));
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleEventCreated = (newEvent: EventModel) => {
    const updated = [newEvent, ...events];
    saveEvents(updated);
    showToast(`Created event ${newEvent.name}!`);
  };

  const handleEventSaved = (updatedEvent: EventModel) => {
    const updated = events.map((ev) => (ev.id === updatedEvent.id ? { ...ev, ...updatedEvent } : ev));
    saveEvents(updated);
    showToast(`Updated event ${updatedEvent.name}.`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-charcoal-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-in slide-in-from-top-3">
          <Check className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900 tracking-tight">Events Management</h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Organize multi-day event transportation, ceremony venues, and passenger groups.
          </p>
        </div>
        <button
          onClick={() => setIsWizardOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-safar-600 hover:bg-safar-700 text-white font-semibold text-xs transition-all shadow-sm shadow-safar-600/20 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Create Event Wizard
        </button>
      </div>

      {events.length === 0 ? (
        <div className="py-12 max-w-lg mx-auto">
          <EmptyState
            icon={CalendarPlus}
            title="No Events Created Yet"
            description="You have 0 active events. Launch the guided 10-step wizard to set up your first event transportation workspace."
            actionLabel="Create Your First Event"
            onAction={() => setIsWizardOpen(true)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="p-6 rounded-3xl bg-white border border-charcoal-200/80 shadow-xs space-y-4 hover:border-safar-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
                      {ev.status || 'ACTIVE'}
                    </span>
                    <h3 className="text-lg font-bold text-charcoal-900">{ev.name}</h3>
                    <p className="text-xs text-charcoal-500">
                      {ev.city} &bull; {ev.dates || (ev.startDate ? new Date(ev.startDate).toLocaleDateString() : 'Upcoming')}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-warm-100 border border-charcoal-200 text-center">
                    <span className="text-[10px] font-bold text-charcoal-500 block">JOIN CODE</span>
                    <span className="text-base font-mono font-bold text-safar-700">{ev.joinCode}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-charcoal-100 text-xs text-charcoal-600">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-charcoal-400" />
                    <span>{ev.guestsCount || 0} Guests</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-charcoal-400" />
                    <span>{ev.vehiclesCount || 0} Vehicles</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-charcoal-400" />
                    <span>{ev.tripsCount || 0} Trips</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-charcoal-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link
                    href="/host"
                    className="text-xs font-semibold text-safar-700 hover:text-safar-800 flex items-center gap-1"
                  >
                    Open Operations &rarr;
                  </Link>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(ev.joinCode);
                      showToast(`Event Code ${ev.joinCode} copied!`);
                    }}
                    className="text-xs text-charcoal-500 hover:text-charcoal-800 font-medium px-2 py-1 rounded-lg hover:bg-charcoal-100"
                  >
                    Copy Code
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEvent(ev);
                      setIsEditModalOpen(true);
                    }}
                    className="p-1.5 text-charcoal-500 hover:text-charcoal-800 rounded-lg hover:bg-charcoal-100"
                    title="Edit Event"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingEvent(ev)}
                    className="p-1.5 text-charcoal-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                    title="Delete Event"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-charcoal-200 shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-charcoal-900">Delete {deletingEvent.name}?</h3>
              <p className="text-xs text-charcoal-500 mt-1">
                This will delete the event, including all associated ceremonies, guest rosters, and scheduled trips.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingEvent(null)}
                className="px-3 py-1.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = events.filter((e) => e.id !== deletingEvent.id);
                  saveEvents(updated);
                  setDeletingEvent(null);
                  showToast('Event deleted.');
                }}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}

      <EventWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreated={handleEventCreated}
      />

      <EditEventModal
        isOpen={isEditModalOpen}
        event={editingEvent}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEventSaved}
      />
    </div>
  );
}
