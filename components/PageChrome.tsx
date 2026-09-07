'use client';

import type { TestDocument } from '@/lib/types';

function fillTemplate(template: string, doc: TestDocument, page: number, totalPages: number): string {
  return template
    .replace(/\{\{testName\}\}/g, doc.meta.testName)
    .replace(/\{\{instituteName\}\}/g, doc.branding.instituteName)
    .replace(/\{\{examName\}\}/g, doc.meta.examName || '')
    .replace(/\{\{page\}\}/g, String(page))
    .replace(/\{\{totalPages\}\}/g, String(totalPages))
    .replace(/\{\{date\}\}/g, doc.meta.date || '');
}

export function PageHeader({ doc, page, totalPages }: { doc: TestDocument; page: number; totalPages: number }) {
  const { headerFooter, branding } = doc;
  if (!headerFooter.headerEnabled) return null;
  return (
    <div
      className="flex items-center justify-between text-[0.72em] text-ink-500 pb-2 mb-3 border-b"
      style={{ borderColor: '#e5e7ee' }}
    >
      <div className="flex items-center gap-1.5">
        {headerFooter.repeatBrandingOnEveryPage && branding.logoDataUrl && (
          <img src={branding.logoDataUrl} alt="" className="h-4 w-4 object-contain" />
        )}
        <span className="font-semibold" style={{ color: branding.accentColor }}>
          {fillTemplate(headerFooter.headerText, doc, page, totalPages)}
        </span>
      </div>
      {headerFooter.showDateInHeader && doc.meta.date && <span>{doc.meta.date}</span>}
    </div>
  );
}

export function PageFooter({ doc, page, totalPages }: { doc: TestDocument; page: number; totalPages: number }) {
  const { headerFooter } = doc;
  if (!headerFooter.footerEnabled && !headerFooter.showPageNumbers) return null;
  return (
    <div
      className="flex items-center justify-between text-[0.7em] text-ink-400 pt-1.5 mt-2 border-t"
      style={{ borderColor: '#e5e7ee' }}
    >
      <span>{headerFooter.footerEnabled ? fillTemplate(headerFooter.footerText, doc, page, totalPages) : ''}</span>
      {headerFooter.showPageNumbers && !headerFooter.footerEnabled && (
        <span>
          Page {page} of {totalPages}
        </span>
      )}
    </div>
  );
}
