// Vector PDF export via dompdf.js — renders each already-paginated A4
// sheet from the live preview into a real vector-text PDF page (not a
// rasterised screenshot), then merges every sheet into one PDF.
//
// Why this instead of html2canvas + jsPDF (tried first): html2canvas has
// a long-standing, unresolved text-kerning/letter-spacing bug in Chromium
// (see niklasvh/html2canvas#1272, #1849) that made every exported page
// look like "wordsallsquished together" — a real, reported defect, not a
// one-off. dompdf.js takes a fundamentally different approach: it reads
// the browser's own already-computed layout and draws real vector text
// via a Rust/WASM PDF engine, so there's no canvas glyph-measurement step
// to get wrong. It was built by the same html2canvas+jsPDF migration
// path we were on, specifically to fix this class of bug.
//
// Print / Save PDF (native browser print-to-PDF) is untouched — this is
// only the engine behind the separate "Instant Download" button.

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

export interface ExportPdfOptions {
  fileName?: string;
  onProgress?: (progress: number) => void;
  /** CSS class identifying each A4 page node within rootEl. Defaults to "a4-sheet". */
  pageClassName?: string;
}

// dompdf.js does not embed browser fonts automatically (see its README,
// "Fonts and Multilingual Text") — without explicit registration, any
// glyph its own default font lacks (Devanagari script, and even a few
// Latin punctuation marks KaTeX uses, like the U+2212 minus sign) comes
// out blank or as "?". We register two self-hosted TTFs via
// langFontConfig: Noto Sans Devanagari for the Devanagari Unicode block
// (U+0900–U+097F, covers Hindi), and Inter as the default fallback for
// everything else (Latin text, KaTeX's punctuation/operator glyphs).
let cachedFontConfig: Promise<{ fontFamily: string; fontBytes: Uint8Array; charRange?: [number, number][]; isDefault?: boolean }[]> | null = null;

async function loadFontBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font request failed: ${res.status} ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

function getLangFontConfig() {
  if (!cachedFontConfig) {
    cachedFontConfig = Promise.all([
      loadFontBytes('/fonts/NotoSansDevanagari-Regular.ttf'),
      loadFontBytes('/fonts/Inter-Regular.ttf'),
    ]).then(([devanagariBytes, interBytes]) => [
      {
        fontFamily: 'NotoSansDevanagari-Regular',
        fontBytes: devanagariBytes,
        charRange: [[0x0900, 0x097f]] as [number, number][],
      },
      {
        fontFamily: 'Inter-Regular',
        fontBytes: interBytes,
        isDefault: true,
      },
    ]);
  }
  return cachedFontConfig;
}

/**
 * Exports each page-class child of `rootEl` as one page of a single
 * vector-text PDF. `rootEl` should be the UNSCALED #print-root node (not
 * the on-screen zoom-transformed wrapper) so every page is captured at
 * true 210mm x 297mm / 96dpi layout, matching the live preview.
 *
 * Each .a4-sheet is already a complete, fully-paginated page (built by
 * the same engine that drives the live preview), so we export every
 * sheet in its own "continuous" (pagination: false) pass sized exactly
 * to one A4 page, then concatenate the resulting single-page PDFs —
 * rather than handing dompdf.js the whole multi-page flow and asking it
 * to re-paginate on its own, which could disagree with our own
 * measured/fragmented pagination (see lib/paginate.ts).
 */
export async function exportPreviewToPdf(rootEl: HTMLElement, options: ExportPdfOptions = {}) {
  const { fileName = 'mock-test', onProgress, pageClassName = 'a4-sheet' } = options;

  const { exportPDF } = await import('dompdf.js');
  const { PDFDocument } = await import('pdf-lib');

  const pages = Array.from(rootEl.querySelectorAll<HTMLElement>(`.${pageClassName}`));
  const nodesToRender = pages.length > 0 ? pages : [rootEl];

  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await (document as Document & { fonts: FontFaceSet }).fonts.ready;
    } catch {
      /* noop */
    }
  }

  const langFontConfig = await getLangFontConfig();
  const merged = await PDFDocument.create();

  for (let i = 0; i < nodesToRender.length; i++) {
    const node = nodesToRender[i];

    const blob = await exportPDF(node, {
      format: [A4_WIDTH_PT, A4_HEIGHT_PT],
      pagination: false, // each .a4-sheet is already exactly one page
      backgroundColor: '#ffffff',
      langFontConfig,
    });

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const pageDoc = await PDFDocument.load(bytes);
    const [copiedPage] = await merged.copyPages(pageDoc, [0]);
    merged.addPage(copiedPage);

    onProgress?.((i + 1) / nodesToRender.length);
  }

  const mergedBytes = await merged.save();
  const mergedBlob = new Blob([mergedBytes.slice().buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(mergedBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
