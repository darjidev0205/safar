'use client';

import React, { useState, useEffect } from 'react';
import {
  Car,
  UserCheck,
  Plus,
  Shield,
  FileSpreadsheet,
  Download,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  Check,
  Phone,
  Mail,
  Search,
} from 'lucide-react';
import { StatusBadge } from '../../../components/ui/status-badge';
import { ExcelImportModal, FieldDefinition } from '../../../components/import/excel-import-modal';

export interface VehicleRecord {
  id: string;
  model: string;
  plate: string;
  category: 'SUV' | 'SEDAN' | 'TEMPO_TRAVELLER' | 'LUXURY_SEDAN' | 'BUS';
  capacity: number;
  driverName?: string;
  status: 'ON_DUTY' | 'AVAILABLE' | 'OFF_DUTY' | 'MAINTENANCE';
  fuelType?: string;
  notes?: string;
}

export interface DriverRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  licenseNumber: string;
  licenseExpiry?: string;
  experience?: string;
  status: 'ON_DUTY' | 'AVAILABLE' | 'OFF_DUTY';
  assignedVehicle?: string;
  emergencyContact?: string;
}

const DRIVER_IMPORT_FIELDS: FieldDefinition[] = [
  { key: 'name', label: 'Full Name', required: true, suggestedHeaders: ['driver name', 'name', 'full name', 'chauffeur'] },
  { key: 'phone', label: 'Phone Number', required: true, type: 'phone', suggestedHeaders: ['mobile', 'phone', 'contact number'] },
  { key: 'email', label: 'Email', type: 'email', suggestedHeaders: ['email', 'email id'] },
  { key: 'licenseNumber', label: 'License Number', required: true, suggestedHeaders: ['license', 'license number', 'dl number', 'dl'] },
  { key: 'experience', label: 'Experience (Years)', suggestedHeaders: ['experience', 'years'] },
  { key: 'emergencyContact', label: 'Emergency Contact', suggestedHeaders: ['emergency contact', 'alt phone'] },
];

