import React, { useState, useRef, useMemo, useEffect } from 'react';
import { attendeeImportService, FieldMapping, ImportedAttendeeRow, AttendeeImportPreview, AttendeeImportResult } from '@/services/attendeeImport';
import { useAppContext } from '@/context/AppContext';
import { createClient } from '@/lib/supabase/client';
interface AttendeeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onSuccess: () => void;
}

type Step = 'upload' | 'mapping' | 'preview' | 'result';

export default function AttendeeImportModal({ isOpen, onClose, eventId, onSuccess }: AttendeeImportModalProps) {
  const { activeWorkspace } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  
  const [mapping, setMapping] = useState<FieldMapping>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    organization: '',
    job_title: ''
  });

  const [preview, setPreview] = useState<AttendeeImportPreview | null>(null);
  const [result, setResult] = useState<AttendeeImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isWalkathon, setIsWalkathon] = useState(false);
  const [distanceCategories, setDistanceCategories] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && eventId) {
        const fetchEventData = async () => {
            const supabase = createClient();
            const { data: eventData } = await supabase.from('events').select('type').eq('id', eventId).single();
            if (eventData?.type === 'Walkathon') {
                setIsWalkathon(true);
                const { data: catData } = await supabase.from('walkathon_distance_categories').select('*').eq('event_id', eventId).eq('is_active', true);
                setDistanceCategories(catData || []);
            } else {
                setIsWalkathon(false);
                setDistanceCategories([]);
            }
        };
        fetchEventData();
    }
  }, [isOpen, eventId]);

  if (!isOpen) return null;

  const resetState = () => {
    setStep('upload');
    setFile(null);
    setRawRows([]);
    setHeaders([]);
    setPreview(null);
    setResult(null);
    setError(null);
    setMapping({ first_name: '', last_name: '', email: '', phone: '', organization: '', job_title: '', distance_category_id: '', gender: '', date_of_birth: '', age: '', t_shirt_size: '', emergency_contact_name: '', emergency_contact_phone: '', city: '', medical_notes: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Step 1: Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);
    
    // Validate size (5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setFile(selectedFile);
    
    try {
      const parsedRows = await attendeeImportService.parseFile(selectedFile);
      if (parsedRows.length === 0) {
        throw new Error("File contains no data rows");
      }
      
      const detectedHeaders = Object.keys(parsedRows[0]);
      setHeaders(detectedHeaders);
      setRawRows(parsedRows);
      
      // Auto-map common headers
      const lowerHeaders = detectedHeaders.map(h => h.toLowerCase().trim());
      
      const findMatch = (terms: string[]) => {
        const idx = lowerHeaders.findIndex(h => terms.some(t => h.includes(t)));
        return idx >= 0 ? detectedHeaders[idx] : '';
      };

      const newMapping: FieldMapping = {
        first_name: findMatch(['first name', 'given name', 'first', 'name']),
        last_name: findMatch(['last name', 'surname', 'last']),
        email: findMatch(['email', 'e-mail', 'mail']),
        phone: findMatch(['phone', 'mobile', 'contact', 'cell']),
        organization: findMatch(['company', 'organization', 'org', 'employer']),
        job_title: findMatch(['title', 'designation', 'role', 'job'])
      };

      if (isWalkathon) {
          newMapping.distance_category_id = findMatch(['distance', 'category', 'km']);
          newMapping.gender = findMatch(['gender', 'sex']);
          newMapping.date_of_birth = findMatch(['dob', 'date of birth', 'birth date']);
          newMapping.age = findMatch(['age', 'years']);
          newMapping.t_shirt_size = findMatch(['t-shirt', 'tshirt', 'shirt', 'size']);
          newMapping.emergency_contact_name = findMatch(['emergency name', 'emergency contact name', 'emergency_name']);
          newMapping.emergency_contact_phone = findMatch(['emergency phone', 'emergency contact phone', 'emergency_phone']);
          newMapping.city = findMatch(['city', 'town', 'location']);
          newMapping.medical_notes = findMatch(['medical', 'health', 'notes']);
      }

      setMapping(newMapping);

      setStep('mapping');
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
      setFile(null);
    }
  };

  // Step 2: Mapping -> Preview
  const handlePreview = () => {
    if (!mapping.first_name || !mapping.email) {
      setError('First Name and Email are required fields to map.');
      return;
    }
    setError(null);
    const generatedPreview = attendeeImportService.processMapping(rawRows, mapping, isWalkathon, distanceCategories);
    setPreview(generatedPreview);
    setStep('preview');
  };

  // Step 3: Preview -> Import
  const handleImport = async () => {
    if (!preview || preview.validRows === 0 || !file || !activeWorkspace) return;
    
    try {
      setIsImporting(true);
      setError(null);
      const importResult = await attendeeImportService.executeImport(
        activeWorkspace.id,
        eventId,
        file.name,
        preview.rows
      );
      setResult(importResult);
      setStep('result');
      onSuccess(); // Refresh people list
    } catch (err: any) {
      setError(err.message || 'Import failed unexpectedly.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface-container-lowest w-full max-w-3xl rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/40 flex items-center justify-between">
          <div>
            <h2 className="text-title-lg font-bold text-on-surface">Import Attendees</h2>
            <p className="text-body-sm text-on-surface-variant mt-1">
              {step === 'upload' && 'Upload a CSV or Excel file'}
              {step === 'mapping' && 'Map your columns'}
              {step === 'preview' && 'Review before importing'}
              {step === 'result' && 'Import complete'}
            </p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant">
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined">error</span>
              <p className="font-medium">{error}</p>
            </div>
          )}

          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-outline-variant rounded-xl bg-surface-container-lowest hover:bg-surface-container transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container mb-4">
                <span className="material-symbols-outlined text-[32px]">upload_file</span>
              </div>
              <h3 className="text-title-md font-bold mb-2">Click to upload or drag and drop</h3>
              <p className="text-body-md text-on-surface-variant">.csv or .xlsx (Max 5MB)</p>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" className="hidden" />
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries({
                  'first_name': 'First Name *',
                  'last_name': 'Last Name',
                  'email': 'Email *',
                  'phone': 'Phone',
                  'organization': 'Organization',
                  'job_title': 'Job Title',
                  ...(isWalkathon ? {
                    'distance_category_id': 'Distance Category *',
                    'gender': 'Gender *',
                    't_shirt_size': 'T-Shirt Size *',
                    'date_of_birth': 'Date of Birth',
                    'age': 'Age',
                    'emergency_contact_name': 'Emergency Contact Name *',
                    'emergency_contact_phone': 'Emergency Contact Phone *',
                    'city': 'City',
                    'medical_notes': 'Medical Notes'
                  } : {})
                }).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-label-sm font-bold text-on-surface-variant">{label}</label>
                    <select 
                      value={mapping[key as keyof FieldMapping]}
                      onChange={e => setMapping(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded focus:border-primary focus:outline-none"
                    >
                      <option value="">-- Ignore --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'preview' && preview && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-surface-container rounded-xl text-center">
                  <div className="text-headline-sm font-bold">{preview.totalRows}</div>
                  <div className="text-label-sm text-on-surface-variant uppercase tracking-wider">Total Rows</div>
                </div>
                <div className="p-4 bg-green-50 rounded-xl text-center text-green-800 border border-green-200">
                  <div className="text-headline-sm font-bold">{preview.validRows}</div>
                  <div className="text-label-sm uppercase tracking-wider">Valid</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-xl text-center text-orange-800 border border-orange-200">
                  <div className="text-headline-sm font-bold">{preview.duplicateRows}</div>
                  <div className="text-label-sm uppercase tracking-wider">Duplicates</div>
                </div>
                <div className="p-4 bg-red-50 rounded-xl text-center text-red-800 border border-red-200">
                  <div className="text-headline-sm font-bold">{preview.invalidRows}</div>
                  <div className="text-label-sm uppercase tracking-wider">Errors</div>
                </div>
              </div>

              {preview.errors.length > 0 && (
                <div className="border border-red-200 rounded-xl overflow-hidden mb-6">
                  <div className="bg-red-50 px-4 py-2 border-b border-red-200 font-bold text-red-800 flex items-center justify-between">
                    <span>Errors to review</span>
                    <span className="bg-red-200 text-red-900 text-xs px-2 py-0.5 rounded-full">{preview.errors.length}</span>
                  </div>
                  <ul className="divide-y divide-red-100 max-h-40 overflow-y-auto">
                    {preview.errors.map((err, i) => (
                      <li key={i} className="px-4 py-2 text-sm bg-white text-red-700 flex justify-between">
                        <span>Row {err.row}</span>
                        <span className="font-medium">{err.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-label-md font-bold text-on-surface mb-2">Sample of Valid Rows</div>
              <div className="border border-outline-variant/40 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-surface-container-lowest border-b border-outline-variant/40">
                    <tr>
                      <th className="px-4 py-2 font-bold text-on-surface-variant">Name</th>
                      <th className="px-4 py-2 font-bold text-on-surface-variant">Email</th>
                      {isWalkathon && (
                          <>
                              <th className="px-4 py-2 font-bold text-on-surface-variant">Distance</th>
                              <th className="px-4 py-2 font-bold text-on-surface-variant">Gender</th>
                              <th className="px-4 py-2 font-bold text-on-surface-variant">T-Shirt</th>
                          </>
                      )}
                      {!isWalkathon && <th className="px-4 py-2 font-bold text-on-surface-variant">Company</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40 bg-white">
                    {preview.rows.slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2">{r.first_name} {r.last_name}</td>
                        <td className="px-4 py-2">{r.email}</td>
                        {isWalkathon && (
                            <>
                                <td className="px-4 py-2">{r.distance_category_name}</td>
                                <td className="px-4 py-2">{r.gender}</td>
                                <td className="px-4 py-2">{r.t_shirt_size}</td>
                            </>
                        )}
                        {!isWalkathon && <td className="px-4 py-2">{r.organization}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'result' && result && (
            <div className="space-y-6 text-center py-6">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-green-600 mx-auto mb-4">
                <span className="material-symbols-outlined text-[40px]">check_circle</span>
              </div>
              <h3 className="text-headline-sm font-bold text-on-surface">Import Complete</h3>
              
              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mt-6 text-left">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-on-surface-variant">Total Rows:</span>
                  <span className="font-bold">{result.metrics.total_rows}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-on-surface-variant">Imported:</span>
                  <span className="font-bold text-green-600">{result.metrics.imported_count}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-on-surface-variant">Already Existed:</span>
                  <span className="font-bold">{result.metrics.existing_count}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-on-surface-variant">Duplicates Skipped:</span>
                  <span className="font-bold text-orange-600">{result.metrics.duplicate_count}</span>
                </div>
                <div className="flex justify-between py-2 border-b col-span-2">
                  <span className="text-on-surface-variant">Errors:</span>
                  <span className="font-bold text-red-600">{result.metrics.error_count}</span>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="mt-6 border border-red-200 rounded-xl overflow-hidden max-w-lg mx-auto text-left">
                   <div className="bg-red-50 px-4 py-2 font-bold text-red-800">Failed Imports</div>
                   <ul className="divide-y divide-red-100 max-h-40 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <li key={i} className="px-4 py-2 text-sm bg-white text-red-700">
                        {err.email} - {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-outline-variant/40 bg-surface-container-lowest flex justify-end gap-3">
          {step !== 'result' && (
            <button onClick={handleClose} className="px-5 py-2.5 text-label-md font-bold text-on-surface-variant hover:bg-surface-container rounded transition-colors" disabled={isImporting}>
              Cancel
            </button>
          )}
          
          {step === 'mapping' && (
            <button onClick={handlePreview} className="px-5 py-2.5 bg-primary text-white text-label-md font-bold rounded hover:bg-primary/90 transition-colors">
              Review Import
            </button>
          )}

          {step === 'preview' && (
            <button 
              onClick={handleImport} 
              disabled={isImporting || preview?.validRows === 0}
              className="px-5 py-2.5 bg-primary text-white text-label-md font-bold rounded hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isImporting ? (
                <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Importing...</>
              ) : (
                `Import ${preview?.validRows} Attendees`
              )}
            </button>
          )}

          {step === 'result' && (
            <button onClick={handleClose} className="px-5 py-2.5 bg-primary text-white text-label-md font-bold rounded hover:bg-primary/90 transition-colors">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
