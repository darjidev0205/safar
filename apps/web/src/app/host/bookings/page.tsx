'use client';

import React, { useState, useEffect } from 'react';
import {
  BookMarked,
  Download,
  Search,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  Check,
  Plus,
  Ticket,
} from 'lucide-react';
import { StatusBadge } from '../../../components/ui/status-badge';

export interface BookingRecord {
  id: string;
  guest: string;
  route: string;
  time: string;
  vehicle: string;
  passengers: number;
  boardingCode: string;
  status: 'CONFIRMED' | 'BOARDED' | 'CANCELLED';
  notes?: string;
}

export default function HostBookingsPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [editingBooking, setEditingBooking] = useState<BookingRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingBooking, setDeletingBooking] = useState<BookingRecord | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('safar_host_bookings');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setBookings(parsed);
            return;
          }
        } catch (e) {}
      }

      const initial: BookingRecord[] = [
        { id: 'BK-101', guest: 'Kabir Mehta', route: 'The Grand Hotel → The Celebration Venue', time: 'Today, 10:30 AM', vehicle: 'Sedan', passengers: 4, boardingCode: '4827', status: 'CONFIRMED' },
        { id: 'BK-102', guest: 'Ananya Sharma', route: 'The Grand Hotel → The Celebration Venue', time: 'Today, 11:30 AM', vehicle: 'SUV', passengers: 6, boardingCode: '9124', status: 'CONFIRMED' },
        { id: 'BK-103', guest: 'Meera Kapoor', route: 'Ahmedabad Airport → The Grand Hotel', time: 'Today, 02:00 PM', vehicle: 'Tempo Traveller', passengers: 12, boardingCode: '3381', status: 'CONFIRMED' },
        { id: 'BK-104', guest: 'Vikramaditya Rao', route: 'The Grand Hotel → The Heritage Palace', time: 'Tomorrow, 09:30 AM', vehicle: 'SUV', passengers: 5, boardingCode: '7194', status: 'CONFIRMED' },
      ];
      setBookings(initial);
      localStorage.setItem('safar_host_bookings', JSON.stringify(initial));
    }
  }, []);

  const saveBookings = (updated: BookingRecord[]) => {
    setBookings(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('safar_host_bookings', JSON.stringify(updated));
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExportCSV = () => {
    const headers = ['Booking ID', 'Guest Name', 'Route', 'Time', 'Vehicle', 'Passengers', 'Boarding Code', 'Status'];
    const rows = bookings.map((b) => [
      b.id,
      `"${b.guest}"`,
      `"${b.route}"`,
      `"${b.time}"`,
      `"${b.vehicle}"`,
      b.passengers,
      b.boardingCode,
      b.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `safar_bookings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported Bookings CSV');
  };

  const filteredBookings = bookings.filter((b) => {
    const q = search.toLowerCase().trim();
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    if (!matchesStatus) return false;
    if (!q) return true;
    return (
      b.guest.toLowerCase().includes(q) ||
      b.route.toLowerCase().includes(q) ||
      b.id.toLowerCase().includes(q) ||
      b.boardingCode.includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-charcoal-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-in slide-in-from-top-3">
          <Check className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900 tracking-tight">Passenger Reservations</h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Confirmed guest rides, seat reservations, and active boarding verification codes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-700 bg-white hover:bg-charcoal-50 shadow-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export Bookings CSV
          </button>
          <button
            onClick={() => {
              setEditingBooking({
                id: `BK-${Math.floor(100 + Math.random() * 900)}`,
                guest: '',
                route: 'The Grand Hotel → The Celebration Venue',
                time: 'Today, 04:00 PM',
                vehicle: 'SUV',
                passengers: 2,
                boardingCode: String(Math.floor(1000 + Math.random() * 9000)),
                status: 'CONFIRMED',
              });
              setIsEditModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-safar-600 hover:bg-safar-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 active:scale-[0.98] transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Create Booking
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl border border-charcoal-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-charcoal-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
              <input
                type="text"
                placeholder="Search by guest, booking ID, or route..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-charcoal-200 focus:outline-none focus:ring-2 focus:ring-safar-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-charcoal-200 text-xs text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-safar-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="BOARDED">Boarded</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="text-xs text-charcoal-500 font-medium">
            Showing <strong>{filteredBookings.length}</strong> of <strong>{bookings.length}</strong> Bookings
          </div>
        </div>

        {/* Bookings Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-charcoal-100 bg-charcoal-50/50 text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider">
                <th className="py-3 px-6">Booking ID</th>
                <th className="py-3 px-4">Guest</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4 text-center">Boarding Code</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-100 text-xs">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-charcoal-400 text-xs">
                    No reservations found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-charcoal-50/50 transition-colors">
                    <td className="py-3.5 px-6 font-mono font-bold text-charcoal-800">{b.id}</td>
                    <td className="py-3.5 px-4 font-semibold text-charcoal-900">{b.guest}</td>
                    <td className="py-3.5 px-4 text-charcoal-700">{b.route}</td>
                    <td className="py-3.5 px-4 text-charcoal-600">{b.time}</td>
                    <td className="py-3.5 px-4 text-charcoal-600">
                      {b.vehicle} &bull; {b.passengers} seats
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-bold text-safar-700 bg-safar-50 border border-safar-200 px-2.5 py-1 rounded-lg">
                        {b.boardingCode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={b.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBooking({ ...b });
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 text-charcoal-500 hover:text-charcoal-800 rounded-lg hover:bg-charcoal-100 transition-colors"
                          title="Edit Booking"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingBooking(b)}
                          className="p-1.5 text-charcoal-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Cancel/Delete Booking"
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

      {/* Edit / Create Booking Modal */}
      {isEditModalOpen && editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-charcoal-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-charcoal-100 pb-3">
              <h3 className="font-bold text-sm text-charcoal-900">
                {bookings.some((b) => b.id === editingBooking.id) ? 'Edit Passenger Booking' : 'Create Passenger Booking'}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-charcoal-400 hover:text-charcoal-700 rounded-lg p-1 hover:bg-charcoal-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">Guest Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Shah"
                  value={editingBooking.guest}
                  onChange={(e) => setEditingBooking({ ...editingBooking, guest: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">Route *</label>
                <input
                  type="text"
                  required
                  placeholder="Origin → Destination"
                  value={editingBooking.route}
                  onChange={(e) => setEditingBooking({ ...editingBooking, route: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Time</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Today, 11:30 AM"
                    value={editingBooking.time}
                    onChange={(e) => setEditingBooking({ ...editingBooking, time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Vehicle</label>
                  <input
                    type="text"
                    placeholder="e.g. SUV, Sedan"
                    value={editingBooking.vehicle}
                    onChange={(e) => setEditingBooking({ ...editingBooking, vehicle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Passengers</label>
                  <input
                    type="number"
                    min={1}
                    value={editingBooking.passengers}
                    onChange={(e) => setEditingBooking({ ...editingBooking, passengers: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Status</label>
                  <select
                    value={editingBooking.status}
                    onChange={(e) => setEditingBooking({ ...editingBooking, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  >
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="BOARDED">BOARDED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-charcoal-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editingBooking.guest.trim() || !editingBooking.route.trim()) return;
                  const exists = bookings.some((b) => b.id === editingBooking.id);
                  const updated = exists
                    ? bookings.map((b) => (b.id === editingBooking.id ? editingBooking : b))
                    : [editingBooking, ...bookings];
                  saveBookings(updated);
                  setIsEditModalOpen(false);
                  showToast(exists ? 'Booking updated.' : 'Booking created.');
                }}
                className="px-4 py-1.5 rounded-xl bg-safar-600 hover:bg-safar-700 text-white text-xs font-bold shadow-sm"
              >
                Save Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete / Cancel Booking Confirmation */}
      {deletingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-charcoal-200 shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-charcoal-900">Cancel Booking {deletingBooking.id}?</h3>
              <p className="text-xs text-charcoal-500 mt-1">
                Reservation for <strong>{deletingBooking.guest}</strong> ({deletingBooking.route}) will be cancelled
                and assigned vehicle seats released.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingBooking(null)}
                className="px-3 py-1.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-600"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = bookings.filter((b) => b.id !== deletingBooking.id);
                  saveBookings(updated);
                  setDeletingBooking(null);
                  showToast('Booking cancelled.');
                }}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
