'use client';

import { useEffect, useState } from 'react';
import { useTestStore } from '@/store/testStore';
import TopBar from '@/components/builder/TopBar';
import BottomNav from '@/components/builder/BottomNav';
import PanelHost from '@/components/builder/PanelHost';
import LivePreview from '@/components/LivePreview';
import SlidePrintView from '@/components/SlidePrintView';
import type { PanelKey } from '@/components/builder/panels';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const hydrate = useTestStore((s) => s.hydrate);
  const hydrated = useTestStore((s) => s.hydrated);
  const doc = useTestStore((s) => s.doc);
  const [activePanel, setActivePanel] = useState<PanelKey>('questions');
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-ink-50 dark:bg-ink-950">
        <div className="flex flex-col items-center gap-3 text-ink-400">
          <Loader2 className="animate-spin" size={28} />
          <span className="text-sm font-medium">Loading your workspace…</span>
        </div>
      </div>
    );
  }

  return (
    // app-shell-h (globals.css) uses 100dvh with a 100vh fallback instead of
    // Tailwind's h-screen (100vh) — 100vh is measured against the browser's
    // LARGEST possible viewport on mobile Safari/Chrome, taller than what's
    // actually visible once the address bar is showing on screen, which is
    // exactly what was pushing the bottom nav below the visible area until
    // the page scrolled. dvh tracks the real, current visible viewport.
    <div className="app-shell app-shell-h w-screen flex flex-col bg-ink-50 dark:bg-ink-950 overflow-hidden">
      <TopBar activePanel={activePanel} onSelectPanel={setActivePanel} />

      <div className="app-body-row flex-1 flex overflow-hidden min-h-0">
        {/* Editor panel — no left sidebar anymore; nav lives in the header,
            so this column can be narrower and the preview gets the rest. */}
        <div
          className={`no-print flex-1 md:flex-[0_0_auto] md:w-[380px] lg:w-[400px] xl:w-[420px] min-w-0 overflow-y-auto overflow-x-hidden styled-scroll border-r border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 pb-20 md:pb-0 ${
            mobilePreviewOpen ? 'hidden md:block' : 'block'
          }`}
        >
          <PanelHost activePanel={activePanel} onSelectPanel={setActivePanel} />
        </div>

        {/* Live A4 preview — now has the majority of the desktop width.
            Deliberately NOT dark-mode-styled: this pane's background frames
            real printed paper, so it stays the same neutral light gray in
            both themes — only the surrounding builder chrome goes dark. */}
        <div
          className={`preview-pane flex-1 min-w-0 overflow-y-auto overflow-x-hidden styled-scroll bg-ink-100 px-4 md:px-8 lg:px-12 pb-20 md:pb-0 ${
            mobilePreviewOpen ? 'block' : 'hidden md:block'
          }`}
        >
          <div className="preview-scale-wrap scale-[0.42] sm:scale-[0.55] md:scale-[0.7] lg:scale-[0.85] xl:scale-100 origin-top transition-transform">
            <LivePreview doc={doc} />
          </div>
        </div>
      </div>

      {/* Slide PDF print target — a second, independent print target from
          the main A4 mock-test pipeline above. Never visible on screen
          (see .no-print-ever in globals.css) and never shown during a
          normal Print/Save PDF — only rendered onto the physical/PDF page
          when body.slide-print-active is toggled on right before
          window.print() (see TopBar's handlePrintSlides), and the normal
          #print-root is simultaneously hidden by that same class so the
          two print targets can never overlap in one PDF. */}
      <div className="no-print-ever">
        <SlidePrintView doc={doc} />
      </div>

      {/* Mobile bottom nav — fixed to the viewport bottom (not flex-shrunk
          inside the app-shell column) so it is always reachable without
          scrolling, on any phone, regardless of dynamic browser-chrome
          resizing. See BottomNav.tsx for why it's `fixed` now. */}
      <BottomNav
        activePanel={activePanel}
        onSelect={(p) => {
          setActivePanel(p);
          setMobilePreviewOpen(false);
        }}
        previewOpen={mobilePreviewOpen}
        onTogglePreview={() => setMobilePreviewOpen((v) => !v)}
      />
    </div>
  );
}
