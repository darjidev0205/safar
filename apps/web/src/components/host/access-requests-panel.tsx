'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldCheck,
  Car,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  UserX,
  RefreshCw,
  Search,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { firestore, collection, onSnapshot } from '../../lib/firebase';
import { StarFlourish } from '../ui/botanical-ornaments';

export interface AccessRequestItem {
  id: string;
  eventId: string;
  eventName: string;
  eventCity: string;
  eventStartDate: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  userPhone: string | null;
  userAvatarUrl: string | null;
  role: 'DRIVER' | 'GUEST';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string | null;
  requestedAt: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
}

export function AccessRequestsPanel({ eventId }: { eventId?: string }) {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<AccessRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleTab, setRoleTab] = useState<'ALL' | 'DRIVER' | 'GUEST'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isMounted = useRef(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchRequests = useCallback(async () => {
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('safar_auth_token') || profile?.email || ''
          : '';

      let url = '/api/events/access-requests';
      const params = new URLSearchParams();
      if (eventId) params.append('eventId', eventId);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (roleTab !== 'ALL') params.append('role', roleTab);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-user-id': profile?.id || '',
          'x-user-email': profile?.email || '',
          'x-user-uid': profile?.firebaseUid || '',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.requests) && isMounted.current) {
          setRequests(data.requests);
        }
      }
    } catch (err) {
      console.error('Error fetching access requests:', err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [profile, eventId, statusFilter, roleTab]);

  useEffect(() => {
    isMounted.current = true;
    fetchRequests();

    // 1. Realtime Firestore listener for Instant Zero-Refresh updates
    let unsubscribeFirestore: (() => void) | null = null;
    try {
      const colRef = collection(firestore, 'event_access_requests');
      unsubscribeFirestore = onSnapshot(
        colRef,
        () => {
          fetchRequests();
        },
        (err: any) => {
          console.warn('Firestore access requests listener note:', err);
        }
      );
    } catch (err: any) {
      console.warn('Firestore snapshot setup note:', err);
    }

    // 2. Periodic background poll
    const interval = setInterval(() => {
      fetchRequests();
    }, 10000);

    return () => {
      isMounted.current = false;
      if (unsubscribeFirestore) unsubscribeFirestore();
      clearInterval(interval);
    };
  }, [fetchRequests]);

  const handleApprove = async (requestId: string, userName: string) => {
    try {
      setActionLoadingId(requestId);
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('safar_auth_token') || profile?.email || ''
          : '';

      const res = await fetch(`/api/events/access-requests/${requestId}/approve`, {
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
        showToast(`Approved ${userName} successfully.`);
        setRequests((prev) =>
          prev.map((r) =>
            r.id === requestId
              ? { ...r, status: 'APPROVED', approvedAt: new Date().toISOString() }
              : r
          )
        );
      } else {
        alert(data.error?.message || 'Failed to approve request.');
      }
    } catch (err) {
      console.error('Error approving request:', err);
      alert('Network error while approving request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (requestId: string, userName: string) => {
    try {
      setActionLoadingId(requestId);
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('safar_auth_token') || profile?.email || ''
          : '';

      const res = await fetch(`/api/events/access-requests/${requestId}/reject`, {
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
        showToast(`Rejected request for ${userName}.`);
        setRequests((prev) =>
          prev.map((r) =>
            r.id === requestId
              ? { ...r, status: 'REJECTED', rejectedAt: new Date().toISOString() }
              : r
          )
        );
      } else {
        alert(data.error?.message || 'Failed to reject request.');
      }
    } catch (err) {
      console.error('Error rejecting request:', err);
      alert('Network error while rejecting request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (roleTab !== 'ALL' && r.role !== roleTab) return false;
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.userName.toLowerCase().includes(q);
      const matchEmail = r.userEmail?.toLowerCase().includes(q) || false;
      const matchEvent = r.eventName.toLowerCase().includes(q);
      return matchName || matchEmail || matchEvent;
    }
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const driverPendingCount = requests.filter((r) => r.status === 'PENDING' && r.role === 'DRIVER').length;
  const guestPendingCount = requests.filter((r) => r.status === 'PENDING' && r.role === 'GUEST').length;

  const formatTimeAgo = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.max(1, Math.floor(diffMs / 1000));
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E8E2D9] shadow-card overflow-hidden font-sans">
      {/* Panel Header */}
      <div className="px-6 py-4.5 border-b border-warm-200/80 bg-warm-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <StarFlourish className="w-3 h-3 text-gold-600" />
            <h3 className="font-serif font-bold text-base text-charcoal-900 tracking-tight">
              Access Requests
            </h3>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-terracotta-600 text-white text-[10px] font-bold uppercase tracking-wider animate-pulse">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="text-xs text-charcoal-500 font-sans mt-0.5">
            Manage real-time access requests from guests and chauffeurs for this celebration
          </p>
        </div>

        <button
          onClick={() => fetchRequests()}
          className="self-start sm:self-auto px-3.5 py-1.5 rounded-full border border-warm-300 bg-white hover:bg-warm-100/80 text-charcoal-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all"
          title="Refresh requests"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="p-5 sm:p-6 space-y-4">
        {/* Toast banner */}
        {toastMessage && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2 shadow-2xs animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Filter Controls Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#FDFBF7] border border-[#E8E2D9] text-xs font-semibold">
            <button
              onClick={() => setRoleTab('ALL')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                roleTab === 'ALL'
                  ? 'bg-charcoal-900 text-white shadow-2xs'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              All Roles
            </button>
            <button
              onClick={() => setRoleTab('DRIVER')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                roleTab === 'DRIVER'
                  ? 'bg-terracotta-600 text-white shadow-2xs'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Drivers {driverPendingCount > 0 && `(${driverPendingCount})`}</span>
            </button>
            <button
              onClick={() => setRoleTab('GUEST')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                roleTab === 'GUEST'
                  ? 'bg-sage-800 text-white shadow-2xs'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Guests {guestPendingCount > 0 && `(${guestPendingCount})`}</span>
            </button>
          </div>

          {/* Search field and Status Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
              <input
                type="text"
                placeholder="Search requester name, event..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-warm-50/70 border border-[#E8E2D9] text-xs text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-1 focus:ring-terracotta-500 font-sans"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-warm-50/70 border border-[#E8E2D9] text-xs font-semibold text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-terracotta-500 font-sans"
            >
              <option value="PENDING">Pending Only</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="ALL">All Statuses</option>
            </select>
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="py-12 text-center text-xs text-charcoal-500 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-terracotta-500 border-t-transparent rounded-full animate-spin" />
            <span>Verifying celebration access requests…</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-10 px-4 text-center rounded-2xl bg-[#FDFBF7] border border-dashed border-[#E8E2D9] space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-warm-100 border border-warm-200 flex items-center justify-center text-charcoal-400 mx-auto">
              <ShieldCheck className="w-5 h-5 text-gold-600" />
            </div>
            <h4 className="text-sm font-serif font-bold text-charcoal-800">
              No {statusFilter.toLowerCase()} requests
            </h4>
            <p className="text-xs text-charcoal-500 max-w-sm mx-auto font-sans leading-relaxed">
              {statusFilter === 'PENDING'
                ? 'When chauffeurs or guests submit your event passcodes, their pending requests will appear here for review.'
                : 'No access requests match your selected filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-0.5">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  req.status === 'PENDING'
                    ? 'bg-[#FDFBF7] border-warm-300/80 shadow-2xs'
                    : req.status === 'APPROVED'
                    ? 'bg-white border-[#E8E2D9]'
                    : 'bg-warm-50/40 border-[#E8E2D9] opacity-80'
                }`}
              >
                {/* User & Event Info */}
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                      req.role === 'DRIVER'
                        ? 'bg-terracotta-50 border-terracotta-200 text-terracotta-800'
                        : 'bg-sage-50 border-sage-200 text-sage-800'
                    }`}
                  >
                    {req.role === 'DRIVER' ? <Car className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-serif font-bold text-sm text-charcoal-900 truncate">
                        {req.userName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                          req.role === 'DRIVER'
                            ? 'bg-terracotta-50 text-terracotta-700 border border-terracotta-200'
                            : 'bg-sage-50 text-sage-700 border border-sage-200'
                        }`}
                      >
                        {req.role}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-900'
                            : req.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-rose-100 text-rose-900'
                        }`}
                      >
                        {req.status === 'PENDING' ? '● Pending' : req.status === 'APPROVED' ? '✓ Approved' : '✕ Rejected'}
                      </span>
                    </div>

                    <div className="text-xs text-charcoal-600 flex items-center gap-2 flex-wrap font-sans">
                      {req.userEmail && <span className="truncate max-w-[200px]">{req.userEmail}</span>}
                      {req.userPhone && <span>&bull; {req.userPhone}</span>}
                      <span className="text-charcoal-400 font-mono text-[11px] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(req.requestedAt)}
                      </span>
                    </div>

                    <div className="text-[11px] text-charcoal-500 pt-0.5 truncate">
                      Requested access to: <strong className="text-charcoal-800 font-serif">{req.eventName}</strong> ({req.eventCity})
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 sm:self-center shrink-0">
                  {req.status === 'PENDING' ? (
                    <>
                      <button
                        onClick={() => handleApprove(req.id, req.userName)}
                        disabled={actionLoadingId === req.id}
                        className="flex-1 sm:flex-initial px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs flex items-center justify-center gap-1.5 transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{actionLoadingId === req.id ? 'Approving…' : 'Approve'}</span>
                      </button>
                      <button
                        onClick={() => handleReject(req.id, req.userName)}
                        disabled={actionLoadingId === req.id}
                        className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-full border border-warm-300 bg-white hover:bg-warm-100 text-charcoal-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </>
                  ) : req.status === 'APPROVED' ? (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-1 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Access Active</span>
                      </span>
                      <button
                        onClick={() => handleReject(req.id, req.userName)}
                        disabled={actionLoadingId === req.id}
                        className="px-2.5 py-1 rounded-full text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 text-[11px] font-semibold transition-colors"
                        title="Revoke access"
                      >
                        Revoke
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-semibold flex items-center gap-1 border border-rose-200">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Rejected</span>
                      </span>
                      <button
                        onClick={() => handleApprove(req.id, req.userName)}
                        disabled={actionLoadingId === req.id}
                        className="px-2.5 py-1 rounded-full text-charcoal-600 hover:text-emerald-700 hover:bg-emerald-50 text-[11px] font-semibold transition-colors"
                        title="Re-approve"
                      >
                        Re-approve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
