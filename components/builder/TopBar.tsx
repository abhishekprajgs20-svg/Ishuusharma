'use client';

import { useRef, useState } from 'react';
import clsx from 'clsx';
import Link from 'next/link';
import { Download, RotateCcw, Sparkles, ImagePlus, X, Wrench, Settings2 } from 'lucide-react';
import { useTestStore } from '@/store/testStore';
import { Button, HeaderColorSwatch, ThemeToggle } from './ui';
import { PANELS, type PanelKey } from './panels';
// InstantDownloadButton is disabled. Two engines were tried for a
// dialog-free direct-PDF export: html2canvas+jsPDF (unfixable Chromium
// text-kerning bug — see git history) and dompdf.js+pdf-lib (real vector
// text, fixes kerning and — once NotoSansDevanagari/Inter are registered
// via langFontConfig — fixes blank/tofu Devanagari glyphs, but its text
// shaper doesn't reorder Devanagari matras/conjuncts correctly, so Hindi
// renders with scrambled letter order, e.g. "निम्नलिखित" -> "नम्िनलिखित".
// That's a core-content-breaking bug for this app's bilingual questions,
// not a config issue — dompdf.js has no Indic shaping support to enable.
// Print / Save PDF (native browser print, untouched throughout) remains
// the one fully correct download path.
// import InstantDownloadButton from './InstantDownloadButton';

