'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { HostSidebar } from '../../components/host/sidebar';
import { HostHeader } from '../../components/host/header';
import { EventWizardModal } from '../../components/host/event-wizard-modal';
import { EventModel, UserRole } from '@safar/types';
import { useRouter, usePathname } from 'next/navigation';
import { AuthGuard } from '../../components/auth/auth-guard';
import { MobileBottomNav } from '../../components/host/mobile-bottom-nav';
import { useAuth } from '../../context/auth-context';

export default function HostLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useAuth();
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Active events state
  const [events, setEvents] = useState<EventModel[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventModel | null>(null);

  // Check demo mode environment configuration
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  const loadEventsFromServer = useCallback(async () => {
    try {
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
        if (data.success && Array.isArray(data.events) && data.events.length > 0) {
          setEvents(data.events);
          const savedEventId = typeof window !== 'undefined' ? localStorage.getItem('safar_selected_event_id') : null;
          const matched = savedEventId ? data.events.find((e: any) => e.id === savedEventId) : null;
          const chosen = matched || data.events[0];
          setSelectedEvent(chosen);
          if (typeof window !== 'undefined') {
            localStorage.setItem('safar_host_events', JSON.stringify(data.events));
            localStorage.setItem('safar_selected_event_id', chosen.id);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load host events in layout:', err);
    }
  }, [profile]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('safar_host_events');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEvents(parsed);
            const savedEventId = localStorage.getItem('safar_selected_event_id');
            const matched = savedEventId ? parsed.find((e: any) => e.id === savedEventId) : null;
            setSelectedEvent(matched || parsed[0]);
            return;
          }
        } catch (e) {
          // ignore
        }
      }

      if (profile) {
        loadEventsFromServer();
      } else if (isDemoMode) {
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
        setSelectedEvent(demoEvent);
      }
    }
  }, [profile, isDemoMode, loadEventsFromServer]);

  const currentTab = pathname.split('/')[2] || 'dashboard';

  const handleTabChange = (tabId: string) => {
    if (tabId === 'dashboard') {
      router.push('/host');
    } else {
      router.push(`/host/${tabId}`);
    }
  };

  const handleSelectEvent = (ev: EventModel) => {
    setSelectedEvent(ev);
    if (typeof window !== 'undefined') {
      localStorage.setItem('safar_selected_event_id', ev.id);
    }
  };

  const handleEventCreated = (newEvent: EventModel) => {
    const updated = [newEvent, ...events];
    setEvents(updated);
    setSelectedEvent(newEvent);
    if (typeof window !== 'undefined') {
      localStorage.setItem('safar_host_events', JSON.stringify(updated));
      localStorage.setItem('safar_selected_event_id', newEvent.id);
    }
  };

  return (
    <AuthGuard allowedRoles={[UserRole.EVENT_ORGANIZER, UserRole.ACCOUNT_OWNER, UserRole.SUPER_ADMIN]}>
      <div className="min-h-screen w-full flex bg-warm-50 paper-texture text-charcoal-900 font-sans overflow-x-hidden antialiased">
        {/* Fixed Desktop Sidebar */}
        <div className="hidden md:flex shrink-0">
          <HostSidebar currentTab={currentTab} onTabChange={handleTabChange} />
        </div>

        {/* Main Viewport Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <HostHeader
            events={events}
            selectedEvent={selectedEvent}
            onSelectEvent={handleSelectEvent}
            onOpenWizard={() => setIsWizardOpen(true)}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24 md:pb-10 min-w-0">
            <div className="max-w-[1360px] mx-auto w-full min-w-0">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile Floating Bottom Navigation */}
        <MobileBottomNav onOpenWizard={() => setIsWizardOpen(true)} />

        {/* Celebration Creation Wizard */}
        <EventWizardModal
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onCreated={handleEventCreated}
        />
      </div>
    </AuthGuard>
  );
}
