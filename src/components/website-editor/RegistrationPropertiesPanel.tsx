import React from 'react';

export default function RegistrationPropertiesPanel({ section, updateSection }: { section: any; updateSection: (updates: any) => void }) {
  const content = section?.content || {};

  return (
    <div className="space-y-6 text-sm">
      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2">Content</label>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Section Heading</label>
          <input 
            type="text" 
            value={content.heading || ''} 
            placeholder="Secure Your Spot"
            onChange={(e) => updateSection({ heading: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Title</label>
          <input 
            type="text" 
            value={content.title || ''} 
            placeholder="Join us at ARAM BTS"
            onChange={(e) => updateSection({ title: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Description</label>
          <textarea 
            value={content.description || ''} 
            placeholder="Don't miss out on this opportunity to connect with industry leaders."
            onChange={(e) => updateSection({ description: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white min-h-[80px]"
          />
        </div>
      </div>

      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2">Button Settings</label>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Button Text</label>
          <input 
            type="text" 
            value={content.buttonText || ''} 
            placeholder="Register Now"
            onChange={(e) => updateSection({ buttonText: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Destination URL</label>
          <input 
            type="text" 
            value={content.buttonUrl || ''} 
            placeholder="/events/[slug]/register"
            onChange={(e) => updateSection({ buttonUrl: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white font-mono text-xs"
          />
          <p className="text-xs text-gray-500 mt-1">Leave empty to use the default ARAM BTS registration page.</p>
        </div>
      </div>
    </div>
  );
}
