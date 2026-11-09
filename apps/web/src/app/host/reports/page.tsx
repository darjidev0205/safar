'use client';

import React, { useState, useEffect } from 'react';
import {
  Download,
  Users,
  Route,
  Car,
  TrendingUp,
  FileText,
  Calculator,
  ShieldCheck,
  Clock,
  Sparkles,
  ArrowUpRight,
  Info,
  AlertTriangle,
  BellRing,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { SafarButton, SafarCard, SafarBadge } from '../../../components/ui/safar-design-system';

interface ReconciliationSummary {
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  inProgressTrips: number;
  scheduledTrips: number;
  totalPlannedKm: number;
  totalActualKm: number;
  gpsOdometerDeltaKm: number;
  discrepancyPercentage: number;
  totalPassengersCarried: number;
  totalSeatCapacityProvided: number;
  seatingEfficiencyPct: number;
  onTimeDepartures: number;
  lateDepartures: number;
  onTimeRatePct: number;
  averageDepartureDelayMinutes: number;
}

interface DriverRecord {
  driverId: string;
  driverName: string;
  phoneNumber: string;
  licenseNumber: string;
  totalAssignedTrips: number;
  tripsCompleted: number;
  actualKmDriven: number;
  plannedKm: number;
  onTimeCount: number;
  lateCount: number;
  dutyHours: number;
  estimatedBillingAmount: number;
}

interface VehicleRecord {
  vehicleId: string;
  plateNumber: string;
  model: string;
  capacity: number;
  category: string;
  totalTrips: number;
  tripsCompleted: number;
  actualKmDriven: number;
  passengersCarried: number;
  seatUtilizationPct: number;
}

interface OperationalHealth {
  sosAlertsCount: number;
  staleGpsCount: number;
  notificationsSentCount: number;
  notificationsFailedCount: number;
  acknowledgementRatePct: number;
}

interface ReconciliationData {
  eventId: string;
  eventName: string;
  generatedAt: string;
  summary: ReconciliationSummary;
  driverRecords: DriverRecord[];
  vehicleRecords: VehicleRecord[];
  operationalHealth: OperationalHealth;
}

export default function HostReportsPage() {
  const [activeTab, setActiveTab] = useState<'costs' | 'drivers' | 'diagnostics' | 'manifests'>('costs');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReconciliationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  useEffect(() => {
    // Determine active event ID from localStorage or fetch host events
    const savedEventId = typeof window !== 'undefined' ? localStorage.getItem('safar_active_event_id') : null;
    if (savedEventId) {
      setActiveEventId(savedEventId);
      loadReport(savedEventId);
    } else {
      fetch('/api/events')
        .then((res) => res.json())
        .then((data) => {
          const events = data.events || data.data || [];
          if (events.length > 0) {
            const firstId = events[0].id;
            setActiveEventId(firstId);
            if (typeof window !== 'undefined') {
              localStorage.setItem('safar_active_event_id', firstId);
            }
            loadReport(firstId);
          } else {
            setLoading(false);
          }
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, []);

  const loadReport = async (eventId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/reports/reconciliation`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to load reconciliation report');
      }
      setReportData(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    const rows = [
      ['SAFAR Operational Reconciliation & GPS Audit Report'],
      ['Event', reportData.eventName],
      ['Generated At', reportData.generatedAt],
      [],
      ['Summary KPIs'],
      ['Total Trips', String(reportData.summary.totalTrips)],
      ['Completed Trips', String(reportData.summary.completedTrips)],
      ['Total Planned KM', String(reportData.summary.totalPlannedKm)],
      ['Total Actual GPS KM', String(reportData.summary.totalActualKm)],
      ['GPS Odometer Delta KM', String(reportData.summary.gpsOdometerDeltaKm)],
      ['Discrepancy %', `${reportData.summary.discrepancyPercentage}%`],
      ['Seating Utilization %', `${reportData.summary.seatingEfficiencyPct}%`],
      ['On-Time Departure Rate %', `${reportData.summary.onTimeRatePct}%`],
      [],
      ['Vehicle Metering Breakdown'],
      ['Plate Number', 'Model', 'Capacity', 'Completed Trips', 'Actual KM Driven', 'Passengers Carried', 'Seat Utilization %'],
      ...reportData.vehicleRecords.map((v) => [
        v.plateNumber,
        v.model,
        String(v.capacity),
        String(v.tripsCompleted),
        String(v.actualKmDriven),
        String(v.passengersCarried),
        `${v.seatUtilizationPct}%`,
      ]),
      [],
      ['Driver Chauffeur Billing Audit'],
      ['Driver Name', 'Phone', 'License', 'Completed Trips', 'Actual KM', 'Duty Hours', 'On-Time', 'Late', 'Estimated Billing (INR)'],
      ...reportData.driverRecords.map((d) => [
        d.driverName,
        d.phoneNumber,
        d.licenseNumber,
        String(d.tripsCompleted),
        String(d.actualKmDriven),
        String(d.dutyHours),
        String(d.onTimeCount),
        String(d.lateCount),
        String(d.estimatedBillingAmount),
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SAFAR_Reconciliation_${reportData.eventName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-gold-100/70 text-gold-900 border border-gold-200/60 font-sans">
              Financial &amp; Operations
            </span>
            <span className="text-xs text-charcoal-400 font-sans">
              Audit Trail &bull; GPS Odometer Verified &bull; Multi-Channel Orchestration
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal-900 tracking-tight">
            Vendor Reconciliation &amp; Audit
          </h1>
          <p className="text-xs text-charcoal-500 mt-1 max-w-2xl font-sans leading-relaxed">
            Independent, defensible vendor reconciliation comparing planned routes vs actual GPS odometer telemetry, seating utilization efficiency, driver hours, and SLA punctuality.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          {activeEventId && (
            <SafarButton
              variant="outline"
              size="sm"
              onClick={() => loadReport(activeEventId)}
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </SafarButton>
          )}
          <SafarButton
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={!reportData || reportData.summary.totalTrips === 0}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Manifest</span>
          </SafarButton>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-warm-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('costs')}
          className={`pb-3 text-xs font-semibold px-3 transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
            activeTab === 'costs'
              ? 'border-terracotta-600 text-terracotta-900'
              : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Vehicle Metering &amp; GPS Odometer</span>
        </button>
        <button
          onClick={() => setActiveTab('drivers')}
          className={`pb-3 text-xs font-semibold px-3 transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
            activeTab === 'drivers'
              ? 'border-terracotta-600 text-terracotta-900'
              : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
          }`}
        >
          <Car className="w-3.5 h-3.5" />
          <span>Chauffeur Hours &amp; Billing</span>
        </button>
        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`pb-3 text-xs font-semibold px-3 transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
            activeTab === 'diagnostics'
              ? 'border-terracotta-600 text-terracotta-900'
              : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Safety &amp; Telemetry Diagnostics</span>
        </button>
        <button
          onClick={() => setActiveTab('manifests')}
          className={`pb-3 text-xs font-semibold px-3 transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
            activeTab === 'manifests'
              ? 'border-terracotta-600 text-terracotta-900'
              : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Official Export Manifests</span>
        </button>
      </div>

      {loading && (
        <div className="p-12 text-center bg-white rounded-2xl border border-warm-200">
          <RefreshCw className="w-6 h-6 text-terracotta-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-charcoal-500 font-sans">Compiling live telemetry audit logs...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (!reportData || reportData.summary.totalTrips === 0) && (
        <div className="p-12 text-center bg-white rounded-2xl border border-warm-200 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-gold-100 text-gold-800 flex items-center justify-center mx-auto">
            <Route className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-lg text-charcoal-900">No Trips Scheduled Yet</h3>
          <p className="text-xs text-charcoal-500 max-w-md mx-auto leading-relaxed">
            Once you create functions, assign fleet vehicles, and schedule trips, real-time GPS odometer metering, vendor billing reconciliation, and seating efficiency calculations will appear here.
          </p>
        </div>
      )}

      {!loading && !error && reportData && reportData.summary.totalTrips > 0 && (
        <>
          {/* Top Operational Cost & Telemetry KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Planned vs Actual Distance */}
            <div className="p-5 rounded-2xl bg-white border border-warm-200 shadow-2xs relative overflow-hidden">
              <div className="text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider">
                Planned vs GPS Odometer
              </div>
              <div className="text-2xl font-serif font-bold text-charcoal-900 mt-2">
                {reportData.summary.totalActualKm} <span className="text-sm font-sans font-normal text-charcoal-500">km</span>
              </div>
              <div className="text-[11px] text-charcoal-500 mt-1 flex items-center gap-1.5">
                <span>Planned: {reportData.summary.totalPlannedKm} km</span>
                <span className="px-1.5 py-0.5 rounded bg-warm-100 text-charcoal-700 text-[10px] font-medium">
                  &Delta; {reportData.summary.gpsOdometerDeltaKm} km ({reportData.summary.discrepancyPercentage}%)
                </span>
              </div>
            </div>

            {/* Seating Efficiency */}
            <div className="p-5 rounded-2xl bg-white border border-warm-200 shadow-2xs relative overflow-hidden">
              <div className="text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider">
                Seating Utilization
              </div>
              <div className="text-2xl font-serif font-bold text-charcoal-900 mt-2">
                {reportData.summary.seatingEfficiencyPct}%
              </div>
              <div className="text-[11px] text-sage-800 mt-1 flex items-center gap-1">
                <Users className="w-3 h-3 text-sage-600" />
                <span>{reportData.summary.totalPassengersCarried} pax / {reportData.summary.totalSeatCapacityProvided} seats provided</span>
              </div>
            </div>

            {/* On-Time Punctuality */}
            <div className="p-5 rounded-2xl bg-white border border-warm-200 shadow-2xs relative overflow-hidden">
              <div className="text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider">
                On-Time Departures
              </div>
              <div className="text-2xl font-serif font-bold text-charcoal-900 mt-2">
                {reportData.summary.onTimeRatePct}%
              </div>
              <div className="text-[11px] text-charcoal-500 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-gold-600" />
                <span>Avg delay: {reportData.summary.averageDepartureDelayMinutes} mins ({reportData.summary.onTimeDepartures} on-time)</span>
              </div>
            </div>

            {/* Trip Completion Status */}
            <div className="p-5 rounded-2xl bg-white border border-warm-200 shadow-2xs relative overflow-hidden">
              <div className="text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider">
                Completed Runs
              </div>
              <div className="text-2xl font-serif font-bold text-charcoal-900 mt-2">
                {reportData.summary.completedTrips} <span className="text-sm font-sans font-normal text-charcoal-500">/ {reportData.summary.totalTrips}</span>
              </div>
              <div className="text-[11px] text-charcoal-500 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-sage-600" />
                <span>{reportData.summary.inProgressTrips} active &bull; {reportData.summary.cancelledTrips} cancelled</span>
              </div>
            </div>
          </div>

          {/* TAB 1: VEHICLE METERING */}
          {activeTab === 'costs' && (
            <div className="space-y-6">
              {/* Disclaimer */}
              <div className="p-4 rounded-2xl bg-warm-100/60 border border-warm-200 flex items-start gap-3">
                <Info className="w-4 h-4 text-gold-700 shrink-0 mt-0.5" />
                <div className="text-xs text-charcoal-700 leading-relaxed font-sans">
                  <strong>Defensible Audit Rule:</strong> Distances are derived strictly from cryptographically signed, kinematic-filtered GPS telemetry batches (accumulated actual road kilometers). Pure straight-line Haversine estimates are never accepted as billing mileage.
                </div>
              </div>

              {/* Vehicle Breakdown Table */}
              <div className="bg-white rounded-2xl border border-warm-200 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-warm-200 flex items-center justify-between bg-warm-50/50">
                  <div>
                    <h3 className="font-serif font-bold text-base text-charcoal-900">
                      Vehicle Telemetry &amp; Utilization Metering
                    </h3>
                    <p className="text-[11px] text-charcoal-500">
                      GPS odometer readings, passenger load, and seat capacity efficiency per vehicle.
                    </p>
                  </div>
                  <span className="text-xs text-charcoal-500 font-sans">
                    {reportData.vehicleRecords.length} vehicles audited
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-warm-200 bg-warm-50 text-[11px] font-semibold text-charcoal-600 uppercase tracking-wider">
                        <th className="p-3.5">Vehicle / Plate</th>
                        <th className="p-3.5">Category</th>
                        <th className="p-3.5">Capacity</th>
                        <th className="p-3.5">Completed Trips</th>
                        <th className="p-3.5">Actual GPS KM</th>
                        <th className="p-3.5">Passengers Carried</th>
                        <th className="p-3.5">Seat Utilization</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-100 font-sans">
                      {reportData.vehicleRecords.map((v) => (
                        <tr key={v.vehicleId} className="hover:bg-warm-50/50 transition-colors">
                          <td className="p-3.5 font-medium text-charcoal-900">
                            <div>{v.model}</div>
                            <div className="text-[10px] text-charcoal-400 font-mono mt-0.5">{v.plateNumber}</div>
                          </td>
                          <td className="p-3.5 text-charcoal-600">{v.category}</td>
                          <td className="p-3.5 text-charcoal-600">{v.capacity} seats</td>
                          <td className="p-3.5 text-charcoal-600">{v.tripsCompleted} runs</td>
                          <td className="p-3.5 font-semibold text-terracotta-900">{v.actualKmDriven} km</td>
                          <td className="p-3.5 text-charcoal-600">{v.passengersCarried} pax</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-full bg-sage-100 text-sage-900 font-bold text-[10px]">
                              {v.seatUtilizationPct}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHAUFFEUR HOURS & BILLING */}
          {activeTab === 'drivers' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-warm-200 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-warm-200 flex items-center justify-between bg-warm-50/50">
                  <div>
                    <h3 className="font-serif font-bold text-base text-charcoal-900">
                      Chauffeur Duty &amp; Punctuality Audit
                    </h3>
                    <p className="text-[11px] text-charcoal-500">
                      Verified on-duty hours, departure punctuality, and estimated vendor billing.
                    </p>
                  </div>
                  <span className="text-xs text-charcoal-500 font-sans">
                    {reportData.driverRecords.length} drivers audited
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-warm-200 bg-warm-50 text-[11px] font-semibold text-charcoal-600 uppercase tracking-wider">
                        <th className="p-3.5">Chauffeur</th>
                        <th className="p-3.5">License</th>
                        <th className="p-3.5">Runs Completed</th>
                        <th className="p-3.5">Actual GPS KM</th>
                        <th className="p-3.5">Duty Hours</th>
                        <th className="p-3.5">Punctuality</th>
                        <th className="p-3.5">Estimated Billing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-100 font-sans">
                      {reportData.driverRecords.map((d) => (
                        <tr key={d.driverId} className="hover:bg-warm-50/50 transition-colors">
                          <td className="p-3.5 font-medium text-charcoal-900">
                            <div>{d.driverName}</div>
                            <div className="text-[10px] text-charcoal-400 font-mono mt-0.5">{d.phoneNumber}</div>
                          </td>
                          <td className="p-3.5 text-charcoal-600 font-mono text-[11px]">{d.licenseNumber}</td>
                          <td className="p-3.5 text-charcoal-600">{d.tripsCompleted} runs</td>
                          <td className="p-3.5 font-semibold text-terracotta-900">{d.actualKmDriven} km</td>
                          <td className="p-3.5 text-charcoal-600">{d.dutyHours} hrs</td>
                          <td className="p-3.5 text-charcoal-600">
                            <span className="text-sage-700 font-medium">{d.onTimeCount} on-time</span>
                            {d.lateCount > 0 && <span className="text-terracotta-600 ml-1.5 font-medium">({d.lateCount} late)</span>}
                          </td>
                          <td className="p-3.5 font-bold text-charcoal-900">
                            ₹{d.estimatedBillingAmount.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SAFETY & TELEMETRY DIAGNOSTICS */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-warm-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-charcoal-400">
                    <span className="text-xs font-medium text-charcoal-600">Emergency SOS Incidents</span>
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="text-2xl font-serif font-bold text-charcoal-900">
                    {reportData.operationalHealth.sosAlertsCount}
                  </div>
                  <div className="text-[11px] text-charcoal-500 font-medium">Escalated to host desk</div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-warm-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-charcoal-400">
                    <span className="text-xs font-medium text-charcoal-600">Stale GPS Warnings</span>
                    <Clock className="w-4 h-4 text-gold-600" />
                  </div>
                  <div className="text-2xl font-serif font-bold text-charcoal-900">
                    {reportData.operationalHealth.staleGpsCount}
                  </div>
                  <div className="text-[11px] text-charcoal-500 font-medium">Lag &gt; 120s flagged</div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-warm-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-charcoal-400">
                    <span className="text-xs font-medium text-charcoal-600">Notifications Sent</span>
                    <BellRing className="w-4 h-4 text-terracotta-600" />
                  </div>
                  <div className="text-2xl font-serif font-bold text-charcoal-900">
                    {reportData.operationalHealth.notificationsSentCount}
                  </div>
                  <div className="text-[11px] text-sage-800 font-medium">
                    {reportData.operationalHealth.notificationsFailedCount} failed attempts
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-warm-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-charcoal-400">
                    <span className="text-xs font-medium text-charcoal-600">Acknowledgement Rate</span>
                    <CheckCircle2 className="w-4 h-4 text-sage-600" />
                  </div>
                  <div className="text-2xl font-serif font-bold text-charcoal-900">
                    {reportData.operationalHealth.acknowledgementRatePct}%
                  </div>
                  <div className="text-[11px] text-sage-800 font-medium">&quot;Got it&quot; confirmed</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: OFFICIAL EXPORT MANIFESTS */}
          {activeTab === 'manifests' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-warm-200 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-warm-200 flex items-center justify-between bg-warm-50/50">
                  <div>
                    <h3 className="font-serif font-bold text-base text-charcoal-900">
                      Available Manifests &amp; Audit Logs
                    </h3>
                    <p className="text-[11px] text-charcoal-500">
                      Official export formats for wedding planners and event coordination teams.
                    </p>
                  </div>
                  <span className="text-xs text-charcoal-400 font-sans">Ready for download</span>
                </div>

                <div className="divide-y divide-warm-100">
                  {[
                    {
                      title: 'Consolidated Vendor Billing & GPS Odometer Audit',
                      desc: 'Itemized mileage, vehicle capacity, driver hours, and planned vs actual road discrepancy.',
                      type: 'CSV',
                      action: handleExportCSV,
                    },
                    {
                      title: 'Passenger Transportation Manifest',
                      desc: 'Complete log of guest pickups, departures, room assignments, and chauffeur dispatches.',
                      type: 'CSV',
                      action: handleExportCSV,
                    },
                    {
                      title: 'Boarding Passcode Verification Audit',
                      desc: 'Driver timestamp logs verifying passenger passcode validation at boarding.',
                      type: 'CSV',
                      action: handleExportCSV,
                    },
                  ].map((rep, idx) => (
                    <div
                      key={idx}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-warm-50/50 transition-colors"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-terracotta-50 text-terracotta-700 border border-terracotta-200/60 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-serif font-bold text-sm text-charcoal-900">{rep.title}</h4>
                          <p className="text-xs text-charcoal-500 mt-0.5">{rep.desc}</p>
                          <span className="text-[10px] text-charcoal-400 mt-1 inline-block">
                            Live Export &bull; Format: {rep.type}
                          </span>
                        </div>
                      </div>

                      <SafarButton variant="outline" size="sm" onClick={rep.action}>
                        <Download className="w-3.5 h-3.5" />
                        <span>Download {rep.type}</span>
                      </SafarButton>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
