
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import EditorToolbar from '@/components/website-editor/EditorToolbar';
import WebsitePreview from '@/components/website-editor/WebsitePreview';
import TemplateGallery from '@/components/website-editor/TemplateGallery';
import SectionPropertiesPanel from '@/components/website-editor/SectionPropertiesPanel';
import { templates } from '@/data/templates';

const defaultSections = [
  { id: 'header', type: 'header', visible: true, order: 0 },
  { id: 'hero', type: 'hero', visible: true, order: 1 },
  { id: 'event_info', type: 'event_info', visible: true, order: 2 },
  { id: 'about', type: 'about', visible: true, order: 3 },
  { id: 'speakers', type: 'speakers', visible: true, order: 4 },
  { id: 'agenda', type: 'agenda', visible: true, order: 5 },
  { id: 'register', type: 'register', visible: true, order: 6 },
  { id: 'venue', type: 'venue', visible: true, order: 7 },
  { id: 'sponsors', type: 'sponsors', visible: true, order: 8 },
  { id: 'exhibitors', type: 'exhibitors', visible: true, order: 9 },
  { id: 'contact', type: 'contact', visible: true, order: 10 },
  { id: 'final_cta', type: 'final_cta', visible: true, order: 11 },
  { id: 'footer', type: 'footer', visible: true, order: 12 }
];

export default function EventOverviewPage() {
  const router = useRouter();
  const routeParams = useParams();
  const eventId = routeParams?.eventId as string;
  const { getEvent, updateEvent, isHydrated } = useAppContext();
  
  const [publishing, setPublishing] = useState(false);
  const [viewport, setViewport] = useState('desktop');
  const [zoom, setZoom] = useState(1);
  const [draft, setDraft] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const event = getEvent(eventId);

  useEffect(() => {
    if (event && !draft && history.length === 0) {
      let initialDraft = event.website?.draft;
      if (!initialDraft) {
        initialDraft = {
          templateId: event.website?.templateId || 'editorial',
          status: 'draft',
          theme: {},
          sections: event.website?.sections?.length ? event.website.sections : defaultSections
        };
      }
      setDraft(initialDraft);
      setHistory([initialDraft]);
      setHistoryIndex(0);
    }
  }, [event, draft, history]);

  if (!isHydrated) return null;
  if (!event) return <div className="p-10 text-center">Event not found</div>;
  if (!draft) return <div className="p-10 text-center">Loading editor...</div>;

  const pushHistory = (newDraft: any) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newDraft);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setDraft(newDraft);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setDraft(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setDraft(history[historyIndex + 1]);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    pushHistory({ ...draft, templateId });
  };

  const handleToggleSection = (sectionId: string) => {
    const newSections = draft.sections.map((s: any) => s.id === sectionId ? { ...s, visible: !s.visible } : s);
    pushHistory({ ...draft, sections: newSections });
  };

  const handleMoveSection = (sectionId: string, direction: string) => {
    const idx = draft.sections.findIndex((s: any) => s.id === sectionId);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === draft.sections.length - 1)) return;
    
    const newSections = [...draft.sections];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    
    const tempOrder = newSections[idx].order;
    newSections[idx].order = newSections[swapIdx].order;
    newSections[swapIdx].order = tempOrder;
    pushHistory({ ...draft, sections: newSections.sort((a: any, b: any) => a.order - b.order) });
  };

  const updateSectionConfig = (sectionId: string, updates: any) => {
    const newSections = draft.sections.map((s: any) => {
      if (s.id === sectionId) {
        return {
          ...s,
          content: { ...s.content, ...updates }
        };
      }
      return s;
    });
    pushHistory({ ...draft, sections: newSections });
  };


  const handleSave = async () => {
    try {
      setSaving(true);
      await updateEvent({
        ...event,
        website: {
          ...event.website,
          draft
        }
      });
      alert('Saved as draft!');
    } catch (err) {
      console.error('Error saving draft:', err);
      alert('Failed to save draft. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = () => {
    setPublishing(true);
    setTimeout(() => {
      const publishedState = { ...draft, status: 'published' };
      updateEvent({ 
        ...event,
        website: { 
          status: 'published',
          draft: publishedState,
          published: publishedState
        } 
      });
      setPublishing(false);
      setDraft(publishedState);
      alert('Website Published!');
    }, 800);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <EditorToolbar 
        event={event} 
        onPublish={handlePublish} 
        publishing={publishing}
        viewport={viewport}
        setViewport={setViewport}
        zoom={zoom}
        setZoom={setZoom}
        undo={undo}
        redo={redo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        handleSave={handleSave}
        saving={saving}
      />
      
      <div className="flex flex-1 min-h-0 relative">
        <aside className="w-[320px] bg-surface-container-lowest border-r flex flex-col h-full overflow-y-auto custom-scroll">
          <div className="p-3 font-semibold border-b flex justify-between items-center">
            <span>{activeSectionId ? `${activeSectionId.toUpperCase()} Settings` : 'Website Sections'}</span>
            {activeSectionId && (
              <button onClick={() => setActiveSectionId(null)} className="text-sm font-medium text-brand-maroon hover:underline">
                Back
              </button>
            )}
          </div>
          
          {!activeSectionId ? (
            <div className="p-2 space-y-2">
              {draft.sections.map((section: any) => (
                <div key={section.id} className="flex items-center justify-between p-2 border rounded hover:bg-surface-container cursor-pointer" onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return;
                  setActiveSectionId(section.id);
                }}>
                  <span>{section.id}</span>
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); handleToggleSection(section.id); }}>
                      <span className="material-symbols-outlined text-[16px]">
                        {section.visible ? 'visibility' : 'visibility_off'}
                      </span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleMoveSection(section.id, 'up'); }}><span className="material-symbols-outlined text-[16px]">arrow_upward</span></button>
                    <button onClick={(e) => { e.stopPropagation(); handleMoveSection(section.id, 'down'); }}><span className="material-symbols-outlined text-[16px]">arrow_downward</span></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 space-y-6">
              <SectionPropertiesPanel 
                section={draft.sections.find((s: any) => s.id === activeSectionId)} 
                updateSection={(updates: any) => updateSectionConfig(activeSectionId, updates)} 
              />
            </div>
          )}
        </aside>

        <WebsitePreview 
          event={event} 
          draft={draft} 
          viewport={viewport} 
          zoom={zoom} 
          activeSectionId={activeSectionId}
          onSectionClick={setActiveSectionId}
        />

        <TemplateGallery 
          selectedTemplateId={draft.templateId} 
          onSelect={handleTemplateSelect} 
        />
      </div>
    </div>
  );
}
