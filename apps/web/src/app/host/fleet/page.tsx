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
import { StarFlourish } from '../../../components/ui/botanical-ornaments';
import { SafarBadge, SafarButton, SafarEmptyState } from '../../../components/ui/safar-design-system';

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
          { id: 'v_1', model: 'Force Urbania Traveller', plate: 'GJ 01 AB 1234', category: 'TEMPO_TRAVELLER', capacity: 16, driverName: 'Rohit Sharma', status: 'ON_DUTY' },
          { id: 'v_2', model: 'Toyota Innova Crysta', plate: 'GJ 01 CD 5678', category: 'SUV', capacity: 6, driverName: 'Amit Patel', status: 'ON_DUTY' },
          { id: 'v_3', model: 'Honda City', plate: 'GJ 27 EF 9012', category: 'SEDAN', capacity: 4, driverName: 'Suresh Kumar', status: 'AVAILABLE' },
          { id: 'v_4', model: 'Toyota Innova Hycross', plate: 'GJ 01 GH 3456', category: 'SUV', capacity: 6, driverName: 'Vikram Singh', status: 'AVAILABLE' },
          { id: 'v_5', model: 'Mercedes-Benz E-Class', plate: 'GJ 01 IJ 7890', category: 'LUXURY_SEDAN', capacity: 4, driverName: 'Manish Verma', status: 'OFF_DUTY' },
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
          { id: 'd_1', name: 'Rohit Sharma', phone: '+91 98765 43210', licenseNumber: 'GJ-01-2018-00456', experience: '8 yrs', status: 'ON_DUTY', assignedVehicle: 'GJ 01 AB 1234' },
          { id: 'd_2', name: 'Amit Patel', phone: '+91 98234 56789', licenseNumber: 'GJ-01-2015-00123', experience: '11 yrs', status: 'ON_DUTY', assignedVehicle: 'GJ 01 CD 5678' },
          { id: 'd_3', name: 'Suresh Kumar', phone: '+91 97123 45678', licenseNumber: 'GJ-27-2020-00890', experience: '5 yrs', status: 'AVAILABLE', assignedVehicle: 'GJ 27 EF 9012' },
          { id: 'd_4', name: 'Vikram Singh', phone: '+91 96345 67890', licenseNumber: 'GJ-01-2019-00567', experience: '7 yrs', status: 'AVAILABLE', assignedVehicle: 'GJ 01 GH 3456' },
          { id: 'd_5', name: 'Manish Verma', phone: '+91 95456 78901', licenseNumber: 'GJ-01-2014-00234', experience: '12 yrs', status: 'OFF_DUTY', assignedVehicle: 'GJ 01 IJ 7890' },
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
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-full bg-charcoal-900 text-warm-50 text-xs font-semibold shadow-xl flex items-center gap-2 animate-in slide-in-from-top-3 border border-warm-300">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-200/80 pb-6">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-gold-700 mb-1 font-sans">
            <StarFlourish className="w-2.5 h-2.5 text-gold-600" />
            <span>Hospitality Mobility Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-charcoal-900 tracking-tight">
            Fleet &amp; Chauffeurs
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-600 mt-1 max-w-2xl font-sans">
            Manage your dedicated celebration vehicles, passenger capacities, chauffeur duty shifts, and Excel roster imports.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap font-sans">
          {activeTab === 'DRIVERS' && (
            <button
              onClick={() => setIsDriverImportOpen(true)}
              className="px-4 py-2 rounded-full border border-warm-300 text-xs font-bold text-charcoal-800 bg-warm-50 hover:bg-warm-100 shadow-2xs flex items-center gap-1.5 transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-terracotta-600" />
              <span>Import Chauffeurs Excel</span>
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
              className="px-5 py-2.5 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-gold-400" />
              <span>Add Vehicle</span>
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
              className="px-5 py-2.5 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-gold-400" />
              <span>Add Chauffeur</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Switcher and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-warm-200/80 pb-3 font-sans">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('VEHICLES')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'VEHICLES'
                ? 'bg-charcoal-900 text-white shadow-2xs'
                : 'bg-white/90 text-charcoal-700 hover:bg-warm-100/70 border border-warm-300'
            }`}
          >
            <Car className="w-3.5 h-3.5 text-gold-500" />
            <span>Vehicles ({vehicles.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('DRIVERS')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'DRIVERS'
                ? 'bg-charcoal-900 text-white shadow-2xs'
                : 'bg-white/90 text-charcoal-700 hover:bg-warm-100/70 border border-warm-300'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-gold-500" />
            <span>Chauffeurs ({drivers.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400" />
          <input
            type="text"
            placeholder={activeTab === 'VEHICLES' ? 'Search vehicles...' : 'Search chauffeurs...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-full border border-warm-300 bg-white/90 text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-terracotta-500/30"
          />
        </div>
      </div>

      {/* ==================================================== */}
      {/* VEHICLES TAB VIEW */}
      {/* ==================================================== */}
      {activeTab === 'VEHICLES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in font-sans">
          {filteredVehicles.length === 0 ? (
            <div className="col-span-full py-12 text-center text-charcoal-400 text-xs">
              No vehicles found. Click &ldquo;+ Add Vehicle&rdquo; to register fleet units.
            </div>
          ) : (
            filteredVehicles.map((veh) => (
              <div
                key={veh.id}
                className="p-5 rounded-3xl bg-white/95 border border-warm-200/90 shadow-2xs space-y-4 hover:border-warm-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-warm-100/90 border border-warm-200 flex items-center justify-center text-terracotta-700">
                        <Car className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-serif font-bold text-base text-charcoal-900">{veh.model}</h3>
                        <p className="text-xs font-mono text-terracotta-700 font-bold">{veh.plate}</p>
                      </div>
                    </div>

                    <StatusBadge status={veh.status} size="sm" />
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-warm-100 text-xs text-charcoal-600">
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

                <div className="pt-3 border-t border-warm-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingVehicle({ ...veh });
                      setIsVehicleModalOpen(true);
                    }}
                    className="p-1.5 text-charcoal-400 hover:text-charcoal-800 rounded-full hover:bg-warm-100 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingVehicle(veh)}
                    className="p-1.5 text-burgundy-600 hover:text-burgundy-800 rounded-full hover:bg-burgundy-50 transition-colors"
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
        <div className="bg-white/95 rounded-3xl border border-warm-200/90 shadow-2xs overflow-hidden animate-in fade-in font-sans">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-warm-200/80 bg-warm-100/40 text-[10px] font-bold text-charcoal-500 uppercase tracking-wider">
                  <th className="py-3 px-6">Chauffeur Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">License Number</th>
                  <th className="py-3 px-4">Assigned Vehicle</th>
                  <th className="py-3 px-4 text-center">Duty Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100 text-xs">
                {filteredDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-charcoal-400">
                      No chauffeurs found on roster.
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map((drv) => (
                    <tr key={drv.id} className="hover:bg-warm-50/50 transition-colors">
                      <td className="py-3 px-6 font-bold text-charcoal-900">
                        {drv.name}
                        {drv.experience && (
                          <span className="block text-[10px] text-charcoal-400 font-normal">
                            Exp: {drv.experience}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-charcoal-600 font-mono text-[11px]">
                        {drv.phone}
                      </td>
                      <td className="py-3 px-4 text-charcoal-700 font-mono text-[11px]">
                        {drv.licenseNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-charcoal-800">
                        {drv.assignedVehicle || 'Unassigned'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={drv.status} size="sm" />
                      </td>
                      <td className="py-3 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDriver({ ...drv });
                              setIsDriverModalOpen(true);
                            }}
                            className="p-1.5 text-charcoal-400 hover:text-charcoal-800 rounded-full hover:bg-warm-100"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingDriver(drv)}
                            className="p-1.5 text-burgundy-600 hover:text-burgundy-800 rounded-full hover:bg-burgundy-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs animate-in fade-in font-sans">
          <div className="bg-white rounded-3xl border border-warm-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-warm-100 pb-3">
              <h3 className="font-serif font-bold text-base text-charcoal-900">
                {vehicles.some((v) => v.id === editingVehicle.id) ? 'Edit Vehicle' : 'Register Vehicle'}
              </h3>
              <button
                onClick={() => setIsVehicleModalOpen(false)}
                className="text-charcoal-400 hover:text-charcoal-700 rounded-full p-1 hover:bg-warm-100"
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
                    placeholder="GJ 01 AB 1234"
                    value={editingVehicle.plate}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, plate: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-warm-300 text-xs focus:ring-2 focus:ring-terracotta-500/30 font-mono uppercase bg-warm-50/50"
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
                    className="w-full px-3 py-2 rounded-xl border border-warm-300 text-xs focus:ring-2 focus:ring-terracotta-500/30 bg-warm-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Category</label>
                  <select
                    value={editingVehicle.category}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-warm-300 text-xs focus:ring-2 focus:ring-terracotta-500/30 bg-white"
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
                    className="w-full px-3 py-2 rounded-xl border border-warm-300 text-xs focus:ring-2 focus:ring-terracotta-500/30 text-center bg-warm-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Assigned Chauffeur</label>
                  <select
                    value={editingVehicle.driverName || ''}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, driverName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-warm-300 text-xs focus:ring-2 focus:ring-terracotta-500/30 bg-white"
                  >
                    <option value="">-- No Chauffeur --</option>
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
                    className="w-full px-3 py-2 rounded-xl border border-warm-300 text-xs focus:ring-2 focus:ring-terracotta-500/30 bg-white"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="ON_DUTY">ON_DUTY</option>
                    <option value="OFF_DUTY">OFF_DUTY</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-warm-100">
              <button
                type="button"
                onClick={() => setIsVehicleModalOpen(false)}
                className="px-4 py-2 rounded-full border border-warm-300 text-xs font-semibold text-charcoal-600 hover:bg-warm-100"
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
                className="px-5 py-2 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white text-xs font-bold"
              >
                Save Vehicle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add Driver Modal */}
      {isDriverModalOpen && editingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs animate-in fade-in font-sans">
          <div className="bg-white rounded-3xl border border-warm-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-warm-100 pb-3">
              <h3 className="font-serif font-bold text-base text-charcoal-900">
                {drivers.some((d) => d.id === editingDriver.id) ? 'Edit Chauffeur' : 'Register Chauffeur'}
              </h3>
              <button
                onClick={() => setIsDriverModalOpen(false)}
                className="text-charcoal-400 hover:text-charcoal-700 rounded-full p-1 hover:bg-warm-100"
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
                  placeholder="e.g. Ramesh Bhai Patel"
                  value={editingDriver.name}
                  onChange={(e) => setEditingDriver({ ...editingDriver, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-warm-300 text-xs focus:ring-2 focus:ring-terracotta-500/30 bg-warm-50/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={editingDriver.phone}
                    onChange={(e) => setEditingDriver({ ...editingDriver, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-warm-300 text-xs focus:ring-2 focus:ring-terracotta-500/30 font-mono bg-warm-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">License (DL) Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="GJ-01-2018-00456"
                    value={editingDriver.licenseNumber}
                    onChange={(e) => setEditingDriver({ ...editingDriver, licenseNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-warm-300 text-xs focus:ring-2 focus:ring-terracotta-500/30 font-mono uppercase bg-warm-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Experience</label>
                  <input
                    type="text"
                    placeholder="e.g. 8 years"
                    value={editingDriver.experience || ''}
                    onChange={(e) => setEditingDriver({ ...editingDriver, experience: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-warm-300 text-xs focus:ring-2 focus:ring-terracotta-500/30 bg-warm-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Status</label>
                  <select
                    value={editingDriver.status}
                    onChange={(e) => setEditingDriver({ ...editingDriver, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-warm-300 text-xs focus:ring-2 focus:ring-terracotta-500/30 bg-white"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="ON_DUTY">ON_DUTY</option>
                    <option value="OFF_DUTY">OFF_DUTY</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-warm-100">
              <button
                type="button"
                onClick={() => setIsDriverModalOpen(false)}
                className="px-4 py-2 rounded-full border border-warm-300 text-xs font-semibold text-charcoal-600 hover:bg-warm-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editingDriver.name.trim() || !editingDriver.phone.trim() || !editingDriver.licenseNumber.trim()) return;
                  const exists = drivers.some((d) => d.id === editingDriver.id);
                  const updated = exists
                    ? drivers.map((d) => (d.id === editingDriver.id ? editingDriver : d))
                    : [editingDriver, ...drivers];
                  saveDrivers(updated);
                  setIsDriverModalOpen(false);
                  showToast(exists ? 'Chauffeur record updated.' : 'Chauffeur added to roster.');
                }}
                className="px-5 py-2 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white text-xs font-bold"
              >
                Save Chauffeur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chauffeurs Excel Import Modal */}
      {isDriverImportOpen && (
        <ExcelImportModal
          isOpen={isDriverImportOpen}
          title="Import Chauffeurs Manifest (Excel)"
          subtitle="Upload an Excel file with chauffeur names, contact numbers, and commercial driving license numbers."
          fields={DRIVER_IMPORT_FIELDS}
          sampleData={[
            { name: 'Ramesh Patel', phone: '+91 98765 43210', email: 'ramesh@chauffeur.in', licenseNumber: 'GJ-01-2018-00456', experience: '8 yrs', emergencyContact: '+91 98111 22233' },
            { name: 'Kishan Solanki', phone: '+91 98234 56789', email: 'kishan@chauffeur.in', licenseNumber: 'GJ-01-2015-00123', experience: '11 yrs', emergencyContact: '+91 98222 33344' },
          ]}
          templateFileName="safar_chauffeurs_template.xlsx"
          onClose={() => setIsDriverImportOpen(false)}
          onImport={(importedRows) => {
            const newDrivers: DriverRecord[] = importedRows.map((r, i) => ({
              id: `drv_imp_${Date.now()}_${i}`,
              name: String(r.name || 'Chauffeur'),
              phone: String(r.phone || ''),
              email: r.email ? String(r.email) : undefined,
              licenseNumber: String(r.licenseNumber || 'DL-PENDING'),
              experience: r.experience ? String(r.experience) : undefined,
              status: 'AVAILABLE',
            }));
            const updated = [...newDrivers, ...drivers];
            saveDrivers(updated);
            setIsDriverImportOpen(false);
            showToast(`Imported ${newDrivers.length} chauffeurs into roster.`);
          }}
        />
      )}

      {/* Delete Vehicle Confirmation */}
      {deletingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs animate-in fade-in font-sans">
          <div className="bg-white rounded-3xl border border-warm-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-burgundy-50 border border-burgundy-200 text-burgundy-700 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-charcoal-900">Remove Vehicle?</h3>
              <p className="text-xs text-charcoal-600 mt-1">
                Are you sure you want to remove <span className="font-bold text-charcoal-800">{deletingVehicle.model} ({deletingVehicle.plate})</span> from your fleet?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeletingVehicle(null)}
                className="px-4 py-2 rounded-full border border-warm-300 text-xs font-semibold text-charcoal-700 hover:bg-warm-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const updated = vehicles.filter((v) => v.id !== deletingVehicle.id);
                  saveVehicles(updated);
                  setDeletingVehicle(null);
                  showToast('Vehicle removed from fleet.');
                }}
                className="px-4 py-2 rounded-full bg-burgundy-800 hover:bg-burgundy-900 text-white text-xs font-bold shadow-xs"
              >
                Remove Vehicle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Driver Confirmation */}
      {deletingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs animate-in fade-in font-sans">
          <div className="bg-white rounded-3xl border border-warm-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-burgundy-50 border border-burgundy-200 text-burgundy-700 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-charcoal-900">Remove Chauffeur?</h3>
              <p className="text-xs text-charcoal-600 mt-1">
                Are you sure you want to remove <span className="font-bold text-charcoal-800">{deletingDriver.name}</span> from the chauffeur roster?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeletingDriver(null)}
                className="px-4 py-2 rounded-full border border-warm-300 text-xs font-semibold text-charcoal-700 hover:bg-warm-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const updated = drivers.filter((d) => d.id !== deletingDriver.id);
                  saveDrivers(updated);
                  setDeletingDriver(null);
                  showToast('Chauffeur removed from roster.');
                }}
                className="px-4 py-2 rounded-full bg-burgundy-800 hover:bg-burgundy-900 text-white text-xs font-bold shadow-xs"
              >
                Remove Chauffeur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
