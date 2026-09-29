import React from 'react';

export default function SpeakersPropertiesPanel({ section, updateSection }: { section: any; updateSection: (updates: any) => void }) {
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
            placeholder="Speakers"
            onChange={(e) => updateSection({ heading: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Title</label>
          <input 
            type="text" 
            value={content.title || ''} 
            placeholder="Voices shaping what comes next."
            onChange={(e) => updateSection({ title: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
          />
        </div>
      </div>

      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2">Presentation</label>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Layout Style</label>
          <select 
            className="w-full border rounded px-2 py-1.5 bg-white"
            value={content.layout || 'grid'}
            onChange={(e) => updateSection({ layout: e.target.value })}
          >
            <option value="grid">Grid</option>
            <option value="carousel">Carousel</option>
          </select>
        </div>

        <label className="flex items-center justify-between text-sm pt-2">
          <span>Show Organization</span>
          <input 
            type="checkbox" 
            checked={content.showOrganization ?? true}
            onChange={(e) => updateSection({ showOrganization: e.target.checked })}
            className="w-4 h-4"
          />
        </label>
        
        <label className="flex items-center justify-between text-sm">
          <span>Show Role</span>
          <input 
            type="checkbox" 
            checked={content.showRole ?? true}
            onChange={(e) => updateSection({ showRole: e.target.checked })}
            className="w-4 h-4"
          />
        </label>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-800">
        <p className="font-semibold mb-1">Live Data Connected</p>
        <p className="text-xs">
          This section automatically displays speakers managed in the <strong>People</strong> module.
        </p>
      </div>
    </div>
  );
}
