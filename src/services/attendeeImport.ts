import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/client';

export interface ImportedAttendeeRow {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  organization: string;
  job_title: string;
  distance_category_id?: string;
  distance_category_name?: string;
  gender?: string;
  date_of_birth?: string;
  age?: number;
  t_shirt_size?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  city?: string;
  medical_notes?: string;
  _originalRowIndex: number;
}

export interface AttendeeImportPreview {
  rows: ImportedAttendeeRow[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  errors: { row: number; reason: string }[];
}

export interface AttendeeImportResult {
  success: boolean;
  metrics: {
    total_rows: number;
    imported_count: number;
    existing_count: number;
    duplicate_count: number;
    error_count: number;
  };
  errors: { first_name: string; email: string; error: string }[];
}

export type FieldMapping = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  organization: string;
  job_title: string;
  distance_category_id?: string;
  gender?: string;
  date_of_birth?: string;
  age?: string;
  t_shirt_size?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  city?: string;
  medical_notes?: string;
};

export const attendeeImportService = {
  /**
   * Parse a file into raw JSON objects.
   */
  async parseFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      
      if (ext === 'csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            resolve(results.data);
          },
          error: (error) => {
            reject(error);
          }
        });
      } else if (ext === 'xlsx') {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
            resolve(json);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
      } else {
        reject(new Error('Unsupported file format. Please upload .csv or .xlsx'));
      }
    });
  },

  /**
   * Apply column mapping to raw JSON objects to produce normalized rows,
   * while validating and detecting duplicates.
   */
  processMapping(rawRows: any[], mapping: FieldMapping, isWalkathon: boolean = false, distanceCategories: any[] = []): AttendeeImportPreview {
    const rows: ImportedAttendeeRow[] = [];
    const errors: { row: number; reason: string }[] = [];
    const seenEmails = new Set<string>();
    
    let validRows = 0;
    let duplicateRows = 0;

    rawRows.forEach((rawRow, index) => {
      const rowNum = index + 1;
      
      
      // Extract mapped fields
      const email = String(rawRow[mapping.email] || '').trim().toLowerCase();
      const firstName = String(rawRow[mapping.first_name] || '').trim();
      const lastName = String(rawRow[mapping.last_name] || '').trim();
      const phone = String(rawRow[mapping.phone] || '').trim();
      const organization = String(rawRow[mapping.organization] || '').trim();
      const jobTitle = String(rawRow[mapping.job_title] || '').trim();
      
      let distanceCategoryId = '';
      let distanceCategoryName = '';
      let gender = '';
      let dateOfBirth = '';
      let age: number | undefined;
      let tShirtSize = '';
      let emergencyContactName = '';
      let emergencyContactPhone = '';
      let city = '';
      let medicalNotes = '';

      if (isWalkathon) {
        const rawDistance = String(mapping.distance_category_id && rawRow[mapping.distance_category_id] ? rawRow[mapping.distance_category_id] : '').trim().toLowerCase();
        if (rawDistance) {
            const matchedCategory = distanceCategories.find(c => String(c.name).toLowerCase() === rawDistance || String(c.name).toLowerCase().replace(/\s+/g, '') === rawDistance.replace(/\s+/g, ''));
            if (matchedCategory) {
                distanceCategoryId = matchedCategory.id;
                distanceCategoryName = matchedCategory.name;
            } else {
                errors.push({ row: rowNum, reason: `Distance category "${String(rawRow[mapping.distance_category_id || ''])}" is not configured for this event.` });
                return;
            }
        } else {
             errors.push({ row: rowNum, reason: 'Distance category is required for Walkathon.' });
             return;
        }

        const rawGender = String(mapping.gender && rawRow[mapping.gender] ? rawRow[mapping.gender] : '').trim().toLowerCase();
        if (rawGender) {
            if (['m', 'male'].includes(rawGender)) gender = 'Male';
            else if (['f', 'female'].includes(rawGender)) gender = 'Female';
            else if (rawGender === 'other') gender = 'Other';
            else if (['prefer not to say', 'prefer_not_to_say', 'pnts'].includes(rawGender)) gender = 'Prefer not to say';
            else {
                errors.push({ row: rowNum, reason: 'Gender must be Male, Female, Other, or Prefer not to say.' });
                return;
            }
        } else {
            errors.push({ row: rowNum, reason: 'Gender is required for Walkathon.' });
            return;
        }

        const rawTShirt = String(mapping.t_shirt_size && rawRow[mapping.t_shirt_size] ? rawRow[mapping.t_shirt_size] : '').trim().toLowerCase();
        if (rawTShirt) {
            const sizeMap: Record<string, string> = {
                'xs': 'XS', 'extra small': 'XS',
                's': 'S', 'small': 'S',
                'm': 'M', 'medium': 'M',
                'l': 'L', 'large': 'L',
                'xl': 'XL', 'extra large': 'XL',
                'xxl': 'XXL', '2xl': 'XXL',
                'xxxl': 'XXXL', '3xl': 'XXXL'
            };
            if (sizeMap[rawTShirt]) {
                tShirtSize = sizeMap[rawTShirt];
            } else {
                errors.push({ row: rowNum, reason: 'Unsupported T-shirt size.' });
                return;
            }
        } else {
            errors.push({ row: rowNum, reason: 'T-shirt size is required for Walkathon.' });
            return;
        }

        emergencyContactName = String(mapping.emergency_contact_name && rawRow[mapping.emergency_contact_name] ? rawRow[mapping.emergency_contact_name] : '').trim();
        emergencyContactPhone = String(mapping.emergency_contact_phone && rawRow[mapping.emergency_contact_phone] ? rawRow[mapping.emergency_contact_phone] : '').trim();
        
        if (!emergencyContactName) {
            errors.push({ row: rowNum, reason: 'Emergency contact name is required for Walkathon.' });
            return;
        }
        if (!emergencyContactPhone) {
            errors.push({ row: rowNum, reason: 'Emergency contact phone is required for Walkathon.' });
            return;
        }

        dateOfBirth = String(mapping.date_of_birth && rawRow[mapping.date_of_birth] ? rawRow[mapping.date_of_birth] : '').trim();
        const rawAge = String(mapping.age && rawRow[mapping.age] ? rawRow[mapping.age] : '').trim();
        if (rawAge && !isNaN(Number(rawAge))) {
            age = Number(rawAge);
        }
        if (!dateOfBirth && !age) {
             errors.push({ row: rowNum, reason: 'Age or DOB is required for Walkathon.' });
             return;
        }

        city = String(mapping.city && rawRow[mapping.city] ? rawRow[mapping.city] : '').trim();
        medicalNotes = String(mapping.medical_notes && rawRow[mapping.medical_notes] ? rawRow[mapping.medical_notes] : '').trim();
      }

      if (!email || !firstName) {
        errors.push({ row: rowNum, reason: !email ? 'Missing email address' : 'Missing first name' });
        return;
      }
      
      // Basic email validation regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push({ row: rowNum, reason: 'Invalid email address format' });
        return;
      }

      if (seenEmails.has(email)) {
        duplicateRows++;
        return;
      }

      seenEmails.add(email);
      validRows++;
      
      const importedRow: ImportedAttendeeRow = {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        organization,
        job_title: jobTitle,
        _originalRowIndex: rowNum
      };

      if (isWalkathon) {
          importedRow.distance_category_id = distanceCategoryId;
          importedRow.distance_category_name = distanceCategoryName;
          importedRow.gender = gender;
          importedRow.t_shirt_size = tShirtSize;
          importedRow.emergency_contact_name = emergencyContactName;
          importedRow.emergency_contact_phone = emergencyContactPhone;
          if (dateOfBirth) importedRow.date_of_birth = dateOfBirth;
          if (age) importedRow.age = age;
          if (city) importedRow.city = city;
          if (medicalNotes) importedRow.medical_notes = medicalNotes;
      }

      rows.push(importedRow);
    });

    return {
      rows,
      totalRows: rawRows.length,
      validRows,
      invalidRows: errors.length,
      duplicateRows,
      errors
    };
  },

  /**
   * Execute the import by calling the Supabase RPC.
   */
  async executeImport(
    workspaceId: string, 
    eventId: string, 
    fileName: string, 
    rows: ImportedAttendeeRow[]
  ): Promise<AttendeeImportResult> {
    const supabase = createClient();
    
    // Remove temporary internal fields before sending to RPC
    const cleanRows = rows.map(r => {
      const { _originalRowIndex, ...cleanRow } = r;
      return cleanRow;
    });

    const { data, error } = await supabase.rpc('import_attendees', {
      p_workspace_id: workspaceId,
      p_event_id: eventId,
      p_file_name: fileName,
      p_rows: cleanRows
    });

    if (error) {
      throw error;
    }

    return data as AttendeeImportResult;
  }
};
