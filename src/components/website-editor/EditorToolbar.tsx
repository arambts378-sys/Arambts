
import React from 'react';
import Link from 'next/link';

export default function EditorToolbar({ event, onPublish, publishing, setViewport, viewport, setZoom, zoom, undo, redo, canUndo, canRedo, handleSave, saving }: any) {
  return (
    <header className="h-14 bg-surface-container-lowest border-b border-outline-variant flex items-center justify-between px-space-md z-30 shrink-0 select-none">
      <div className="flex items-center gap-space-sm">
        <Link className="flex items-center gap-1 text-label-md font-label-md text-on-surface-variant hover:text-primary transition-colors py-1 px-2 rounded hover:bg-surface-container" href={`/app/events/${event.id}`}>
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Back to Event</span>
        </Link>
        <div className="h-5 w-[1px] bg-outline-variant mx-1"></div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="font-headline-sm text-headline-sm font-bold text-primary">{event.name}</span>
            <span className="text-label-sm font-label-sm text-on-surface-variant">/ Website Editor</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-mono-badge font-mono-badge bg-[#FDF6EB] text-[#8F5300] border border-[#F3DBB3]">
              STATUS: {event.website?.status === 'published' ? 'PUBLISHED' : 'DRAFT'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-space-sm">
        <div className="flex items-center p-0.5 bg-surface-container rounded border border-outline-variant">
          <button onClick={() => setViewport('desktop')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-label-sm font-label-sm ${viewport === 'desktop' ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm' : 'text-on-surface-variant'}`}>
            <span>Desktop</span>
          </button>
          <button onClick={() => setViewport('tablet')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-label-sm font-label-sm ${viewport === 'tablet' ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm' : 'text-on-surface-variant'}`}>
            <span>Tablet</span>
          </button>
          <button onClick={() => setViewport('mobile')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-label-sm font-label-sm ${viewport === 'mobile' ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm' : 'text-on-surface-variant'}`}>
            <span>Mobile</span>
          </button>
        </div>
        <div className="h-4 w-[1px] bg-outline-variant"></div>
        <div className="flex items-center gap-0.5 text-on-surface-variant">
          <button disabled={!canUndo} onClick={undo} className="p-1.5 disabled:opacity-50" title="Undo"><span className="material-symbols-outlined text-[18px]">undo</span></button>
          <button disabled={!canRedo} onClick={redo} className="p-1.5 disabled:opacity-50" title="Redo"><span className="material-symbols-outlined text-[18px]">redo</span></button>
          <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="bg-transparent text-sm ml-2 outline-none">
            <option value="0.5">50%</option>
            <option value="0.75">75%</option>
            <option value="1">100%</option>
            <option value="1.25">125%</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-label-md font-label-md bg-surface-container-lowest disabled:opacity-50">
          <span className="material-symbols-outlined text-[16px]">{saving ? 'sync' : 'save'}</span>
          <span>{saving ? 'Saving...' : 'Save'}</span>
        </button>
        <button onClick={onPublish} disabled={publishing} className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-primary-container text-on-primary font-semibold">
          <span>{publishing ? 'Publishing...' : 'Publish Website'}</span>
        </button>
      </div>
    </header>
  );
}
