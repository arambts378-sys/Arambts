"use client";

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Event, WebsiteConfig } from '@/types';
import { createClient } from '@/lib/supabase/client';

export default function CreateEventPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { createEvent } = useAppContext();

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    format: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    timezone: '',
    location: '',
    description: '',
  });

  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Walkathon specific state
  const [walkathonDistances, setWalkathonDistances] = useState([
    { distance_km: 3, name: '3 KM', capacity: '', is_active: true },
    { distance_km: 5, name: '5 KM', capacity: '', is_active: true }
  ]);

  const handleWalkathonDistanceChange = (index: number, field: string, value: any) => {
    const newDistances = [...walkathonDistances];
    newDistances[index] = { ...newDistances[index], [field]: value };
    setWalkathonDistances(newDistances);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.type || !formData.format || !formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime) {
      setError('Please complete all required fields.');
      return;
    }

    if (formData.format !== 'Virtual' && !formData.location) {
      setError('Location is required for In-person and Hybrid events.');
      return;
    }

    const eventId = Math.random().toString(36).substring(2, 10);
    const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + eventId.substring(0,4);

    try {
      setIsSubmitting(true);
      
      let uploadedFlyerUrl = '';
      if (fileInputRef.current?.files?.length) {
        const supabase = createClient();
        const file = fileInputRef.current.files[0];
        const fileExt = file.name.split('.').pop();
        const storedFileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `website_flyers/${storedFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('event-flyers')
          .upload(filePath, file);

        if (uploadError) {
          setError('Failed to upload flyer: ' + uploadError.message);
          setIsSubmitting(false);
          return;
        }

        const { data } = supabase.storage
          .from('event-flyers')
          .getPublicUrl(filePath);
          
        uploadedFlyerUrl = data.publicUrl;
      }

      const defaultWebsite: WebsiteConfig = {
        status: 'draft',
        draft: {
          templateId: 'minimal',
          status: 'draft',
          theme: {},
          sections: [
            { id: 'header', type: 'header', visible: true, order: 0 },
            { 
              id: 'hero', 
              type: 'hero', 
              visible: true, 
              order: 1,
              content: uploadedFlyerUrl ? {
                image: uploadedFlyerUrl,
                layout: 'banner',
                showEventInfo: false
              } : {}
            },
            { id: 'event_info', type: 'event_info', visible: true, order: 2 },
            { id: 'about', type: 'about', visible: true, order: 3 },
            { id: 'speakers', type: 'speakers', visible: false, order: 4 },
            { id: 'agenda', type: 'agenda', visible: false, order: 5 },
            { id: 'register', type: 'register', visible: true, order: 6 },
            { id: 'venue', type: 'venue', visible: formData.format !== 'Virtual', order: 7 },
            { id: 'sponsors', type: 'sponsors', visible: false, order: 8 },
            { id: 'exhibitors', type: 'exhibitors', visible: false, order: 9 },
            { id: 'contact', type: 'contact', visible: true, order: 10 },
            { id: 'final_cta', type: 'final_cta', visible: true, order: 11 },
            { id: 'footer', type: 'footer', visible: true, order: 12 },
          ]
        }
      };

      const newEvent: Event = {
        id: eventId,
        slug: slug,
        name: formData.name,
        type: formData.type,
        format: formData.format,
        startDate: formData.startDate,
        endDate: formData.endDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        timezone: formData.timezone,
        location: formData.location,
        description: formData.description,
        status: 'draft',
        createdAt: new Date().toISOString(),
        flyer: uploadedFlyerUrl || undefined,
        website: defaultWebsite
      };

      const createdEvent = await createEvent(newEvent);

      // If Walkathon, create distance categories
      if (formData.type === 'Walkathon') {
        const supabase = createClient();
        
        // Filter out inactive ones, or keep them but set is_active
        const distanceInserts = walkathonDistances.map(d => ({
          event_id: createdEvent.id,
          distance_km: d.distance_km,
          name: d.name,
          capacity: d.capacity ? parseInt(d.capacity as string) : null,
          is_active: d.is_active
        }));
        
        if (distanceInserts.length > 0) {
          const { error: distanceError } = await supabase
            .from('walkathon_distance_categories')
            .insert(distanceInserts);
            
          if (distanceError) {
            console.error('Failed to create walkathon distances:', distanceError);
            // Non-blocking error for event creation, but should be handled better in prod
          }
        }
      }

      router.push(`/app/events/${createdEvent.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create event. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <>
  <header className="w-full border-b border-[#E7E2DD] bg-[#FAF8F5]/80 backdrop-blur-md sticky top-0 z-30">
    <div className="max-w-6xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between">
      <div className="flex items-center gap-5">
        <button onClick={() => router.push('/app')} className="group flex items-center gap-2 text-sm font-medium text-[#6B6B6B] hover:text-[#171717] transition-colors py-1.5 px-2.5 -ml-2.5 rounded-lg hover:bg-[#F3EFE9]">
          <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
          <span>Events</span>
        </button>
        <div className="h-4 w-px bg-[#E7E2DD]"></div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-[#7A1F3D] text-[#FAF8F5] flex items-center justify-center font-bold text-xs tracking-tight shadow-sm">
            A
          </div>
          <span className="font-bold text-sm tracking-tight text-[#171717]">ARAM <span className="font-normal text-[#7A1F3D]">BTS</span></span>
        </div>
      </div>
    </div>
  </header>

  <main className="flex-1 w-full max-w-[820px] mx-auto px-6 sm:px-8 py-10 sm:py-14">
    <div className="mb-10 sm:mb-12">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F3EFE9] border border-[#E7E2DD] text-[11px] font-mono font-medium text-[#6B6B6B] mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-[#7A1F3D]"></span>
        <span>STEP 1 OF 1 • UNDER 1 MINUTE</span>
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#171717] leading-tight">
        Create your event
      </h1>
      <p className="text-base sm:text-lg text-[#6B6B6B] mt-2 font-normal">
        Start with the basics. You can add more details later.
      </p>
    </div>

    {error && (
      <div className="mb-8 p-4 rounded-xl bg-red-50/80 border border-red-200 text-red-900 flex items-start gap-3 smooth-fade">
        <span className="material-symbols-outlined text-red-600 text-xl mt-0.5">error</span>
        <div>
          <h4 className="text-sm font-semibold">Please complete required event information</h4>
          <p className="text-xs text-red-700 mt-0.5">{error}</p>
        </div>
      </div>
    )}

    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="name" className="block text-sm font-semibold text-[#171717]">
            Event name <span className="text-[#7A1F3D]">*</span>
          </label>
        </div>
        <input 
          type="text" 
          id="name" 
          name="name" 
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter your event name" 
          className="w-full px-4 py-3.5 bg-white border border-[#E7E2DD] rounded-xl text-base text-[#171717] placeholder:text-[#9E9E9E] focus:outline-none focus:ring-2 focus:ring-[#7A1F3D]/20 focus:border-[#7A1F3D] transition-all shadow-xs"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="type" className="block text-sm font-semibold text-[#171717]">
              Event type <span className="text-[#7A1F3D]">*</span>
            </label>
          </div>
          <div className="relative">
            <select 
              id="type" 
              name="type" 
              value={formData.type}
              onChange={handleChange}
              className="w-full appearance-none px-4 py-3.5 bg-white border border-[#E7E2DD] rounded-xl text-base text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#7A1F3D]/20 focus:border-[#7A1F3D] transition-all shadow-xs cursor-pointer"
            >
              <option value="" disabled className="text-[#9E9E9E]">Select event type</option>
              <option value="Conference">Conference</option>
              <option value="Corporate Event">Corporate Event</option>
              <option value="Workshop">Workshop</option>
              <option value="Exhibition">Exhibition</option>
              <option value="Summit">Summit</option>
              <option value="Networking">Networking</option>
              <option value="Training">Training</option>
              <option value="Walkathon">Walkathon</option>
              <option value="Other">Other</option>
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6B6B] text-[20px]">
              expand_more
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="format" className="block text-sm font-semibold text-[#171717]">
              Event format <span className="text-[#7A1F3D]">*</span>
            </label>
          </div>
          <div className="relative">
            <select 
              id="format" 
              name="format" 
              value={formData.format}
              onChange={handleChange}
              className="w-full appearance-none px-4 py-3.5 bg-white border border-[#E7E2DD] rounded-xl text-base text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#7A1F3D]/20 focus:border-[#7A1F3D] transition-all shadow-xs cursor-pointer"
            >
              <option value="" disabled className="text-[#9E9E9E]">Select event format</option>
              <option value="In-person">In-person</option>
              <option value="Virtual">Virtual</option>
              <option value="Hybrid">Hybrid</option>
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6B6B] text-[20px]">
              expand_more
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-[#171717]">
            Start <span className="text-[#7A1F3D]">*</span>
          </label>
          <div className="grid grid-cols-7 gap-2">
            <div className="col-span-4 relative">
              <input 
                type="date" 
                name="startDate" 
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-3 py-3.5 bg-white border border-[#E7E2DD] rounded-xl text-sm sm:text-base text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#7A1F3D]/20 focus:border-[#7A1F3D] transition-all shadow-xs"
              />
            </div>
            <div className="col-span-3 relative">
              <input 
                type="time" 
                name="startTime" 
                value={formData.startTime}
                onChange={handleChange}
                className="w-full px-3 py-3.5 bg-white border border-[#E7E2DD] rounded-xl text-sm sm:text-base text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#7A1F3D]/20 focus:border-[#7A1F3D] transition-all shadow-xs"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-[#171717]">
              End <span className="text-[#7A1F3D]">*</span>
            </label>
          </div>
          <div className="grid grid-cols-7 gap-2">
            <div className="col-span-4 relative">
              <input 
                type="date" 
                name="endDate" 
                value={formData.endDate}
                onChange={handleChange}
                className="w-full px-3 py-3.5 bg-white border border-[#E7E2DD] rounded-xl text-sm sm:text-base text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#7A1F3D]/20 focus:border-[#7A1F3D] transition-all shadow-xs"
              />
            </div>
            <div className="col-span-3 relative">
              <input 
                type="time" 
                name="endTime" 
                value={formData.endTime}
                onChange={handleChange}
                className="w-full px-3 py-3.5 bg-white border border-[#E7E2DD] rounded-xl text-sm sm:text-base text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#7A1F3D]/20 focus:border-[#7A1F3D] transition-all shadow-xs"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="timezone" className="block text-sm font-semibold text-[#171717]">
          Time zone
        </label>
        <div className="relative">
          <select 
            id="timezone" 
            name="timezone"
            value={formData.timezone}
            onChange={handleChange}
            className="w-full appearance-none px-4 py-3.5 bg-white border border-[#E7E2DD] rounded-xl text-base text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#7A1F3D]/20 focus:border-[#7A1F3D] transition-all shadow-xs cursor-pointer"
          >
            <option value="" disabled className="text-[#9E9E9E]">Select time zone</option>
            <option value="Asia/Kolkata">India Standard Time (IST) — UTC+05:30</option>
            <option value="America/New_York">Eastern Time (ET) — UTC-05:00 / -04:00</option>
            <option value="America/Los_Angeles">Pacific Time (PT) — UTC-08:00 / -07:00</option>
            <option value="Europe/London">Greenwich Mean Time / BST — UTC+00:00 / +01:00</option>
            <option value="Europe/Berlin">Central European Time (CET) — UTC+01:00 / +02:00</option>
            <option value="Asia/Singapore">Singapore Standard Time (SGT) — UTC+08:00</option>
            <option value="Asia/Dubai">Gulf Standard Time (GST) — UTC+04:00</option>
          </select>
          <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6B6B] text-[20px]">
            expand_more
          </span>
        </div>
      </div>

      {formData.format !== 'Virtual' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="location" className="block text-sm font-semibold text-[#171717]">
              Location <span className="text-[#7A1F3D]">*</span>
            </label>
            <span className="text-xs text-[#6B6B6B] font-mono">Physical venue</span>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6B6B] text-[20px]">
              location_on
            </span>
            <input 
              type="text" 
              id="location" 
              name="location" 
              value={formData.location}
              onChange={handleChange}
              placeholder="Enter event location" 
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-[#E7E2DD] rounded-xl text-base text-[#171717] placeholder:text-[#9E9E9E] focus:outline-none focus:ring-2 focus:ring-[#7A1F3D]/20 focus:border-[#7A1F3D] transition-all shadow-xs"
            />
          </div>
        </div>
      )}

      {formData.format === 'Virtual' && (
        <div className="p-4 rounded-xl bg-[#F8F4EF] border border-[#E7E2DD] flex items-center justify-between smooth-fade">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FAF0F3] border border-[#E3B9C6] flex items-center justify-center text-[#7A1F3D]">
              <span className="material-symbols-outlined text-[18px]">videocam</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#171717]">Online Event</p>
              <p className="text-xs text-[#6B6B6B]">You can add live stream links or meeting URLs later in the event workspace.</p>
            </div>
          </div>
          <span className="text-xs font-mono font-medium text-[#7A1F3D] bg-[#FAF0F3] px-2.5 py-1 rounded">No venue needed</span>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="description" className="block text-sm font-semibold text-[#171717]">
            Short description
          </label>
          <span className="text-xs font-mono text-[#6B6B6B]">Optional</span>
        </div>
        <textarea 
          id="description" 
          name="description" 
          value={formData.description}
          onChange={handleChange}
          rows={3} 
          placeholder="Tell attendees what this event is about"
          className="w-full px-4 py-3.5 bg-white border border-[#E7E2DD] rounded-xl text-base text-[#171717] placeholder:text-[#9E9E9E] focus:outline-none focus:ring-2 focus:ring-[#7A1F3D]/20 focus:border-[#7A1F3D] transition-all shadow-xs resize-y"
        ></textarea>
      </div>

      {formData.type === 'Walkathon' && (
        <div className="space-y-4 pt-6 border-t border-[#E7E2DD]">
          <div>
            <h3 className="text-lg font-bold text-[#171717]">Walkathon Configuration</h3>
            <p className="text-sm text-[#6B6B6B]">Configure the distances available for this walkathon.</p>
          </div>
          
          <div className="space-y-4">
            {walkathonDistances.map((distance, index) => (
              <div key={index} className="flex items-center gap-4 p-4 rounded-xl border border-[#E7E2DD] bg-[#FAF8F5]">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={distance.is_active}
                    onChange={(e) => handleWalkathonDistanceChange(index, 'is_active', e.target.checked)}
                    className="w-4 h-4 text-[#7A1F3D] border-[#D5CDC5] rounded focus:ring-[#7A1F3D]"
                  />
                </div>
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#6B6B6B] mb-1">Distance (KM)</label>
                    <input
                      type="number"
                      value={distance.distance_km}
                      onChange={(e) => handleWalkathonDistanceChange(index, 'distance_km', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#E7E2DD] rounded-lg text-sm"
                      disabled={!distance.is_active}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#6B6B6B] mb-1">Name</label>
                    <input
                      type="text"
                      value={distance.name}
                      onChange={(e) => handleWalkathonDistanceChange(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E7E2DD] rounded-lg text-sm"
                      disabled={!distance.is_active}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#6B6B6B] mb-1">Capacity (Optional)</label>
                    <input
                      type="number"
                      placeholder="Unlimited"
                      value={distance.capacity}
                      onChange={(e) => handleWalkathonDistanceChange(index, 'capacity', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E7E2DD] rounded-lg text-sm"
                      disabled={!distance.is_active}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-[#E7E2DD]"></div>

      <div className="rounded-2xl border border-[#E7E2DD] bg-[#FAF8F5] p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-[#7A1F3D]/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#7A1F3D] tracking-wide uppercase font-mono mb-2">
          <span className="text-sm leading-none">✦</span>
          <span>Have an event flyer?</span>
        </div>

        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#171717] mb-1.5">
          Turn your flyer into the starting point for your event website.
        </h3>
        <p className="text-sm text-[#6B6B6B] leading-relaxed max-w-2xl mb-5">
          Upload your event flyer and ARAM BTS can understand the event information and prepare the first version of your event website.
        </p>

        {!fileName ? (
          <div onClick={() => fileInputRef.current?.click()} className="border border-dashed border-[#D5CDC5] hover:border-[#7A1F3D] bg-white hover:bg-[#FAF0F3]/30 rounded-xl p-6 sm:p-7 text-center transition-all cursor-pointer group" >
            <div className="w-12 h-12 rounded-full bg-[#F8F4EF] group-hover:bg-[#FAF0F3] text-[#7A1F3D] flex items-center justify-center mx-auto mb-3 transition-colors">
              <span className="material-symbols-outlined text-[24px]">upload_file</span>
            </div>
            <div className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#FAF8F5] border border-[#E7E2DD] text-sm font-semibold text-[#171717] group-hover:text-[#7A1F3D] group-hover:border-[#7A1F3D] transition-all shadow-2xs mb-1.5">
              Upload Event Flyer
            </div>
            <p className="text-xs text-[#6B6B6B]">
              JPG, PNG or PDF • <span className="font-mono text-[#9E9E9E]">Optional</span>
            </p>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".jpg,.jpeg,.png,.pdf" className="hidden"  />
          </div>
        ) : (
          <div className="bg-white border border-[#E3B9C6] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs smooth-fade">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-lg bg-[#FAF0F3] border border-[#E3B9C6] flex items-center justify-center text-[#7A1F3D] shrink-0 font-mono font-bold text-xs">
                <span className="material-symbols-outlined text-[22px]">description</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-[#171717]">{fileName}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Flyer uploaded
                  </span>
                </div>
                <p className="text-xs text-[#6B6B6B] mt-0.5">
                  ARAM BTS will use this flyer when preparing your event website.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EFECE7]">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs font-semibold text-[#7A1F3D] hover:underline px-2 py-1">
                Replace
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".jpg,.jpeg,.png,.pdf" className="hidden"  />
              <span className="text-[#E7E2DD]">•</span>
              <button type="button" onClick={() => setFileName('')} className="text-xs font-semibold text-[#6B6B6B] hover:text-red-600 px-2 py-1">
                Remove
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="pt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 sm:gap-4">
        <button 
          type="button"
          onClick={() => router.push('/app')}
          className="w-full sm:w-auto px-5 py-3 rounded-xl border border-[#E7E2DD] bg-white hover:bg-[#F3EFE9] text-sm font-semibold text-[#171717] text-center transition-all shadow-xs"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#7A1F3D] text-white text-sm sm:text-base font-semibold shadow-sm transition-all flex items-center justify-center gap-2 hover:shadow-md hover:bg-[#4A1024] disabled:opacity-70"
        >
          <span>{isSubmitting ? 'Creating...' : 'Create Event'}</span>
          {!isSubmitting && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
        </button>
      </div>

    </form>
  </main>
    </>
  );
}