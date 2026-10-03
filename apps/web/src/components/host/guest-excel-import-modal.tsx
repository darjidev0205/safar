'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Users,
  Copy,
  ArrowRight,
  RefreshCw,
  Info,
  Check,
  ChevronDown,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { SafarButton } from '../ui/safar-design-system';

interface GuestExcelImportModalProps {
  isOpen: boolean;
  eventId: string;
  eventName: string;
  onClose: () => void;
  onImportSuccess: () => void;
}

interface DuplicateItem {
  rowNumber: number;
  uploaded: any;
  existing: any;
  matchingField: string;
}

interface InvalidRowItem {
  rowNumber: number;
  row: any;
  reason: string;
}

export function GuestExcelImportModal({
  isOpen,
  eventId,
  eventName,
  onClose,
  onImportSuccess,
}: GuestExcelImportModalProps) {
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'duplicates' | 'importing' | 'completed'>('upload');
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Validation output from server
  const [summary, setSummary] = useState<{
    totalRows: number;
    validCount: number;
    duplicateCount: number;
    invalidCount: number;
  } | null>(null);
  const [validRows, setValidRows] = useState<any[]>([]);
  const [invalidRows, setInvalidRows] = useState<InvalidRowItem[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateItem[]>([]);

  // Duplicate resolution choices by row number: 'skip' | 'update' | 'import_new'
  const [resolutions, setResolutions] = useState<Record<number, 'skip' | 'update' | 'import_new'>>({});

  // Final summary after commit
  const [finalResult, setFinalResult] = useState<{
    importedCount: number;
    updatedCount: number;
    skippedCount: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    window.open(`/api/events/${eventId}/guests/template`, '_blank');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setErrorMsg(null);
    setValidating(true);

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const buffer = evt.target?.result;
          const workbook = XLSX.read(buffer, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (rawJson.length < 2) {
            throw new Error('The uploaded Excel sheet contains no guest data rows.');
          }

          const headers = rawJson[0].map((h: any) => String(h || '').trim().toLowerCase());
          const rows = rawJson.slice(1).filter((r: any[]) => r && r.some((c) => c !== undefined && c !== ''));

          // Send raw parsed rows to backend validation engine
          const token =
            typeof window !== 'undefined'
              ? localStorage.getItem('safar_auth_token') || profile?.email || ''
              : '';

          const res = await fetch(`/api/events/${eventId}/guests/import`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              'x-user-email': profile?.email || '',
            },
            body: JSON.stringify({
              mode: 'validate',
              headers,
              rows,
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data?.error?.message || 'Failed to validate guest records');
          }

          setSummary(data.summary);
          setValidRows(data.validRows || []);
          setInvalidRows(data.invalidRows || []);
          setDuplicates(data.duplicates || []);

          // Initialize default resolution for duplicates to 'skip'
          const initRes: Record<number, 'skip' | 'update' | 'import_new'> = {};
          (data.duplicates || []).forEach((d: DuplicateItem) => {
            initRes[d.rowNumber] = 'skip';
          });
          setResolutions(initRes);

          setStep('preview');
        } catch (err: any) {
          console.error('Validation error:', err);
          setErrorMsg(err.message || 'Error processing spreadsheet file');
        } finally {
          setValidating(false);
        }
      };
      reader.readAsBinaryString(uploadedFile);
    } catch (err: any) {
      setValidating(false);
      setErrorMsg(err.message || 'Failed to read file');
    }
  };

  const handleConfirmImport = async () => {
    setImporting(true);
    setErrorMsg(null);

    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('safar_auth_token') || profile?.email || ''
          : '';

      const itemsToCommit = [
        ...validRows.map((vr) => ({ ...vr, existingGuestId: null })),
        ...duplicates.map((dup) => ({
          ...dup.uploaded,
          existingGuestId: dup.existing?.id || null,
        })),
      ];

      const res = await fetch(`/api/events/${eventId}/guests/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-user-email': profile?.email || '',
        },
        body: JSON.stringify({
          mode: 'commit',
          items: itemsToCommit,
          duplicateResolutions: resolutions,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || 'Database import failed');
      }

      setFinalResult(data.summary);
      setStep('completed');
      onImportSuccess();
    } catch (err: any) {
      console.error('Import commit error:', err);
      setErrorMsg(err.message || 'Error saving imported guests to database');
    } finally {
      setImporting(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setStep('upload');
    setSummary(null);
    setValidRows([]);
    setInvalidRows([]);
    setDuplicates([]);
    setResolutions({});
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl border border-warm-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-warm-200 flex items-center justify-between bg-warm-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-terracotta-50 border border-terracotta-200 text-terracotta-700 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta-900 font-sans">
                Excel Roster Import
              </span>
              <h2 className="text-base sm:text-lg font-serif font-bold text-charcoal-900">
                Import Guest List into {eventName}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-charcoal-400 hover:text-charcoal-700 rounded-xl hover:bg-warm-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-charcoal-900 font-sans">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Upload File & Template Download */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Template Download Prompt */}
              <div className="p-5 rounded-2xl bg-warm-50 border border-warm-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider">
                    Verified SAFAR Excel Columns
                  </h4>
                  <p className="text-xs text-charcoal-600 mt-1 max-w-lg">
                    Download the pre-formatted Excel template with verified columns: Family Name, Guest Name, Relation, Mobile Number, Email, Members, Guest Category, Pickup, Drop, Hotel, Special Requirements, and Notes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2.5 rounded-xl bg-white border border-warm-300 text-xs font-bold text-charcoal-800 hover:border-warm-400 hover:bg-warm-100/50 flex items-center gap-2 shrink-0 shadow-2xs transition-all"
                >
                  <Download className="w-4 h-4 text-terracotta-600" />
                  Download Excel Template
                </button>
              </div>

              {/* Upload Drag & Drop Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`p-10 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                  validating
                    ? 'border-terracotta-400 bg-terracotta-50/30'
                    : 'border-warm-300 hover:border-terracotta-500 hover:bg-warm-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-terracotta-50 text-terracotta-700 flex items-center justify-center mb-3 shadow-xs">
                  <Upload className="w-7 h-7" />
                </div>

                <div className="text-sm font-bold text-charcoal-900 font-serif">
                  {validating ? 'Parsing & Validating Excel Rows...' : 'Click to Upload Guest Excel'}
                </div>
                <p className="text-xs text-charcoal-500 mt-1">
                  Supports Microsoft Excel spreadsheets (.xlsx, .xls)
                </p>

                {file && (
                  <div className="mt-3 px-3 py-1 rounded-full bg-warm-100 text-xs font-semibold text-charcoal-800 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-terracotta-600" />
                    {file.name}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Preview & Validation Summary (Req 14: 120 records detected: 116 valid, 3 duplicates, 1 invalid) */}
          {step === 'preview' && summary && (
            <div className="space-y-6">
              {/* Validation Summary Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-warm-50 border border-warm-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500 block">
                    Total Detected
                  </span>
                  <div className="text-xl font-serif font-bold text-charcoal-900 mt-0.5">
                    {summary.totalRows} records
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-sage-50 border border-sage-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sage-800 block">
                    Valid Guests
                  </span>
                  <div className="text-xl font-serif font-bold text-sage-900 mt-0.5">
                    {summary.validCount} valid
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-gold-50 border border-gold-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gold-800 block">
                    Duplicates
                  </span>
                  <div className="text-xl font-serif font-bold text-gold-900 mt-0.5">
                    {summary.duplicateCount} detected
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                    Invalid Rows
                  </span>
                  <div className="text-xl font-serif font-bold text-rose-900 mt-0.5">
                    {summary.invalidCount} invalid
                  </div>
                </div>
              </div>

              {/* Duplicate Detection Alert if Any */}
              {duplicates.length > 0 && (
                <div className="p-4 rounded-2xl bg-gold-50/80 border border-gold-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gold-700 text-white flex items-center justify-center shrink-0">
                      <Copy className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gold-950">
                        {duplicates.length} duplicate guest(s) detected
                      </h4>
                      <p className="text-[11px] text-gold-800">
                        Review matched records to choose whether to Skip, Update Existing, or Import as New.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('duplicates')}
                    className="px-3.5 py-1.5 rounded-xl bg-gold-700 hover:bg-gold-800 text-white text-xs font-bold shrink-0 transition-colors"
                  >
                    Resolve Duplicates
                  </button>
                </div>
              )}

              {/* Invalid Rows Section */}
              {invalidRows.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Invalid Rows ({invalidRows.length})
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {invalidRows.map((inv, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200 text-xs flex items-center justify-between text-rose-900"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md text-[11px]">
                            Row {inv.rowNumber}
                          </span>
                          <span className="font-semibold">{inv.row?.guestName || 'Unnamed Guest'}</span>
                          <span className="text-rose-600">({inv.reason})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Valid Rows Preview Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                    Valid Guests Preview ({validRows.length})
                  </h4>
                  <span className="text-[11px] text-charcoal-400">
                    Previewing top {Math.min(validRows.length, 10)} rows
                  </span>
                </div>

                <div className="border border-warm-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto max-h-60">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-warm-50 border-b border-warm-200 text-[11px] font-semibold text-charcoal-600 uppercase tracking-wider">
                        <tr>
                          <th className="px-3.5 py-2.5">Row</th>
                          <th className="px-3.5 py-2.5">Family</th>
                          <th className="px-3.5 py-2.5">Guest Name</th>
                          <th className="px-3.5 py-2.5">Mobile</th>
                          <th className="px-3.5 py-2.5">Members</th>
                          <th className="px-3.5 py-2.5">Pickup Location</th>
                          <th className="px-3.5 py-2.5">Hotel</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-warm-100 bg-white">
                        {validRows.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="hover:bg-warm-50/60">
                            <td className="px-3.5 py-2 text-charcoal-400 font-mono text-[11px]">
                              {row.rowNumber}
                            </td>
                            <td className="px-3.5 py-2 font-medium text-charcoal-700">
                              {row.familyName}
                            </td>
                            <td className="px-3.5 py-2 font-bold text-charcoal-900">
                              {row.fullName}
                            </td>
                            <td className="px-3.5 py-2 text-charcoal-600 font-mono text-[11px]">
                              {row.phoneNumber}
                            </td>
                            <td className="px-3.5 py-2 text-charcoal-800 font-semibold">
                              {row.memberCount}
                            </td>
                            <td className="px-3.5 py-2 text-charcoal-600 truncate max-w-[120px]">
                              {row.pickupLocation || '-'}
                            </td>
                            <td className="px-3.5 py-2 text-charcoal-600 truncate max-w-[120px]">
                              {row.hotelRoom || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Duplicate Resolution UI */}
          {step === 'duplicates' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-warm-200">
                <div>
                  <h3 className="font-serif font-bold text-base text-charcoal-900">
                    Duplicate Guest Resolution ({duplicates.length})
                  </h3>
                  <p className="text-xs text-charcoal-500">
                    Decide how to handle guests matching existing records in your host database.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const updated: any = {};
                      duplicates.forEach((d) => (updated[d.rowNumber] = 'skip'));
                      setResolutions(updated);
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-warm-100 text-charcoal-700 hover:bg-warm-200"
                  >
                    Skip All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated: any = {};
                      duplicates.forEach((d) => (updated[d.rowNumber] = 'update'));
                      setResolutions(updated);
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-terracotta-100 text-terracotta-900 hover:bg-terracotta-200"
                  >
                    Update All
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {duplicates.map((dup) => {
                  const currentDecision = resolutions[dup.rowNumber] || 'skip';
                  return (
                    <div
                      key={dup.rowNumber}
                      className="p-4 rounded-2xl bg-white border border-warm-200 shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gold-900 bg-gold-50 px-2 py-0.5 rounded-md border border-gold-200">
                          Row {dup.rowNumber} • Matched via {dup.matchingField}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setResolutions({ ...resolutions, [dup.rowNumber]: 'skip' })
                            }
                            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                              currentDecision === 'skip'
                                ? 'bg-charcoal-900 text-white shadow-xs'
                                : 'bg-warm-100 text-charcoal-600 hover:bg-warm-200'
                            }`}
                          >
                            Skip
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setResolutions({ ...resolutions, [dup.rowNumber]: 'update' })
                            }
                            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                              currentDecision === 'update'
                                ? 'bg-terracotta-600 text-white shadow-xs'
                                : 'bg-terracotta-50 text-terracotta-700 border border-terracotta-200 hover:bg-terracotta-100'
                            }`}
                          >
                            Update Existing
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setResolutions({ ...resolutions, [dup.rowNumber]: 'import_new' })
                            }
                            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                              currentDecision === 'import_new'
                                ? 'bg-gold-700 text-white shadow-xs'
                                : 'bg-gold-50 text-gold-800 border border-gold-200 hover:bg-gold-100'
                            }`}
                          >
                            Import as New
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-warm-50 border border-warm-200">
                          <span className="text-[10px] font-bold text-charcoal-400 block uppercase">
                            Existing Database Guest
                          </span>
                          <div className="font-bold text-charcoal-900 mt-0.5">
                            {dup.existing.fullName}
                          </div>
                          <div className="text-charcoal-600 text-[11px]">
                            Family: {dup.existing.familyName || 'None'} • {dup.existing.phoneNumber || dup.existing.email}
                          </div>
                          <div className="text-[10px] text-terracotta-700 mt-1 font-semibold">
                            {dup.existing.isAlreadyInEvent
                              ? 'Already in this event'
                              : 'Exists in host database'}
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-terracotta-50/50 border border-terracotta-200">
                          <span className="text-[10px] font-bold text-terracotta-900 block uppercase">
                            Uploaded Excel Guest
                          </span>
                          <div className="font-bold text-terracotta-950 mt-0.5">
                            {dup.uploaded.fullName}
                          </div>
                          <div className="text-terracotta-800 text-[11px]">
                            Family: {dup.uploaded.familyName} • {dup.uploaded.phoneNumber || dup.uploaded.email}
                          </div>
                          <div className="text-[10px] text-terracotta-900 mt-1 font-semibold">
                            {dup.uploaded.memberCount} Members • {dup.uploaded.pickupLocation || 'No pickup'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Completed Result */}
          {step === 'completed' && finalResult && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-sage-100 text-sage-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-serif font-bold text-charcoal-900">
                Guests Imported Successfully!
              </h3>
              <p className="text-xs text-charcoal-600 max-w-md mx-auto">
                All guest records and family groupings have been saved to your real database and associated with {eventName}.
              </p>

              <div className="inline-flex items-center gap-4 p-4 rounded-2xl bg-warm-50 border border-warm-200 text-xs font-semibold text-charcoal-800">
                <div>
                  <span className="text-sage-800 font-bold text-base block font-serif">
                    {finalResult.importedCount}
                  </span>
                  New Imported
                </div>
                <div className="w-px h-8 bg-warm-200" />
                <div>
                  <span className="text-terracotta-700 font-bold text-base block font-serif">
                    {finalResult.updatedCount}
                  </span>
                  Updated
                </div>
                <div className="w-px h-8 bg-warm-200" />
                <div>
                  <span className="text-charcoal-500 font-bold text-base block font-serif">
                    {finalResult.skippedCount}
                  </span>
                  Skipped
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-warm-200 flex items-center justify-between bg-warm-50/50">
          {step === 'upload' && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-warm-200 text-xs font-semibold text-charcoal-700 hover:bg-warm-100"
            >
              Cancel
            </button>
          )}

          {step === 'preview' && (
            <>
              <button
                type="button"
                onClick={resetAll}
                className="px-4 py-2 rounded-xl border border-warm-200 text-xs font-semibold text-charcoal-700 hover:bg-warm-100 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Fix &amp; Upload Again
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-warm-200 text-xs font-semibold text-charcoal-700 hover:bg-warm-100"
                >
                  Cancel
                </button>
                <SafarButton
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={validRows.length === 0 && duplicates.length === 0}
                  onClick={handleConfirmImport}
                >
                  Import Valid Guests ({validRows.length})
                </SafarButton>
              </div>
            </>
          )}

          {step === 'duplicates' && (
            <>
              <button
                type="button"
                onClick={() => setStep('preview')}
                className="px-4 py-2 rounded-xl border border-warm-200 text-xs font-semibold text-charcoal-700 hover:bg-warm-100"
              >
                Back to Preview
              </button>
              <SafarButton
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setStep('preview')}
              >
                Save Decisions &amp; Continue
              </SafarButton>
            </>
          )}

          {step === 'completed' && (
            <div className="w-full flex justify-end">
              <SafarButton
                type="button"
                variant="primary"
                size="sm"
                onClick={onClose}
              >
                Done
              </SafarButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
