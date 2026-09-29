import React from 'react';

export default function AgendaPropertiesPanel({ section, updateSection }: { section: any; updateSection: (updates: any) => void }) {
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
            placeholder="Agenda"
            onChange={(e) => updateSection({ heading: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Title</label>
          <input 
            type="text" 
            value={content.title || ''} 
            placeholder="Two days of insights."
            onChange={(e) => updateSection({ title: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
          />
        </div>
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800">
        <p className="font-semibold mb-1">Live Data Binding Blocked</p>
        <p className="text-xs">
          The operational Agenda module has not yet been built. This section will remain empty or show a placeholder on the live site until the Agenda database source exists.
        </p>
      </div>
    </div>
  );
}
