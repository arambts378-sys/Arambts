import React, { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function HeroPropertiesPanel({ section, updateSection }: { section: any; updateSection: (updates: any) => void }) {
  const content = section?.content || {};
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `website_flyers/${fileName}`;

    try {
      setUploading(true);
      const { error: uploadError } = await supabase.storage
        .from('event-flyers')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('event-flyers')
        .getPublicUrl(filePath);

      updateSection({ image: data.publicUrl });
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Failed to upload image.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 text-sm">
      <div className="space-y-3">
        <label className="font-semibold block">HERO IMAGE</label>
        
        {content.image ? (
          <div className="space-y-2 border rounded p-2 bg-gray-50">
            <span className="text-xs bg-[#7A1F3D] text-white px-2 py-0.5 rounded">Event flyer</span>
            <img src={content.image} alt="Hero Flyer Preview" className="w-full h-32 object-contain bg-gray-200 rounded" />
            <div className="flex justify-between gap-2 pt-2">
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="flex-1 px-2 py-1.5 text-xs font-semibold text-[#7A1F3D] border border-[#7A1F3D] rounded hover:bg-[#7A1F3D]/10"
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Replace Image'}
              </button>
              <button 
                onClick={() => updateSection({ image: null })} 
                className="px-2 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="border border-dashed p-4 rounded text-center">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-sm font-semibold text-[#7A1F3D] bg-[#7A1F3D]/10 rounded hover:bg-[#7A1F3D]/20"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Hero Image'}
            </button>
          </div>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      </div>

      <div className="space-y-2">
        <label className="font-semibold block">Layout</label>
        <select 
          className="w-full border rounded px-2 py-1.5 bg-white"
          value={content.layout || (content.image ? 'banner' : 'standard')}
          onChange={(e) => updateSection({ layout: e.target.value })}
        >
          <option value="banner">Flyer Banner</option>
          <option value="split">Split Hero</option>
          <option value="standard">Standard</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="font-semibold block">Image Fit</label>
        <select 
          className="w-full border rounded px-2 py-1.5 bg-white"
          value={content.imageFit || 'contain'}
          onChange={(e) => updateSection({ imageFit: e.target.value })}
        >
          <option value="contain">Contain</option>
          <option value="cover">Cover</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="font-semibold block">Image Alignment</label>
        <select 
          className="w-full border rounded px-2 py-1.5 bg-white"
          value={content.imageAlignment || 'center'}
          onChange={(e) => updateSection({ imageAlignment: e.target.value })}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="font-semibold block">Overlay</label>
        <div className="flex gap-2">
          <select 
            className="flex-1 border rounded px-2 py-1.5 bg-white"
            value={content.overlay || 'none'}
            onChange={(e) => updateSection({ overlay: e.target.value })}
          >
            <option value="none">None</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <select 
            className="flex-1 border rounded px-2 py-1.5 bg-white"
            value={content.overlayOpacity || '50'}
            onChange={(e) => updateSection({ overlayOpacity: e.target.value })}
            disabled={content.overlay === 'none'}
          >
            <option value="10">10%</option>
            <option value="25">25%</option>
            <option value="50">50%</option>
            <option value="75">75%</option>
            <option value="90">90%</option>
          </select>
        </div>
      </div>

      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2">Event Information</label>
        
        <label className="flex items-center justify-between text-sm">
          <span>Show Title</span>
          <input 
            type="checkbox" 
            checked={content.showTitle ?? (content.image ? false : true)}
            onChange={(e) => updateSection({ showTitle: e.target.checked })}
            className="w-4 h-4"
          />
        </label>
        
        <label className="flex items-center justify-between text-sm">
          <span>Show Date</span>
          <input 
            type="checkbox" 
            checked={content.showDate ?? (content.image ? false : true)}
            onChange={(e) => updateSection({ showDate: e.target.checked })}
            className="w-4 h-4"
          />
        </label>
        
        <label className="flex items-center justify-between text-sm">
          <span>Show Location</span>
          <input 
            type="checkbox" 
            checked={content.showLocation ?? (content.image ? false : true)}
            onChange={(e) => updateSection({ showLocation: e.target.checked })}
            className="w-4 h-4"
          />
        </label>

        <label className="flex items-center justify-between text-sm">
          <span>Show Description</span>
          <input 
            type="checkbox" 
            checked={content.showDescription ?? (content.image ? false : true)}
            onChange={(e) => updateSection({ showDescription: e.target.checked })}
            className="w-4 h-4"
          />
        </label>
      </div>

      <div className="space-y-2">
        <label className="font-semibold block">Hero Height</label>
        <select 
          className="w-full border rounded px-2 py-1.5 bg-white"
          value={content.heroHeight || 'medium'}
          onChange={(e) => updateSection({ heroHeight: e.target.value })}
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>

      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2 flex items-center justify-between">
          <span>Primary Call to Action</span>
          <input 
            type="checkbox" 
            checked={content.showPrimaryCta ?? true}
            onChange={(e) => updateSection({ showPrimaryCta: e.target.checked })}
            className="w-4 h-4"
          />
        </label>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Text</label>
          <input 
            type="text" 
            value={content.primaryCtaText || ''}
            placeholder="Register Now"
            onChange={(e) => updateSection({ primaryCtaText: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
            disabled={content.showPrimaryCta === false}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Destination (URL)</label>
          <input 
            type="text" 
            value={content.primaryCtaDest || ''}
            placeholder="/events/[slug]/register"
            onChange={(e) => updateSection({ primaryCtaDest: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white font-mono text-xs"
            disabled={content.showPrimaryCta === false}
          />
        </div>
      </div>

      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2 flex items-center justify-between">
          <span>Secondary Call to Action</span>
          <input 
            type="checkbox" 
            checked={content.showSecondaryCta ?? false}
            onChange={(e) => updateSection({ showSecondaryCta: e.target.checked })}
            className="w-4 h-4"
          />
        </label>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Text</label>
          <input 
            type="text" 
            value={content.secondaryCtaText || ''}
            placeholder="View Agenda"
            onChange={(e) => updateSection({ secondaryCtaText: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
            disabled={content.showSecondaryCta === false}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Destination (URL)</label>
          <input 
            type="text" 
            value={content.secondaryCtaDest || ''}
            placeholder="#agenda"
            onChange={(e) => updateSection({ secondaryCtaDest: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white font-mono text-xs"
            disabled={content.showSecondaryCta === false}
          />
        </div>
      </div>
    </div>
  );
}
