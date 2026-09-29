import React from 'react';

export default function FooterPropertiesPanel({ section, updateSection }: { section: any; updateSection: (updates: any) => void }) {
  const content = section?.content || {};

  return (
    <div className="space-y-6 text-sm">
      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2">Content</label>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Logo Text</label>
          <input 
            type="text" 
            value={content.logoText || ''} 
            placeholder="ARAM BTS"
            onChange={(e) => updateSection({ logoText: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Description</label>
          <textarea 
            value={content.description || ''} 
            placeholder="Building the future of business and technology through meaningful connections."
            onChange={(e) => updateSection({ description: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white min-h-[80px]"
          />
        </div>
      </div>

      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2">Presentation</label>
        
        <label className="flex items-center justify-between text-sm pt-2">
          <span>Show Social Links</span>
          <input 
            type="checkbox" 
            checked={content.showSocial ?? true}
            onChange={(e) => updateSection({ showSocial: e.target.checked })}
            className="w-4 h-4"
          />
        </label>
      </div>
    </div>
  );
}
