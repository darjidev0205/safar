'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Car,
  Calendar,
  MapPin,
  Sparkles,
  X,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { firestore, doc, onSnapshot } from '../../lib/firebase';

interface DriverEventItem {
  id: string;
  requestId: string;
  name: string;
  city: string;
  startDate: string;
  endDate: string;
  venueName?: string;
  venueAddress?: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  requestedAt: string;
  approvedAt?: string | null;
  logistics?: {
    functionsCount: number;
    assignedTrips: Array<{
      id: string;
      origin?: string;
      destination?: string;
      scheduledPickupTime: string;
      status: string;
      vehicleModel: string;
      plateNumber: string;
    }>;
  } | null;
}

export function DriverEventAccessCard({ onEventSelected }: { onEventSelected?: (eventId: string) => void }) {
  const { profile } = useAuth();
  const [driverEvents, setDriverEvents] = useState<DriverEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [driverCodeInput, setDriverCodeInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [activeRequestStatus, setActiveRequestStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | null>(null);
  const [activeEventName, setActiveEventName] = useState<string>('');
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMyEvents = useCallback(async () => {
    try {
      setLoading(true);
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('safar_auth_token') || profile?.email || ''
          : '';

      const res = await fetch('/api/driver/my-events', {
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
          setDriverEvents(data.events);
        }
      }
    } catch (err) {
      console.error('Error fetching driver events:', err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchMyEvents();
  }, [fetchMyEvents]);

  // Handle ESC key press for Join Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isJoinModalOpen) {
        setIsJoinModalOpen(false);
      }
    };
    if (isJoinModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Auto-focus the input field when modal opens
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isJoinModalOpen]);

  // Real-time listener for active access request approval
  useEffect(() => {
    if (!activeRequestId) return;
    let unsub: (() => void) | null = null;
    try {
      const docRef = doc(firestore, 'event_access_requests', activeRequestId);
      unsub = onSnapshot(docRef, (snap: any) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.status === 'APPROVED') {
            setActiveRequestStatus('APPROVED');
            fetchMyEvents();
          } else if (data.status === 'REJECTED') {
            setActiveRequestStatus('REJECTED');
          }
        }
      });
    } catch (e) {
      console.warn('Realtime approval listener warning:', e);
    }

    return () => {
      if (unsub) unsub();
    };
  }, [activeRequestId, fetchMyEvents]);

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = driverCodeInput.trim().toUpperCase();
    if (!code) {
      setSubmitError('Invalid access code. Please check and try again.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('safar_auth_token') || profile?.email || ''
          : '';

      const res = await fetch('/api/events/access-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-user-id': profile?.id || '',
          'x-user-email': profile?.email || '',
          'x-user-uid': profile?.firebaseUid || '',
        },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActiveRequestId(data.requestId);
        setActiveRequestStatus(data.status);
        setActiveEventName(data.eventName || 'Wedding Event');
        fetchMyEvents();
      } else {
        setSubmitError(data.error?.message || 'Invalid access code. Please check and try again.');
      }
    } catch (err) {
      setSubmitError('Network error while requesting event access.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Top Banner Card: Join Event CTA */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E8E2D9] shadow-[0_4px_20px_-4px_rgba(70,50,40,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-terracotta-50 border border-terracotta-200/70 text-terracotta-700 flex items-center justify-center font-bold shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-terracotta-700 font-sans">
                Authorized Event Access
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-warm-100 text-charcoal-700 text-[10px] font-bold border border-[#E8E2D9]">
                {driverEvents.filter((e) => e.status === 'APPROVED').length} Active Events
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-serif font-bold text-charcoal-900 mt-0.5">
              Join Celebration &amp; Fleet Roster
            </h3>
            <p className="text-xs text-charcoal-500 font-sans mt-0.5">
              Enter host-provided 6-character Driver Access Code to request event roster allocation.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setIsJoinModalOpen(true);
            setSubmitError(null);
            setActiveRequestId(null);
            setActiveRequestStatus(null);
            setDriverCodeInput('');
          }}
          className="px-5 py-2.5 rounded-full bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-bold shadow-md shadow-terracotta-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] shrink-0"
        >
          <KeyRound className="w-3.5 h-3.5 text-white/90" />
          <span>Join Event</span>
        </button>
      </div>

      {/* Driver's My Events Section */}
      {driverEvents.length > 0 && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E8E2D9] shadow-[0_4px_20px_-4px_rgba(70,50,40,0.04)] space-y-4">
          <div className="flex items-center justify-between border-b border-warm-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-charcoal-800">
              My Approved &amp; Requested Events ({driverEvents.length})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {driverEvents.map((ev) => (
              <div
                key={ev.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  ev.status === 'APPROVED'
                    ? 'bg-[#FDFBF7] border-[#E8E2D9] shadow-2xs'
                    : ev.status === 'PENDING'
                    ? 'bg-amber-50/50 border-amber-200'
                    : 'bg-warm-50/50 border-[#E8E2D9] opacity-75'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        ev.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : ev.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {ev.status === 'APPROVED' ? '✓ Approved' : ev.status === 'PENDING' ? '⏳ Waiting for Approval' : '✕ Rejected'}
                    </span>
                    <span className="text-[11px] font-mono text-charcoal-400">{ev.city}</span>
                  </div>

                  <h4 className="font-serif font-bold text-sm sm:text-base text-charcoal-900 pt-1">{ev.name}</h4>
                  <div className="text-xs text-charcoal-500 flex items-center gap-1.5 font-sans">
                    <Calendar className="w-3.5 h-3.5 text-gold-600" />
                    <span>
                      {new Date(ev.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} &bull; {ev.venueName || ev.city}
                    </span>
                  </div>

                  {ev.logistics && (
                    <div className="mt-2 pt-2 border-t border-[#E8E2D9] text-[11px] text-charcoal-600 font-sans">
                      <span className="font-semibold text-terracotta-700">
                        {ev.logistics.assignedTrips.length} Assigned Trips
                      </span>
                    </div>
                  )}
                </div>

                {ev.status === 'APPROVED' && onEventSelected && (
                  <button
                    onClick={() => onEventSelected(ev.id)}
                    className="mt-3.5 px-4 py-2 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                  >
                    <span>View Event Trips</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Join Event Modal (Driver Access Code Modal) */}
      {isJoinModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="driver-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsJoinModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0A1223]/55 backdrop-blur-[8px] animate-in fade-in duration-200 font-sans"
        >
          <div
            ref={modalRef}
            className="bg-white rounded-[24px] border border-[#E8E2D9] shadow-[0_20px_50px_rgba(15,23,42,0.16),0_4px_12px_rgba(15,23,42,0.08)] max-w-lg sm:max-w-xl w-[calc(100%-16px)] sm:w-full overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-[#E8E2D9] flex items-center justify-between bg-[#FDFBF7]/80">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-terracotta-50 border border-terracotta-200/70 text-terracotta-700 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                </div>
                <div className="min-w-0">
                  <h3 id="driver-modal-title" className="text-lg sm:text-xl font-serif font-bold text-charcoal-900 truncate">
                    Enter Driver Access Code
                  </h3>
                  <p className="text-xs sm:text-sm text-charcoal-500 font-sans mt-0.5">
                    Provide the 6-character code given by the event host.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsJoinModalOpen(false)}
                aria-label="Close modal"
                className="w-11 h-11 rounded-full hover:bg-warm-100 flex items-center justify-center text-charcoal-500 hover:text-charcoal-800 transition-colors active:scale-95 shrink-0"
              >
                <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              {activeRequestStatus === 'PENDING' ? (
                <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-center space-y-3 animate-in fade-in">
                  <div className="w-12 h-12 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center mx-auto animate-pulse">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-serif font-bold text-amber-950">Request Sent to Host</h4>
                  <p className="text-xs sm:text-sm text-amber-900 leading-relaxed font-sans">
                    Waiting for host approval for <strong>{activeEventName}</strong>. This screen will update automatically as soon as the host approves your request.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs font-mono text-amber-800 pt-2 border-t border-amber-200/60">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span>Listening for realtime host authorization…</span>
                  </div>
                </div>
              ) : activeRequestStatus === 'APPROVED' ? (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-center space-y-3 animate-in fade-in">
                  <div className="w-12 h-12 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-serif font-bold text-emerald-950">Access Approved!</h4>
                  <p className="text-xs sm:text-sm text-emerald-900 font-sans">
                    You are now authorized to drive for <strong>{activeEventName}</strong>.
                  </p>
                  <button
                    onClick={() => setIsJoinModalOpen(false)}
                    className="mt-3 px-6 py-2.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-xs active:scale-[0.98]"
                  >
                    Open Event Dashboard
                  </button>
                </div>
              ) : activeRequestStatus === 'REJECTED' ? (
                <div className="p-5 rounded-2xl bg-rose-50 border border-rose-300 text-center space-y-3 animate-in fade-in">
                  <div className="w-12 h-12 rounded-full bg-rose-200 text-rose-900 flex items-center justify-center mx-auto">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-serif font-bold text-rose-950">Request Rejected</h4>
                  <p className="text-xs sm:text-sm text-rose-900 font-sans">
                    Your request was rejected by the host of <strong>{activeEventName}</strong>.
                  </p>
                  <button
                    onClick={() => {
                      setActiveRequestStatus(null);
                      setActiveRequestId(null);
                      setDriverCodeInput('');
                    }}
                    className="text-xs font-semibold text-charcoal-700 underline hover:text-charcoal-900 pt-1"
                  >
                    Try another code
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRequestAccess} className="space-y-4">
                  {/* Code Input Field */}
                  <div className="space-y-2">
                    <label className="block text-xs sm:text-[13px] font-bold uppercase tracking-wider text-charcoal-700 font-sans">
                      Driver Access Code
                    </label>
                    <input
                      ref={inputRef}
                      type="text"
                      maxLength={8}
                      value={driverCodeInput}
                      onChange={(e) => {
                        setDriverCodeInput(e.target.value.toUpperCase());
                        setSubmitError(null);
                      }}
                      placeholder="DRV26A"
                      className="w-full text-center font-mono text-[24px] font-bold tracking-[4px] py-3.5 px-4 rounded-[18px] border border-[#E8E2D9] bg-[#FDFBF7] text-charcoal-900 focus:outline-none focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-500/20 uppercase transition-all placeholder:text-charcoal-300 shadow-2xs"
                    />
                  </div>

                  {/* Error State */}
                  {submitError && (
                    <div className="p-3 rounded-2xl bg-rose-50/90 border border-rose-200/80 text-rose-800 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1 shadow-xs font-sans">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Note Card */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#FDFBF7] border border-[#E8E2D9] text-xs sm:text-sm text-charcoal-600 leading-relaxed font-sans">
                    <strong className="font-semibold text-charcoal-900">Note:</strong>{' '}
                    <span className="text-charcoal-500">Entering a driver code creates an access request for host review.</span>
                  </div>

                  {/* Modal Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsJoinModalOpen(false)}
                      className="min-h-[48px] px-6 py-2.5 rounded-full border border-[#E8E2D9] bg-white text-charcoal-800 hover:bg-warm-50 text-xs sm:text-sm font-semibold transition-all active:scale-[0.98]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !driverCodeInput.trim()}
                      className="min-h-[48px] px-6 py-2.5 rounded-full bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs sm:text-sm font-bold uppercase tracking-wider disabled:opacity-50 transition-all active:scale-[0.98] shadow-md shadow-terracotta-600/20 flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Requesting Access...</span>
                        </>
                      ) : (
                        <span>Request Access</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
