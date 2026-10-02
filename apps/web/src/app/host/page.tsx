'use client';

import React, { useState, useEffect } from 'react';
import { KpiCards } from '../../components/host/kpi-cards';
import { UpcomingTripsTable } from '../../components/host/upcoming-trips-table';
import { LiveFleetMapCard } from '../../components/host/live-fleet-map-card';
import { QuickActionsBar } from '../../components/host/quick-actions-bar';
import { EmptyState } from '../../components/ui/empty-state';
import { CalendarPlus, Calendar, Plus, Edit3, Share2, Sparkles, AlertCircle } from 'lucide-react';
import { TripModel, DashboardStats, TripStatus, EventModel } from '@safar/types';
import { EventWizardModal } from '../../components/host/event-wizard-modal';
import { EditEventModal } from '../../components/host/edit-event-modal';
import { useAuth } from '../../context/auth-context';
import { formatHostGreeting } from '../../lib/time-greeting';

export default function HostDashboardPage() {
  const { profile, authStatus } = useAuth();
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [events, setEvents] = useState<EventModel[]>([]);
  const [activeEvent, setActiveEvent] = useState<EventModel | null>(null);

  // Dynamic timer that auto-refreshes greeting if host crosses boundary (e.g. morning to afternoon)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 20000);
    return () => clearInterval(timer);
  }, []);

  // Check demo mode environment configuration
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  // Load events from persistence or initialize
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('safar_host_events');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEvents(parsed);
            setActiveEvent(parsed[0]);
            return;
          }
        } catch (e) {
          // ignore
        }
      }

      // If demo mode is explicitly enabled, provide sample event
      if (isDemoMode) {
        const demoEvent: EventModel = {
          id: 'ev_demo_1',
          accountId: 'acc_demo',
          name: 'Aarav & Diya Wedding',
          city: 'Ahmedabad',
          startDate: '2026-11-14T09:00:00.000Z',
          endDate: '2026-11-17T23:00:00.000Z',
          joinCode: 'ADW26X',
          status: 'ACTIVE',
          description: 'Grand Royal Wedding & Multi-Venue Mobility',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setEvents([demoEvent]);
        setActiveEvent(demoEvent);
      }
    }
  }, [isDemoMode]);

  const handleEventCreated = (newEvent: EventModel) => {
    const updated = [newEvent, ...events];
    setEvents(updated);
    setActiveEvent(newEvent);
    if (typeof window !== 'undefined') {
      localStorage.setItem('safar_host_events', JSON.stringify(updated));
    }
  };

  const handleEventUpdated = (updatedEvent: EventModel) => {
    const updatedList = events.map((ev) => (ev.id === updatedEvent.id ? updatedEvent : ev));
    setEvents(updatedList);
    setActiveEvent(updatedEvent);
    if (typeof window !== 'undefined') {
      localStorage.setItem('safar_host_events', JSON.stringify(updatedList));
    }
  };

  // Real database metrics (dynamic state)
  const stats: DashboardStats = activeEvent
    ? {
        totalGuests: 186,
        totalBookings: 142,
        activeTrips: 12,
        vehiclesOnDuty: 8,
        totalVehicles: 12,
      }
    : {
        totalGuests: 0,
        totalBookings: 0,
        activeTrips: 0,
        vehiclesOnDuty: 0,
        totalVehicles: 0,
      };

  const trips: TripModel[] = activeEvent
    ? [
        {
          id: 'tr_1',
          eventId: activeEvent.id,
          originPlaceId: 'p_1',
          destinationPlaceId: 'p_2',
          scheduledPickupTime: '2026-11-14T08:30:00.000Z',
          status: TripStatus.EN_ROUTE_TO_PICKUP,
          origin: { id: 'p_1', eventId: activeEvent.id, name: 'The Grand Hotel', address: 'SG Hwy', latitude: 23.03, longitude: 72.52, type: 'HOTEL' },
          destination: { id: 'p_2', eventId: activeEvent.id, name: 'The Celebration Venue', address: 'Sindhu Bhavan', latitude: 23.04, longitude: 72.51, type: 'VENUE' },
          vehicle: { id: 'v_1', accountId: 'a_1', model: 'Force Urbania', plateNumber: 'KA 01 AB 1234', category: 'TEMPO_TRAVELLER' as any, capacity: 16, isActive: true },
          driver: { id: 'd_1', accountId: 'a_1', userId: 'u_1', fullName: 'Rohit Sharma', phoneNumber: '+91 98765 00001', licenseNumber: 'DL01', dutyStatus: 'ON_DUTY' as any },
        },
        {
          id: 'tr_2',
          eventId: activeEvent.id,
          originPlaceId: 'p_1',
          destinationPlaceId: 'p_2',
          scheduledPickupTime: '2026-11-14T09:15:00.000Z',
          status: TripStatus.ASSIGNED,
          origin: { id: 'p_1', eventId: activeEvent.id, name: 'The Grand Hotel', address: 'SG Hwy', latitude: 23.03, longitude: 72.52, type: 'HOTEL' },
          destination: { id: 'p_2', eventId: activeEvent.id, name: 'The Celebration Venue', address: 'Sindhu Bhavan', latitude: 23.04, longitude: 72.51, type: 'VENUE' },
          vehicle: { id: 'v_2', accountId: 'a_1', model: 'Innova Crysta', plateNumber: 'KA 02 CD 5678', category: 'SUV' as any, capacity: 6, isActive: true },
          driver: { id: 'd_2', accountId: 'a_1', userId: 'u_2', fullName: 'Amit Patel', phoneNumber: '+91 98765 00002', licenseNumber: 'DL02', dutyStatus: 'ON_DUTY' as any },
        },
      ]
    : [];

  // When a completely new Host creates an account, they start with 0 events
  if (events.length === 0 || !activeEvent) {
    return (
      <div className="max-w-2xl mx-auto py-16 space-y-6">
        <div className="p-8 rounded-3xl bg-white border border-charcoal-200/90 shadow-sm text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-safar-50 text-safar-700 mx-auto flex items-center justify-center">
            <CalendarPlus className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-black text-charcoal-900 tracking-tight">
              {formatHostGreeting(profile?.fullName, currentDate)}
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-500 max-w-md mx-auto">
              Ready to manage your event? Let&apos;s set up your first event. You will configure ceremonies, transport locations, vehicles, drivers, and guest rules in a guided 10-step wizard.
            </p>
          </div>

          {/* Zero metrics indicator */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
            {[
              { label: 'Events', value: '0' },
              { label: 'Guests', value: '0' },
              { label: 'Drivers', value: '0' },
              { label: 'Vehicles', value: '0' },
              { label: 'Bookings', value: '0' },
              { label: 'Trips', value: '0' },
            ].map((m, i) => (
              <div key={i} className="p-2.5 rounded-xl bg-charcoal-50 border border-charcoal-100 text-center">
                <div className="text-base font-bold text-charcoal-900">{m.value}</div>
                <div className="text-[10px] text-charcoal-400 font-medium">{m.label}</div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={() => setIsWizardOpen(true)}
              className="px-6 py-3 rounded-2xl bg-safar-600 hover:bg-safar-700 text-white font-bold text-xs shadow-md shadow-safar-600/30 transition-all inline-flex items-center gap-2 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Create Your First Event
            </button>
          </div>
        </div>

        <EventWizardModal
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onCreated={handleEventCreated}
        />
      </div>
    );
  }

  const greetingHeadline = formatHostGreeting(profile?.fullName, currentDate);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Welcome Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900 tracking-tight">
            {greetingHeadline}
          </h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Ready to manage your event?
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-charcoal-200 bg-white hover:bg-charcoal-50 text-charcoal-800 font-semibold text-xs transition-all shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-charcoal-500" />
            Edit Event Details
          </button>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-safar-600 hover:bg-safar-700 text-white font-semibold text-xs transition-all shadow-sm shadow-safar-600/20 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Create New Event
          </button>
        </div>
      </div>

      {/* Active Event Header Banner Card */}
      <div className="relative rounded-3xl overflow-hidden bg-charcoal-900 text-white p-6 shadow-sm">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80)',
          }}
        />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Active Event
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              {activeEvent.name}
            </h2>
            <p className="text-xs text-charcoal-300">
              {activeEvent.city} &bull; {new Date(activeEvent.startDate).toLocaleDateString()} &ndash; {new Date(activeEvent.endDate).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-2xl bg-charcoal-800/80 backdrop-blur-md border border-white/10 text-xs flex items-center gap-2">
              <span className="text-charcoal-400">Join Code: </span>
              <strong className="text-white font-mono tracking-widest text-sm">{activeEvent.joinCode}</strong>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(activeEvent.joinCode);
                alert(`Event Join Code ${activeEvent.joinCode} copied to clipboard!`);
              }}
              className="px-3 py-2 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <KpiCards stats={stats} />

      {/* Upcoming Trips Table */}
      <UpcomingTripsTable
        trips={trips}
        onViewAll={() => alert('Viewing all trips')}
        onCreateTrip={() => setIsWizardOpen(true)}
      />

      {/* Live Fleet Tracking Map Card */}
      <LiveFleetMapCard onOpenLiveMap={() => alert('Opening live full map modal')} />

      {/* Quick Actions Bar */}
      <QuickActionsBar
        onOpenWizard={() => setIsWizardOpen(true)}
        onAddVehicle={() => alert('Add Vehicle dialog')}
        onInviteGuests={() => alert(`Share Code: ${activeEvent.joinCode}`)}
        onViewReports={() => alert('Generating transportation manifest report')}
      />

      {/* 10-Step Guided Event Wizard Modal */}
      <EventWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreated={handleEventCreated}
      />

      {/* Edit Event Details Modal */}
      <EditEventModal
        isOpen={isEditModalOpen}
        event={activeEvent}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEventUpdated}
      />
    </div>
  );
}
