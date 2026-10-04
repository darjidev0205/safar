'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Plus,
  MapPin,
  Users,
  Car,
  KeyRound,
  CalendarPlus,
  Edit2,
  Trash2,
  AlertTriangle,
  Check,
  Clock,
  Copy,
  ChevronRight,
} from 'lucide-react';
import { EventWizardModal } from '../../../components/host/event-wizard-modal';
import { EditEventModal } from '../../../components/host/edit-event-modal';
import { EventAccessCodesModal } from '../../../components/host/event-access-codes-modal';
import { AccessRequestsPanel } from '../../../components/host/access-requests-panel';
import { useAuth } from '../../../context/auth-context';
import { StarFlourish, MarigoldFlower } from '../../../components/ui/botanical-ornaments';
import { SafarBadge, SafarButton, SafarEmptyState } from '../../../components/ui/safar-design-system';
import Link from 'next/link';

export default function HostEventsPage() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [mainTab, setMainTab] = useState<'EVENTS' | 'REQUESTS'>('EVENTS');

  // Modals
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [accessCodesEvent, setAccessCodesEvent] = useState<any | null>(null);
  const [isAccessCodesModalOpen, setIsAccessCodesModalOpen] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('safar_auth_token') || profile?.email || ''
          : '';

      const res = await fetch('/api/events', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-user-id': profile?.id || '',
          'x-user-email': profile?.email || '',
          'x-user-uid': profile?.firebaseUid || '',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.events)) {
          setEvents(data.events);
        }
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleDuplicate = async (event: any) => {
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('safar_auth_token') || profile?.email || ''
          : '';

      const res = await fetch(`/api/events/${event.id}/duplicate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-user-id': profile?.id || '',
          'x-user-email': profile?.email || '',
          'x-user-uid': profile?.firebaseUid || '',
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Duplicated "${event.name}" successfully.`);
        fetchEvents();
      } else {
        showToast(data?.error?.message || 'Failed to duplicate event');
      }
    } catch (err: any) {
      showToast(err.message || 'Error duplicating event');
    }
  };

  const handleDelete = async () => {
    if (!deletingEvent) return;
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('safar_auth_token') || profile?.email || ''
          : '';

      const res = await fetch(`/api/events/${deletingEvent.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-user-id': profile?.id || '',
          'x-user-email': profile?.email || '',
          'x-user-uid': profile?.firebaseUid || '',
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Deleted "${deletingEvent.name}".`);
        setDeletingEvent(null);
        fetchEvents();
      } else {
        showToast(data?.error?.message || 'Failed to delete event');
      }
    } catch (err: any) {
      showToast(err.message || 'Error deleting event');
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (filterType === 'ALL') return true;
    return (ev.eventType || '').toUpperCase() === filterType.toUpperCase();
  });

  const getFunctionBadgeVariant = (type: string) => {
    const t = (type || '').toUpperCase();
    if (t.includes('SANGEET')) return 'sangeet';
    if (t.includes('MEHNDI')) return 'mehndi';
    if (t.includes('HALDI')) return 'haldi';
    if (t.includes('WEDDING')) return 'wedding';
    if (t.includes('RECEPTION')) return 'reception';
    return 'custom';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-full bg-charcoal-900 text-warm-50 text-xs font-semibold shadow-xl flex items-center gap-2 animate-in slide-in-from-top-3 border border-warm-300">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-200/80 pb-6">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-gold-700 mb-1 font-sans">
            <StarFlourish className="w-2.5 h-2.5 text-gold-600" />
            <span>Ceremony Mapping & Fleet Manifests</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-charcoal-900 tracking-tight">
            Functions & Events Management
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-600 mt-1 max-w-2xl font-sans">
            Manage your individual functions (Sangeet, Mehndi, Haldi, Wedding Ceremony, Reception) with dedicated guest lists, Google Maps locations, and transport requirements.
          </p>
        </div>

        <button
          onClick={() => setIsWizardOpen(true)}
          className="px-6 py-3 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-warm-50 text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm flex items-center gap-2 self-start sm:self-auto transition-all font-sans"
        >
          <CalendarPlus className="w-4 h-4 text-gold-400" />
          <span>Create Function</span>
        </button>
      </div>

      {/* Main Tab Switcher: Ceremonies vs Access Requests */}
      <div className="flex items-center gap-2 border-b border-warm-200/80 pb-3">
        <button
          onClick={() => setMainTab('EVENTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            mainTab === 'EVENTS'
              ? 'bg-charcoal-900 text-white shadow-xs'
              : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-warm-100/50'
          }`}
        >
          Ceremonies &amp; Functions ({events.length})
        </button>

        <button
          onClick={() => setMainTab('REQUESTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            mainTab === 'REQUESTS'
              ? 'bg-terracotta-600 text-white shadow-xs'
              : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-warm-100/50'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Access Requests</span>
        </button>
      </div>

      {mainTab === 'REQUESTS' ? (
        <AccessRequestsPanel />
      ) : (
        <>
          {/* Filter Tabs by Function Type */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 font-sans">
            {['ALL', 'SANGEET', 'MEHNDI', 'HALDI', 'WEDDING', 'RECEPTION', 'CUSTOM'].map((t) => {
              const isActive = filterType === t;
              return (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-charcoal-900 text-white shadow-2xs'
                      : 'bg-white/90 text-charcoal-700 hover:bg-warm-100/70 border border-warm-300/80'
                  }`}
                >
                  {t === 'ALL' ? 'All Ceremonies' : t}
                </button>
              );
            })}
          </div>

          {/* Empty State */}
          {events.length === 0 && !loading && (
            <SafarEmptyState
              title="No Ceremonies Planned Yet"
              description="Your celebration starts with your first ceremony. Create Sangeet, Mehndi, Haldi, Wedding Rituals, or Reception to begin allocating family transport."
              actionText="Create Ceremony"
              onAction={() => setIsWizardOpen(true)}
            />
          )}

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEvents.map((event) => {
          const tr = event.transportRequirements;
          const startDateObj = new Date(event.startDate);
          const formattedDate = !isNaN(startDateObj.getTime())
            ? startDateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'Scheduled';

          const timeString = event.startTime
            ? `${event.startTime} – ${event.endTime || 'End'}`
            : 'All Day';

          const badgeVariant = getFunctionBadgeVariant(event.eventType);

          return (
            <div
              key={event.id}
              className="p-6 rounded-3xl bg-white/95 border border-warm-200/90 shadow-2xs hover:shadow-xs hover:border-warm-300 transition-all flex flex-col justify-between"
            >
              {/* Card Header */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <SafarBadge variant={badgeVariant as any} size="sm">
                    {event.eventType || 'FUNCTION'}
                  </SafarBadge>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-charcoal-500 bg-warm-50 px-2.5 py-0.5 rounded-full border border-warm-200/80">
                    <KeyRound className="w-3 h-3 text-gold-600" />
                    <span>{event.joinCode}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-serif font-bold text-charcoal-900 tracking-tight">
                    {event.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-charcoal-600 font-sans">
                    <Calendar className="w-3.5 h-3.5 text-gold-600 shrink-0" />
                    <span>{formattedDate}</span>
                    <span>•</span>
                    <Clock className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                    <span>{timeString}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-charcoal-500 font-sans">
                    <MapPin className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                    <span className="truncate">{event.venueName || event.city}</span>
                  </div>
                </div>

                {/* Key Metrics Strip */}
                <div className="p-3.5 rounded-2xl bg-warm-50/70 border border-warm-200/80 grid grid-cols-3 gap-2 text-center text-xs font-sans">
                  <div>
                    <span className="text-[10px] text-charcoal-400 uppercase font-semibold block">Guests</span>
                    <span className="font-serif font-bold text-charcoal-900 text-sm">{event.guestCount || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-charcoal-400 uppercase font-semibold block">Vehicles</span>
                    <span className="font-serif font-bold text-charcoal-900 text-sm">
                      {tr?.numberOfVehicles || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-charcoal-400 uppercase font-semibold block">Trips</span>
                    <span className="font-serif font-bold text-charcoal-900 text-sm">{event.tripsCount || 0}</span>
                  </div>
                </div>

                {/* Transport Status Badge */}
                <div className="text-xs text-charcoal-600 flex items-center justify-between p-2.5 rounded-xl bg-warm-50/60 border border-warm-100 font-sans">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-terracotta-700" />
                    <span className="font-medium text-[11px]">
                      {tr ? `${tr.vehicleType || 'Fleet'} • ${tr.pickupRequired ? 'Pickup' : ''} ${tr.dropRequired ? '& Drop' : ''}` : 'No transport configured'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-sage-800 bg-sage-50 px-2.5 py-0.5 rounded-full border border-sage-200">
                    Active
                  </span>
                </div>

                {/* EVENT ACCESS CODES BAR */}
                <div className="p-3 rounded-2xl bg-[#FCFAF6] border border-[#E8E2D9] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-charcoal-700 uppercase tracking-wider flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-terracotta-600" />
                      Event Access Codes
                    </span>
                    <button
                      onClick={() => {
                        setAccessCodesEvent(event);
                        setIsAccessCodesModalOpen(true);
                      }}
                      className="text-[10px] font-bold text-terracotta-700 hover:text-terracotta-800 underline"
                    >
                      Manage / Regenerate
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                    <div
                      onClick={() => {
                        setAccessCodesEvent(event);
                        setIsAccessCodesModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-white border border-[#E8E2D9] cursor-pointer hover:border-terracotta-400 transition-colors"
                      title="Click to view & copy Driver Code"
                    >
                      <span className="text-[9px] font-sans font-semibold text-charcoal-400 block">DRIVER</span>
                      <strong className="text-charcoal-900 text-xs tracking-wider">{event.driverAccessCode || 'DRV---'}</strong>
                    </div>
                    <div
                      onClick={() => {
                        setAccessCodesEvent(event);
                        setIsAccessCodesModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-white border border-[#E8E2D9] cursor-pointer hover:border-emerald-400 transition-colors"
                      title="Click to view & copy Guest Code"
                    >
                      <span className="text-[9px] font-sans font-semibold text-charcoal-400 block">GUEST</span>
                      <strong className="text-charcoal-900 text-xs tracking-wider">{event.guestAccessCode || event.joinCode || 'GST---'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3.5 border-t border-warm-100 space-y-2.5 font-sans">
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/host/guests?eventId=${event.id}`}
                    className="px-3 py-2 rounded-full bg-warm-50 hover:bg-warm-100 text-charcoal-800 text-xs font-bold text-center border border-warm-300 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Users className="w-3.5 h-3.5 text-terracotta-600" />
                    <span>Guests ({event.guestCount || 0})</span>
                  </Link>

                  <button
                    onClick={() => {
                      setEditingEvent(event);
                      setIsEditModalOpen(true);
                    }}
                    className="px-3 py-2 rounded-full bg-white hover:bg-warm-50 text-charcoal-700 text-xs font-semibold text-center border border-warm-200 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Ceremony</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => handleDuplicate(event)}
                    className="text-[11px] font-semibold text-charcoal-500 hover:text-charcoal-800 flex items-center gap-1"
                    title="Duplicate this ceremony"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Duplicate</span>
                  </button>

                  <button
                    onClick={() => setDeletingEvent(event)}
                    className="text-[11px] font-semibold text-burgundy-600 hover:text-burgundy-800 flex items-center gap-1"
                    title="Delete function"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      </>
      )}

      {/* Access Codes Modal */}
      {accessCodesEvent && (
        <EventAccessCodesModal
          isOpen={isAccessCodesModalOpen}
          onClose={() => {
            setIsAccessCodesModalOpen(false);
            setAccessCodesEvent(null);
          }}
          event={accessCodesEvent}
          onCodesUpdated={() => fetchEvents()}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-warm-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-burgundy-50 border border-burgundy-200 text-burgundy-700 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-charcoal-900">Delete Ceremony?</h3>
              <p className="text-xs text-charcoal-600 mt-1 font-sans">
                Are you sure you want to delete <span className="font-bold text-charcoal-800">{deletingEvent.name}</span>? This will remove associated guest manifests and transport requirements from your database.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2 font-sans">
              <button
                onClick={() => setDeletingEvent(null)}
                className="px-4 py-2 rounded-full border border-warm-300 text-xs font-semibold text-charcoal-700 hover:bg-warm-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-full bg-burgundy-800 hover:bg-burgundy-900 text-white text-xs font-bold shadow-xs"
              >
                Delete Ceremony
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      <EventWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreated={() => {
          showToast('New function created successfully!');
          fetchEvents();
        }}
      />

      {/* Edit Event Modal */}
      {editingEvent && (
        <EditEventModal
          isOpen={isEditModalOpen}
          event={editingEvent}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingEvent(null);
          }}
          onSave={() => {
            showToast('Ceremony updated successfully!');
            fetchEvents();
          }}
        />
      )}
    </div>
  );
}
