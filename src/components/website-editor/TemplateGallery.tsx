
import React from 'react';
import { templates } from '@/data/templates';

export default function TemplateGallery({ selectedTemplateId, onSelect }: any) {
  return (
    <aside className="w-[280px] bg-surface-container-lowest border-l border-outline-variant flex flex-col shrink-0 select-none z-10">
      <div className="p-3 border-b font-semibold">Templates</div>
      <div className="p-3 space-y-4 overflow-y-auto">
        {templates.map(t => (
          <div 
            key={t.id} 
            onClick={() => onSelect(t.id)}
            className={`p-3 border rounded cursor-pointer ${t.id === selectedTemplateId ? 'border-primary bg-primary/5' : 'border-outline-variant'}`}
          >
            <h3 className="font-bold">{t.name}</h3>
            <p className="text-xs opacity-70">{t.description}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}
