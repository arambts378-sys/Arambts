import React from 'react';

export default function ContactPropertiesPanel({ section, updateSection }: { section: any; updateSection: (updates: any) => void }) {
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
            placeholder="Contact"
            onChange={(e) => updateSection({ heading: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Title</label>
          <input 
            type="text" 
            value={content.title || ''} 
            placeholder="Get in touch."
            onChange={(e) => updateSection({ title: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Description</label>
          <textarea 
            value={content.description || ''} 
            placeholder="Have questions about the event? Our team is here to help."
            onChange={(e) => updateSection({ description: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white min-h-[80px]"
          />
        </div>
      </div>
      
      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2">Contact Details</label>
        
        <label className="flex items-center justify-between text-sm">
          <span>Show Email</span>
          <input 
            type="checkbox" 
            checked={content.showEmail ?? true}
            onChange={(e) => updateSection({ showEmail: e.target.checked })}
            className="w-4 h-4"
          />
        </label>
        
        <label className="flex items-center justify-between text-sm">
          <span>Show Phone</span>
          <input 
            type="checkbox" 
            checked={content.showPhone ?? true}
            onChange={(e) => updateSection({ showPhone: e.target.checked })}
            className="w-4 h-4"
          />
        </label>
        
        <label className="flex items-center justify-between text-sm">
          <span>Show Social Media</span>
          <input 
            type="checkbox" 
            checked={content.showSocial ?? true}
            onChange={(e) => updateSection({ showSocial: e.target.checked })}
            className="w-4 h-4"
          />
        </label>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-800">
        <p className="font-semibold mb-1">Live Data Connected</p>
        <p className="text-xs">
          The email and phone number are automatically pulled from the event's contact settings.
        </p>
      </div>
    </div>
  );
}
