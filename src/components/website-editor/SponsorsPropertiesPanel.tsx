import React from 'react';

export default function SponsorsPropertiesPanel({ section, updateSection }: { section: any; updateSection: (updates: any) => void }) {
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
            placeholder="Sponsors"
            onChange={(e) => updateSection({ heading: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Title</label>
          <input 
            type="text" 
            value={content.title || ''} 
            placeholder="Supported by industry leaders."
            onChange={(e) => updateSection({ title: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
          />
        </div>
      </div>

      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2">Presentation</label>
        
        <label className="flex items-center justify-between text-sm pt-2">
          <span>Show Sponsor Tiers</span>
          <input 
            type="checkbox" 
            checked={content.showTiers ?? true}
            onChange={(e) => updateSection({ showTiers: e.target.checked })}
            className="w-4 h-4"
          />
        </label>
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800">
        <p className="font-semibold mb-1">Live Data Binding Blocked</p>
        <p className="text-xs">
          The operational Sponsors module has not yet been built. This section will remain empty or show a placeholder on the live site until the Sponsors database source exists.
        </p>
      </div>
    </div>
  );
}
