'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  Trash2,
  Plus,
  FileStack,
  Download,
  Loader2,
  ImagePlus,
  X,
  RotateCw,
  Copy,
} from 'lucide-react';
import {
  loadPdfFile,
  makeBlankWorkingPage,
  renderPageThumbnail,
  buildExportedPdf,
  downloadPdfBytes,
  genPageId,
  type WorkingPage,
  type SourceDoc,
  type ImageOverlaySpec,
} from '@/lib/pdfToolsEngine';
import { Button } from '@/components/builder/ui';

type Thumb = { url: string | null; loading: boolean };

export default function PdfToolsPage() {
  const [sourceDocs, setSourceDocs] = useState<Map<string, SourceDoc>>(new Map());
  const [pages, setPages] = useState<WorkingPage[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, Thumb>>({});
  const [overlays, setOverlays] = useState<Map<string, ImageOverlaySpec>>(new Map());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overlayPanelOpen, setOverlayPanelOpen] = useState(false);
  const [pendingOverlayImage, setPendingOverlayImage] = useState<string | null>(null);
  const [overlayOpts, setOverlayOpts] = useState({ xFrac: 0.35, yFrac: 0.4, widthFrac: 0.3, opacity: 0.6, rotationDeg: 0 });
  const [fileName, setFileName] = useState('edited-document');

  const mainFileInputRef = useRef<HTMLInputElement | null>(null);
  const insertFileInputRef = useRef<HTMLInputElement | null>(null);
  const insertAtIndexRef = useRef<number>(0);
  const overlayImageInputRef = useRef<HTMLInputElement | null>(null);

  // Renders (and caches) the thumbnail for one working page. Keyed by the
  // page's own stable id, not source doc + index, so a reordered/duplicated
  // page never shows a stale thumbnail meant for a different slot.
  const ensureThumb = useCallback(
    async (page: WorkingPage, docs: Map<string, SourceDoc>) => {
      setThumbs((t) => ({ ...t, [page.id]: { url: t[page.id]?.url ?? null, loading: true } }));
      if (page.sourceDocId === 'blank') {
        setThumbs((t) => ({ ...t, [page.id]: { url: 'blank', loading: false } }));
        return;
      }
      const src = docs.get(page.sourceDocId);
      if (!src) return;
      try {
        const url = await renderPageThumbnail(src.bytes, page.sourcePageIndex, 260);
        setThumbs((t) => ({ ...t, [page.id]: { url, loading: false } }));
      } catch {
        setThumbs((t) => ({ ...t, [page.id]: { url: null, loading: false } }));
      }
    },
    []
  );

  const addPagesFromFile = useCallback(
    async (file: File, atIndex: number | null) => {
      setBusy(`Loading ${file.name}…`);
      try {
        const { doc, pages: newPages } = await loadPdfFile(file);
        setSourceDocs((prev) => {
          const next = new Map(prev);
          next.set(doc.id, doc);
          return next;
        });
        setPages((prev) => {
          const insertAt = atIndex === null ? prev.length : atIndex;
          const next = [...prev.slice(0, insertAt), ...newPages, ...prev.slice(insertAt)];
          return next;
        });
        setSourceDocs((prevDocs) => {
          const docsWithNew = new Map(prevDocs);
          docsWithNew.set(doc.id, doc);
          newPages.forEach((p) => ensureThumb(p, docsWithNew));
          return docsWithNew;
        });
      } catch (e) {
        alert(`Could not read "${file.name}" — is it a valid PDF? (${(e as Error).message})`);
      } finally {
        setBusy(null);
      }
    },
    [ensureThumb]
  );

  const handleMainUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    for (const file of Array.from(fileList)) {
      await addPagesFromFile(file, null);
    }
  };

  const handleInsertUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    await addPagesFromFile(file, insertAtIndexRef.current);
  };

  const insertBlankAt = (index: number) => {
    const blank = makeBlankWorkingPage();
    setPages((prev) => [...prev.slice(0, index), blank, ...prev.slice(index)]);
    setThumbs((t) => ({ ...t, [blank.id]: { url: 'blank', loading: false } }));
  };

  const duplicatePage = (index: number) => {
    const p = pages[index];
    const copy: WorkingPage = { ...p, id: genPageId() };
    setPages((prev) => [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)]);
    setThumbs((t) => ({ ...t, [copy.id]: t[p.id] ?? { url: null, loading: false } }));
    const ov = overlays.get(p.id);
    if (ov) setOverlays((prev) => new Map(prev).set(copy.id, ov));
  };

  const deletePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const rotatePage = (id: string) => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p)));
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteSelected = () => {
    setPages((prev) => prev.filter((p) => !selected.has(p.id)));
    setSelected(new Set());
  };

  // --- Drag-and-drop reorder (native HTML5 DnD — no extra library needed
  // for a plain "reorder items in one list" interaction) ---
  const handleDragStart = (id: string) => setDragId(id);
  const handleDropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    setPages((prev) => {
      const fromIdx = prev.findIndex((p) => p.id === dragId);
      const toIdx = prev.findIndex((p) => p.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setDragId(null);
  };

  // --- Image overlay ---
  const openOverlayPanelForSelection = () => {
    if (selected.size === 0) {
      alert('Select one or more pages first (click a page to select it), then add an overlay image.');
      return;
    }
    setOverlayPanelOpen(true);
  };

  const handleOverlayImagePicked = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setPendingOverlayImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const applyOverlayToSelected = () => {
    if (!pendingOverlayImage) return;
    setOverlays((prev) => {
      const next = new Map(prev);
      selected.forEach((id) => {
        next.set(id, { imageDataUrl: pendingOverlayImage, ...overlayOpts });
      });
      return next;
    });
    setOverlayPanelOpen(false);
  };

  const removeOverlay = (id: string) => {
    setOverlays((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const handleExport = async () => {
    if (pages.length === 0) return;
    setBusy('Building PDF…');
    try {
      const bytes = await buildExportedPdf(pages, sourceDocs, overlays);
      downloadPdfBytes(bytes, fileName.trim() || 'edited-document');
    } catch (e) {
      alert(`Export failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const reset = () => {
    setSourceDocs(new Map());
    setPages([]);
    setThumbs({});
    setOverlays(new Map());
    setSelected(new Set());
  };

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950">
      <div className="shrink-0 border-b border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 shadow-soft sticky top-0 z-20">
        <div className="h-14 flex items-center justify-between px-3 sm:px-5 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-500 dark:text-ink-400 hover:text-brand-600 dark:hover:text-brand-400 shrink-0"
            >
              <ArrowLeft size={16} /> Back to Mock Test Generator
            </Link>
            <span className="hidden sm:inline text-ink-200 dark:text-ink-700">|</span>
            <div className="hidden sm:flex items-center gap-2 min-w-0">
              <FileStack size={16} className="text-brand-500 shrink-0" />
              <span className="font-display font-bold text-[14.5px] text-ink-900 dark:text-ink-100 truncate">PDF Tools</span>
            </div>
          </div>
          {pages.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={reset}>
                <Trash2 size={14} /> Clear All
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        {pages.length === 0 ? (
          <EmptyState
            onPick={() => mainFileInputRef.current?.click()}
            onFiles={handleMainUpload}
            busy={busy}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-5 bg-white dark:bg-ink-900 rounded-xl2 border border-ink-200 dark:border-ink-700 p-3 shadow-soft">
              <Button variant="secondary" size="sm" onClick={() => mainFileInputRef.current?.click()}>
                <Upload size={14} /> Add PDF(s)
              </Button>
              <Button variant="secondary" size="sm" onClick={() => insertBlankAt(pages.length)}>
                <Plus size={14} /> Add Blank Page
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={openOverlayPanelForSelection}
                disabled={selected.size === 0}
                title="Select pages first by clicking them"
              >
                <ImagePlus size={14} /> Overlay Image on Selected ({selected.size})
              </Button>
              {selected.size > 0 && (
                <Button variant="danger" size="sm" onClick={deleteSelected}>
                  <Trash2 size={14} /> Delete Selected ({selected.size})
                </Button>
              )}
              <div className="flex-1" />
              <span className="text-[12.5px] text-ink-500 dark:text-ink-400 font-medium">
                {pages.length} page{pages.length === 1 ? '' : 's'}
              </span>
            </div>

            <p className="text-[12.5px] text-ink-500 dark:text-ink-400 mb-4 leading-relaxed">
              Drag a page to reorder it. Click a page to select it (for bulk delete or an image overlay). Use the{' '}
              <Plus size={11} className="inline -mt-0.5" /> button between pages to insert a blank page or another PDF's
              pages at that exact position. Everything happens in your browser — nothing is uploaded anywhere.
            </p>

            <div className="flex flex-wrap items-stretch">
              <InsertGap onInsertBlank={() => insertBlankAt(0)} onInsertFile={() => { insertAtIndexRef.current = 0; insertFileInputRef.current?.click(); }} />
              {pages.map((page, idx) => (
                <div key={page.id} className="flex items-stretch">
                  <PageCard
                    page={page}
                    thumb={thumbs[page.id]}
                    index={idx}
                    isSelected={selected.has(page.id)}
                    hasOverlay={overlays.has(page.id)}
                    onToggleSelect={() => toggleSelected(page.id)}
                    onDelete={() => deletePage(page.id)}
                    onDuplicate={() => duplicatePage(idx)}
                    onRotate={() => rotatePage(page.id)}
                    onRemoveOverlay={() => removeOverlay(page.id)}
                    onDragStart={() => handleDragStart(page.id)}
                    onDropOn={() => handleDropOn(page.id)}
                  />
                  <InsertGap
                    onInsertBlank={() => insertBlankAt(idx + 1)}
                    onInsertFile={() => { insertAtIndexRef.current = idx + 1; insertFileInputRef.current?.click(); }}
                  />
                </div>
              ))}
            </div>

            <div className="mt-8 bg-white dark:bg-ink-900 rounded-xl2 border border-ink-200 dark:border-ink-700 p-4 shadow-soft flex flex-wrap items-center gap-3">
              <label className="text-[13px] font-semibold text-ink-700 dark:text-ink-200 shrink-0">File name</label>
              <input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="flex-1 min-w-[160px] rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100 px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <span className="text-[12.5px] text-ink-400 dark:text-ink-500">.pdf</span>
              <Button variant="primary" onClick={handleExport} disabled={!!busy} className="shadow-pop">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Export PDF
              </Button>
            </div>
          </>
        )}
      </div>

      <input
        ref={mainFileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          handleMainUpload(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={insertFileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          handleInsertUpload(e.target.files);
          e.target.value = '';
        }}
      />

      {busy && (
        <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center">
          <div className="bg-white dark:bg-ink-900 rounded-xl2 shadow-card px-5 py-4 flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-brand-500" />
            <span className="text-[14px] font-medium text-ink-700 dark:text-ink-200">{busy}</span>
          </div>
        </div>
      )}

      {overlayPanelOpen && (
        <OverlayPanel
          pendingImage={pendingOverlayImage}
          opts={overlayOpts}
          setOpts={setOverlayOpts}
          onPickImage={() => overlayImageInputRef.current?.click()}
          onApply={applyOverlayToSelected}
          onClose={() => setOverlayPanelOpen(false)}
          selectedCount={selected.size}
        />
      )}
      <input
        ref={overlayImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleOverlayImagePicked(f);
        }}
      />
    </div>
  );
}

function EmptyState({
  onPick,
  onFiles,
  busy,
}: {
  onPick: () => void;
  onFiles: (files: FileList | null) => void;
  busy: string | null;
}) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        onFiles(e.dataTransfer.files);
      }}
      className={`mt-10 border-2 border-dashed rounded-2xl p-10 sm:p-16 text-center transition ${
        dragOver ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/10' : 'border-ink-200 dark:border-ink-700'
      }`}
    >
      <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
        <FileStack size={26} className="text-brand-500" />
      </div>
      <h1 className="font-display font-bold text-[20px] text-ink-900 dark:text-ink-100 mb-1.5">PDF Tools</h1>
      <p className="text-[13.5px] text-ink-500 dark:text-ink-400 max-w-md mx-auto mb-5 leading-relaxed">
        Upload one or more PDFs to reorder, delete, or insert pages at any position, stamp an image overlay onto any
        page, and export a merged PDF — all in your browser, nothing leaves your device.
      </p>
      <Button variant="primary" size="md" onClick={onPick} disabled={!!busy} className="shadow-pop">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        {busy || 'Upload PDF(s)'}
      </Button>
      <p className="text-[11.5px] text-ink-400 dark:text-ink-500 mt-3">or drag & drop PDF files here</p>
    </div>
  );
}

function InsertGap({ onInsertBlank, onInsertFile }: { onInsertBlank: () => void; onInsertFile: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex items-center justify-center w-6 shrink-0 group">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-5 h-5 rounded-full bg-ink-100 dark:bg-ink-800 text-ink-400 dark:text-ink-500 hover:bg-brand-500 hover:text-white flex items-center justify-center transition opacity-40 group-hover:opacity-100"
        title="Insert page here"
      >
        <Plus size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-ink-900 rounded-lg shadow-card border border-ink-200 dark:border-ink-700 py-1 w-44">
            <button
              onClick={() => {
                onInsertBlank();
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-[12.5px] font-medium text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800 flex items-center gap-2"
            >
              <Plus size={13} /> Blank page
            </button>
            <button
              onClick={() => {
                onInsertFile();
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-[12.5px] font-medium text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800 flex items-center gap-2"
            >
              <Upload size={13} /> Pages from another PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function PageCard({
  page,
  thumb,
  index,
  isSelected,
  hasOverlay,
  onToggleSelect,
  onDelete,
  onDuplicate,
  onRotate,
  onRemoveOverlay,
  onDragStart,
  onDropOn,
}: {
  page: WorkingPage;
  thumb: Thumb | undefined;
  index: number;
  isSelected: boolean;
  hasOverlay: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRotate: () => void;
  onRemoveOverlay: () => void;
  onDragStart: () => void;
  onDropOn: () => void;
}) {
  const aspect = page.height > 0 ? page.width / page.height : 0.77;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDropOn}
      onClick={onToggleSelect}
      className={`relative w-[150px] shrink-0 rounded-xl border-2 bg-white dark:bg-ink-900 shadow-soft cursor-grab active:cursor-grabbing mb-4 transition ${
        isSelected ? 'border-brand-500 ring-2 ring-brand-200 dark:ring-brand-500/30' : 'border-ink-200 dark:border-ink-700'
      }`}
    >
      <div
        className="w-full rounded-t-[10px] bg-ink-100 dark:bg-ink-800 overflow-hidden flex items-center justify-center relative"
        style={{ aspectRatio: `${aspect}` }}
      >
        {thumb?.url === 'blank' ? (
          <span className="text-[11px] text-ink-400 dark:text-ink-500 font-medium">Blank page</span>
        ) : thumb?.url ? (
          <img
            src={thumb.url}
            alt={`Page ${index + 1}`}
            className="w-full h-full object-contain"
            style={{ transform: page.rotation ? `rotate(${page.rotation}deg)` : undefined }}
          />
        ) : (
          <Loader2 size={18} className="animate-spin text-ink-300 dark:text-ink-600" />
        )}
        {hasOverlay && (
          <div className="absolute bottom-1 right-1 bg-brand-500 text-white rounded px-1.5 py-0.5 text-[9.5px] font-bold flex items-center gap-0.5">
            <ImagePlus size={9} /> overlay
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-1.5 py-1.5">
        <span className="text-[11px] font-semibold text-ink-500 dark:text-ink-400 pl-1">{index + 1}</span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRotate();
            }}
            className="p-1 text-ink-400 dark:text-ink-500 hover:text-brand-500"
            title="Rotate 90°"
          >
            <RotateCw size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-1 text-ink-400 dark:text-ink-500 hover:text-brand-500"
            title="Duplicate page"
          >
            <Copy size={12} />
          </button>
          {hasOverlay && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveOverlay();
              }}
              className="p-1 text-ink-400 dark:text-ink-500 hover:text-amber-500"
              title="Remove overlay"
            >
              <X size={12} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-ink-400 dark:text-ink-500 hover:text-red-500"
            title="Delete page"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function OverlayPanel({
  pendingImage,
  opts,
  setOpts,
  onPickImage,
  onApply,
  onClose,
  selectedCount,
}: {
  pendingImage: string | null;
  opts: { xFrac: number; yFrac: number; widthFrac: number; opacity: number; rotationDeg: number };
  setOpts: (updater: (prev: typeof opts) => typeof opts) => void;
  onPickImage: () => void;
  onApply: () => void;
  onClose: () => void;
  selectedCount: number;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-ink-900 rounded-xl2 shadow-card max-w-md w-full p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-[15px] text-ink-900 dark:text-ink-100">
            Image Overlay ({selectedCount} page{selectedCount === 1 ? '' : 's'})
          </h3>
          <button onClick={onClose} className="text-ink-400 dark:text-ink-500 hover:text-ink-700 dark:hover:text-ink-200">
            <X size={18} />
          </button>
        </div>

        {!pendingImage ? (
          <button
            onClick={onPickImage}
            className="w-full border-2 border-dashed border-ink-200 dark:border-ink-700 rounded-xl p-6 text-center hover:border-brand-400 transition"
          >
            <ImagePlus size={22} className="text-ink-400 dark:text-ink-500 mx-auto mb-2" />
            <span className="text-[13px] font-semibold text-ink-600 dark:text-ink-300">Choose an image (stamp / watermark / signature)</span>
          </button>
        ) : (
          <div className="space-y-3.5">
            <div className="flex items-center gap-3">
              <img src={pendingImage} alt="overlay preview" className="w-16 h-16 object-contain rounded-lg border border-ink-200 dark:border-ink-700 bg-ink-50 dark:bg-ink-800" />
              <button onClick={onPickImage} className="text-[12.5px] font-semibold text-brand-600 dark:text-brand-400 hover:underline">
                Change image
              </button>
            </div>

            <SliderField
              label="Horizontal position"
              value={opts.xFrac}
              min={0}
              max={0.9}
              step={0.01}
              onChange={(v) => setOpts((p) => ({ ...p, xFrac: v }))}
            />
            <SliderField
              label="Vertical position"
              value={opts.yFrac}
              min={0}
              max={0.9}
              step={0.01}
              onChange={(v) => setOpts((p) => ({ ...p, yFrac: v }))}
            />
            <SliderField
              label="Size (width % of page)"
              value={opts.widthFrac}
              min={0.05}
              max={1}
              step={0.01}
              onChange={(v) => setOpts((p) => ({ ...p, widthFrac: v }))}
            />
            <SliderField
              label="Opacity"
              value={opts.opacity}
              min={0.05}
              max={1}
              step={0.05}
              onChange={(v) => setOpts((p) => ({ ...p, opacity: v }))}
            />
            <SliderField
              label="Rotation (degrees)"
              value={opts.rotationDeg}
              min={0}
              max={359}
              step={1}
              onChange={(v) => setOpts((p) => ({ ...p, rotationDeg: v }))}
              format={(v) => `${Math.round(v)}°`}
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={onApply}>
                Apply to selected
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] font-semibold text-ink-600 dark:text-ink-300">{label}</span>
        <span className="text-[11.5px] text-ink-400 dark:text-ink-500 font-mono">
          {format ? format(value) : Math.round(value * 100) + '%'}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-500"
      />
    </div>
  );
}
