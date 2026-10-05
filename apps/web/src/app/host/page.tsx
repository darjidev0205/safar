'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronRight, Calendar, Plus } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { DashboardHero } from '../../components/host/dashboard-hero';
import { KpiCards, HostKpiStats } from '../../components/host/kpi-cards';
import { SectionHeader } from '../../components/host/section-header';
import { FunctionCard, FunctionCardData } from '../../components/host/function-card';
import { AccessCodeCard } from '../../components/host/access-code-card';
import { AccessRequestsPanel } from '../../components/host/access-requests-panel';
import { LiveTrackingPanel } from '../../components/host/live-tracking-panel';
import { ShuttlePanel } from '../../components/host/shuttle-panel';
import { EmptyState } from '../../components/host/empty-state';
import { EventWizardModal } from '../../components/host/event-wizard-modal';
import { EditEventModal } from '../../components/host/edit-event-modal';
import { GuestExcelImportModal } from '../../components/host/guest-excel-import-modal';
import { EventAccessCodesModal } from '../../components/host/event-access-codes-modal';
import { TripStatus } from '@safar/types';

export default function HostDashboardPage() {
  const { profile, authStatus } = useAuth();
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // Modals
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCodesModalOpen, setIsCodesModalOpen] = useState(false);

  const [events, setEvents] = useState<any[]>([]);
  const [activeEvent, setActiveEvent] = useState<any | null>(null);
  const [stats, setStats] = useState<HostKpiStats>({
    totalGuests: 0,
    families: 0,
    functionsCount: 0,
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
        if (eventsData.success && Array.isArray(eventsData.events) && eventsData.events.length > 0) {
          setEvents(eventsData.events);
          if (!activeEvent) {
            setActiveEvent(eventsData.events[0]);
          }
        } else if (typeof window !== 'undefined') {
          try {
            const stored = JSON.parse(localStorage.getItem('safar_host_events') || '[]');
            if (Array.isArray(stored) && stored.length > 0) {
              setEvents(stored);
              if (!activeEvent) {
                setActiveEvent(stored[0]);
              }
            }
          } catch {
            // ignore
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

  // Convert raw trips to typed models for ShuttlePanel
  const formattedTrips = trips.map((t) => ({
    id: t.id,
    eventId: t.eventId,
    originPlaceId: '',
    destinationPlaceId: '',
    scheduledPickupTime: t.scheduledPickupTime,
    status: t.status as TripStatus,
    origin: {
      name: t.originName || 'Guest Hotel',
      address: '',
      latitude: 0,
      longitude: 0,
      type: 'HOTEL' as any,
      id: '',
      eventId: '',
    },
    destination: t.destinationName || 'Ceremony Venue',
    destinationLocation: {
      name: t.destinationName || 'Ceremony Venue',
      address: '',
      latitude: 0,
      longitude: 0,
      type: 'VENUE' as any,
      id: '',
      eventId: '',
    },
    vehicle: t.vehicleModel
      ? {
          model: t.vehicleModel,
          plateNumber: t.vehiclePlate || 'GJ 01 AB 1234',
          id: '',
          accountId: '',
          category: 'SEDAN' as any,
          capacity: 4,
          isActive: true,
        }
      : undefined,
    driver: t.driverName
      ? {
          fullName: t.driverName,
          phoneNumber: t.driverPhone,
          id: '',
          accountId: '',
          userId: '',
          licenseNumber: '',
          dutyStatus: 'ON_DUTY' as any,
        }
      : undefined,
  }));

  return (
    <div className="space-y-7 min-w-0 transition-all duration-300">
      {/* 1. Dashboard Welcome Hero */}
      <DashboardHero
        hostName={profile?.fullName}
        currentDate={currentDate}
        hasEvents={events.length > 0}
        onUploadExcel={() => setIsImportModalOpen(true)}
        onCreateFunction={() => setIsWizardOpen(true)}
      />

      {/* 2. Real Database Summary KPI Cards */}
      <KpiCards
        stats={{
          ...stats,
          functionsCount: stats.functionsCount ?? events.length,
        }}
      />

      {/* 3. Functions & Events Section (Identical Card Structure) */}
      <section className="space-y-4">
        <SectionHeader
          title="Ceremonies & Functions"
          subtitle="Distinct celebration milestones with dedicated guest rosters and chauffeur rules"
          rightAction={
            <Link
              href="/host/events"
              className="text-xs font-semibold text-terracotta-700 hover:text-terracotta-800 flex items-center gap-1 font-sans transition-colors"
            >
              <span>View All ({events.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          }
        />

        {events.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-6 h-6 text-gold-600" />}
            title="No Functions Created Yet"
            description="Your celebration starts with your first ceremony. Create Sangeet, Mehndi, Haldi, Wedding Rituals, or Reception to begin allocating family transport."
            actionText="Plan Your First Function"
            onAction={() => setIsWizardOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 min-w-0">
            {events.slice(0, 6).map((ev) => (
              <FunctionCard
                key={ev.id}
                event={{
                  id: ev.id,
                  name: ev.name,
                  eventType: ev.eventType,
                  venueName: ev.venueName,
                  city: ev.city,
                  startDate: ev.startDate,
                  startTime: ev.startTime,
                  endTime: ev.endTime,
                  guestCount: ev.guestCount || 0,
                  transportRequirements: ev.transportRequirements,
                }}
                onEdit={(item) => {
                  setActiveEvent(ev);
                  setIsEditModalOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. Event Access Passcodes Presentation */}
      <AccessCodeCard
        eventName={activeEvent?.name || events[0]?.name || 'Master Wedding Celebration'}
        driverCode={
          activeEvent?.driverAccessCode ||
          events[0]?.driverAccessCode ||
          (activeEvent?.id ? `DRV${activeEvent.id.slice(-3).toUpperCase()}` : 'DRV849')
        }
        guestCode={
          activeEvent?.guestAccessCode ||
          activeEvent?.joinCode ||
          events[0]?.guestAccessCode ||
          events[0]?.joinCode ||
          (activeEvent?.id ? `GST${activeEvent.id.slice(-3).toUpperCase()}` : 'GST26X')
        }
        onManageCodes={() => setIsCodesModalOpen(true)}
      />

      {/* 5. Live Vehicle Tracking (Balanced 68% / 32% Two-Column Layout) */}
      <section>
        <LiveTrackingPanel />
      </section>

      {/* 6. Upcoming Guest Shuttles Table */}
      <section>
        <ShuttlePanel
          trips={formattedTrips}
          onCreateTrip={() => setIsWizardOpen(true)}
        />
      </section>

      {/* 7. Real-Time Access Requests Management (Full-Width Card) */}
      <section>
        <AccessRequestsPanel eventId={activeEvent?.id} />
      </section>

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

      {activeEvent && (
        <EventAccessCodesModal
          isOpen={isCodesModalOpen}
          event={activeEvent}
          onClose={() => setIsCodesModalOpen(false)}
          onCodesUpdated={fetchHostData}
        />
      )}
    </div>
  );
}
