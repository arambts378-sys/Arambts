import React, { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AboutPropertiesPanel({ section, updateSection }: { section: any; updateSection: (updates: any) => void }) {
  const content = section?.content || {};
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `website_images/${fileName}`;

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
      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2">Content</label>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Section Heading</label>
          <input 
            type="text" 
            value={content.heading || ''} 
            placeholder="About the Event"
            onChange={(e) => updateSection({ heading: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Title / Main Text</label>
          <textarea 
            value={content.title || ''} 
            placeholder="Where leaders meet ideas, people, and possibilities."
            onChange={(e) => updateSection({ title: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white min-h-[80px]"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Description / Body</label>
          <textarea 
            value={content.description || ''} 
            placeholder="Add a detailed description about the event here..."
            onChange={(e) => updateSection({ description: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white min-h-[120px]"
          />
        </div>
      </div>

      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2">Image</label>
        
        {content.image ? (
          <div className="space-y-2">
            <img src={content.image} alt="About Section Preview" className="w-full h-32 object-cover bg-gray-200 rounded" />
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
          <div className="border border-dashed p-4 rounded text-center bg-white">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-sm font-semibold text-[#7A1F3D] bg-[#7A1F3D]/10 rounded hover:bg-[#7A1F3D]/20"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Add Image'}
            </button>
          </div>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        
        {content.image && (
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">Image Position</label>
            <select 
              className="w-full border rounded px-2 py-1.5 bg-white"
              value={content.imagePosition || 'right'}
              onChange={(e) => updateSection({ imagePosition: e.target.value })}
            >
              <option value="right">Right</option>
              <option value="left">Left</option>
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
