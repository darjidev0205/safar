'use client';

import React, { useState, useEffect } from 'react';
import {
  Route,
  Plus,
  ArrowRight,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  AlertCircle,
  Check,
  Search,
  Filter,
  Clock,
  Car,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { StatusBadge } from '../../../components/ui/status-badge';
import { SafarButton } from '../../../components/ui/safar-design-system';

export interface TripRecord {
  id: string;
  time: string;
  date: string;
  origin: string;
  dest: string;
  vehicle: string;
  driver: string;
  status: 'SCHEDULED' | 'ASSIGNED' | 'EN_ROUTE_TO_PICKUP' | 'ARRIVED_AT_PICKUP' | 'ON_TRIP' | 'COMPLETED' | 'CANCELLED';
  passengers: number;
  capacity?: number;
  notes?: string;
}

export default function HostTripsPage() {
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [editingTrip, setEditingTrip] = useState<TripRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState<TripRecord | null>(null);

  // Available vehicles & drivers for dropdowns
  const [availableVehicles, setAvailableVehicles] = useState<string[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('safar_host_trips');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTrips(parsed);
          }
        } catch (e) {}
      } else {
        const initialTrips: TripRecord[] = [
          { id: 'tr_1', date: '2026-11-14', time: '08:30 AM', origin: 'The Grand Hotel', dest: 'The Celebration Venue', vehicle: 'Force Urbania (GJ 01 AB 1234)', driver: 'Rohit Sharma', status: 'EN_ROUTE_TO_PICKUP', passengers: 12, capacity: 16 },
          { id: 'tr_2', date: '2026-11-14', time: '09:15 AM', origin: 'The Grand Hotel', dest: 'The Celebration Venue', vehicle: 'Innova Crysta (GJ 02 CD 5678)', driver: 'Amit Patel', status: 'ASSIGNED', passengers: 6, capacity: 6 },
          { id: 'tr_3', date: '2026-11-14', time: '10:00 AM', origin: 'The Grand Hotel', dest: 'The Celebration Venue', vehicle: 'Honda City (GJ 03 EF 9012)', driver: 'Suresh Kumar', status: 'SCHEDULED', passengers: 4, capacity: 4 },
          { id: 'tr_4', date: '2026-11-14', time: '11:30 AM', origin: 'The Celebration Venue', dest: 'The Grand Hotel', vehicle: 'Force Urbania (GJ 01 AB 1234)', driver: 'Rohit Sharma', status: 'SCHEDULED', passengers: 14, capacity: 16 },
          { id: 'tr_5', date: '2026-11-14', time: '01:00 PM', origin: 'Ahmedabad Airport (AMD)', dest: 'The Grand Hotel', vehicle: 'Innova Crysta (GJ 02 CD 5678)', driver: 'Amit Patel', status: 'SCHEDULED', passengers: 5, capacity: 6 },
        ];
        setTrips(initialTrips);
        localStorage.setItem('safar_host_trips', JSON.stringify(initialTrips));
      }

      // Populate driver and vehicle suggestions from fleet
      const storedVehicles = localStorage.getItem('safar_host_vehicles');
      if (storedVehicles) {
        try {
          const vList = JSON.parse(storedVehicles);
          if (Array.isArray(vList)) {
            setAvailableVehicles(vList.map((v) => `${v.model} (${v.plate})`));
          }
        } catch (e) {}
      }

      const storedDrivers = localStorage.getItem('safar_host_drivers');
      if (storedDrivers) {
        try {
          const dList = JSON.parse(storedDrivers);
          if (Array.isArray(dList)) {
            setAvailableDrivers(dList.map((d) => d.name));
          }
        } catch (e) {}
      }
    }
  }, []);

  const saveTrips = (updated: TripRecord[]) => {
    setTrips(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('safar_host_trips', JSON.stringify(updated));
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Conflict detection helper
  const detectConflict = (trip: TripRecord) => {
    return trips.find(
      (t) =>
        t.id !== trip.id &&
        t.date === trip.date &&
        t.time === trip.time &&
        ((t.driver && trip.driver && t.driver === trip.driver) ||
          (t.vehicle && trip.vehicle && t.vehicle === trip.vehicle))
    );
  };

  const filteredTrips = trips.filter((t) => {
    const q = search.toLowerCase().trim();
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    if (!matchesStatus) return false;
    if (!q) return true;
    return (
      t.origin.toLowerCase().includes(q) ||
      t.dest.toLowerCase().includes(q) ||
      t.driver.toLowerCase().includes(q) ||
      t.vehicle.toLowerCase().includes(q) ||
      t.time.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-charcoal-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-in slide-in-from-top-3 border border-warm-300">
          <Check className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-gold-100/70 text-gold-900 border border-gold-200/60 font-sans">
              Fleet Scheduling
            </span>
            <span className="text-xs text-charcoal-400 font-sans">Live Conflict Guard Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal-900 tracking-tight">
            Trips Dispatch Board
          </h1>
          <p className="text-xs text-charcoal-500 mt-1 max-w-2xl font-sans leading-relaxed">
            Real-time shuttle run schedules, chauffeur allocations, and automated conflict detection across all celebrations.
          </p>
        </div>

        <SafarButton
          variant="primary"
          size="sm"
          onClick={() => {
            setEditingTrip({
              id: `tr_${Date.now()}`,
              date: '2026-11-14',
              time: '02:00 PM',
              origin: 'The Grand Hotel',
              dest: 'The Celebration Venue',
              vehicle: availableVehicles[0] || 'Tempo Traveller',
              driver: availableDrivers[0] || 'Rohit Sharma',
              status: 'SCHEDULED',
              passengers: 0,
              capacity: 6,
            });
            setIsEditModalOpen(true);
          }}
          className="self-start sm:self-center"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Schedule Run</span>
        </SafarButton>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-2xl border border-warm-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-warm-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-warm-50/50">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
              <input
                type="text"
                placeholder="Search by route, driver, vehicle, or time..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-warm-200 bg-white focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-warm-200 bg-white text-xs text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-terracotta-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="EN_ROUTE_TO_PICKUP">En Route</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="text-xs text-charcoal-500 font-sans font-medium">
            Showing <strong>{filteredTrips.length}</strong> of <strong>{trips.length}</strong> Scheduled Runs
          </div>
        </div>

        {/* Trips Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-warm-200 bg-warm-50 text-[11px] font-semibold text-charcoal-600 uppercase tracking-wider">
                <th className="py-3 px-6">Departure Time</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Chauffeur</th>
                <th className="py-3 px-4 text-center">Passengers</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100 text-xs">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-charcoal-400 text-xs font-sans">
                    No scheduled runs found. Click &ldquo;+ Schedule Run&rdquo; to add a shuttle trip.
                  </td>
                </tr>
              ) : (
                filteredTrips.map((t) => (
                  <tr key={t.id} className="hover:bg-warm-50/50 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-charcoal-900">
                      <div>{t.time}</div>
                      <div className="text-[10px] text-charcoal-400 font-normal">{t.date}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-charcoal-700">
                      <div className="flex items-center gap-1.5">
                        <span>{t.origin}</span>
                        <ArrowRight className="w-3 h-3 text-charcoal-400" />
                        <span>{t.dest}</span>
                      </div>
                      {t.notes && <div className="text-[10px] text-charcoal-400 italic mt-0.5">{t.notes}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-charcoal-700">{t.vehicle}</td>
                    <td className="py-3.5 px-4 font-semibold text-charcoal-900">{t.driver}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-charcoal-800">
                      {t.passengers} {t.capacity ? `/ ${t.capacity}` : ''}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={t.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTrip({ ...t });
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 text-charcoal-500 hover:text-terracotta-700 rounded-lg hover:bg-warm-100 transition-colors"
                          title="Edit Trip"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingTrip(t)}
                          className="p-1.5 text-charcoal-400 hover:text-burgundy-700 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Cancel/Delete Trip"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Schedule Trip Modal with Conflict Detection */}
      {isEditModalOpen && editingTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-warm-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-warm-100 pb-3">
              <h3 className="font-serif font-bold text-base text-charcoal-900">
                {trips.some((t) => t.id === editingTrip.id) ? 'Edit Shuttle Run' : 'Schedule Shuttle Run'}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-charcoal-400 hover:text-charcoal-700 rounded-lg p-1 hover:bg-warm-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Departure Date *</label>
                  <input
                    type="date"
                    required
                    value={editingTrip.date}
                    onChange={(e) => setEditingTrip({ ...editingTrip, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-warm-200 text-xs focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Departure Time *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 08:30 AM"
                    value={editingTrip.time}
                    onChange={(e) => setEditingTrip({ ...editingTrip, time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-warm-200 text-xs focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Origin / Pickup *</label>
                  <input
                    type="text"
                    required
                    placeholder="Pickup venue"
                    value={editingTrip.origin}
                    onChange={(e) => setEditingTrip({ ...editingTrip, origin: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-warm-200 text-xs focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Destination / Drop *</label>
                  <input
                    type="text"
                    required
                    placeholder="Drop destination"
                    value={editingTrip.dest}
                    onChange={(e) => setEditingTrip({ ...editingTrip, dest: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-warm-200 text-xs focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Assign Chauffeur</label>
                  <select
                    value={editingTrip.driver}
                    onChange={(e) => setEditingTrip({ ...editingTrip, driver: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-warm-200 text-xs focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                  >
                    <option value="">-- Select Driver --</option>
                    {availableDrivers.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Assign Vehicle</label>
                  <select
                    value={editingTrip.vehicle}
                    onChange={(e) => setEditingTrip({ ...editingTrip, vehicle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-warm-200 text-xs focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                  >
                    <option value="">-- Select Vehicle --</option>
                    {availableVehicles.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Run Status</label>
                  <select
                    value={editingTrip.status}
                    onChange={(e) => setEditingTrip({ ...editingTrip, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-warm-200 text-xs focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                  >
                    <option value="SCHEDULED">SCHEDULED</option>
                    <option value="ASSIGNED">ASSIGNED</option>
                    <option value="EN_ROUTE_TO_PICKUP">EN_ROUTE_TO_PICKUP</option>
                    <option value="ARRIVED_AT_PICKUP">ARRIVED_AT_PICKUP</option>
                    <option value="ON_TRIP">ON_TRIP</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Booked Passengers</label>
                  <input
                    type="number"
                    min={0}
                    value={editingTrip.passengers}
                    onChange={(e) => setEditingTrip({ ...editingTrip, passengers: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-warm-200 text-xs focus:ring-2 focus:ring-terracotta-500 focus:outline-none text-center"
                  />
                </div>
              </div>

              {/* Conflict Warning Banner */}
              {(() => {
                const conflict = detectConflict(editingTrip);
                if (conflict) {
                  return (
                    <div className="p-3.5 rounded-2xl bg-gold-50/80 border border-gold-200 text-gold-900 text-xs flex items-start gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-gold-700 shrink-0 mt-0.5" />
                      <div>
                        <strong>Schedule Conflict Detected:</strong>{' '}
                        {conflict.driver === editingTrip.driver
                          ? `Driver ${editingTrip.driver} is already assigned to a run departing at ${conflict.time}.`
                          : `Vehicle ${editingTrip.vehicle} is already assigned to a run departing at ${conflict.time}.`}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-warm-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-warm-200 text-xs font-semibold text-charcoal-600 hover:bg-warm-50"
              >
                Cancel
              </button>
              <SafarButton
                variant="primary"
                size="sm"
                onClick={() => {
                  if (!editingTrip.origin.trim() || !editingTrip.dest.trim()) return;
                  const exists = trips.some((t) => t.id === editingTrip.id);
                  const updated = exists
                    ? trips.map((t) => (t.id === editingTrip.id ? editingTrip : t))
                    : [editingTrip, ...trips];
                  saveTrips(updated);
                  setIsEditModalOpen(false);
                  showToast(exists ? 'Trip details updated.' : 'Trip run scheduled.');
                }}
              >
                Save Run
              </SafarButton>
            </div>
          </div>
        </div>
      )}

      {/* Delete / Cancel Trip Confirmation */}
      {deletingTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-warm-200 shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-charcoal-900">Cancel &amp; Delete Run?</h3>
              <p className="text-xs text-charcoal-500 mt-1 font-sans">
                Trip from <strong>{deletingTrip.origin}</strong> to <strong>{deletingTrip.dest}</strong> at{' '}
                {deletingTrip.time} will be cancelled. Booked guests will be notified.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTrip(null)}
                className="px-3 py-1.5 rounded-xl border border-warm-200 text-xs font-semibold text-charcoal-600 hover:bg-warm-50"
              >
                Keep Run
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = trips.filter((t) => t.id !== deletingTrip.id);
                  saveTrips(updated);
                  setDeletingTrip(null);
                  showToast('Trip run deleted.');
                }}
                className="px-4 py-1.5 rounded-xl bg-burgundy-600 hover:bg-burgundy-700 text-white text-xs font-bold shadow-sm"
              >
                Delete Run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
