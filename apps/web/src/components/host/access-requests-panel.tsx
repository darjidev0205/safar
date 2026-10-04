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
  Filter,
  RefreshCw,
  Search,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { firestore, collection, query, where, onSnapshot } from '../../lib/firebase';

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
          // Re-fetch formatted relational records when any request changes
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
        // Optimistic local update
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
        // Optimistic local update
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
    <div className="bg-white rounded-3xl border border-[#E8E2D9] shadow-sm overflow-hidden space-y-5 p-5 sm:p-6">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E2D9] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-serif font-bold text-charcoal-900">
              Access Requests
            </h2>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-terracotta-600 text-white text-[11px] font-bold animate-pulse">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Approve or reject Driver and Guest access requests for your wedding events.
          </p>
        </div>

        <button
          onClick={() => fetchRequests()}
          className="self-start sm:self-auto p-2 rounded-xl border border-[#E8E2D9] text-charcoal-600 hover:bg-warm-50 text-xs flex items-center gap-1.5 transition-colors"
          title="Refresh requests"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Toast banner */}
      {toastMessage && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2 shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Role Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-warm-50 border border-[#E8E2D9] text-xs font-semibold">
          <button
            onClick={() => setRoleTab('ALL')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              roleTab === 'ALL'
                ? 'bg-charcoal-900 text-white shadow-xs'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            All Roles
          </button>
          <button
            onClick={() => setRoleTab('DRIVER')}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
              roleTab === 'DRIVER'
                ? 'bg-terracotta-600 text-white shadow-xs'
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
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Guests {guestPendingCount > 0 && `(${guestPendingCount})`}</span>
          </button>
        </div>

        {/* Status Filters & Search Input */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
            <input
              type="text"
              placeholder="Search requester..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-warm-50 border border-[#E8E2D9] text-xs text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-1 focus:ring-terracotta-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl bg-warm-50 border border-[#E8E2D9] text-xs font-semibold text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-terracotta-500"
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
          <span>Loading access requests…</span>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="py-12 px-4 text-center rounded-2xl bg-warm-50/60 border border-dashed border-[#E8E2D9] space-y-2">
          <ShieldCheck className="w-8 h-8 text-charcoal-300 mx-auto" />
          <h3 className="text-sm font-serif font-bold text-charcoal-700">No {statusFilter.toLowerCase()} requests</h3>
          <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
            {statusFilter === 'PENDING'
              ? 'When drivers or guests enter your event access codes, their pending requests will appear here in real time for approval.'
              : 'No access requests match your selected filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                req.status === 'PENDING'
                  ? 'bg-[#FCFAF6] border-warm-300 shadow-xs'
                  : req.status === 'APPROVED'
                  ? 'bg-white border-[#E8E2D9] opacity-90'
                  : 'bg-warm-50/50 border-[#E8E2D9] opacity-75'
              }`}
            >
              {/* User & Event Info */}
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                    req.role === 'DRIVER'
                      ? 'bg-terracotta-100 text-terracotta-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {req.role === 'DRIVER' ? <Car className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-charcoal-900">{req.userName}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        req.role === 'DRIVER'
                          ? 'bg-terracotta-50 text-terracotta-700 border border-terracotta-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {req.role}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        req.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : req.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {req.status === 'PENDING' ? '● Pending Approval' : req.status === 'APPROVED' ? '✓ Approved' : '✕ Rejected'}
                    </span>
                  </div>

                  <div className="text-xs text-charcoal-600 flex items-center gap-2 flex-wrap font-sans">
                    {req.userEmail && <span>{req.userEmail}</span>}
                    {req.userPhone && <span>&bull; {req.userPhone}</span>}
                    <span className="text-charcoal-400 font-mono text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(req.requestedAt)}
                    </span>
                  </div>

                  <div className="text-[11px] text-charcoal-500 pt-0.5">
                    Requested access to: <strong className="text-charcoal-800 font-serif">{req.eventName}</strong> ({req.eventCity})
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 sm:self-center shrink-0">
                {req.status === 'PENDING' ? (
                  <>
                    <button
                      onClick={() => handleApprove(req.id, req.userName)}
                      disabled={actionLoadingId === req.id}
                      className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{actionLoadingId === req.id ? 'Processing…' : 'Approve'}</span>
                    </button>
                    <button
                      onClick={() => handleReject(req.id, req.userName)}
                      disabled={actionLoadingId === req.id}
                      className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </>
                ) : req.status === 'APPROVED' ? (
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-1 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Access Active
                    </span>
                    <button
                      onClick={() => handleReject(req.id, req.userName)}
                      disabled={actionLoadingId === req.id}
                      className="px-2.5 py-1.5 rounded-xl text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 text-[11px] font-semibold transition-colors"
                      title="Revoke access"
                    >
                      Revoke
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 text-xs font-semibold flex items-center gap-1 border border-rose-200">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      Rejected
                    </span>
                    <button
                      onClick={() => handleApprove(req.id, req.userName)}
                      disabled={actionLoadingId === req.id}
                      className="px-2.5 py-1.5 rounded-xl text-charcoal-600 hover:text-emerald-700 hover:bg-emerald-50 text-[11px] font-semibold transition-colors"
                      title="Re-approve"
                    >
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
