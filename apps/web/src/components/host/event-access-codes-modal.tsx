'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  Car,
  Users,
  X,
  Loader2,
  Share2,
  UserPlus,
  Trash2,
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';

interface DriverInvite {
  id: string;
  code: string;
  displayCode: string;
  recipientName?: string | null;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
  isActive: boolean;
  isSingleUse: boolean;
  redeemedAt?: string | null;
  redeemer?: {
    id: string;
    fullName: string;
    phoneNumber?: string | null;
    email?: string | null;
  } | null;
  createdAt: string;
}

interface AssignedDriver {
  id: string;
  driverId: string;
  fullName: string;
  phoneNumber?: string | null;
  licenseNumber: string;
  dutyStatus: string;
  status: string;
  assignedVehicle?: string | null;
}

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
  const [loading, setLoading] = useState(false);
  const [guestCode, setGuestCode] = useState(event?.guestAccessCode || event?.joinCode || '');
  const [guestCodeId, setGuestCodeId] = useState<string | null>(null);
  const [driverInvitations, setDriverInvitations] = useState<DriverInvite[]>([]);
  const [assignedDrivers, setAssignedDrivers] = useState<AssignedDriver[]>([]);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmRevokeType, setConfirmRevokeType] = useState<'GUEST' | string | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Invite Driver Form State
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [creatingInvite, setCreatingInvite] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  const fetchAccessData = useCallback(async () => {
    if (!event) return;
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('safar_auth_token') || profile?.email || '' : '';
      const res = await fetch(`/api/events/${event.id}/access-codes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-user-id': profile?.id || '',
          'x-user-email': profile?.email || '',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.codes?.guestAccessCode) {
            setGuestCode(data.codes.guestAccessCode);
          }
          if (data.guestCode?.id) {
            setGuestCodeId(data.guestCode.id);
          }
          if (Array.isArray(data.driverInvitations)) {
            setDriverInvitations(data.driverInvitations);
          }
          if (Array.isArray(data.assignedDrivers)) {
            setAssignedDrivers(data.assignedDrivers);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching event access data:', err);
    } finally {
      setLoading(false);
    }
  }, [event, profile]);

  useEffect(() => {
    if (isOpen && event) {
      fetchAccessData();
    }
  }, [isOpen, event, fetchAccessData]);

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    showToast('Copied to clipboard!');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleShare = () => {
    const clean = guestCode.replace(/[^A-Za-z0-9]/g, '');
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/guest?code=${clean}`;
    if (navigator.share) {
      navigator.share({
        title: `${event.name} — Wedding Guest Pass`,
        text: `You are warmly invited to ${event.name}! Use Guest Code ${guestCode} to view ceremonial functions and request transportation.`,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      showToast('Wedding portal guest link copied to clipboard!');
    }
  };

  const handleRegenerateGuestCode = async () => {
    try {
      setRegenerating(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('safar_auth_token') || profile?.email || '' : '';
      const res = await fetch(`/api/events/${event.id}/access-codes/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-user-id': profile?.id || '',
        },
        body: JSON.stringify({ type: 'GUEST' }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setGuestCode(data.guestAccessCode || data.newCode);
        setConfirmRegenerate(false);
        showToast('New guest code generated. Previous guest code is now invalidated.');
        if (onCodesUpdated) onCodesUpdated();
        fetchAccessData();
      } else {
        alert(data.error?.message || 'Failed to regenerate guest code.');
      }
    } catch {
      alert('Network error while regenerating guest code.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleCreateDriverInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingInvite(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('safar_auth_token') || profile?.email || '' : '';
      const res = await fetch(`/api/events/${event.id}/access-codes/driver-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-user-id': profile?.id || '',
        },
        body: JSON.stringify({
          recipientName: inviteName.trim() || undefined,
          recipientPhone: invitePhone.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setInviteName('');
        setInvitePhone('');
        setShowInviteForm(false);
        showToast('Driver invitation code created successfully!');
        fetchAccessData();
      } else {
        alert(data.error?.message || 'Failed to create driver invitation.');
      }
    } catch {
      alert('Network error creating driver invitation.');
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleRevokeCode = async (codeId: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('safar_auth_token') || profile?.email || '' : '';
      const res = await fetch(`/api/events/${event.id}/access-codes/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-user-id': profile?.id || '',
        },
        body: JSON.stringify({ codeId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setConfirmRevokeType(null);
        showToast('Access code revoked successfully.');
        fetchAccessData();
      } else {
        alert(data.error?.message || 'Failed to revoke code.');
      }
    } catch {
      alert('Network error while revoking code.');
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0A1223]/60 backdrop-blur-[8px] animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-[24px] border border-[#E8E2D9] shadow-[0_20px_50px_rgba(15,23,42,0.16)] max-w-xl w-full max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 font-sans"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#E8E2D9] flex items-center justify-between bg-[#FDFBF7]/90 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-terracotta-50 border border-terracotta-200/70 flex items-center justify-center text-terracotta-700 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="access-control-title" className="text-lg sm:text-xl font-serif font-bold text-charcoal-900 truncate">
                Event Access Management
              </h2>
              <p className="text-xs text-charcoal-500 font-medium truncate">
                {event.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-10 h-10 rounded-full hover:bg-warm-100 flex items-center justify-center text-charcoal-500 hover:text-charcoal-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Two-Factor Guidance */}
          <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F3E2CE] text-xs sm:text-sm text-charcoal-800 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-terracotta-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-charcoal-900 block mb-0.5">Authoritative Tenant Access Control</strong>
              <span className="text-charcoal-600 text-xs leading-relaxed">
                Guest codes allow attendees to discover functions and access itineraries. Driver invitations are one-time secure passes designed specifically for assigned chauffeurs.
              </span>
            </div>
          </div>

          {/* GUEST ACCESS CODE PANEL */}
          <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E8E2D9] space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-charcoal-900 uppercase">
                <Users className="w-4 h-4 text-terracotta-600" />
                <span>Guest Event Code</span>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Active Code
              </span>
            </div>

            <p className="text-xs text-charcoal-500">
              Allows invited guests to discover the wedding, view ceremonies, and request shuttles.
            </p>

            <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-[#E8E2D9] shadow-xs">
              <div className="font-mono text-2xl sm:text-3xl font-bold tracking-[0.15em] text-charcoal-900 px-2 select-all">
                {guestCode || 'GENERATING...'}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleCopy(guestCode, 'GUEST')}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all bg-warm-100 hover:bg-warm-200 text-charcoal-900 border border-[#E8E2D9]"
                >
                  {copiedType === 'GUEST' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-charcoal-600" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleShare}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all bg-terracotta-50 hover:bg-terracotta-100 text-terracotta-800 border border-terracotta-200"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Actions for Guest Code */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-[#E8E2D9]/60">
              <span className="text-[11px] text-charcoal-400">10-character human-readable code</span>

              {confirmRegenerate ? (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 p-2 rounded-xl">
                  <span className="text-[11px] text-rose-800 font-semibold">Invalidate current code?</span>
                  <button
                    onClick={handleRegenerateGuestCode}
                    disabled={regenerating}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold shadow-xs active:scale-95 flex items-center gap-1"
                  >
                    {regenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes, Regenerate'}
                  </button>
                  <button
                    onClick={() => setConfirmRegenerate(false)}
                    className="text-[11px] text-charcoal-600 hover:text-charcoal-900 font-medium underline px-1"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConfirmRegenerate(true)}
                    className="text-xs font-semibold text-terracotta-700 hover:text-terracotta-800 flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-terracotta-50 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerate</span>
                  </button>
                  {guestCodeId && (
                    <button
                      onClick={() => handleRevokeCode(guestCodeId)}
                      className="text-xs font-semibold text-charcoal-500 hover:text-rose-700 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Revoke</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* DRIVER ACCESS PANEL */}
          <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E8E2D9] space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-charcoal-900 uppercase">
                <Car className="w-4 h-4 text-terracotta-600" />
                <span>Driver Access &amp; Invitations</span>
              </div>
              <button
                onClick={() => setShowInviteForm(!showInviteForm)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-charcoal-900 hover:bg-charcoal-800 text-white flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite Driver</span>
              </button>
            </div>

            <p className="text-xs text-charcoal-500">
              One-time access invitation for an assigned chauffeur. Redeeming connects the driver and prevents code reuse.
            </p>

            {/* Invite Form Drawer */}
            {showInviteForm && (
              <form onSubmit={handleCreateDriverInvite} className="p-4 rounded-2xl bg-white border border-[#E8E2D9] space-y-3 animate-in fade-in duration-150">
                <div className="text-xs font-bold text-charcoal-900 uppercase tracking-wider">
                  New Single-Use Chauffeur Invite
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-charcoal-600 mb-1">
                      Chauffeur Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kumar"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#E8E2D9] focus:outline-none focus:ring-2 focus:ring-terracotta-500/20 focus:border-terracotta-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-charcoal-600 mb-1">
                      Mobile Phone (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={invitePhone}
                      onChange={(e) => setInvitePhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#E8E2D9] focus:outline-none focus:ring-2 focus:ring-terracotta-500/20 focus:border-terracotta-600"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowInviteForm(false)}
                    className="px-3 py-1.5 text-xs text-charcoal-600 hover:text-charcoal-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingInvite}
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-terracotta-600 hover:bg-terracotta-700 text-white flex items-center gap-1.5 shadow-xs"
                  >
                    {creatingInvite ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Generate Invitation'}
                  </button>
                </div>
              </form>
            )}

            {/* Pending Driver Invitations */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-charcoal-500 uppercase tracking-wider">
                Pending Chauffeur Invitations ({driverInvitations.filter((i) => i.isActive && !i.redeemedAt).length})
              </div>

              {driverInvitations.filter((i) => i.isActive && !i.redeemedAt).length === 0 ? (
                <div className="p-3 text-center text-xs text-charcoal-400 border border-dashed border-[#E8E2D9] rounded-xl bg-white/50">
                  No pending invitations. Click &quot;Invite Driver&quot; to issue a one-time pass.
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {driverInvitations
                    .filter((i) => i.isActive && !i.redeemedAt)
                    .map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#E8E2D9] text-xs shadow-2xs"
                      >
                        <div className="min-w-0">
                          <div className="font-mono font-bold tracking-wider text-charcoal-900 select-all">
                            {inv.displayCode}
                          </div>
                          <div className="text-[11px] text-charcoal-500 truncate">
                            {inv.recipientName || 'Unassigned Chauffeur'} {inv.recipientPhone ? `• ${inv.recipientPhone}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleCopy(inv.displayCode, inv.id)}
                            className="px-2.5 py-1 rounded-lg bg-warm-100 hover:bg-warm-200 text-charcoal-800 text-[11px] font-semibold flex items-center gap-1"
                          >
                            {copiedType === inv.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedType === inv.id ? 'Copied' : 'Copy'}</span>
                          </button>
                          <button
                            onClick={() => handleRevokeCode(inv.id)}
                            title="Revoke Invitation"
                            className="p-1 text-charcoal-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Assigned Drivers */}
            <div className="space-y-2 pt-2 border-t border-[#E8E2D9]/60">
              <div className="text-[11px] font-bold text-charcoal-500 uppercase tracking-wider">
                Assigned Fleet Chauffeurs ({assignedDrivers.length})
              </div>

              {assignedDrivers.length === 0 ? (
                <div className="p-3 text-center text-xs text-charcoal-400 border border-dashed border-[#E8E2D9] rounded-xl bg-white/50">
                  No drivers assigned yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {assignedDrivers.map((driver) => (
                    <div
                      key={driver.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#E8E2D9] text-xs shadow-2xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-charcoal-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{driver.fullName}</span>
                        </div>
                        <div className="text-[11px] text-charcoal-500">
                          {driver.assignedVehicle || 'No vehicle currently paired'} {driver.phoneNumber ? `• ${driver.phoneNumber}` : ''}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {driver.dutyStatus}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {toastMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs text-center font-semibold animate-in fade-in slide-in-from-top-1 shadow-xs">
              {toastMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#E8E2D9] bg-[#FDFBF7]/90 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-8 py-2.5 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white text-xs sm:text-sm font-semibold shadow-md transition-all active:scale-[0.98]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