export default function TopBar({
  activePanel,
  onSelectPanel,
}: {
  activePanel: PanelKey;
  onSelectPanel: (p: PanelKey) => void;
}) {
  const resetDocument = useTestStore((s) => s.resetDocument);
  const testName = useTestStore((s) => s.doc.meta.testName);
  const accentColor = useTestStore((s) => s.doc.branding.accentColor);
  const logoDataUrl = useTestStore((s) => s.doc.branding.logoDataUrl);
  const updateBranding = useTestStore((s) => s.updateBranding);
  const [confirmReset, setConfirmReset] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const handlePrint = () => {
    document.title = testName.replace(/[^\w\s-]/g, '').trim() || 'Mock-Test';
    window.print();
  };

  // NOTE: the "Print Slide PDF" header shortcut used to live here (one
  // question per landscape page, via components/SlidePrintView.tsx + the
  // body.slide-print-active CSS toggle). That print target and its
  // settings panel (Slide PDF, in the left nav) are untouched — this only
  // removes the header BUTTON, replaced by the "Tools" link below that
  // routes to the separate /pdf-tools page. Users who still want the
  // slide-style PDF get to it via the "Slide PDF" panel tab, same as
  // every other export option in this app.

  const handleLogoFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => updateBranding({ logoDataUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="no-print shrink-0 border-b border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 shadow-soft z-20 relative">
      {/* Single-row header on EVERY size now — no second mobile-only row
          beneath it (that row duplicated BottomNav's job and was a big
          part of what made the mobile header feel cramped/overflowing).
          On mobile this row only ever holds: brand mark, Export, Print,
          and a Settings gear that reveals Theme/Accent/Logo/Reset in a
          dropdown — those four are used rarely enough that they don't
          need to be one-tap on a phone, unlike on desktop where there's
          room to spare. min-w-0 on every flex child + truncate on labels
          means this row can never force horizontal page scroll. */}
      <div className="h-14 flex items-center justify-between px-3 sm:px-4 md:px-5 gap-2 md:gap-4 min-w-0">
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shrink-0">
            <Sparkles size={16} className="text-white" />
          </div>
          <div className="hidden sm:block leading-tight min-w-0">
            <div className="font-display font-extrabold text-[15px] text-ink-900 dark:text-ink-100 truncate">Ishuu Sharma</div>
            <div className="text-[10.5px] text-ink-400 dark:text-ink-500 -mt-0.5 truncate">Mock Test Generator</div>
          </div>
        </div>

        {/* Desktop panel navigation — lives in the header so the left column
            can be freed up entirely for the live preview. Hidden below md;
            BottomNav (+ its More sheet) is mobile's only navigation now. */}
        <div className="hidden md:flex items-center gap-0.5 flex-1 justify-center overflow-x-auto styled-scroll min-w-0">
          {PANELS.map(({ key, shortLabel, icon: Icon }) => {
            const active = activePanel === key;
            return (
              <button
                key={key}
                onClick={() => onSelectPanel(key)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all whitespace-nowrap',
                  active
                    ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400'
                    : 'text-ink-500 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-800 hover:text-ink-700 dark:hover:text-ink-200'
                )}
              >
                <Icon size={15} className={clsx(active && 'text-brand-500')} />
                {shortLabel}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
          {/* Theme / accent / logo / reset — always visible from md up.
              Below md, these collapse into the Settings gear popover so
              the always-visible row only carries Export + Print, which is
              what actually needs to be one-tap on a phone. */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <HeaderColorSwatch value={accentColor} onChange={(v) => updateBranding({ accentColor: v })} title="Accent color" />
            <div className="relative group">
              <button
                onClick={() => logoInputRef.current?.click()}
                className="w-8 h-8 rounded-lg border border-ink-200 dark:border-ink-700 shrink-0 shadow-soft flex items-center justify-center bg-white dark:bg-ink-800 hover:border-brand-400 transition overflow-hidden"
                title={logoDataUrl ? 'Change logo' : 'Upload logo'}
              >
                {logoDataUrl ? (
                  <img src={logoDataUrl} alt="logo" className="w-full h-full object-contain p-0.5" />
                ) : (
                  <ImagePlus size={15} className="text-ink-400 dark:text-ink-500" />
                )}
              </button>
              {logoDataUrl && (
                <button
                  onClick={() => updateBranding({ logoDataUrl: undefined })}
                  className="absolute -top-1.5 -right-1.5 bg-white dark:bg-ink-800 rounded-full shadow-soft p-0.5 text-red-500 opacity-0 group-hover:opacity-100 transition"
                  title="Remove logo"
                >
                  <X size={11} />
                </button>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleLogoFile(f);
                }}
              />
            </div>

            {confirmReset ? (
              <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 rounded-lg px-2 py-1">
                <span className="text-[12px] text-red-600 dark:text-red-400 font-medium hidden lg:inline">Reset everything?</span>
                <Button size="sm" variant="danger" onClick={() => { resetDocument(); setConfirmReset(false); }}>
                  Yes
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>
                  No
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
                <RotateCcw size={14} /> Reset
              </Button>
            )}
          </div>

          {/* Mobile-only Settings gear — opens a small dropdown with the
              four controls above, so they still exist on phone, just not
              competing for space in the always-visible row. */}
          <div className="relative md:hidden">
            <button
              onClick={() => setMobileSettingsOpen((v) => !v)}
              className={clsx(
                'w-8 h-8 rounded-lg border shrink-0 shadow-soft flex items-center justify-center transition overflow-hidden',
                mobileSettingsOpen
                  ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/10 text-brand-500'
                  : 'border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 text-ink-500 dark:text-ink-400'
              )}
              title="More settings"
            >
              {logoDataUrl && !mobileSettingsOpen ? (
                <img src={logoDataUrl} alt="logo" className="w-full h-full object-contain p-0.5" />
              ) : (
                <Settings2 size={15} />
              )}
            </button>

            {mobileSettingsOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMobileSettingsOpen(false)} />
                {/* `fixed` to the VIEWPORT (not `absolute` to the button) —
                    this button sits mid-header, so a button-anchored panel
                    at any reasonable width either clips its own left edge
                    (right-anchored) or its own right edge (left-anchored)
                    once the button isn't near a header edge itself. Pinning
                    to the header's right corner with a viewport-clamped
                    width sidesteps that entirely: it's always fully
                    on-screen regardless of where the gear button sits. */}
                <div className="fixed top-16 right-3 w-[min(15rem,calc(100vw-1.5rem))] rounded-xl2 border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 shadow-[0_8px_28px_rgba(16,24,40,0.16)] p-3 z-40">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12.5px] font-semibold text-ink-700 dark:text-ink-200">Theme</span>
                    <ThemeToggle />
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12.5px] font-semibold text-ink-700 dark:text-ink-200">Accent color</span>
                    <HeaderColorSwatch value={accentColor} onChange={(v) => updateBranding({ accentColor: v })} title="Accent color" />
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12.5px] font-semibold text-ink-700 dark:text-ink-200">Logo</span>
                    <div className="relative group shrink-0">
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        className="w-8 h-8 rounded-lg border border-ink-200 dark:border-ink-700 shadow-soft flex items-center justify-center bg-white dark:bg-ink-800 overflow-hidden"
                      >
                        {logoDataUrl ? (
                          <img src={logoDataUrl} alt="logo" className="w-full h-full object-contain p-0.5" />
                        ) : (
                          <ImagePlus size={15} className="text-ink-400 dark:text-ink-500" />
                        )}
                      </button>
                      {logoDataUrl && (
                        <button
                          onClick={() => updateBranding({ logoDataUrl: undefined })}
                          className="absolute -top-1.5 -right-1.5 bg-white dark:bg-ink-800 rounded-full shadow-soft p-0.5 text-red-500"
                          title="Remove logo"
                        >
                          <X size={11} />
                        </button>
                      )}
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleLogoFile(f);
                        }}
                      />
                    </div>
                  </div>
                  <div className="border-t border-ink-100 dark:border-ink-800 pt-2.5">
                    {confirmReset ? (
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[12px] text-red-600 dark:text-red-400 font-medium">Reset everything?</span>
                        <div className="flex gap-1.5 shrink-0">
                          <Button size="sm" variant="danger" onClick={() => { resetDocument(); setConfirmReset(false); setMobileSettingsOpen(false); }}>
                            Yes
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>
                            No
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setConfirmReset(true)} className="w-full">
                        <RotateCcw size={14} /> Reset everything
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <Link
            href="/pdf-tools"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all active:scale-[0.97] bg-white dark:bg-ink-800 text-ink-700 dark:text-ink-200 border border-ink-200 dark:border-ink-700 hover:bg-ink-50 dark:hover:bg-ink-700 px-2.5 py-1.5 text-[12.5px] md:!px-4 md:!py-2 md:!text-[14px]"
            title="PDF Tools — merge, reorder, delete, insert, or add an image overlay to any PDF's pages"
          >
            <Wrench size={15} />
            <span className="hidden sm:inline">Tools</span>
            <span className="sm:hidden">Tools</span>
          </Link>

          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            className="shadow-pop md:!px-4 md:!py-2 md:!text-[14px]"
            title="Print / Save as PDF — matches the live preview exactly, full LaTeX & Hindi support"
          >
            <Download size={15} />
            <span className="hidden sm:inline">Print / Save PDF</span>
            <span className="sm:hidden">Print</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
