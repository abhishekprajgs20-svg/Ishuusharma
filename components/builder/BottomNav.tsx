'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { Eye, EyeOff, MoreHorizontal, X } from 'lucide-react';
import { PANELS, type PanelKey } from './panels';

// Material Design caps a bottom nav at 5 destinations for a reason — much
// past that and labels either truncate or the bar has to scroll, both of
// which feel broken on a phone. So: the 4 most-used panels get a direct,
// always-visible slot, Preview gets its own slot (it's not a panel, it's
// the primary "see my paper" action), and everything else — including
// panels that used to be missing entirely from mobile (Test Details,
// Branding, AI Prompt Builder, PPT Slides, Cover/End Pages) — is one tap
// away behind "More", which opens a full grid bottom sheet instead of
// trying to cram a 9th icon into the bar itself.
const PRIMARY_KEYS: PanelKey[] = ['questions', 'sections', 'layout', 'meta'];

export default function BottomNav({
  activePanel,
  onSelect,
  previewOpen,
  onTogglePreview,
}: {
  activePanel: PanelKey;
  onSelect: (p: PanelKey) => void;
  previewOpen: boolean;
  onTogglePreview: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const primaryItems = PANELS.filter((p) => PRIMARY_KEYS.includes(p.key));
  const overflowItems = PANELS.filter((p) => !PRIMARY_KEYS.includes(p.key));
  const activeInOverflow = !previewOpen && overflowItems.some((p) => p.key === activePanel);

  return (
    <>
      {/* Backdrop + sheet for "More" — closes on tap-outside, same pattern
          as the reset-confirm popover elsewhere in the app. */}
      {moreOpen && (
        <div className="no-print md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMoreOpen(false)}>
          <div
            className="mobile-safe-bottom absolute bottom-0 left-0 right-0 bg-white dark:bg-ink-900 rounded-t-2xl shadow-[0_-8px_30px_rgba(16,24,40,0.18)] p-4 pb-3 max-h-[70vh] overflow-y-auto styled-scroll"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[14px] font-bold text-ink-900 dark:text-ink-100">More sections</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-ink-400 dark:text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {overflowItems.map(({ key, shortLabel, icon: Icon }) => {
                const active = !previewOpen && activePanel === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      onSelect(key);
                      setMoreOpen(false);
                    }}
                    className={clsx(
                      'flex flex-col items-center justify-center gap-1 rounded-xl2 py-3 px-1 transition',
                      active ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-ink-50 dark:hover:bg-ink-800'
                    )}
                  >
                    <Icon size={19} className={active ? 'text-brand-500' : 'text-ink-500 dark:text-ink-400'} strokeWidth={active ? 2.4 : 2} />
                    <span
                      className={clsx(
                        'text-[10.5px] font-semibold text-center leading-tight',
                        active ? 'text-brand-500' : 'text-ink-600 dark:text-ink-300'
                      )}
                    >
                      {shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* The bar itself — `fixed` (not flex-shrunk inside the app column)
          so it is ALWAYS pinned to the visible viewport bottom, never
          requires scrolling to reach, and survives mobile browser chrome
          resizing the viewport mid-session. mobile-safe-bottom (globals.css)
          adds env(safe-area-inset-bottom) padding for notched phones. */}
      <div className="no-print md:hidden mobile-safe-bottom fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-ink-900 border-t border-ink-200 dark:border-ink-800 shadow-[0_-4px_16px_rgba(16,24,40,0.08)] flex items-stretch">
        {primaryItems.map(({ key, shortLabel, icon: Icon }) => {
          const active = !previewOpen && activePanel === key;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 relative"
            >
              {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-brand-500" />}
              <Icon size={19} className={clsx(active ? 'text-brand-500' : 'text-ink-400 dark:text-ink-500')} strokeWidth={active ? 2.4 : 2} />
              <span className={clsx('text-[10px] font-semibold truncate max-w-full px-0.5', active ? 'text-brand-500' : 'text-ink-400 dark:text-ink-500')}>
                {shortLabel}
              </span>
            </button>
          );
        })}

        <button
          onClick={onTogglePreview}
          className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 relative"
        >
          {previewOpen && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-brand-500" />}
          {previewOpen ? (
            <EyeOff size={19} className="text-brand-500" strokeWidth={2.4} />
          ) : (
            <Eye size={19} className="text-ink-400 dark:text-ink-500" />
          )}
          <span className={clsx('text-[10px] font-semibold', previewOpen ? 'text-brand-500' : 'text-ink-400 dark:text-ink-500')}>
            Preview
          </span>
        </button>

        <button
          onClick={() => setMoreOpen(true)}
          className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 relative"
        >
          {activeInOverflow && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-brand-500" />}
          <MoreHorizontal size={19} className={clsx(activeInOverflow ? 'text-brand-500' : 'text-ink-400 dark:text-ink-500')} strokeWidth={activeInOverflow ? 2.4 : 2} />
          <span className={clsx('text-[10px] font-semibold', activeInOverflow ? 'text-brand-500' : 'text-ink-400 dark:text-ink-500')}>
            More
          </span>
        </button>
      </div>
    </>
  );
}
