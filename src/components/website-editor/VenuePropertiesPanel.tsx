import React from 'react';

export default function VenuePropertiesPanel({ section, updateSection }: { section: any; updateSection: (updates: any) => void }) {
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
            placeholder="Venue"
            onChange={(e) => updateSection({ heading: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Description</label>
          <textarea 
            value={content.description || ''} 
            placeholder="Experience ARAM BTS in a state-of-the-art facility designed for collaboration."
            onChange={(e) => updateSection({ description: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white min-h-[80px]"
          />
        </div>
      </div>

      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2">Presentation</label>
        
        <label className="flex items-center justify-between text-sm pt-2">
          <span>Show Map</span>
          <input 
            type="checkbox" 
            checked={content.showMap ?? true}
            onChange={(e) => updateSection({ showMap: e.target.checked })}
            className="w-4 h-4"
          />
        </label>
      </div>
      
      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-800">
        <p className="font-semibold mb-1">Live Data Connected</p>
        <p className="text-xs">
          The venue name and location are automatically pulled from the event configuration.
        </p>
      </div>
    </div>
  );
}
