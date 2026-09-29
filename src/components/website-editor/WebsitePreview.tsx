import React from 'react';
import { templates } from '@/data/templates';
import EventWebsiteRenderer from '@/components/event/EventWebsiteRenderer';

export default function WebsitePreview({ event, draft, viewport, zoom, activeSectionId, onSectionClick }: any) {
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
        {/* Render sections based on config using shared renderer */}
        <EventWebsiteRenderer 
          event={event} 
          websiteConfig={draft} 
          mode="editor" 
          activeSectionId={activeSectionId} 
          onSectionClick={onSectionClick} 
        />
      </div>
    </div>
  );
}
