
import React from 'react';
import { templates } from '@/data/templates';

export default function WebsitePreview({ event, draft, viewport, zoom }: any) {
  const template = templates.find(t => t.id === draft.templateId) || templates[0];
  
  let width = '100%';
  if (viewport === 'desktop') width = '1440px';
  if (viewport === 'tablet') width = '768px';
  if (viewport === 'mobile') width = '390px';

  const visibleSections = draft.sections.filter((s: any) => s.visible).sort((a: any, b: any) => a.order - b.order);

  return (
    <div className="flex-1 bg-surface-container-high overflow-auto custom-scroll relative flex items-start justify-center p-8">
      <div 
        style={{ 
          width, 
          transform: `scale(${zoom})`, 
          transformOrigin: 'top center',
          minHeight: '800px',
          backgroundColor: template.colors.background,
          color: template.colors.text
        }} 
        className="shadow-2xl transition-all duration-300"
      >
        {/* Render sections based on config */}
        {visibleSections.map((section: any) => (
          <div key={section.id} className="p-8 border-b" style={{ borderColor: template.colors.secondary }}>
            <h2 className="text-3xl font-bold mb-4" style={{ color: template.colors.primary }}>
              {section.id === 'hero' ? event.name : section.type.toUpperCase()}
            </h2>
            {section.id === 'hero' && <p>{event.description}</p>}
            {section.id === 'venue' && <p>{event.location}</p>}
            <p className="opacity-70 text-sm mt-4">Section Type: {section.type}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
