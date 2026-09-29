import React from 'react';

export default function EventInfoPropertiesPanel({ section, updateSection }: { section: any; updateSection: (updates: any) => void }) {
  const content = section?.content || {};

  return (
    <div className="space-y-6 text-sm">
      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2">Fields to Display</label>
        
        <label className="flex items-center justify-between text-sm">
          <span>Show Date</span>
          <input 
            type="checkbox" 
            checked={content.showDate ?? true}
            onChange={(e) => updateSection({ showDate: e.target.checked })}
            className="w-4 h-4"
          />
        </label>

        <label className="flex items-center justify-between text-sm">
          <span>Show Time</span>
          <input 
            type="checkbox" 
            checked={content.showTime ?? true}
            onChange={(e) => updateSection({ showTime: e.target.checked })}
            className="w-4 h-4"
          />
        </label>
        
        <label className="flex items-center justify-between text-sm">
          <span>Show Location</span>
          <input 
            type="checkbox" 
            checked={content.showLocation ?? true}
            onChange={(e) => updateSection({ showLocation: e.target.checked })}
            className="w-4 h-4"
          />
        </label>
        
        <label className="flex items-center justify-between text-sm">
          <span>Show Event Format</span>
          <input 
            type="checkbox" 
            checked={content.showFormat ?? true}
            onChange={(e) => updateSection({ showFormat: e.target.checked })}
            className="w-4 h-4"
          />
        </label>
      </div>
      
      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2">Presentation</label>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Alignment</label>
          <select 
            className="w-full border rounded px-2 py-1.5 bg-white"
            value={content.alignment || 'left'}
            onChange={(e) => updateSection({ alignment: e.target.value })}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
          </select>
        </div>
      </div>
    </div>
  );
}
