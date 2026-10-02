'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { ExcelImportModal, FieldDefinition } from '../../../components/import/excel-import-modal';

export interface GuestRecord {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  group: string;
  hotel: string;
  pickupPlace?: string;
  passengerCount: number;
  status: 'CONFIRMED' | 'INVITED' | 'ARRIVED' | 'CANCELLED';
  notes?: string;
}

const GUEST_IMPORT_FIELDS: FieldDefinition[] = [
  { key: 'fullName', label: 'Full Name', required: true, suggestedHeaders: ['guest name', 'name', 'full name', 'attendee'] },
  { key: 'phone', label: 'Phone Number', required: true, type: 'phone', suggestedHeaders: ['mobile', 'phone', 'contact number', 'cell'] },
  { key: 'email', label: 'Email Address', type: 'email', suggestedHeaders: ['email', 'email id'] },
  { key: 'group', label: 'Guest Group / Family', suggestedHeaders: ['group', 'family', 'party', 'cohort', 'side'] },
  { key: 'hotel', label: 'Hotel / Room Accommodation', suggestedHeaders: ['hotel', 'accommodation', 'room', 'stay'] },
  { key: 'pickupPlace', label: 'Pickup Location', suggestedHeaders: ['pickup', 'pickup location', 'origin'] },
  { key: 'passengerCount', label: 'Passengers', type: 'number', suggestedHeaders: ['passengers', 'pax', 'seats', 'count'] },
  { key: 'notes', label: 'Notes / Special Requests', suggestedHeaders: ['notes', 'remarks', 'special requirements'] },
];

