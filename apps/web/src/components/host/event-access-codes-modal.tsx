'use client';

import React, { useState, useEffect, useRef } from 'react';
import { KeyRound, Copy, Check, RefreshCw, AlertTriangle, ShieldCheck, Car, Users, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/auth-context';

interface EventAccessCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    id: string;
    name: string;
    driverAccessCode?: string;
    guestAccessCode?: string;
    joinCode?: string;
  } | null;
  onCodesUpdated?: () => void;
}

export function EventAccessCodesModal({
  isOpen,
  onClose,
  event,
  onCodesUpdated,
}: EventAccessCodesModalProps) {
  const { profile } = useAuth();
  const [driverCode, setDriverCode] = useState(event?.driverAccessCode || '');
  const [guestCode, setGuestCode] = useState(event?.guestAccessCode || event?.joinCode || '');
  const [copiedType, setCopiedType] = useState<'DRIVER' | 'GUEST' | null>(null);
  const [regeneratingType, setRegeneratingType] = useState<'DRIVER' | 'GUEST' | null>(null);
  const [confirmType, setConfirmType] = useState<'DRIVER' | 'GUEST' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (event) {
      setDriverCode(event.driverAccessCode || `DRV${event.id.slice(-3).toUpperCase()}`);
      setGuestCode(event.guestAccessCode || event.joinCode || `GST${event.id.slice(-3).toUpperCase()}`);
    }
  }, [event]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

  const handleCopy = (code: string, type: 'DRIVER' | 'GUEST') => {
    navigator.clipboard.writeText(code);
    setCopiedType(type);
    setToastMessage(`${type === 'DRIVER' ? 'Driver' : 'Guest'} access code copied to clipboard.`);
    setTimeout(() => {
      setCopiedType(null);
      setToastMessage(null);
    }, 2000);
  };

  const handleRegenerate = async (type: 'DRIVER' | 'GUEST') => {
    try {
      setRegeneratingType(type);
      const token = typeof window !== 'undefined' ? localStorage.getItem('safar_auth_token') || profile?.email || '' : '';
      const res = await fetch(`/api/events/${event.id}/access-codes/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-user-id': profile?.id || '',
          'x-user-email': profile?.email || '',
          'x-user-uid': profile?.firebaseUid || '',
        },
        body: JSON.stringify({ type }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (type === 'DRIVER') {
          setDriverCode(data.newCode);
        } else {
          setGuestCode(data.newCode);
        }
        setConfirmType(null);
        setToastMessage(`New ${type.toLowerCase()} code generated. Previous code is now invalid.`);
        if (onCodesUpdated) onCodesUpdated();
      } else {
        alert(data.error?.message || 'Failed to regenerate access code.');
      }
    } catch (err) {
      console.error('Error regenerating code:', err);
      alert('Network error while regenerating code.');
    } finally {
      setRegeneratingType(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="access-control-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0A1223]/55 backdrop-blur-[8px] animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-[24px] border border-[#E8E2D9] shadow-[0_20px_50px_rgba(15,23,42,0.16),0_4px_12px_rgba(15,23,42,0.08)] max-w-lg sm:max-w-xl w-[calc(100%-16px)] sm:w-full max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 font-sans"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#E8E2D9] flex items-center justify-between bg-[#FDFBF7]/80 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-terracotta-50 border border-terracotta-200/70 flex items-center justify-center text-terracotta-700 shrink-0">
              <KeyRound className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
            </div>
            <div className="min-w-0">
              <h2 id="access-control-title" className="text-lg sm:text-xl font-serif font-bold text-charcoal-900 truncate">
                Event Access Control
              </h2>
              <p className="text-xs sm:text-sm text-charcoal-500 truncate">
                {event.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-11 h-11 rounded-full hover:bg-warm-100 flex items-center justify-center text-charcoal-500 hover:text-charcoal-800 transition-colors active:scale-95 shrink-0"
          >
            <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
        </div>

        {/* Modal Body (Scrollable if viewport is small) */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Two-Factor Security Notice */}
          <div className="p-4 rounded-2xl bg-amber-50/75 border border-amber-200/80 text-amber-950 text-xs sm:text-sm flex items-start gap-3 leading-relaxed">
            <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-amber-900 block mb-0.5">Two-Factor Security:</strong>
              <span className="text-amber-900/90">
                Sharing a code only creates an <em>Access Request</em>. You must approve each driver or guest from the Access Requests section before they can view event logistics.
              </span>
            </div>
          </div>

          {/* DRIVER ACCESS CODE */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FDFBF7] border border-[#E8E2D9] space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs sm:text-[13px] font-bold tracking-wider text-charcoal-900 uppercase">
                <Car className="w-4 h-4 text-terracotta-600" />
                <span>Driver Access Code</span>
              </div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-charcoal-500">
                For Chauffeurs &amp; Fleets
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-white border border-[#E8E2D9] shadow-2xs">
              <div className="font-mono text-2xl sm:text-3xl font-bold tracking-[0.2em] text-charcoal-900 px-2 select-all">
                {driverCode}
              </div>
              <button
                onClick={() => handleCopy(driverCode, 'DRIVER')}
                aria-label="Copy driver access code"
                className={`min-h-[40px] px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                  copiedType === 'DRIVER'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs'
                    : 'bg-warm-100 hover:bg-warm-200 text-charcoal-900 border border-[#E8E2D9]'
                }`}
              >
                {copiedType === 'DRIVER' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied ✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-charcoal-600" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 pt-0.5">
              <p className="text-xs text-charcoal-500 font-sans">Only grants Driver role request</p>
              {confirmType === 'DRIVER' ? (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 p-2 rounded-xl">
                  <span className="text-[11px] text-rose-800 font-semibold">Invalidate previous code?</span>
                  <button
                    onClick={() => handleRegenerate('DRIVER')}
                    disabled={regeneratingType === 'DRIVER'}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold shadow-xs active:scale-95"
                  >
                    {regeneratingType === 'DRIVER' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Yes, Regenerate'
                    )}
                  </button>
                  <button
                    onClick={() => setConfirmType(null)}
                    className="text-[11px] text-charcoal-600 hover:text-charcoal-900 font-medium underline px-1"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmType('DRIVER')}
                  className="text-xs font-semibold text-terracotta-700 hover:text-terracotta-800 flex items-center gap-1.5 transition-colors py-1 px-2 rounded-lg hover:bg-terracotta-50/60"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerate Code</span>
                </button>
              )}
            </div>
          </div>

          {/* GUEST ACCESS CODE */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FDFBF7] border border-[#E8E2D9] space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs sm:text-[13px] font-bold tracking-wider text-charcoal-900 uppercase">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Guest Access Code</span>
              </div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-charcoal-500">
                For Wedding Attendees
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-white border border-[#E8E2D9] shadow-2xs">
              <div className="font-mono text-2xl sm:text-3xl font-bold tracking-[0.2em] text-charcoal-900 px-2 select-all">
                {guestCode}
              </div>
              <button
                onClick={() => handleCopy(guestCode, 'GUEST')}
                aria-label="Copy guest access code"
                className={`min-h-[40px] px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                  copiedType === 'GUEST'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs'
                    : 'bg-warm-100 hover:bg-warm-200 text-charcoal-900 border border-[#E8E2D9]'
                }`}
              >
                {copiedType === 'GUEST' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied ✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-charcoal-600" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 pt-0.5">
              <p className="text-xs text-charcoal-500 font-sans">Only grants Guest role request</p>
              {confirmType === 'GUEST' ? (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 p-2 rounded-xl">
                  <span className="text-[11px] text-rose-800 font-semibold">Invalidate previous code?</span>
                  <button
                    onClick={() => handleRegenerate('GUEST')}
                    disabled={regeneratingType === 'GUEST'}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold shadow-xs active:scale-95"
                  >
                    {regeneratingType === 'GUEST' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Yes, Regenerate'
                    )}
                  </button>
                  <button
                    onClick={() => setConfirmType(null)}
                    className="text-[11px] text-charcoal-600 hover:text-charcoal-900 font-medium underline px-1"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmType('GUEST')}
                  className="text-xs font-semibold text-terracotta-700 hover:text-terracotta-800 flex items-center gap-1.5 transition-colors py-1 px-2 rounded-lg hover:bg-terracotta-50/60"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerate Code</span>
                </button>
              )}
            </div>
          </div>

          {toastMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs text-center font-semibold animate-in fade-in slide-in-from-top-1 shadow-xs">
              {toastMessage}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#E8E2D9] bg-[#FDFBF7]/80 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-[48px] px-8 py-2.5 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white text-xs sm:text-sm font-semibold shadow-md transition-all active:scale-[0.98]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
