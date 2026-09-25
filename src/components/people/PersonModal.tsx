"use client";

import React, { useState, useEffect } from 'react';
import { EventPersonType, EventPerson } from '@/types';

interface PersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PersonFormData) => Promise<void>;
  initialData?: EventPerson | null;
  mode: 'add' | 'edit';
}

export interface PersonFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  organization: string;
  job_title: string;
  person_type: EventPersonType;
}

const defaultFormData: PersonFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  organization: '',
  job_title: '',
  person_type: 'attendee'
};

export default function PersonModal({ isOpen, onClose, onSave, initialData, mode }: PersonModalProps) {
  const [formData, setFormData] = useState<PersonFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData && initialData.person) {
        setFormData({
          first_name: initialData.person.first_name || '',
          last_name: initialData.person.last_name || '',
          email: initialData.person.email || '',
          phone: initialData.person.phone || '',
          organization: initialData.person.organization || '',
          job_title: initialData.person.job_title || '',
          person_type: initialData.person_type
        });
      } else {
        setFormData(defaultFormData);
      }
      setError(null);
    }
  }, [isOpen, initialData, mode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.first_name.trim() || !formData.email.trim() || !formData.person_type) {
      setError('First name, email, and person type are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save person. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/40">
          <h2 className="text-title-lg font-bold text-on-surface">
            {mode === 'add' ? 'Add Person' : 'Edit Person'}
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-highest text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-xl text-body-md border border-error/20 flex items-start gap-3">
              <span className="material-symbols-outlined text-error mt-0.5 text-lg">error</span>
              <p>{error}</p>
            </div>
          )}

          <form id="person-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            
            <div className="flex flex-col gap-2">
              <label className="text-label-md font-bold text-on-surface">Person Type *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="person_type" 
                    value="attendee" 
                    checked={formData.person_type === 'attendee'}
                    onChange={(e) => setFormData({...formData, person_type: e.target.value as EventPersonType})}
                    className="w-4 h-4 text-primary accent-primary"
                    disabled={mode === 'edit'} // Usually shouldn't change core participation type easily, or maybe it's fine. We disable for now.
                  />
                  <span className="text-body-md text-on-surface">Attendee</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="person_type" 
                    value="staff" 
                    checked={formData.person_type === 'staff'}
                    onChange={(e) => setFormData({...formData, person_type: e.target.value as EventPersonType})}
                    className="w-4 h-4 text-primary accent-primary"
                    disabled={mode === 'edit'}
                  />
                  <span className="text-body-md text-on-surface">Staff</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-label-sm font-medium text-on-surface-variant">First Name *</label>
                <input 
                  type="text" 
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  className="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md"
                  placeholder="Jane"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label-sm font-medium text-on-surface-variant">Last Name</label>
                <input 
                  type="text" 
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  className="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-label-sm font-medium text-on-surface-variant">Email Address *</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md"
                placeholder="jane@example.com"
                required
                disabled={mode === 'edit'} // Email is tied to workspace identity, hard to change easily.
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-label-sm font-medium text-on-surface-variant">Phone Number</label>
              <input 
                type="tel" 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md"
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-label-sm font-medium text-on-surface-variant">Organization</label>
                <input 
                  type="text" 
                  value={formData.organization}
                  onChange={(e) => setFormData({...formData, organization: e.target.value})}
                  className="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md"
                  placeholder="Company Name"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label-sm font-medium text-on-surface-variant">Job Title</label>
                <input 
                  type="text" 
                  value={formData.job_title}
                  onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                  className="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md"
                  placeholder="Director of Operations"
                />
              </div>
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-outline-variant/40 bg-surface-container/30 flex justify-end gap-3 rounded-b-2xl">
          <button 
            type="button" 
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 text-label-md font-bold text-on-surface hover:bg-surface-container-highest rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="person-form"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-primary text-white text-label-md font-bold rounded-lg hover:bg-primary/90 shadow-sm transition-all disabled:opacity-70 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                Saving...
              </>
            ) : 'Save Person'}
          </button>
        </div>

      </div>
    </div>
  );
}