export default function HostGuestsPage() {
  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<GuestRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingGuest, setDeletingGuest] = useState<GuestRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load guests from localStorage or initialize
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('safar_host_guests');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setGuests(parsed);
            return;
          }
        } catch (e) {
          // ignore
        }
      }

      // Default baseline data only if empty
      const initial: GuestRecord[] = [
        { id: 'gst_1', fullName: 'Kabir Mehta', phone: '+91 98765 11111', email: 'kabir@example.com', group: 'Groom Family', hotel: 'The Grand Hotel', passengerCount: 2, status: 'CONFIRMED' },
        { id: 'gst_2', fullName: 'Ananya Sharma', phone: '+91 98765 22222', email: 'ananya@example.com', group: 'Bride Family', hotel: 'The Grand Hotel', passengerCount: 1, status: 'CONFIRMED' },
        { id: 'gst_3', fullName: 'Vikramaditya Rao', phone: '+91 98765 33333', email: 'vikram@example.com', group: 'VIP Delegates', hotel: 'The Heritage Palace', passengerCount: 4, status: 'CONFIRMED' },
        { id: 'gst_4', fullName: 'Meera Kapoor', phone: '+91 98765 44444', email: 'meera@example.com', group: 'Friends', hotel: 'The Grand Hotel', passengerCount: 2, status: 'ARRIVED' },
      ];
      setGuests(initial);
      localStorage.setItem('safar_host_guests', JSON.stringify(initial));
    }
  }, []);

  const saveGuests = (updated: GuestRecord[]) => {
    setGuests(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('safar_host_guests', JSON.stringify(updated));
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Groups list for filtering
  const groups = Array.from(new Set(guests.map((g) => g.group || 'General')));

  const filteredGuests = guests.filter((g) => {
    const q = search.toLowerCase().trim();
    const matchesGroup = selectedGroup === 'ALL' || g.group === selectedGroup;
    if (!matchesGroup) return false;
    if (!q) return true;
    return (
      g.fullName.toLowerCase().includes(q) ||
      g.phone.includes(q) ||
      (g.email && g.email.toLowerCase().includes(q)) ||
      (g.hotel && g.hotel.toLowerCase().includes(q))
    );
  });

  const handleExportCSV = () => {
    const headers = ['Full Name', 'Phone', 'Email', 'Group', 'Hotel', 'Passengers', 'Status', 'Notes'];
    const rows = guests.map((g) => [
      `"${g.fullName}"`,
      `"${g.phone}"`,
      `"${g.email || ''}"`,
      `"${g.group}"`,
      `"${g.hotel}"`,
      g.passengerCount,
      g.status,
      `"${g.notes || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `safar_guest_manifest_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported guest manifest CSV');
  };

  const handleImportComplete = (records: any[]) => {
    const newItems: GuestRecord[] = records.map((r, i) => ({
      id: `gst_imp_${Date.now()}_${i}`,
      fullName: r.fullName || 'Guest',
      phone: r.phone || '',
      email: r.email || '',
      group: r.group || 'General',
      hotel: r.hotel || r.dropPlace || 'Unassigned',
      passengerCount: parseInt(r.passengerCount) || 1,
      status: 'INVITED',
      notes: r.notes || '',
    }));

    const updated = [...guests, ...newItems];
    saveGuests(updated);
    setIsImportModalOpen(false);
    showToast(`Successfully imported ${newItems.length} guests into database!`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-charcoal-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-in slide-in-from-top-3">
          <Check className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900 tracking-tight">Guest Manifest</h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Manage passenger cohorts, hotel accommodations, Excel spreadsheets, and boarding access.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-700 bg-white hover:bg-charcoal-50 shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-charcoal-500" /> Export CSV
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-emerald-200 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Import Excel (.xlsx)
          </button>
          <button
            onClick={() => {
              setEditingGuest({
                id: `gst_${Date.now()}`,
                fullName: '',
                phone: '',
                email: '',
                group: 'General',
                hotel: 'The Grand Hotel',
                passengerCount: 1,
                status: 'CONFIRMED',
              });
              setIsEditModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-safar-600 hover:bg-safar-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 active:scale-[0.98] transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add Guest
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
                placeholder="Search guests by name, phone, email, or hotel..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-charcoal-200 focus:outline-none focus:ring-2 focus:ring-safar-500"
              />
            </div>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-charcoal-200 text-xs text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-safar-500"
            >
              <option value="ALL">All Groups</option>
              {groups.map((grp) => (
                <option key={grp} value={grp}>
                  {grp}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-charcoal-500 font-medium">
            Showing <strong>{filteredGuests.length}</strong> of <strong>{guests.length}</strong> Guests
          </div>
        </div>

        {/* Guest Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-charcoal-100 bg-charcoal-50/50 text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider">
                <th className="py-3 px-6">Guest Name</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Group</th>
                <th className="py-3 px-4">Hotel Accommodation</th>
                <th className="py-3 px-4 text-center">Pax</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-100 text-xs">
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-charcoal-400 text-xs">
                    No guests found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredGuests.map((g) => (
                  <tr key={g.id} className="hover:bg-charcoal-50/50 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-charcoal-900">
                      <div>{g.fullName}</div>
                      {g.notes && <div className="text-[10px] text-charcoal-400 italic">{g.notes}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-charcoal-600">
                      <div className="font-mono">{g.phone}</div>
                      {g.email && <div className="text-[10px] text-charcoal-400">{g.email}</div>}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-charcoal-700">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-charcoal-100 text-charcoal-800">
                        {g.group}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-charcoal-600">{g.hotel}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-charcoal-800">{g.passengerCount}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          g.status === 'CONFIRMED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : g.status === 'ARRIVED'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-charcoal-50 text-charcoal-700 border-charcoal-200'
                        }`}
                      >
                        {g.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGuest({ ...g });
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 text-charcoal-500 hover:text-charcoal-800 rounded-lg hover:bg-charcoal-100 transition-colors"
                          title="Edit Guest"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingGuest(g)}
                          className="p-1.5 text-charcoal-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete Guest"
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

      {/* Edit / Add Guest Modal */}
      {isEditModalOpen && editingGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-charcoal-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-charcoal-100 pb-3">
              <h3 className="font-bold text-sm text-charcoal-900">
                {guests.some((g) => g.id === editingGuest.id) ? 'Edit Guest' : 'Add New Guest'}
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
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Patel"
                  value={editingGuest.fullName}
                  onChange={(e) => setEditingGuest({ ...editingGuest, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91..."
                    value={editingGuest.phone}
                    onChange={(e) => setEditingGuest({ ...editingGuest, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="guest@example.com"
                    value={editingGuest.email || ''}
                    onChange={(e) => setEditingGuest({ ...editingGuest, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Guest Group / Cohort</label>
                  <input
                    type="text"
                    placeholder="e.g. Groom Family, VIP"
                    value={editingGuest.group}
                    onChange={(e) => setEditingGuest({ ...editingGuest, group: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Passengers (Pax)</label>
                  <input
                    type="number"
                    min={1}
                    value={editingGuest.passengerCount}
                    onChange={(e) => setEditingGuest({ ...editingGuest, passengerCount: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 focus:outline-none text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">Hotel / Room Accommodation</label>
                <input
                  type="text"
                  placeholder="e.g. The Grand Hotel, Room 402"
                  value={editingGuest.hotel}
                  onChange={(e) => setEditingGuest({ ...editingGuest, hotel: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">Status</label>
                <select
                  value={editingGuest.status}
                  onChange={(e) => setEditingGuest({ ...editingGuest, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 focus:outline-none"
                >
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="INVITED">INVITED</option>
                  <option value="ARRIVED">ARRIVED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">Notes / Flight Info</label>
                <textarea
                  rows={2}
                  placeholder="Flight arrival details, wheelchair assistance..."
                  value={editingGuest.notes || ''}
                  onChange={(e) => setEditingGuest({ ...editingGuest, notes: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-charcoal-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-600 hover:bg-charcoal-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editingGuest.fullName.trim() || !editingGuest.phone.trim()) return;
                  const exists = guests.some((g) => g.id === editingGuest.id);
                  const updated = exists
                    ? guests.map((g) => (g.id === editingGuest.id ? editingGuest : g))
                    : [editingGuest, ...guests];
                  saveGuests(updated);
                  setIsEditModalOpen(false);
                  showToast(exists ? 'Guest details updated.' : 'Guest added to manifest.');
                }}
                className="px-4 py-1.5 rounded-xl bg-safar-600 hover:bg-safar-700 text-white text-xs font-bold shadow-sm"
              >
                Save Guest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-charcoal-200 shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-charcoal-900">Remove {deletingGuest.fullName}?</h3>
              <p className="text-xs text-charcoal-500 mt-1">
                This guest record will be permanently deleted from the database and active shuttle manifests.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingGuest(null)}
                className="px-3 py-1.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = guests.filter((g) => g.id !== deletingGuest.id);
                  saveGuests(updated);
                  setDeletingGuest(null);
                  showToast('Guest removed.');
                }}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Delete Guest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Bulk Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        title="Import Guests from Spreadsheet"
        entityName="Guests"
        fields={GUEST_IMPORT_FIELDS}
        existingRecords={guests}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}