export default function HostFleetPage() {
  const [activeTab, setActiveTab] = useState<'VEHICLES' | 'DRIVERS'>('VEHICLES');
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [editingVehicle, setEditingVehicle] = useState<VehicleRecord | null>(null);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [deletingVehicle, setDeletingVehicle] = useState<VehicleRecord | null>(null);

  const [editingDriver, setEditingDriver] = useState<DriverRecord | null>(null);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [deletingDriver, setDeletingDriver] = useState<DriverRecord | null>(null);
  const [isDriverImportOpen, setIsDriverImportOpen] = useState(false);

  // Load from localStorage or baseline
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedVehicles = localStorage.getItem('safar_host_vehicles');
      if (storedVehicles) {
        try {
          const parsed = JSON.parse(storedVehicles);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setVehicles(parsed);
          }
        } catch (e) {}
      } else {
        const initialVehicles: VehicleRecord[] = [
          { id: 'v_1', model: 'Force Urbania Traveller', plate: 'KA 01 AB 1234', category: 'TEMPO_TRAVELLER', capacity: 16, driverName: 'Rohit Sharma', status: 'ON_DUTY' },
          { id: 'v_2', model: 'Toyota Innova Crysta', plate: 'KA 02 CD 5678', category: 'SUV', capacity: 6, driverName: 'Amit Patel', status: 'ON_DUTY' },
          { id: 'v_3', model: 'Honda City', plate: 'KA 03 EF 9012', category: 'SEDAN', capacity: 4, driverName: 'Suresh Kumar', status: 'AVAILABLE' },
          { id: 'v_4', model: 'Toyota Innova Hycross', plate: 'KA 04 GH 3456', category: 'SUV', capacity: 6, driverName: 'Vikram Singh', status: 'AVAILABLE' },
          { id: 'v_5', model: 'Mercedes-Benz E-Class', plate: 'KA 05 IJ 7890', category: 'LUXURY_SEDAN', capacity: 4, driverName: 'Manish Verma', status: 'OFF_DUTY' },
        ];
        setVehicles(initialVehicles);
        localStorage.setItem('safar_host_vehicles', JSON.stringify(initialVehicles));
      }

      const storedDrivers = localStorage.getItem('safar_host_drivers');
      if (storedDrivers) {
        try {
          const parsed = JSON.parse(storedDrivers);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDrivers(parsed);
          }
        } catch (e) {}
      } else {
        const initialDrivers: DriverRecord[] = [
          { id: 'd_1', name: 'Rohit Sharma', phone: '+91 98765 00001', licenseNumber: 'DL01-2018-001', status: 'ON_DUTY', assignedVehicle: 'KA 01 AB 1234' },
          { id: 'd_2', name: 'Amit Patel', phone: '+91 98765 00002', licenseNumber: 'DL02-2019-002', status: 'ON_DUTY', assignedVehicle: 'KA 02 CD 5678' },
          { id: 'd_3', name: 'Suresh Kumar', phone: '+91 98765 00003', licenseNumber: 'DL03-2020-003', status: 'AVAILABLE', assignedVehicle: 'KA 03 EF 9012' },
          { id: 'd_4', name: 'Vikram Singh', phone: '+91 98765 00004', licenseNumber: 'DL04-2021-004', status: 'AVAILABLE', assignedVehicle: 'KA 04 GH 3456' },
        ];
        setDrivers(initialDrivers);
        localStorage.setItem('safar_host_drivers', JSON.stringify(initialDrivers));
      }
    }
  }, []);

  const saveVehicles = (updated: VehicleRecord[]) => {
    setVehicles(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('safar_host_vehicles', JSON.stringify(updated));
    }
  };

  const saveDrivers = (updated: DriverRecord[]) => {
    setDrivers(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('safar_host_drivers', JSON.stringify(updated));
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredVehicles = vehicles.filter((v) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      v.model.toLowerCase().includes(q) ||
      v.plate.toLowerCase().includes(q) ||
      (v.driverName && v.driverName.toLowerCase().includes(q)) ||
      v.category.toLowerCase().includes(q)
    );
  });

  const filteredDrivers = drivers.filter((d) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      d.name.toLowerCase().includes(q) ||
      d.phone.includes(q) ||
      d.licenseNumber.toLowerCase().includes(q)
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
          <h1 className="text-2xl font-bold text-charcoal-900 tracking-tight">Fleet &amp; Drivers</h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Manage vehicles, passenger capacities, chauffeur duty shifts, and Excel roster imports.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {activeTab === 'DRIVERS' && (
            <button
              onClick={() => setIsDriverImportOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-emerald-200 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Import Drivers Excel
            </button>
          )}

          {activeTab === 'VEHICLES' ? (
            <button
              onClick={() => {
                setEditingVehicle({
                  id: `veh_${Date.now()}`,
                  model: '',
                  plate: '',
                  category: 'SUV',
                  capacity: 6,
                  status: 'AVAILABLE',
                });
                setIsVehicleModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-safar-600 hover:bg-safar-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 active:scale-[0.98] transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Vehicle
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingDriver({
                  id: `drv_${Date.now()}`,
                  name: '',
                  phone: '',
                  licenseNumber: '',
                  status: 'AVAILABLE',
                });
                setIsDriverModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-safar-600 hover:bg-safar-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 active:scale-[0.98] transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Driver
            </button>
          )}
        </div>
      </div>

      {/* Tabs Switcher and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-charcoal-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('VEHICLES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'VEHICLES'
                ? 'bg-safar-600 text-white shadow-xs'
                : 'bg-white text-charcoal-600 hover:bg-charcoal-100 border border-charcoal-200'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            Vehicles ({vehicles.length})
          </button>
          <button
            onClick={() => setActiveTab('DRIVERS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'DRIVERS'
                ? 'bg-safar-600 text-white shadow-xs'
                : 'bg-white text-charcoal-600 hover:bg-charcoal-100 border border-charcoal-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Drivers ({drivers.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
          <input
            type="text"
            placeholder={activeTab === 'VEHICLES' ? 'Search vehicles...' : 'Search drivers...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-charcoal-200 focus:outline-none focus:ring-2 focus:ring-safar-500 bg-white"
          />
        </div>
      </div>

      {/* ==================================================== */}
      {/* VEHICLES TAB VIEW */}
      {/* ==================================================== */}
      {activeTab === 'VEHICLES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in">
          {filteredVehicles.length === 0 ? (
            <div className="col-span-full py-12 text-center text-charcoal-400 text-xs">
              No vehicles found. Click &ldquo;+ Add Vehicle&rdquo; to register fleet units.
            </div>
          ) : (
            filteredVehicles.map((veh) => (
              <div
                key={veh.id}
                className="p-5 rounded-2xl bg-white border border-charcoal-200/80 shadow-xs space-y-4 hover:border-safar-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-safar-50 flex items-center justify-center text-safar-700">
                        <Car className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-charcoal-900">{veh.model}</h3>
                        <p className="text-xs font-mono text-safar-700 font-bold">{veh.plate}</p>
                      </div>
                    </div>

                    <StatusBadge status={veh.status} size="sm" />
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-charcoal-100 text-xs text-charcoal-600">
                    <div className="flex items-center justify-between">
                      <span className="text-charcoal-400">Assigned Chauffeur:</span>
                      <span className="font-semibold text-charcoal-900">{veh.driverName || 'Unassigned'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-charcoal-400">Category:</span>
                      <span className="font-semibold text-charcoal-900">{veh.category}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-charcoal-400">Capacity:</span>
                      <span className="font-semibold text-charcoal-900">{veh.capacity} Seats</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-charcoal-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingVehicle({ ...veh });
                      setIsVehicleModalOpen(true);
                    }}
                    className="p-1.5 text-charcoal-500 hover:text-charcoal-800 rounded-lg hover:bg-charcoal-100 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingVehicle(veh)}
                    className="p-1.5 text-charcoal-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* DRIVERS TAB VIEW */}
      {/* ==================================================== */}
      {activeTab === 'DRIVERS' && (
        <div className="bg-white rounded-2xl border border-charcoal-200/80 shadow-xs overflow-hidden animate-in fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-charcoal-100 bg-charcoal-50/50 text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider">
                  <th className="py-3 px-6">Driver Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">License Number</th>
                  <th className="py-3 px-4">Assigned Vehicle</th>
                  <th className="py-3 px-4 text-center">Duty Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-100 text-xs">
                {filteredDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-charcoal-400 text-xs">
                      No drivers found. Click &ldquo;+ Add Driver&rdquo; or &ldquo;Import Drivers Excel&rdquo;.
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map((d) => (
                    <tr key={d.id} className="hover:bg-charcoal-50/50 transition-colors">
                      <td className="py-3.5 px-6 font-semibold text-charcoal-900">{d.name}</td>
                      <td className="py-3.5 px-4 text-charcoal-600 font-mono">{d.phone}</td>
                      <td className="py-3.5 px-4 font-mono text-charcoal-700">{d.licenseNumber}</td>
                      <td className="py-3.5 px-4 font-semibold text-charcoal-800">
                        {d.assignedVehicle || <span className="text-charcoal-400 font-normal">None</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={d.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDriver({ ...d });
                              setIsDriverModalOpen(true);
                            }}
                            className="p-1.5 text-charcoal-500 hover:text-charcoal-800 rounded-lg hover:bg-charcoal-100 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingDriver(d)}
                            className="p-1.5 text-charcoal-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
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
      )}

      {/* Edit / Add Vehicle Modal */}
      {isVehicleModalOpen && editingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-charcoal-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-charcoal-100 pb-3">
              <h3 className="font-bold text-sm text-charcoal-900">
                {vehicles.some((v) => v.id === editingVehicle.id) ? 'Edit Vehicle' : 'Add Vehicle'}
              </h3>
              <button
                onClick={() => setIsVehicleModalOpen(false)}
                className="text-charcoal-400 hover:text-charcoal-700 rounded-lg p-1 hover:bg-charcoal-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Plate Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="KA 01 AB 1234"
                    value={editingVehicle.plate}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, plate: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Make &amp; Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Toyota Innova Crysta"
                    value={editingVehicle.model}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, model: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Category</label>
                  <select
                    value={editingVehicle.category}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  >
                    <option value="SUV">SUV (6 Seats)</option>
                    <option value="SEDAN">Sedan (4 Seats)</option>
                    <option value="TEMPO_TRAVELLER">Tempo Traveller (16 Seats)</option>
                    <option value="LUXURY_SEDAN">Luxury Sedan (4 Seats)</option>
                    <option value="BUS">Bus (35 Seats)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Seat Capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={editingVehicle.capacity}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, capacity: parseInt(e.target.value) || 4 })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Assigned Driver</label>
                  <select
                    value={editingVehicle.driverName || ''}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, driverName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  >
                    <option value="">-- No Driver --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Status</label>
                  <select
                    value={editingVehicle.status}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="ON_DUTY">ON_DUTY</option>
                    <option value="OFF_DUTY">OFF_DUTY</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-charcoal-100">
              <button
                type="button"
                onClick={() => setIsVehicleModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editingVehicle.plate.trim() || !editingVehicle.model.trim()) return;
                  const exists = vehicles.some((v) => v.id === editingVehicle.id);
                  const updated = exists
                    ? vehicles.map((v) => (v.id === editingVehicle.id ? editingVehicle : v))
                    : [editingVehicle, ...vehicles];
                  saveVehicles(updated);
                  setIsVehicleModalOpen(false);
                  showToast(exists ? 'Vehicle updated.' : 'Vehicle added to fleet.');
                }}
                className="px-4 py-1.5 rounded-xl bg-safar-600 hover:bg-safar-700 text-white text-xs font-bold shadow-sm"
              >
                Save Vehicle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Vehicle Confirmation */}
      {deletingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-charcoal-200 shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-charcoal-900">Remove {deletingVehicle.plate}?</h3>
              <p className="text-xs text-charcoal-500 mt-1">
                Removing this vehicle de-allocates it from scheduled trips and active driver pairings.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingVehicle(null)}
                className="px-3 py-1.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = vehicles.filter((v) => v.id !== deletingVehicle.id);
                  saveVehicles(updated);
                  setDeletingVehicle(null);
                  showToast('Vehicle removed.');
                }}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add Driver Modal */}
      {isDriverModalOpen && editingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-charcoal-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-charcoal-100 pb-3">
              <h3 className="font-bold text-sm text-charcoal-900">
                {drivers.some((d) => d.id === editingDriver.id) ? 'Edit Driver' : 'Add Chauffeur'}
              </h3>
              <button
                onClick={() => setIsDriverModalOpen(false)}
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
                  placeholder="e.g. Rajesh Kumar"
                  value={editingDriver.name}
                  onChange={(e) => setEditingDriver({ ...editingDriver, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91..."
                    value={editingDriver.phone}
                    onChange={(e) => setEditingDriver({ ...editingDriver, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">License Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="DL01-XXXX"
                    value={editingDriver.licenseNumber}
                    onChange={(e) => setEditingDriver({ ...editingDriver, licenseNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Assigned Vehicle</label>
                  <select
                    value={editingDriver.assignedVehicle || ''}
                    onChange={(e) => setEditingDriver({ ...editingDriver, assignedVehicle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  >
                    <option value="">-- No Vehicle --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.plate}>
                        {v.model} ({v.plate})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Duty Status</label>
                  <select
                    value={editingDriver.status}
                    onChange={(e) => setEditingDriver({ ...editingDriver, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-safar-500"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="ON_DUTY">ON_DUTY</option>
                    <option value="OFF_DUTY">OFF_DUTY</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-charcoal-100">
              <button
                type="button"
                onClick={() => setIsDriverModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editingDriver.name.trim() || !editingDriver.phone.trim()) return;
                  const exists = drivers.some((d) => d.id === editingDriver.id);
                  const updated = exists
                    ? drivers.map((d) => (d.id === editingDriver.id ? editingDriver : d))
                    : [editingDriver, ...drivers];
                  saveDrivers(updated);
                  setIsDriverModalOpen(false);
                  showToast(exists ? 'Driver details updated.' : 'Driver invited and enrolled.');
                }}
                className="px-4 py-1.5 rounded-xl bg-safar-600 hover:bg-safar-700 text-white text-xs font-bold shadow-sm"
              >
                Save Driver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Driver Confirmation */}
      {deletingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-charcoal-200 shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-charcoal-900">Deactivate {deletingDriver.name}?</h3>
              <p className="text-xs text-charcoal-500 mt-1">
                This driver will be released from any assigned vehicle and removed from active dispatch rosters.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingDriver(null)}
                className="px-3 py-1.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = drivers.filter((d) => d.id !== deletingDriver.id);
                  saveDrivers(updated);
                  setDeletingDriver(null);
                  showToast('Driver deactivated.');
                }}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import for Drivers */}
      <ExcelImportModal
        isOpen={isDriverImportOpen}
        title="Import Chauffeurs from Spreadsheet"
        entityName="Drivers"
        fields={DRIVER_IMPORT_FIELDS}
        existingRecords={drivers}
        onClose={() => setIsDriverImportOpen(false)}
        onImportComplete={(imported) => {
          const formatted: DriverRecord[] = imported.map((r, i) => ({
            id: `drv_imp_${Date.now()}_${i}`,
            name: r.name || 'Driver',
            phone: r.phone || '',
            email: r.email || '',
            licenseNumber: r.licenseNumber || 'DL-PENDING',
            experience: r.experience || '3 years',
            emergencyContact: r.emergencyContact || '',
            status: 'AVAILABLE',
          }));
          const updated = [...drivers, ...formatted];
          saveDrivers(updated);
          setIsDriverImportOpen(false);
          showToast(`Imported ${formatted.length} drivers from Excel.`);
        }}
      />
    </div>
  );
}
