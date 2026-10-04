'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, ArrowRight, CheckCircle2, AlertCircle, Clock, ShieldCheck, XCircle } from 'lucide-react';
import { useAuth } from '../../../context/auth-context';
import { firestore, doc, onSnapshot } from '../../../lib/firebase';

function GuestJoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = (searchParams.get('code') || '').toUpperCase();
  const { profile } = useAuth();

  const [code, setCode] = useState(initialCode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | null>(null);
  const [eventName, setEventName] = useState<string>('');
  const [eventId, setEventId] = useState<string>('');

  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode) {
      setCode(urlCode.toUpperCase());
    }
  }, [searchParams]);

  // Realtime Firestore listener for Instant Host Approval
  useEffect(() => {
    if (!requestId) return;
    let unsub: (() => void) | null = null;
    try {
      const docRef = doc(firestore, 'event_access_requests', requestId);
      unsub = onSnapshot(docRef, (snap: any) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.status === 'APPROVED') {
            setRequestStatus('APPROVED');
            if (typeof window !== 'undefined') {
              localStorage.setItem('safar_active_guest_event_id', data.eventId);
            }
          } else if (data.status === 'REJECTED') {
            setRequestStatus('REJECTED');
          }
        }
      });
    } catch (e) {
      console.warn('Realtime guest approval listener note:', e);
    }

    return () => {
      if (unsub) unsub();
    };
  }, [requestId]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('Please enter a valid Guest Access Code.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
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
        body: JSON.stringify({ code: trimmed }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRequestId(data.requestId);
        setRequestStatus(data.status);
        setEventName(data.eventName || 'Wedding Celebration');
        setEventId(data.eventId || '');

        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'safar_guest_event',
            JSON.stringify({ name: data.eventName, id: data.eventId, code: trimmed })
          );
          if (data.status === 'APPROVED') {
            localStorage.setItem('safar_active_guest_event_id', data.eventId);
          }
        }

        if (data.status === 'APPROVED') {
          setTimeout(() => {
            router.push('/guest');
          }, 800);
        }
      } else {
        setError(data.error?.message || 'Invalid guest access code.');
      }
    } catch (err) {
      setError('Network error while requesting guest access.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-8 max-w-md mx-auto space-y-6 font-sans">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-terracotta-100 text-terracotta-700 mx-auto flex items-center justify-center">
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-charcoal-900 tracking-tight">
          Join Event Transportation
        </h1>
        <p className="text-xs text-charcoal-500">
          Enter the Guest Access Code provided on your wedding invitation.
        </p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-[#E8E2D9] shadow-sm space-y-4">
        {requestStatus === 'PENDING' ? (
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-center space-y-3 animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center mx-auto animate-pulse">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-serif font-bold text-amber-900">Request Sent to Host</h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              Waiting for host approval for <strong>{eventName}</strong>. This screen will update automatically as soon as the host approves your guest pass.
            </p>
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-amber-700 pt-2 border-t border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Real-time host synchronization active…</span>
            </div>
          </div>
        ) : requestStatus === 'APPROVED' ? (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-center space-y-3 animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-serif font-bold text-emerald-900">Access Approved!</h3>
            <p className="text-xs text-emerald-800">
              You now have full access to event schedules, venues, and wedding shuttles for <strong>{eventName}</strong>.
            </p>
            <button
              onClick={() => router.push('/guest')}
              className="mt-2 w-full py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2"
            >
              Open Guest Portal <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : requestStatus === 'REJECTED' ? (
          <div className="p-5 rounded-2xl bg-rose-50 border border-rose-300 text-center space-y-3 animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-rose-200 text-rose-900 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-serif font-bold text-rose-900">Request Not Approved</h3>
            <p className="text-xs text-rose-800">
              Your request for <strong>{eventName}</strong> was rejected by the host.
            </p>
            <button
              onClick={() => {
                setRequestStatus(null);
                setRequestId(null);
              }}
              className="text-xs font-semibold text-charcoal-700 underline"
            >
              Try another code
            </button>
          </div>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-[13px] font-bold uppercase tracking-wider text-charcoal-700 mb-1.5 font-sans">
                Guest Access Code
              </label>
              <input
                type="text"
                maxLength={8}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                placeholder="e.g. M4Q8ZT"
                className="w-full text-center tracking-[4px] text-[24px] font-mono font-bold py-3.5 px-4 rounded-[18px] border border-[#E8E2D9] bg-[#FDFBF7] text-charcoal-900 focus:outline-none focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-500/20 uppercase placeholder:text-charcoal-300 shadow-2xs"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-2xl bg-rose-50/90 border border-rose-200/80 text-rose-800 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1 shadow-xs font-sans">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-3.5 sm:p-4 rounded-2xl bg-[#FDFBF7] border border-[#E8E2D9] text-xs sm:text-sm text-charcoal-600 leading-relaxed font-sans">
              <ShieldCheck className="w-4 h-4 text-terracotta-700 inline mr-1.5 align-text-bottom" />
              Entering a guest code creates a verification request for host review.
            </div>

            <button
              type="submit"
              disabled={submitting || !code.trim()}
              className="w-full min-h-[48px] py-3 px-6 rounded-full bg-terracotta-600 hover:bg-terracotta-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-md shadow-terracotta-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
            >
              {submitting ? 'Submitting Request…' : 'Request Event Access'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function GuestJoinPage() {
  return (
    <Suspense fallback={<div className="py-8 text-center text-xs text-charcoal-400">Loading guest access portal...</div>}>
      <GuestJoinContent />
    </Suspense>
  );
}
