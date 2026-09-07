'use client';

import { useState } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { useTestStore } from '@/store/testStore';
import { exportPreviewToPdf } from '@/lib/exportPdf';
import { Button } from './ui';

function slugify(name: string) {
  return name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'Mock-Test';
}

/**
 * Instant Download — a dialog-free, one-click PDF export of the
 * already-paginated live preview. Each .a4-sheet page is rendered to a
 * real vector-text PDF page via dompdf.js (reads the browser's own
 * computed layout, no canvas rasterisation step), and every page is
 * merged into one PDF client-side with pdf-lib.
 *
 * This is deliberately a SEPARATE button from "Print / Save PDF" (native
 * browser print-to-PDF, untouched) — that one opens the browser's print
 * dialog; this one skips the dialog entirely for a faster one-click
 * download.
 */
export default function InstantDownloadButton() {
  const testName = useTestStore((s) => s.doc.meta.testName);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleClick = async () => {
    if (busy) return;
    const root = document.getElementById('print-root');
    if (!root) return;
    setBusy(true);
    setProgress(0);
    try {
      await exportPreviewToPdf(root, {
        fileName: slugify(testName),
        onProgress: setProgress,
      });
    } catch (err) {
      console.error('Instant download failed', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="secondary"
      onClick={handleClick}
      disabled={busy}
      className="relative overflow-hidden"
      title="Instant download — direct PDF file, no print dialog"
    >
      {busy && (
        <span
          className="absolute inset-y-0 left-0 bg-brand-100/70 transition-[width] duration-150"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
        <span className="hidden sm:inline">{busy ? 'Preparing…' : 'Instant Download'}</span>
        <span className="sm:hidden">{busy ? '…' : 'Instant'}</span>
      </span>
    </Button>
  );
}
