'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  UserPlus,
  Search,
  Download,
  FileSpreadsheet,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  Check,
  Phone,
  Mail,
  Filter,
  Home,
  Car,
  MapPin,
  Building,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Eye,
  Calendar,
  Table as TableIcon,
} from 'lucide-react';
import { GuestExcelImportModal } from '../../../components/host/guest-excel-import-modal';
import { GuestManualModal } from '../../../components/host/guest-manual-modal';
import { useAuth } from '../../../context/auth-context';
import { StarFlourish, MarigoldFlower, OliveBranch } from '../../../components/ui/botanical-ornaments';
import { SafarBadge, SafarButton, SafarEmptyState } from '../../../components/ui/safar-design-system';
import Link from 'next/link';

export interface EventGuestRow {
  id: string;
  eventGuestId: string | null;
  eventId: string;
  fullName: string;
  familyName: string;
  familyId: string | null;
  relation: string;
  phoneNumber: string;
  email: string;
  memberCount: number;
  category: string;
  pickupLocation: string;
  dropLocation: string;
  hotelRoom: string;
  specialRequirements: string;
  notes: string;
  status: string;
  assignedVehicle: string | null;
  assignedDriver: string | null;
  tripStatus: string | null;
  createdAt: string;
}

export default function HostGuestsPage() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const initialEventId = searchParams.get('eventId');

  // Events List for Selector
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId || '');
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  // Guests & Real Stats
  const [guests, setGuests] = useState<EventGuestRow[]>([]);
  const [familiesList, setFamiliesList] = useState<string[]>([]);
  const [stats, setStats] = useState({
    totalGuests: 0,
    familyCount: 0,
    assignedCount: 0,
    pendingCount: 0,
    vehiclesAssigned: 0,
    driversAssigned: 0,
  });

  // UI View Mode: 'table' or 'families'
  const [viewMode, setViewMode] = useState<'table' | 'families'>('table');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedTransport, setSelectedTransport] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<EventGuestRow | null>(null);
  const [viewingGuest, setViewingGuest] = useState<EventGuestRow | null>(null);
  const [deletingGuest, setDeletingGuest] = useState<EventGuestRow | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Fetch Events List
  useEffect(() => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('safar_auth_token') || profile?.email || ''
        : '';

    fetch('/api/events', {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-user-id': profile?.id || '',
        'x-user-email': profile?.email || '',
        'x-user-uid': profile?.firebaseUid || '',
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.events)) {
          setEvents(data.events);
          if (!selectedEventId && data.events.length > 0) {
            setSelectedEventId(data.events[0].id);
            setSelectedEvent(data.events[0]);
          } else if (selectedEventId) {
            const match = data.events.find((e: any) => e.id === selectedEventId);
            if (match) setSelectedEvent(match);
          }
        }
      })
      .catch((err) => console.error('Error fetching events list:', err));
  }, [selectedEventId, profile]);

  // 2. Fetch Guests strictly scoped to this selected event
  const fetchEventGuests = useCallback(async () => {
    if (!selectedEventId) {
      setGuests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('safar_auth_token') || profile?.email || ''
          : '';

      const queryParams = new URLSearchParams();
      if (search.trim()) queryParams.set('search', search.trim());
      if (selectedFamily !== 'ALL') queryParams.set('family', selectedFamily);
      if (selectedCategory !== 'ALL') queryParams.set('category', selectedCategory);
      if (selectedTransport !== 'ALL') queryParams.set('transport', selectedTransport);

      const res = await fetch(`/api/events/${selectedEventId}/guests?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-user-id': profile?.id || '',
          'x-user-email': profile?.email || '',
          'x-user-uid': profile?.firebaseUid || '',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setGuests(data.guests || []);
          if (data.stats) setStats(data.stats);
          if (data.families) setFamiliesList(data.families);
        }
      }
    } catch (err) {
      console.error('Error fetching event guests:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId, search, selectedFamily, selectedCategory, selectedTransport, profile]);

  useEffect(() => {
    fetchEventGuests();
  }, [fetchEventGuests]);

  const handleEventChange = (newId: string) => {
    setSelectedEventId(newId);
    const match = events.find((e) => e.id === newId);
    if (match) setSelectedEvent(match);
  };

  const handleDownloadTemplate = () => {
    if (!selectedEventId) return;
    window.open(`/api/events/${selectedEventId}/guests/template`, '_blank');
  };

  const handleDeleteGuest = async () => {
    if (!deletingGuest || !selectedEventId) return;

    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('safar_auth_token') || profile?.email || ''
          : '';

      const res = await fetch(`/api/events/${selectedEventId}/guests/${deletingGuest.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-user-id': profile?.id || '',
          'x-user-email': profile?.email || '',
          'x-user-uid': profile?.firebaseUid || '',
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Removed "${deletingGuest.fullName}" from guest roster.`);
        setDeletingGuest(null);
        fetchEventGuests();
      } else {
        showToast(data?.error?.message || 'Failed to remove guest');
      }
    } catch (err) {
      showToast('Error removing guest.');
    }
  };

  // Grouped by Family for Family Structure View
  const familyGroups = useMemo(() => {
    const map: Record<string, EventGuestRow[]> = {};
    guests.forEach((g) => {
      const fam = g.familyName || 'Independent Guests';
      if (!map[fam]) map[fam] = [];
      map[fam].push(g);
    });
    return map;
  }, [guests]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-full bg-charcoal-900 text-warm-50 text-xs font-semibold shadow-xl flex items-center gap-2 animate-in slide-in-from-top-3 border border-warm-300">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Event Selector */}
      <div className="p-6 md:p-8 rounded-3xl bg-white/95 border border-warm-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 font-sans">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-warm-100 text-charcoal-800 border border-warm-300/80">
              <StarFlourish className="w-2 h-2 text-gold-600 inline mr-1" />
              Guest Mobility Manifest
            </span>
            {selectedEvent && (
              <span className="text-xs text-charcoal-400 font-medium">
                {selectedEvent.city} • {selectedEvent.eventType || 'Event'}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-charcoal-900 tracking-tight">
            Guest & Family Management
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-600 max-w-xl font-sans">
            Guests imported here are strictly associated with the selected ceremony. Each function maintains its dedicated guest list and pickup logistics.
          </p>
        </div>

        {/* Action Buttons: Template, Excel Upload, Manual Add */}
        <div className="flex flex-wrap items-center gap-2.5 font-sans">
          <button
            onClick={handleDownloadTemplate}
            disabled={!selectedEventId}
            className="px-4 py-2 rounded-full bg-warm-50 hover:bg-warm-100 text-charcoal-700 text-xs font-bold border border-warm-300 shadow-2xs flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="Download formatted Excel spreadsheet template"
          >
            <Download className="w-4 h-4 text-terracotta-600" />
            <span>Excel Template</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            disabled={!selectedEventId}
            className="px-4 py-2 rounded-full bg-warm-100 hover:bg-warm-200 text-charcoal-900 text-xs font-bold border border-warm-300/80 shadow-2xs flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-terracotta-600" />
            <span>Upload Excel</span>
          </button>

          <button
            onClick={() => {
              setEditingGuest(null);
              setIsManualModalOpen(true);
            }}
            disabled={!selectedEventId}
            className="px-5 py-2 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4 text-gold-400" />
            <span>Add Guest Manually</span>
          </button>
        </div>
      </div>

      {/* Function / Event Selection Bar */}
      <div className="p-4 rounded-2xl bg-warm-50/80 border border-warm-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-charcoal-700 uppercase tracking-wider whitespace-nowrap">
            Selected Function:
          </span>
          <select
            value={selectedEventId}
            onChange={(e) => handleEventChange(e.target.value)}
            className="px-4 py-2 rounded-full border border-warm-300 bg-white text-xs font-bold text-charcoal-900 focus:ring-2 focus:ring-terracotta-500/30 focus:border-terracotta-500 focus:outline-none shadow-2xs"
          >
            {events.length === 0 && <option value="">No events found</option>}
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.eventType || 'Event'}) — {ev.city}
              </option>
            ))}
          </select>
        </div>

        {/* View Mode Toggle: Table View vs Family Structure */}
        <div className="flex items-center gap-1 self-start sm:self-auto bg-white/90 p-1 rounded-full border border-warm-300 shadow-2xs">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'table'
                ? 'bg-charcoal-900 text-white shadow-2xs'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Guest Table</span>
          </button>
          <button
            onClick={() => setViewMode('families')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'families'
                ? 'bg-charcoal-900 text-white shadow-2xs'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Family Units ({Object.keys(familyGroups).length})</span>
          </button>
        </div>
      </div>

      {/* Real-time Event Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-white/95 border border-warm-200/90 shadow-2xs">
          <span className="text-[10px] font-bold text-charcoal-400 uppercase block font-sans">Total Guests</span>
          <div className="text-xl font-bold font-serif text-charcoal-900 mt-0.5">{stats.totalGuests}</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white/95 border border-warm-200/90 shadow-2xs">
          <span className="text-[10px] font-bold text-charcoal-400 uppercase block font-sans">Families</span>
          <div className="text-xl font-bold font-serif text-terracotta-700 mt-0.5">{stats.familyCount}</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white/95 border border-warm-200/90 shadow-2xs">
          <span className="text-[10px] font-bold text-charcoal-400 uppercase block font-sans">Guests Assigned</span>
          <div className="text-xl font-bold font-serif text-sage-800 mt-0.5">{stats.assignedCount}</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white/95 border border-warm-200/90 shadow-2xs">
          <span className="text-[10px] font-bold text-charcoal-400 uppercase block font-sans">Guests Pending</span>
          <div className="text-xl font-bold font-serif text-burgundy-700 mt-0.5">{stats.pendingCount}</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white/95 border border-warm-200/90 shadow-2xs">
          <span className="text-[10px] font-bold text-charcoal-400 uppercase block font-sans">Vehicles Assigned</span>
          <div className="text-xl font-bold font-serif text-gold-700 mt-0.5">{stats.vehiclesAssigned}</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white/95 border border-warm-200/90 shadow-2xs">
          <span className="text-[10px] font-bold text-charcoal-400 uppercase block font-sans">Chauffeurs Active</span>
          <div className="text-xl font-bold font-serif text-charcoal-900 mt-0.5">{stats.driversAssigned}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white/95 border border-warm-200/90 shadow-2xs flex flex-wrap items-center gap-3 font-sans">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by guest name, mobile, email, or family..."
            className="w-full pl-10 pr-3.5 py-2 text-xs rounded-full border border-warm-300 bg-warm-50/50 text-charcoal-900 placeholder:text-charcoal-400 focus:ring-2 focus:ring-terracotta-500/30 focus:border-terracotta-500 focus:outline-none"
          />
        </div>

        {/* Filter by Family */}
        <div className="flex items-center gap-1.5 text-xs text-charcoal-600">
          <Filter className="w-3.5 h-3.5 text-charcoal-400" />
          <select
            value={selectedFamily}
            onChange={(e) => setSelectedFamily(e.target.value)}
            className="px-3 py-2 rounded-full border border-warm-300 bg-white text-xs font-semibold focus:ring-2 focus:ring-terracotta-500/30 focus:outline-none"
          >
            <option value="ALL">All Families</option>
            {familiesList.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Category */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 rounded-full border border-warm-300 bg-white text-xs font-semibold focus:ring-2 focus:ring-terracotta-500/30 focus:outline-none"
        >
          <option value="ALL">All Categories</option>
          <option value="Family">Immediate Family</option>
          <option value="VIP">VIP Dignitaries</option>
          <option value="Friend">Friends</option>
          <option value="General">General Attendees</option>
        </select>

        {/* Filter by Transport */}
        <select
          value={selectedTransport}
          onChange={(e) => setSelectedTransport(e.target.value)}
          className="px-3 py-2 rounded-full border border-warm-300 bg-white text-xs font-semibold focus:ring-2 focus:ring-terracotta-500/30 focus:outline-none"
        >
          <option value="ALL">All Transport Status</option>
          <option value="ASSIGNED">Vehicle Allocated</option>
          <option value="PENDING">Pending Allocation</option>
          <option value="REQUIRED">Pickup / Drop Required</option>
        </select>
      </div>

      {/* EMPTY STATE */}
      {guests.length === 0 && !loading && (
        <SafarEmptyState
          title="No Guests on Manifest Yet"
          description={`Upload your guest Excel spreadsheet or add guests manually to configure transportation for ${selectedEvent?.name || 'this ceremony'}.`}
          actionText="Add First Guest"
          onAction={() => {
            setEditingGuest(null);
            setIsManualModalOpen(true);
          }}
        />
      )}

      {/* VIEW MODE 1: GUEST TABLE */}
      {viewMode === 'table' && guests.length > 0 && (
        <div className="bg-white/95 rounded-3xl border border-warm-200/90 overflow-hidden shadow-2xs font-sans">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-warm-100/50 border-b border-warm-200/80 text-[10px] font-bold text-charcoal-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Family</th>
                  <th className="px-4 py-3.5">Guest Name</th>
                  <th className="px-4 py-3.5">Mobile</th>
                  <th className="px-4 py-3.5 text-center">Members</th>
                  <th className="px-4 py-3.5">Pickup</th>
                  <th className="px-4 py-3.5">Drop</th>
                  <th className="px-4 py-3.5">Hotel</th>
                  <th className="px-4 py-3.5">Transport</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {guests.map((g) => (
                  <tr key={g.id} className="hover:bg-warm-50/50 transition-colors">
                    {/* Family */}
                    <td className="px-4 py-3 font-semibold text-charcoal-800">
                      <div className="flex items-center gap-1.5">
                        <Home className="w-3.5 h-3.5 text-gold-600" />
                        <span>{g.familyName}</span>
                      </div>
                      <span className="text-[10px] text-charcoal-400 font-normal pl-5 block">
                        {g.relation}
                      </span>
                    </td>

                    {/* Guest Name & Category */}
                    <td className="px-4 py-3 font-bold text-charcoal-900">
                      <div className="flex items-center gap-2">
                        <span>{g.fullName}</span>
                        {g.category === 'VIP' && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-amber-50 text-gold-700 border border-gold-300">
                            VIP
                          </span>
                        )}
                      </div>
                      {g.email && (
                        <span className="text-[10px] text-charcoal-500 font-normal block truncate max-w-[140px]">
                          {g.email}
                        </span>
                      )}
                    </td>

                    {/* Mobile */}
                    <td className="px-4 py-3 text-charcoal-600 font-mono text-[11px]">
                      {g.phoneNumber || '—'}
                    </td>

                    {/* Members */}
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-charcoal-800 bg-warm-100 px-2 py-0.5 rounded-md text-[11px]">
                        {g.memberCount}
                      </span>
                    </td>

                    {/* Pickup */}
                    <td className="px-4 py-3 text-charcoal-600 truncate max-w-[130px]">
                      {g.pickupLocation || '—'}
                    </td>

                    {/* Drop */}
                    <td className="px-4 py-3 text-charcoal-600 truncate max-w-[130px]">
                      {g.dropLocation || '—'}
                    </td>

                    {/* Hotel */}
                    <td className="px-4 py-3 text-charcoal-600 truncate max-w-[130px]">
                      {g.hotelRoom || '—'}
                    </td>

                    {/* Transport Assignment */}
                    <td className="px-4 py-3">
                      {g.assignedVehicle ? (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-sage-800 bg-sage-50 px-2.5 py-0.5 rounded-full border border-sage-200">
                          <Car className="w-3 h-3 text-sage-700" />
                          <span className="truncate max-w-[110px]">{g.assignedVehicle}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-medium text-charcoal-400">
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-warm-100 text-charcoal-800 border border-warm-200">
                        {g.status}
                      </span>
                    </td>

                    {/* Actions: View, Edit, Remove */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingGuest(g)}
                          className="p-1.5 rounded-full text-charcoal-400 hover:text-charcoal-800 hover:bg-warm-100"
                          title="View Guest Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingGuest(g);
                            setIsManualModalOpen(true);
                          }}
                          className="p-1.5 rounded-full text-charcoal-400 hover:text-charcoal-800 hover:bg-warm-100"
                          title="Edit Guest"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingGuest(g)}
                          className="p-1.5 rounded-full text-burgundy-600 hover:text-burgundy-800 hover:bg-burgundy-50"
                          title="Remove Guest"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: FAMILY STRUCTURE VIEW */}
      {viewMode === 'families' && guests.length > 0 && (
        <div className="space-y-4 font-sans">
          <div className="text-xs text-charcoal-500 font-medium">
            Showing guests grouped by registered family units. Each family coordinates arrival and vehicle allocation collectively.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(familyGroups).map(([familyName, members]) => {
              const totalMembers = members.reduce((sum, m) => sum + (m.memberCount || 1), 0);

              return (
                <div
                  key={familyName}
                  className="p-5 rounded-3xl bg-white/95 border border-warm-200/90 shadow-2xs hover:shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-warm-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-warm-100/90 border border-warm-200 text-terracotta-700 flex items-center justify-center font-bold">
                        <Home className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-serif font-bold text-charcoal-900">{familyName}</h3>
                        <span className="text-[11px] text-charcoal-500 font-medium">
                          {members[0]?.relation || 'Family Party'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-charcoal-900 block font-serif">
                        {totalMembers} Total Members
                      </span>
                      <span className="text-[10px] text-charcoal-500">
                        {members.length} individual guest records
                      </span>
                    </div>
                  </div>

                  {/* Family Members List */}
                  <div className="space-y-2">
                    {members.map((m) => (
                      <div
                        key={m.id}
                        className="p-2.5 rounded-2xl bg-warm-50/70 border border-warm-200/70 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-charcoal-900 flex items-center gap-1.5">
                            <span>{m.fullName}</span>
                            <span className="text-[10px] text-charcoal-500 font-normal">
                              ({m.memberCount} pax)
                            </span>
                          </div>
                          <div className="text-[11px] text-charcoal-500 flex items-center gap-2 mt-0.5">
                            <span>{m.phoneNumber}</span>
                            {m.hotelRoom && <span>• Hotel: {m.hotelRoom}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {m.assignedVehicle ? (
                            <span className="text-[10px] font-bold text-sage-800 bg-sage-50 px-2.5 py-0.5 rounded-full border border-sage-200 flex items-center gap-1">
                              <Car className="w-3 h-3 text-sage-700" />
                              Assigned
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-gold-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-gold-300">
                              Vehicle Pending
                            </span>
                          )}

                          <button
                            onClick={() => {
                              setEditingGuest(m);
                              setIsManualModalOpen(true);
                            }}
                            className="p-1 rounded text-charcoal-400 hover:text-charcoal-700"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-warm-200 shadow-2xl max-w-sm w-full p-6 space-y-4 font-sans">
            <div className="w-12 h-12 rounded-2xl bg-burgundy-50 border border-burgundy-200 text-burgundy-700 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-charcoal-900">Remove Guest?</h3>
              <p className="text-xs text-charcoal-600 mt-1">
                Are you sure you want to remove <span className="font-bold text-charcoal-800">{deletingGuest.fullName}</span> from this ceremony manifest?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeletingGuest(null)}
                className="px-4 py-2 rounded-full border border-warm-300 text-xs font-semibold text-charcoal-700 hover:bg-warm-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGuest}
                className="px-4 py-2 rounded-full bg-burgundy-800 hover:bg-burgundy-900 text-white text-xs font-bold shadow-xs"
              >
                Remove Guest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guest Details View Modal */}
      {viewingGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs animate-in fade-in font-sans">
          <div className="bg-white rounded-3xl border border-warm-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-warm-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta-700">
                  Guest Profile
                </span>
                <h3 className="text-lg font-serif font-bold text-charcoal-900 mt-0.5">{viewingGuest.fullName}</h3>
              </div>
              <button
                onClick={() => setViewingGuest(null)}
                className="p-1.5 rounded-full text-charcoal-400 hover:text-charcoal-700 hover:bg-warm-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-warm-50/70 border border-warm-200">
                <div>
                  <span className="text-[10px] text-charcoal-400 uppercase font-semibold block">Family</span>
                  <span className="font-bold text-charcoal-800">{viewingGuest.familyName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-charcoal-400 uppercase font-semibold block">Relation</span>
                  <span className="font-bold text-charcoal-800">{viewingGuest.relation}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-charcoal-400 uppercase font-semibold block">Mobile</span>
                  <span className="font-mono text-charcoal-800">{viewingGuest.phoneNumber || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-charcoal-400 uppercase font-semibold block">Party Size</span>
                  <span className="font-bold text-charcoal-800">{viewingGuest.memberCount} Members</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-charcoal-400 uppercase font-semibold block">Pickup Location</span>
                <span className="text-charcoal-800">{viewingGuest.pickupLocation || 'None specified'}</span>
              </div>

              <div>
                <span className="text-[10px] text-charcoal-400 uppercase font-semibold block">Drop Location</span>
                <span className="text-charcoal-800">{viewingGuest.dropLocation || 'None specified'}</span>
              </div>

              <div>
                <span className="text-[10px] text-charcoal-400 uppercase font-semibold block">Hotel & Room</span>
                <span className="text-charcoal-800">{viewingGuest.hotelRoom || 'None specified'}</span>
              </div>

              {viewingGuest.specialRequirements && (
                <div className="p-3 rounded-2xl bg-amber-50/80 text-amber-900 border border-gold-300">
                  <span className="text-[10px] font-bold uppercase block">Special Requirements:</span>
                  <span className="text-xs">{viewingGuest.specialRequirements}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-warm-100 flex justify-end">
              <button
                onClick={() => setViewingGuest(null)}
                className="px-5 py-2 rounded-full bg-charcoal-900 text-white text-xs font-semibold hover:bg-charcoal-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {selectedEventId && (
        <GuestExcelImportModal
          isOpen={isImportModalOpen}
          eventId={selectedEventId}
          eventName={selectedEvent?.name || 'Selected Event'}
          onClose={() => setIsImportModalOpen(false)}
          onImportSuccess={() => {
            showToast('Guest Excel import completed successfully!');
            fetchEventGuests();
          }}
        />
      )}

      {/* Manual Guest Modal (Add or Edit) */}
      {selectedEventId && (
        <GuestManualModal
          isOpen={isManualModalOpen}
          eventId={selectedEventId}
          guest={editingGuest}
          onClose={() => {
            setIsManualModalOpen(false);
            setEditingGuest(null);
          }}
          onSaved={() => {
            showToast(editingGuest ? 'Guest updated successfully.' : 'Guest added successfully.');
            fetchEventGuests();
          }}
        />
      )}
    </div>
  );
}
