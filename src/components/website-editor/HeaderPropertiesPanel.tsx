import React from 'react';

export default function HeaderPropertiesPanel({ section, updateSection }: { section: any; updateSection: (updates: any) => void }) {
  const content = section?.content || {};

  return (
    <div className="space-y-6 text-sm">
      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2 flex items-center justify-between">
          <span>Logo & Branding</span>
        </label>
        
        <label className="flex items-center justify-between text-sm">
          <span>Show Logo Text</span>
          <input 
            type="checkbox" 
            checked={content.showLogoText ?? true}
            onChange={(e) => updateSection({ showLogoText: e.target.checked })}
            className="w-4 h-4"
          />
        </label>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Logo Text</label>
          <input 
            type="text" 
            value={content.logoText || ''} 
            placeholder="Event Name"
            onChange={(e) => updateSection({ logoText: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
            disabled={content.showLogoText === false}
          />
        </div>
      </div>

      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2 flex items-center justify-between">
          <span>Call to Action</span>
          <input 
            type="checkbox" 
            checked={content.showCta ?? true}
            onChange={(e) => updateSection({ showCta: e.target.checked })}
            className="w-4 h-4"
          />
        </label>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Text</label>
          <input 
            type="text" 
            value={content.ctaText || ''} 
            placeholder="Register Now"
            onChange={(e) => updateSection({ ctaText: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
            disabled={content.showCta === false}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Destination</label>
          <input 
            type="text" 
            value={content.ctaDest || ''} 
            placeholder="/events/[slug]/register"
            onChange={(e) => updateSection({ ctaDest: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white font-mono text-xs"
            disabled={content.showCta === false}
          />
        </div>
      </div>
      
      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2 flex items-center justify-between">
          <span>Navigation</span>
        </label>
        <p className="text-xs text-gray-500">
          Navigation links are automatically generated based on visible website sections.
        </p>
      </div>
    </div>
  );
}
