'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Trash2,
  Edit2,
  Check,
  RefreshCw,
} from 'lucide-react';

export interface FieldDefinition {
  key: string;
  label: string;
  required?: boolean;
  type?: 'string' | 'email' | 'phone' | 'number';
  suggestedHeaders?: string[];
}

export interface ExcelImportModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  entityName?: string; // e.g. "Guests" or "Drivers"
  fields: FieldDefinition[];
  sampleData?: any[];
  templateFileName?: string;
  existingRecords?: Array<{ email?: string; phone?: string; id?: string }>;
  onClose: () => void;
  onImportComplete?: (records: any[]) => void;
  onImport?: (records: any[]) => void;
}

export function ExcelImportModal({
  isOpen,
  title,
  subtitle,
  entityName = 'Records',
  fields,
  sampleData,
  templateFileName,
  existingRecords = [],
  onClose,
  onImportComplete,
  onImport,
}: ExcelImportModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({}); // fieldKey -> excelHeader
  const [duplicateResolution, setDuplicateResolution] = useState<'skip' | 'update' | 'add'>('skip');
  const [validatedRows, setValidatedRows] = useState<any[]>([]);
  const [importSummary, setImportSummary] = useState<{
    imported: number;
    updated: number;
    skipped: number;
    errors: number;
  }>({ imported: 0, updated: 0, skipped: 0, errors: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // STEP 1: Handle File Upload & Parse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (rawJson.length === 0) {
          alert('The uploaded spreadsheet contains no data rows.');
          return;
        }

        const detectedHeaders = Object.keys(rawJson[0]);
        setHeaders(detectedHeaders);
        setExcelData(rawJson);

        // Auto-match columns based on suggested headers
        const initialMap: Record<string, string> = {};
        fields.forEach((f) => {
          const suggestions = [f.label.toLowerCase(), f.key.toLowerCase(), ...(f.suggestedHeaders || []).map((s) => s.toLowerCase())];
          const matchedHeader = detectedHeaders.find((h) => suggestions.includes(h.toLowerCase().trim()));
          if (matchedHeader) {
            initialMap[f.key] = matchedHeader;
          }
        });

        setColumnMap(initialMap);
        setStep(2); // Go to Column Mapping
      } catch (err: any) {
        alert('Failed to read Excel file: ' + err.message);
      }
    };

    reader.readAsBinaryString(uploadedFile);
  };

  // STEP 2: Validate Data & Generate Preview
  const handleProceedToPreview = () => {
    // Validate required fields mapped
    const missingRequired = fields.filter((f) => f.required && !columnMap[f.key]);
    if (missingRequired.length > 0) {
      alert(`Please map all required fields: ${missingRequired.map((m) => m.label).join(', ')}`);
      return;
    }

    const processed = excelData.map((row, index) => {
      const record: Record<string, any> = { _rowIndex: index + 1, _status: 'VALID', _errors: [] as string[] };

      fields.forEach((f) => {
        const mappedCol = columnMap[f.key];
        const val = mappedCol ? String(row[mappedCol] || '').trim() : '';
        record[f.key] = val;

        if (f.required && !val) {
          record._errors.push(`Missing required field: ${f.label}`);
          record._status = 'ERROR';
        }

        if (val && f.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(val)) {
            record._errors.push('Invalid email format');
            record._status = 'ERROR';
          }
        }

        if (val && f.type === 'phone') {
          const cleanPhone = val.replace(/[^0-9+]/g, '');
          if (cleanPhone.length < 8) {
            record._errors.push('Phone number is too short or invalid');
            record._status = 'WARNING';
          }
        }
      });

      // Check for duplicate in existing records
      const isExisting = existingRecords.some(
        (ex) =>
          (record.email && ex.email && record.email.toLowerCase() === ex.email.toLowerCase()) ||
          (record.phone && ex.phone && record.phone.replace(/[^0-9]/g, '') === ex.phone.replace(/[^0-9]/g, ''))
      );

      if (isExisting) {
        record._isDuplicate = true;
        if (record._status === 'VALID') {
          record._status = 'DUPLICATE';
        }
      }

      return record;
    });

    setValidatedRows(processed);
    setStep(3); // Go to Preview
  };

  // STEP 3: Confirm & Execute Import
  const handleConfirmImport = () => {
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    const finalRecords: any[] = [];

    validatedRows.forEach((r) => {
      if (r._status === 'ERROR') {
        errorCount++;
        return;
      }

      if (r._isDuplicate) {
        if (duplicateResolution === 'skip') {
          skippedCount++;
          return;
        } else if (duplicateResolution === 'update') {
          updatedCount++;
          finalRecords.push(r);
          return;
        }
      }

      importedCount++;
      finalRecords.push(r);
    });

    setImportSummary({
      imported: importedCount,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errorCount,
    });

    if (onImportComplete) onImportComplete(finalRecords);
    if (onImport) onImport(finalRecords);
    setStep(4); // Summary Result
  };

  const validCount = validatedRows.filter((r) => r._status === 'VALID').length;
  const duplicateCount = validatedRows.filter((r) => r._isDuplicate).length;
  const errorCount = validatedRows.filter((r) => r._status === 'ERROR').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl border border-charcoal-200 shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-charcoal-100 flex items-center justify-between bg-warm-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-safar-100 text-safar-800 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-safar-700">
                Excel Bulk Import Pipeline
              </span>
              <h2 className="text-base font-bold text-charcoal-900">
                {title} (Step {step} of 4)
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-charcoal-400 hover:text-charcoal-700 rounded-xl hover:bg-charcoal-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-charcoal-100 h-1">
          <div
            className="bg-safar-600 h-1 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* STEP 1: Upload */}
          {step === 1 && (
            <div className="text-center py-8 space-y-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-charcoal-300 hover:border-safar-500 rounded-3xl p-10 cursor-pointer bg-warm-50/50 hover:bg-warm-50 transition-all max-w-xl mx-auto space-y-4"
              >
                <div className="w-16 h-16 rounded-3xl bg-safar-50 text-safar-600 mx-auto flex items-center justify-center">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-charcoal-900">
                    Click or Drag &amp; Drop Spreadsheet (.xlsx, .xls, .csv)
                  </h3>
                  <p className="text-xs text-charcoal-500 mt-1 max-w-sm mx-auto">
                    Upload your guest list or driver roster. SAFAR automatically detects columns and provides interactive mapping.
                  </p>
                </div>
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl bg-charcoal-900 text-white font-semibold text-xs shadow-xs hover:bg-charcoal-800"
                >
                  Browse File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="p-4 rounded-2xl bg-charcoal-50 border border-charcoal-200 max-w-xl mx-auto text-left text-xs text-charcoal-600 space-y-1.5">
                <span className="font-bold text-charcoal-900 block">Spreadsheet Guidelines:</span>
                <p>&bull; First row should contain column headers (e.g. Name, Phone, Email, Hotel, Room).</p>
                <p>&bull; Column names do NOT need to match exactly; you can map them in the next step.</p>
                <p>&bull; Duplicate phone numbers and emails will be flagged before inserting.</p>
              </div>
            </div>
          )}

          {/* STEP 2: Column Mapping */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 rounded-2xl bg-safar-50 border border-safar-200 text-xs text-safar-800 flex items-center justify-between">
                <span>
                  Found <strong>{excelData.length} rows</strong> in <strong>{file?.name}</strong>. Map each SAFAR field to the corresponding Excel column.
                </span>
                <span className="font-mono text-[11px] font-bold bg-white px-2.5 py-1 rounded-lg border border-safar-200">
                  {headers.length} Columns Detected
                </span>
              </div>

              <div className="rounded-2xl border border-charcoal-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-charcoal-50 border-b border-charcoal-200 text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">SAFAR Destination Field</th>
                      <th className="py-3 px-4">Requirement</th>
                      <th className="py-3 px-4">Mapped Excel Column Header</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-charcoal-100">
                    {fields.map((f) => {
                      const selectedHeader = columnMap[f.key] || '';
                      return (
                        <tr key={f.key} className="hover:bg-warm-50/50">
                          <td className="py-3 px-4 font-bold text-charcoal-900">
                            {f.label}
                            <span className="block text-[10px] text-charcoal-400 font-mono font-normal">
                              field: {f.key}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {f.required ? (
                              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                                Mandatory *
                              </span>
                            ) : (
                              <span className="text-charcoal-400 text-[11px]">Optional</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={selectedHeader}
                              onChange={(e) => setColumnMap({ ...columnMap, [f.key]: e.target.value })}
                              className={`w-full max-w-xs px-3 py-1.5 rounded-xl border text-xs focus:ring-2 focus:ring-safar-500 font-medium ${
                                selectedHeader
                                  ? 'border-safar-400 bg-safar-50/30 text-safar-900 font-semibold'
                                  : f.required
                                  ? 'border-rose-300 bg-rose-50/20 text-charcoal-600'
                                  : 'border-charcoal-200 bg-white text-charcoal-600'
                              }`}
                            >
                              <option value="">-- Do Not Import / None --</option>
                              {headers.map((h) => (
                                <option key={h} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Duplicate Handling Policy */}
              <div className="p-4 rounded-2xl bg-warm-50 border border-charcoal-200 space-y-2 text-xs">
                <span className="font-bold text-charcoal-900 block">Duplicate Phone/Email Handling:</span>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'skip', label: 'Skip Duplicates', desc: 'Preserve existing records' },
                    { id: 'update', label: 'Update Existing', desc: 'Overwrite with new spreadsheet data' },
                    { id: 'add', label: 'Import Anyway', desc: 'Create multiple entries' },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        duplicateResolution === opt.id
                          ? 'border-safar-500 bg-white shadow-xs text-safar-900 font-semibold'
                          : 'border-charcoal-200 bg-white/50 text-charcoal-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="dupPolicy"
                        checked={duplicateResolution === opt.id}
                        onChange={() => setDuplicateResolution(opt.id as any)}
                        className="sr-only"
                      />
                      <div className="text-xs">{opt.label}</div>
                      <div className="text-[10px] text-charcoal-400 font-normal">{opt.desc}</div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Interactive Validation & Preview */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              {/* Validation Summary Bar */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-charcoal-50 border border-charcoal-200">
                  <span className="text-[10px] font-bold text-charcoal-500 uppercase">Total Rows</span>
                  <div className="text-xl font-black text-charcoal-900">{validatedRows.length}</div>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Valid Rows</span>
                  <div className="text-xl font-black text-emerald-800">{validCount}</div>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-700 uppercase">Duplicates</span>
                  <div className="text-xl font-black text-amber-800">{duplicateCount}</div>
                </div>
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
                  <span className="text-[10px] font-bold text-rose-700 uppercase">Errors</span>
                  <div className="text-xl font-black text-rose-800">{errorCount}</div>
                </div>
              </div>

              {/* Preview Table */}
              <div className="rounded-2xl border border-charcoal-200 overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-charcoal-50 sticky top-0 border-b border-charcoal-200 text-[10px] font-bold text-charcoal-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Row</th>
                      <th className="py-2.5 px-3">Status</th>
                      {fields.map((f) => (
                        <th key={f.key} className="py-2.5 px-3">{f.label}</th>
                      ))}
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-charcoal-100">
                    {validatedRows.map((r, idx) => {
                      const hasError = r._status === 'ERROR';
                      const isDup = r._isDuplicate;
                      return (
                        <tr key={idx} className={hasError ? 'bg-rose-50/40' : isDup ? 'bg-amber-50/40' : 'hover:bg-charcoal-50/30'}>
                          <td className="py-2 px-3 font-mono text-[11px] text-charcoal-400">{r._rowIndex}</td>
                          <td className="py-2 px-3">
                            {hasError ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                <AlertCircle className="w-3 h-3" /> Error
                              </span>
                            ) : isDup ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                <AlertTriangle className="w-3 h-3" /> Duplicate
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <Check className="w-3 h-3" /> Valid
                              </span>
                            )}
                          </td>
                          {fields.map((f) => (
                            <td key={f.key} className="py-2 px-3 text-charcoal-800 font-medium">
                              {r[f.key] || <span className="text-charcoal-300 italic">Empty</span>}
                            </td>
                          ))}
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setValidatedRows(validatedRows.filter((_, i) => i !== idx));
                              }}
                              className="p-1 text-charcoal-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                              title="Exclude this row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {errorCount > 0 && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <span className="font-bold">Rows with errors will be automatically skipped during import.</span>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      You can remove erroneous rows using the trash button or import the remaining valid records.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Import Complete Summary */}
          {step === 4 && (
            <div className="text-center py-6 space-y-6 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-charcoal-900">
                  Bulk Import Completed Successfully!
                </h3>
                <p className="text-xs text-charcoal-500 mt-1">
                  Records have been committed to PostgreSQL and are now available across dispatch dashboards.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-3 max-w-lg mx-auto text-xs">
                <div className="p-4 rounded-2xl bg-warm-50 border border-charcoal-200">
                  <span className="text-charcoal-400 text-[10px] font-bold block uppercase">Imported</span>
                  <div className="text-2xl font-black text-emerald-700 mt-1">{importSummary.imported}</div>
                </div>
                <div className="p-4 rounded-2xl bg-warm-50 border border-charcoal-200">
                  <span className="text-charcoal-400 text-[10px] font-bold block uppercase">Updated</span>
                  <div className="text-2xl font-black text-safar-700 mt-1">{importSummary.updated}</div>
                </div>
                <div className="p-4 rounded-2xl bg-warm-50 border border-charcoal-200">
                  <span className="text-charcoal-400 text-[10px] font-bold block uppercase">Skipped</span>
                  <div className="text-2xl font-black text-amber-700 mt-1">{importSummary.skipped}</div>
                </div>
                <div className="p-4 rounded-2xl bg-warm-50 border border-charcoal-200">
                  <span className="text-charcoal-400 text-[10px] font-bold block uppercase">Errors</span>
                  <div className="text-2xl font-black text-rose-700 mt-1">{importSummary.errors}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-charcoal-100 flex items-center justify-between bg-warm-50/70">
          {step > 1 && step < 4 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as any)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal-600 hover:bg-charcoal-100"
            >
              Previous
            </button>
          )}

          {step === 1 && <div />}

          {step === 2 && (
            <button
              type="button"
              onClick={handleProceedToPreview}
              className="px-5 py-2.5 rounded-xl bg-safar-600 hover:bg-safar-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
            >
              Validate &amp; Preview <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {step === 3 && (
            <button
              type="button"
              onClick={handleConfirmImport}
              className="px-6 py-2.5 rounded-xl bg-safar-600 hover:bg-safar-700 text-white font-bold text-xs shadow-md shadow-safar-600/30 flex items-center gap-2"
            >
              Confirm Import ({validCount + (duplicateResolution === 'update' ? duplicateCount : 0)} Records)
            </button>
          )}

          {step === 4 && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-charcoal-900 text-white font-bold text-xs hover:bg-charcoal-800"
            >
              Done &bull; View {entityName}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
