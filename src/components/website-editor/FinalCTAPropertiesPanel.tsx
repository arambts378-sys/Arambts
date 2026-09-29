import React from 'react';

export default function FinalCTAPropertiesPanel({ section, updateSection }: { section: any; updateSection: (updates: any) => void }) {
  const content = section?.content || {};

  return (
    <div className="space-y-6 text-sm">
      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2">Content</label>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Title</label>
          <input 
            type="text" 
            value={content.title || ''} 
            placeholder="Ready to shape the future?"
            onChange={(e) => updateSection({ title: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
          />
        </div>
      </div>
      
      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2 flex items-center justify-between">
          <span>Primary Button</span>
          <input 
            type="checkbox" 
            checked={content.showPrimaryCta ?? true}
            onChange={(e) => updateSection({ showPrimaryCta: e.target.checked })}
            className="w-4 h-4"
          />
        </label>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Button Text</label>
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
          <label className="text-xs font-semibold text-gray-500 uppercase">Destination URL</label>
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
          <span>Secondary Button</span>
          <input 
            type="checkbox" 
            checked={content.showSecondaryCta ?? false}
            onChange={(e) => updateSection({ showSecondaryCta: e.target.checked })}
            className="w-4 h-4"
          />
        </label>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Button Text</label>
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
          <label className="text-xs font-semibold text-gray-500 uppercase">Destination URL</label>
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
