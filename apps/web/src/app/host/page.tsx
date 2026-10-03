'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { KpiCards, HostKpiStats } from '../../components/host/kpi-cards';
import { UpcomingTripsTable } from '../../components/host/upcoming-trips-table';
import { LiveFleetMapCard } from '../../components/host/live-fleet-map-card';
import {
  CalendarPlus,
  Plus,
  Edit3,
  Users,
  Car,
  Clock,
  MapPin,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';
import { TripStatus } from '@safar/types';
import { EventWizardModal } from '../../components/host/event-wizard-modal';
import { EditEventModal } from '../../components/host/edit-event-modal';
import { GuestExcelImportModal } from '../../components/host/guest-excel-import-modal';
import { useAuth } from '../../context/auth-context';
import { formatHostGreeting } from '../../lib/time-greeting';
import { StarFlourish, MarigoldFlower, OliveBranch } from '../../components/ui/botanical-ornaments';
import { SafarBadge, SafarButton, SafarEmptyState } from '../../components/ui/safar-design-system';
import Link from 'next/link';

export default function HostDashboardPage() {
  const { profile, authStatus } = useAuth();
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [events, setEvents] = useState<any[]>([]);
  const [activeEvent, setActiveEvent] = useState<any | null>(null);
  const [stats, setStats] = useState<HostKpiStats>({
    totalGuests: 0,
    families: 0,
    vehiclesRequired: 0,
    guestsAssigned: 0,
    guestsPending: 0,
    driversAssigned: 0,
    activeTrips: 0,
  });
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic timer for greeting updates
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real database records for this authenticated host
  const fetchHostData = useCallback(async () => {
    try {
      setLoading(true);
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('safar_auth_token') || profile?.email || ''
          : '';

      const [eventsRes, dashRes] = await Promise.all([
        fetch('/api/events', {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-user-id': profile?.id || '',
            'x-user-email': profile?.email || '',
            'x-user-uid': profile?.firebaseUid || '',
          },
        }),
        fetch('/api/host/dashboard', {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-user-id': profile?.id || '',
            'x-user-email': profile?.email || '',
            'x-user-uid': profile?.firebaseUid || '',
          },
        }),
      ]);

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        if (eventsData.success && Array.isArray(eventsData.events)) {
          setEvents(eventsData.events);
          if (eventsData.events.length > 0 && !activeEvent) {
            setActiveEvent(eventsData.events[0]);
          }
        }
      }

      if (dashRes.ok) {
        const dashData = await dashRes.json();
        if (dashData.success) {
          if (dashData.stats) {
            setStats(dashData.stats);
          }
          if (Array.isArray(dashData.trips)) {
            setTrips(dashData.trips);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching host dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [profile, activeEvent]);

  useEffect(() => {
    if (authStatus === 'AUTHENTICATED') {
      fetchHostData();
    }
  }, [authStatus, fetchHostData]);

  const handleEventCreated = (newEvent: any) => {
    fetchHostData();
    setActiveEvent(newEvent);
  };

  const handleEventUpdated = (updatedEvent: any) => {
    fetchHostData();
    setActiveEvent(updatedEvent);
  };

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
    <div className="max-w-7xl mx-auto space-y-7 animate-in fade-in duration-300">
      {/* Top Banner: Printed Editorial Invitation Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-white/95 border border-warm-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle Decorative Botanical Flourish Background Accent */}
        <div className="absolute right-4 -bottom-6 pointer-events-none opacity-20">
          <OliveBranch className="w-36 h-36 text-sage-600" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 font-sans">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-warm-100 text-charcoal-800 border border-warm-300/80">
              <StarFlourish className="w-2.5 h-2.5 text-gold-600" />
              <span>SAFAR Host Control</span>
            </span>
            <span className="text-xs text-charcoal-400 font-medium">
              {currentDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-charcoal-900 tracking-tight font-serif leading-tight">
            {formatHostGreeting(profile?.fullName, currentDate)}
          </h1>
          <p className="mt-1 text-xs md:text-sm text-charcoal-600 max-w-xl font-sans">
            Plan and manage every journey for your celebration with bespoke hospitality and live fleet control.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 relative z-10">
          {events.length > 0 && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2.5 rounded-full border border-warm-300 bg-warm-50/80 hover:bg-warm-100 text-xs font-bold text-charcoal-800 flex items-center gap-2 shadow-2xs transition-all font-sans"
            >
              <FileSpreadsheet className="w-4 h-4 text-terracotta-600" />
              <span>Upload Guest Excel</span>
            </button>
          )}

          <button
            onClick={() => setIsWizardOpen(true)}
            className="px-6 py-3 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-warm-50 hover:text-white text-xs md:text-sm font-bold shadow-xs hover:shadow-sm flex items-center gap-2 transition-all transform hover:-translate-y-0.5 font-sans"
          >
            <CalendarPlus className="w-4 h-4 text-gold-400" />
            <span>Create Function</span>
          </button>
        </div>
      </div>

      {/* Real Database KPI Metrics */}
      <KpiCards stats={stats} />

      {/* Function / Events Overview Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-warm-200/80 pb-3">
          <div className="flex items-center gap-2">
            <StarFlourish className="w-3 h-3 text-gold-600" />
            <h2 className="text-lg md:text-xl font-serif font-bold text-charcoal-900">
              Ceremonies & Functions
            </h2>
            <span className="text-xs text-charcoal-400 font-sans hidden sm:inline">
              — Distinct records with dedicated guest lists and transportation rules
            </span>
          </div>
          <Link
            href="/host/events"
            className="text-xs font-semibold text-terracotta-700 hover:text-terracotta-800 flex items-center gap-1 font-sans"
          >
            View All ({events.length})
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {events.length === 0 ? (
          <SafarEmptyState
            title="No Functions Created Yet"
            description="Your celebration starts with your first ceremony. Create Sangeet, Mehndi, Haldi, Wedding Rituals, or Reception to begin allocating family transport."
            actionText="Plan Your First Function"
            onAction={() => setIsWizardOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.slice(0, 6).map((ev) => {
              const tr = ev.transportRequirements;
              const badgeVariant = getFunctionBadgeVariant(ev.eventType);

              return (
                <div
                  key={ev.id}
                  className="p-5 rounded-3xl bg-white/95 border border-warm-200/90 shadow-2xs hover:shadow-xs hover:border-warm-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <SafarBadge variant={badgeVariant as any} size="sm">
                        {ev.eventType || 'FUNCTION'}
                      </SafarBadge>
                      <span className="text-[11px] text-charcoal-400 font-mono">
                        Code: {ev.joinCode}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-serif font-bold text-charcoal-900 tracking-tight">
                        {ev.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-charcoal-500 font-sans">
                        <MapPin className="w-3.5 h-3.5 text-gold-600 shrink-0" />
                        <span className="truncate">{ev.venueName || ev.city}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-warm-50/70 border border-warm-200/80 grid grid-cols-2 gap-2 text-xs font-sans">
                      <div>
                        <span className="text-[10px] text-charcoal-400 font-medium block">Date & Time</span>
                        <span className="font-semibold text-charcoal-800 truncate block">
                          {new Date(ev.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-[11px] text-charcoal-500">
                          {ev.startTime ? `${ev.startTime} – ${ev.endTime || ''}` : 'Scheduled'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-charcoal-400 font-medium block">Guests & Fleet</span>
                        <span className="font-semibold text-charcoal-800 block">
                          {ev.guestCount || 0} Guests
                        </span>
                        <span className="text-[11px] text-terracotta-700 font-medium">
                          {tr ? `${tr.numberOfVehicles || 1} ${tr.vehicleType || 'Vehicles'}` : 'Transport Ready'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-warm-100 flex items-center justify-between font-sans">
                    <Link
                      href={`/host/guests?eventId=${ev.id}`}
                      className="text-xs font-bold text-terracotta-700 hover:text-terracotta-800 flex items-center gap-1"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Guests ({ev.guestCount || 0})</span>
                    </Link>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setActiveEvent(ev);
                          setIsEditModalOpen(true);
                        }}
                        className="p-1.5 rounded-full text-charcoal-400 hover:text-charcoal-800 hover:bg-warm-100 transition-colors"
                        title="Edit Function"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <Link
                        href={`/host/events?eventId=${ev.id}`}
                        className="px-3.5 py-1 rounded-full bg-charcoal-900 text-white text-xs font-semibold hover:bg-charcoal-800 transition-colors shadow-2xs"
                      >
                        Manage
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid: Upcoming Trips & Fleet Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <UpcomingTripsTable
            trips={trips.map((t) => ({
              id: t.id,
              eventId: t.eventId,
              originPlaceId: '',
              destinationPlaceId: '',
              scheduledPickupTime: t.scheduledPickupTime,
              status: t.status as TripStatus,
              origin: { name: t.originName, address: '', latitude: 0, longitude: 0, type: 'HOTEL', id: '', eventId: '' },
              destination: { name: t.destinationName, address: '', latitude: 0, longitude: 0, type: 'VENUE', id: '', eventId: '' },
              vehicle: t.vehicleModel ? { model: t.vehicleModel, plateNumber: t.vehiclePlate, id: '', accountId: '', category: 'SEDAN' as any, capacity: 4, isActive: true } : undefined,
              driver: t.driverName ? { fullName: t.driverName, phoneNumber: t.driverPhone, id: '', accountId: '', userId: '', licenseNumber: '', dutyStatus: 'ON_DUTY' as any } : undefined,
            }))}
          />
        </div>

        <div className="space-y-4">
          <LiveFleetMapCard />
        </div>
      </div>

      {/* Modals */}
      <EventWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreated={handleEventCreated}
      />

      {activeEvent && (
        <EditEventModal
          isOpen={isEditModalOpen}
          event={activeEvent}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleEventUpdated}
        />
      )}

      {activeEvent && (
        <GuestExcelImportModal
          isOpen={isImportModalOpen}
          eventId={activeEvent.id}
          eventName={activeEvent.name}
          onClose={() => setIsImportModalOpen(false)}
          onImportSuccess={fetchHostData}
        />
      )}
    </div>
  );
}
