// Client-side PDF page-editing engine for the /pdf-tools route. Everything
// here runs entirely in the browser — no server upload, no network call —
// using pdf-lib for the actual page manipulation (merge, delete, reorder,
// insert blank pages, stamp an image overlay) and pdfjs-dist purely for
// rendering page thumbnails so the user can see what they're editing.
//
// Two separate PDF libraries, two separate jobs:
//   - pdf-lib: the ONLY thing that touches page bytes / produces the final
//     exported PDF. It can load existing PDFs, copy pages between
//     documents, reorder/remove pages, create new blank pages, and draw an
//     image onto a page — everything this tool needs, with real vector
//     output (not a rasterized screenshot).
//   - pdfjs-dist: read-only rendering, used only to draw each page to a
//     <canvas> for the thumbnail grid. It never modifies anything.
'use client';

import { PDFDocument, PageSizes, degrees } from 'pdf-lib';

export type WorkingPage = {
  /** Stable id for this page slot in the UI list — NOT a page index, since
   * pages get inserted/deleted/reordered constantly and an index would
   * silently point at the wrong page after any of those. */
  id: string;
  /** Which source document (by id) this page's bytes came from, and its
   * page index within that source at the time it was added. Blank pages
   * have sourceDocId === 'blank'. */
  sourceDocId: string;
  sourcePageIndex: number;
  /** Page size in points, so the blank-page inserter and thumbnail box can
   * size themselves sensibly without re-loading the source doc. */
  width: number;
  height: number;
  rotation: number;
};

export type SourceDoc = {
  id: string;
  name: string;
  bytes: Uint8Array;
};

let pdfjsLibPromise: Promise<typeof import('pdfjs-dist')> | null = null;

async function getPdfJs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist').then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      return mod;
    });
  }
  return pdfjsLibPromise;
}

let idCounter = 0;
export function genPageId(): string {
  idCounter += 1;
  return `pg-${Date.now().toString(36)}-${idCounter}`;
}

/**
 * Loads a File into a SourceDoc + its initial WorkingPage list (one entry
 * per page, in original order). Uses pdf-lib just to find the page count
 * and each page's size/rotation — actual rendering for thumbnails happens
 * separately via renderPageThumbnail (pdfjs), and actual page COPYING into
 * the final export happens separately again at export time (also pdf-lib,
 * via buildExportedPdf) — this function only stages the file in memory.
 */
export async function loadPdfFile(file: File): Promise<{ doc: SourceDoc; pages: WorkingPage[] }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const id = genPageId();
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages: WorkingPage[] = pdfDoc.getPages().map((p, i) => {
    const { width, height } = p.getSize();
    return {
      id: genPageId(),
      sourceDocId: id,
      sourcePageIndex: i,
      width,
      height,
      rotation: p.getRotation().angle,
    };
  });
  return { doc: { id, name: file.name, bytes }, pages };
}

/** A4 blank page in points — matches the rest of this app's print pipeline. */
export function blankPageSize(): { width: number; height: number } {
  return { width: PageSizes.A4[0], height: PageSizes.A4[1] };
}

export function makeBlankWorkingPage(): WorkingPage {
  const { width, height } = blankPageSize();
  return { id: genPageId(), sourceDocId: 'blank', sourcePageIndex: 0, width, height, rotation: 0 };
}

/**
 * Renders one page of a loaded source doc to a data URL for the thumbnail
 * grid. Cached per (docId, pageIndex, targetWidth) by the caller — this
 * function itself just does the one render pdfjs is asked for.
 */
export async function renderPageThumbnail(
  bytes: Uint8Array,
  pageIndex: number,
  targetWidth = 220
): Promise<string> {
  const pdfjsLib = await getPdfJs();
  // pdfjs detaches/transfers the buffer it's given in some code paths —
  // pass a fresh copy so the SAME source bytes can still be reused for
  // later renders (a different page) or for the final export.
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageIndex + 1); // pdfjs pages are 1-indexed
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = targetWidth / baseViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx, viewport }).promise;
  const url = canvas.toDataURL('image/png');
  await pdf.destroy();
  return url;
}

export type ImageOverlaySpec = {
  /** data URL (png/jpg) of the stamp/watermark image. */
  imageDataUrl: string;
  /** 0-1 fractions of the PAGE's own width/height — so the same spec
   * places consistently across pages of different sizes (e.g. a mix of A4
   * and Letter source pages). */
  xFrac: number;
  yFrac: number;
  widthFrac: number;
  opacity: number; // 0-1
  rotationDeg: number;
};

/**
 * Builds the final exported PDF from the current working page list. Each
 * WorkingPage is resolved back to its source doc + original page index
 * (for blank pages, a fresh blank page of the recorded size is created
 * instead), copied into one merged PDFDocument in the list's current
 * order, then any pages with an overlay get that image drawn on top.
 *
 * `sourceDocs` must contain every doc id referenced by `pages` (except
 * 'blank') — the caller keeps every uploaded file's bytes around for
 * exactly this reason, so pages can be re-copied at export time however
 * many times the user has reordered/duplicated them since upload.
 */
export async function buildExportedPdf(
  pages: WorkingPage[],
  sourceDocs: Map<string, SourceDoc>,
  overlays: Map<string, ImageOverlaySpec>
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  // Cache one PDFDocument per source id so re-used pages (same source,
  // multiple pages, or a page duplicated in the working list) don't
  // reparse the same bytes repeatedly.
  const loadedCache = new Map<string, PDFDocument>();
  const imageCache = new Map<string, any>(); // data URL -> embedded pdf-lib image, reused across pages

  async function getLoadedDoc(docId: string): Promise<PDFDocument> {
    let doc = loadedCache.get(docId);
    if (!doc) {
      const src = sourceDocs.get(docId);
      if (!src) throw new Error(`Missing source document for id ${docId}`);
      doc = await PDFDocument.load(src.bytes, { ignoreEncryption: true });
      loadedCache.set(docId, doc);
    }
    return doc;
  }

  async function embedImage(dataUrl: string) {
    let img = imageCache.get(dataUrl);
    if (img) return img;
    const isPng = dataUrl.startsWith('data:image/png');
    img = isPng ? await out.embedPng(dataUrl) : await out.embedJpg(dataUrl);
    imageCache.set(dataUrl, img);
    return img;
  }

  for (const wp of pages) {
    let newPage;
    if (wp.sourceDocId === 'blank') {
      newPage = out.addPage([wp.width, wp.height]);
    } else {
      const srcDoc = await getLoadedDoc(wp.sourceDocId);
      const [copied] = await out.copyPages(srcDoc, [wp.sourcePageIndex]);
      newPage = out.addPage(copied);
    }

    const overlay = overlays.get(wp.id);
    if (overlay) {
      const img = await embedImage(overlay.imageDataUrl);
      const { width: pw, height: ph } = newPage.getSize();
      const drawWidth = overlay.widthFrac * pw;
      const aspect = img.height / img.width;
      const drawHeight = drawWidth * aspect;
      const x = overlay.xFrac * pw;
      // pdf-lib's y origin is bottom-left; xFrac/yFrac are given top-left
      // style (matching how the on-screen overlay editor places things),
      // so flip here at the one point it actually matters.
      const y = ph - overlay.yFrac * ph - drawHeight;
      newPage.drawImage(img, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
        opacity: overlay.opacity,
        rotate: degrees(overlay.rotationDeg),
      });
    }
  }

  return out.save();
}

export function downloadPdfBytes(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes.slice().buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
