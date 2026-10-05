'use client';

import React, { useState, useEffect } from 'react';
import { HostSidebar } from '../../components/host/sidebar';
import { HostHeader } from '../../components/host/header';
import { EventWizardModal } from '../../components/host/event-wizard-modal';
import { EventModel, UserRole } from '@safar/types';
import { useRouter, usePathname } from 'next/navigation';
import { AuthGuard } from '../../components/auth/auth-guard';
import { MobileBottomNav } from '../../components/host/mobile-bottom-nav';

export default function HostLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Active events state
  const [events, setEvents] = useState<EventModel[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventModel | null>(null);

  // Check demo mode environment configuration
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('safar_host_events');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEvents(parsed);
            setSelectedEvent(parsed[0]);
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
        setSelectedEvent(demoEvent);
      }
    }
  }, [isDemoMode]);

  const currentTab = pathname.split('/')[2] || 'dashboard';

  const handleTabChange = (tabId: string) => {
    if (tabId === 'dashboard') {
      router.push('/host');
    } else {
      router.push(`/host/${tabId}`);
    }
  };

  const handleEventCreated = (newEvent: EventModel) => {
    const updated = [newEvent, ...events];
    setEvents(updated);
    setSelectedEvent(newEvent);
    if (typeof window !== 'undefined') {
      localStorage.setItem('safar_host_events', JSON.stringify(updated));
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
            onSelectEvent={(ev) => setSelectedEvent(ev)}
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
