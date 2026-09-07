'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TestDocument } from '@/lib/types';
import { FONT_CHOICES } from '@/lib/types';
import { planPages, MM_TO_PX, A4_WIDTH_MM, A4_HEIGHT_MM } from '@/lib/paginate';
import { buildQuestionFragments, questionContentHash, type QuestionFragment } from './QuestionFragments';
import { SectionHeaderBlock, EndSolutionBlock, CustomPageBlock } from './FlowBlocks';
import CoverPage from './CoverPage';
import { PageHeader, PageFooter } from './PageChrome';
import { useGoogleFont, primaryFontCssFamily } from '@/lib/googleFont';

// A generic "flow item" that gets measured and paginated. Most items are
// now individual question FRAGMENTS (stem / option / inline-solution)
// rather than whole questions — see QuestionFragments.tsx for why.
type FlowKind = 'section-header' | 'question-fragment' | 'end-solutions-title' | 'end-solution' | 'custom-page-single';

interface FlowItem {
  key: string;
  kind: FlowKind;
  render: () => React.ReactNode;
  forcePageBreakBefore?: boolean;
  groupKey?: string;
  groupIsFirst?: boolean;
}

const PAD_MM = 14; // matches --a4-pad
// Matches .q-frag's margin-bottom in globals.css (and the measurement
// portal's own [data-flow-key] rule, which mirrors it) — see the long
// comment at the measureGroup() height cache write for why this must be
// added back into every measured fragment height.
const FRAGMENT_MARGIN_PX = 2.4 * MM_TO_PX;

export default function LivePreview({ doc }: { doc: TestDocument }) {
  const [pages, setPages] = useState<React.ReactNode[]>([]);
  const measureHostRef = useRef<HTMLDivElement | null>(null);
  const chromeHostRef = useRef<HTMLDivElement | null>(null);
  const [measurePortalReady, setMeasurePortalReady] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => setMeasurePortalReady(true), []);

  // bump version (retrigger measurement) whenever doc content changes.
  // NOTE: this key is intentionally cheap-ish (just retrigger detection) —
  // the expensive part (deciding WHICH fragments actually need rebuilding /
  // re-measuring) happens per-question via questionContentHash below, not
  // here. This still stringifies close to the whole doc, but it only runs
  // once per render (not per fragment) and its only job is "did anything
  // change at all", so it stays cheap relative to the measure/rebuild work
  // it used to gate.
  const docKey = useMemo(
    () =>
      JSON.stringify({
        q: doc.questions,
        s: doc.sections,
        l: doc.layout,
        m: doc.meta,
        b: doc.branding,
        h: doc.headerFooter,
        c: doc.customPages,
      }),
    [doc]
  );

  useEffect(() => {
    setVersion((v) => v + 1);
  }, [docKey]);

  // Layout fields that change every fragment's MEASURED HEIGHT (page
  // geometry) rather than its content. A change here means every cached
  // height (and the measurement portal's column width) is stale and must
  // be recomputed from scratch, regardless of per-question content hashes.
  const layoutGeometryKey = useMemo(
    () =>
      JSON.stringify([
        doc.layout.columns,
        doc.layout.fontSizePt,
        doc.layout.lineHeight,
        doc.layout.fontFamily,
        // A custom font NAME change (same fontFamily='google-custom' slot,
        // different typed name) changes every fragment's real metrics just
        // like switching fontFamily itself does — same for the secondary
        // font slot, which affects every fragment with secondary-language
        // text. None of these change questionContentHash on their own, so
        // without this they'd only get picked up on this page's own
        // per-question hash change, not force the height cache clear a
        // font-metric change actually needs.
        doc.layout.customFontName,
        doc.layout.secondaryFontChoice,
        doc.layout.secondaryCustomFontName,
      ]),
    [
      doc.layout.columns,
      doc.layout.fontSizePt,
      doc.layout.lineHeight,
      doc.layout.fontFamily,
      doc.layout.customFontName,
      doc.layout.secondaryFontChoice,
      doc.layout.secondaryCustomFontName,
    ]
  );

  // Load the two independently-choosable Google Fonts (primary + secondary)
  // whenever their custom names are set — safe to call every render, a
  // no-op after the first successful injection per name (see
  // lib/googleFont.ts). Loaded once here at the top of the whole preview
  // tree so both the measurement portal and the real print/preview pages
  // see the same font in place before anything measures against it.
  useGoogleFont(doc.layout.fontFamily === 'google-custom' ? doc.layout.customFontName : undefined);
  useGoogleFont(doc.layout.secondaryFontChoice === 'google-custom' ? doc.layout.secondaryCustomFontName : undefined);

  const resolvedFontFamily = primaryFontCssFamily(doc.layout.fontFamily, doc.layout.customFontName, FONT_CHOICES);

  const columnWidthPx = useMemo(() => {
    const contentWidthMm = A4_WIDTH_MM - PAD_MM * 2;
    const cols = doc.layout.columns;
    const gapMm = cols === 2 ? 8 : 0;
    const colWidthMm = cols === 2 ? (contentWidthMm - gapMm) / 2 : contentWidthMm;
    return colWidthMm * MM_TO_PX;
  }, [doc.layout.columns]);

  const fullWidthPx = useMemo(() => (A4_WIDTH_MM - PAD_MM * 2) * MM_TO_PX, []);

  // Per-question fragment cache (point C): a question whose own data AND
  // every layout field that can affect its rendering (questionContentHash)
  // are unchanged since the last render reuses its previously-built
  // fragments instead of calling buildQuestionFragments again. Persists
  // across renders in a ref (not state) since it's pure memoization, never
  // itself a render trigger. Keyed by question id; stale entries (deleted
  // questions) are pruned each pass so the map can't grow unbounded.
  const fragmentCacheRef = useRef<Map<string, { hash: string; fragments: QuestionFragment[] }>>(new Map());

  // Measured-height cache (point B) — declared here (rather than beside the
  // measurement effect below) because rebuilding a question's fragments is
  // exactly the moment we know its OLD fragment keys are no longer valid
  // (a fragment's key is stable per question+slot, e.g. `q-<id>-stem`, but
  // its rendered content — and therefore its real height — can change even
  // though the key doesn't; and the number/keys of option-row fragments can
  // itself change, e.g. adding an option). So fragment-cache invalidation
  // is also responsible for evicting the corresponding stale height-cache
  // entries; the measurement effect only ever fills gaps, never itself
  // decides a cached height is stale.
  const heightCacheRef = useRef<Map<string, number>>(new Map());

  // Build the flat list of flow items for MCQ body pages (sections +
  // question FRAGMENTS, in document order, respecting section groupings).
  const bodyFlowItems: FlowItem[] = useMemo(() => {
    const items: FlowItem[] = [];
    const cache = fragmentCacheRef.current;
    const heightCache = heightCacheRef.current;
    const seenIds = new Set<string>();

    // Precompute question -> global-index (1-based) and section -> its
    // questions (in doc order) ONCE up front instead of doc.questions
    // .findIndex(...)/.filter(...) inside the per-section loop below —
    // those were each an O(n) scan repeated per question/section, i.e.
    // O(n * sections) and O(n^2) respectively, which is exactly the kind
    // of "cost scales with total document size, not with what changed"
    // overhead this fix targets. A single O(n) pass replaces both.
    const globalIdxById = new Map<string, number>();
    const questionsBySection = new Map<string, typeof doc.questions>();
    doc.questions.forEach((q, i) => {
      globalIdxById.set(q.id, i + 1);
      const bucket = questionsBySection.get(q.sectionId);
      if (bucket) bucket.push(q);
      else questionsBySection.set(q.sectionId, [q]);
    });

    doc.sections.forEach((section, sIdx) => {
      if (section.showSectionHeader) {
        items.push({
          key: `sec-${section.id}`,
          kind: 'section-header',
          forcePageBreakBefore: section.pageBreakBefore && sIdx > 0,
          render: () => <SectionHeaderBlock section={section} layout={doc.layout} />,
        });
      }
      const sectionQuestions = questionsBySection.get(section.id) || [];
      sectionQuestions.forEach((q) => {
        seenIds.add(q.id);
        const globalIdx = globalIdxById.get(q.id)!;
        const hash = questionContentHash(q, section, doc.layout, doc.meta.globalSolutionPlacement, globalIdx);
        const cached = cache.get(q.id);
        let fragments: QuestionFragment[];
        if (cached && cached.hash === hash) {
          fragments = cached.fragments;
        } else {
          fragments = buildQuestionFragments(q, section, doc.layout, doc.meta.globalSolutionPlacement, globalIdx);
          // content actually changed (or this is a new question) — any
          // previously-cached heights for this question's OLD fragment
          // keys are now stale (either the content behind that key
          // changed, or the key no longer exists at all because option
          // rows were added/removed), so drop them and let the
          // measurement effect re-measure this question's fragments only.
          if (cached) {
            cached.fragments.forEach((f) => heightCache.delete(f.key));
          }
        }
        cache.set(q.id, { hash, fragments });
        fragments.forEach((frag) => {
          items.push({
            key: frag.key,
            kind: 'question-fragment',
            groupKey: q.id,
            groupIsFirst: frag.isFirst,
            render: () => frag.node,
          });
        });
      });
    });
    // prune deleted questions so the cache doesn't grow unbounded
    for (const id of Array.from(cache.keys())) {
      if (!seenIds.has(id)) cache.delete(id);
    }
    return items;
  }, [doc]);

  // End-of-booklet solutions (only for questions whose effective
  // placement resolves to "end") — these stay atomic; the answer-key
  // page is short-form text and doesn't have the same blank-space risk.
  const endSolutionItems: FlowItem[] = useMemo(() => {
    const items: FlowItem[] = [];
    const sectionById = new Map(doc.sections.map((s) => [s.id, s]));
    const globalIdxById = new Map<string, number>();
    doc.questions.forEach((q, i) => globalIdxById.set(q.id, i + 1));
    const withEndPlacement = doc.questions.filter((q) => {
      const section = sectionById.get(q.sectionId);
      const placement = q.solutionPlacement || section?.defaultSolutionPlacement || doc.meta.globalSolutionPlacement;
      return placement === 'end';
    });
    if (withEndPlacement.length === 0) return items;
    items.push({
      key: 'end-sol-title',
      kind: 'end-solutions-title',
      render: () => (
        <div className="q-block">
          <h2 className="font-display font-bold text-[1.3em] mb-2" style={{ color: 'var(--accent, #3d4bfa)' }}>
            Answer Key &amp; Solutions
          </h2>
        </div>
      ),
    });
    withEndPlacement.forEach((q) => {
      const globalIdx = globalIdxById.get(q.id)!;
      const section = sectionById.get(q.sectionId);
      // The key incorporates the SAME content hash question fragments use
      // (shuffle order/seed, option style, secondary-language toggles,
      // font, emphasis — everything that can change what EndSolutionBlock
      // actually renders and therefore its real height). Without this the
      // key stayed `endsol-<id>` forever, so heightCacheRef kept
      // reusing a height measured under the OLD settings after a change
      // like turning Shuffle or the secondary language on/off — the exact
      // same "stale cached height silently overflows the fixed-height,
      // overflow:hidden print page" bug already found and fixed for the
      // main question body. A hash change here just orphans the old key
      // (pruned by the "drop cached heights for keys that no longer
      // exist" pass below) and measures fresh under a new one.
      const hash = questionContentHash(q, section, doc.layout, doc.meta.globalSolutionPlacement, globalIdx);
      items.push({
        key: `endsol-${q.id}-${hash}`,
        kind: 'end-solution',
        render: () => <EndSolutionBlock question={q} layout={doc.layout} index={globalIdx} />,
      });
    });
    return items;
  }, [doc]);

  // Bumped whenever a layout-geometry field changes (columns/font/line
  // height/family) — a change here invalidates every cached height at
  // once, since it can change how EVERY fragment wraps/renders, not just
  // ones whose content changed.
  const geometryGenRef = useRef(layoutGeometryKey);

  // Debounce gate (point A): every doc change re-runs this effect (via
  // `version`), but while the user is actively typing we don't want to
  // kick off a fresh raf+180ms+550ms settle chain on every single
  // keystroke — that's 3 full measure/plan passes per character. Instead,
  // a keystroke only (re)arms a short debounce timer; the actual settle
  // chain starts once that timer fires uninterrupted, i.e. ~200ms after
  // the LAST change. The settle chain itself (raf, then +180ms, then
  // +550ms retries for async font/KaTeX/image loads) is unchanged once it
  // starts — this only delays when it starts, so slow-loading fonts/math
  // still get their retries after the debounce settles.
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!measurePortalReady) return;

    // Full geometry change invalidates all cached heights up front. Done
    // outside the debounce so the very next settle pass (whenever it
    // fires) always sees a clean cache, even if more keystrokes arrive
    // before the debounce elapses.
    if (geometryGenRef.current !== layoutGeometryKey) {
      geometryGenRef.current = layoutGeometryKey;
      heightCacheRef.current.clear();
    }

    let cancelled = false;
    let raf = 0;
    let t1: ReturnType<typeof setTimeout> | null = null;
    let t2: ReturnType<typeof setTimeout> | null = null;

    const measureAndPlan = () => {
      const host = measureHostRef.current;
      const chromeHost = chromeHostRef.current;
      if (!host || !chromeHost) return;

      // Measure the ACTUAL rendered header/footer height instead of using
      // a fixed guess. A fixed 10mm/8mm reserve is what caused the print
      // cutoff bug: whenever real header text wrapped to two lines (long
      // institute + test name), the header rendered taller than the
      // guess, shrinking the real content area below what pagination had
      // already planned for — and the fixed-height, overflow:hidden sheet
      // silently clipped the difference. Measuring for real means the
      // content-height budget always matches what actually renders.
      const headerEl = chromeHost.querySelector<HTMLElement>('[data-chrome="header"]');
      const footerEl = chromeHost.querySelector<HTMLElement>('[data-chrome="footer"]');
      const headerHeightPx = headerEl?.getBoundingClientRect().height || 0;
      const footerHeightPx = footerEl?.getBoundingClientRect().height || 0;

      const contentHeightMm = A4_HEIGHT_MM - PAD_MM * 2;
      const contentHeightPx = contentHeightMm * MM_TO_PX - headerHeightPx - footerHeightPx;
      // small safety margin so rounding/subpixel measurement never tips
      // content over the real page boundary
      const columnHeightPx = Math.max(contentHeightPx - 2, 40);

      // Only query/measure DOM nodes for keys not already cached — a key
      // stays cached across passes until fragmentCacheRef rebuilds it
      // (new content) or a geometry change clears the whole cache above,
      // so an unrelated question's fragments never pay a DOM read here.
      const measureGroup = (flowItems: FlowItem[]) => {
        const cache = heightCacheRef.current;
        const missing = flowItems.filter((item) => !cache.has(item.key));
        if (missing.length > 0) {
          const missingKeys = new Set(missing.map((m) => m.key));
          const nodes = Array.from(host.querySelectorAll<HTMLElement>('[data-flow-key]'));
          nodes.forEach((n) => {
            const key = n.getAttribute('data-flow-key')!;
            // getBoundingClientRect() deliberately excludes margin, but every
            // rendered fragment (.q-frag in the real pages, [data-flow-key]
            // here) carries a real margin-bottom: 2.4mm between it and the
            // next one (see .q-frag in globals.css) — that's real vertical
            // space it occupies in the actual column, just not part of its
            // own border box. Leaving it out of the measured height silently
            // under-budgets every single fragment by 2.4mm, and with dozens
            // of fragments per page that adds up to tens of millimetres of
            // unaccounted height — exactly enough to overflow a column well
            // past what the packer believed it fit, and (since .a4-sheet is
            // fixed-height + overflow:hidden in print) silently clip whole
            // questions off the bottom with no way for them to reappear
            // anywhere. Adding the margin back here is what makes the
            // packer's budget match the page's real, rendered footprint.
            if (missingKeys.has(key)) cache.set(key, n.getBoundingClientRect().height + FRAGMENT_MARGIN_PX);
          });
        }
        return flowItems.map((item) => ({
          item,
          height: cache.get(item.key) || 40,
          breakBefore: item.forcePageBreakBefore,
          groupKey: item.groupKey,
          groupIsFirst: item.groupIsFirst,
        }));
      };

      const bodyMeasured = measureGroup(bodyFlowItems);
      const endMeasured = measureGroup(endSolutionItems);

      // Drop cached heights for keys that no longer exist in either flow
      // (deleted questions / removed fragments) so the cache can't grow
      // unbounded across a long editing session.
      {
        const liveKeys = new Set<string>([...bodyFlowItems.map((i) => i.key), ...endSolutionItems.map((i) => i.key)]);
        const cache = heightCacheRef.current;
        for (const key of Array.from(cache.keys())) {
          if (!liveKeys.has(key)) cache.delete(key);
        }
      }

      if (cancelled) return;

      const bodyPages = planPages(bodyMeasured, columnHeightPx, doc.layout.columns);
      const endPages = endSolutionItems.length > 0 ? planPages(endMeasured, columnHeightPx, doc.layout.columns) : [];

      const startCustomPages = doc.customPages.filter((p) => p.position === 'start');
      const endCustomPages = doc.customPages.filter((p) => p.position === 'end');

      const totalPages =
        1 + // cover (now also carries instructions — no separate page)
        startCustomPages.length +
        bodyPages.length +
        endPages.length +
        endCustomPages.length;

      let pageCounter = 1;
      const rendered: React.ReactNode[] = [];

      // Cover page
      rendered.push(
        <div className="a4-sheet" key="cover">
          <CoverPage doc={doc} />
        </div>
      );
      pageCounter++;

      // Start custom pages
      startCustomPages.forEach((p) => {
        const pg = pageCounter++;
        rendered.push(
          <div className="a4-sheet" key={`start-${p.id}`}>
            <div className="a4-sheet-inner">
              <PageHeader doc={doc} page={pg} totalPages={totalPages} />
              <div className="a4-content-area">
                <CustomPageBlock title={p.title} content={p.content} />
              </div>
              <PageFooter doc={doc} page={pg} totalPages={totalPages} />
            </div>
          </div>
        );
      });

      // Body pages (question fragments — a question may visibly continue
      // from the bottom of one column straight into the top of the next)
      bodyPages.forEach((page, pIdx) => {
        const pg = pageCounter++;
        rendered.push(
          <div className="a4-sheet" key={`body-${pIdx}`}>
            <div className="a4-sheet-inner">
              <PageHeader doc={doc} page={pg} totalPages={totalPages} />
              {doc.branding.watermarkDataUrl && (
                <div className="a4-watermark" style={{ opacity: doc.branding.watermarkOpacity }}>
                  <img src={doc.branding.watermarkDataUrl} alt="" />
                </div>
              )}
              <div className="a4-content-area">
                <div className={doc.layout.columns === 2 ? 'a4-two-col' : 'a4-one-col'}>
                  {/* Each column div renders ONLY the fragments the JS packer
                      already assigned to it (see the .a4-col comment in
                      globals.css for why this can no longer be a single flat
                      list handed to CSS multicol). */}
                  {page.columns.map((col, ci) => (
                    <div key={ci} className="a4-col">
                      {col.blocks.map((item) => (
                        <div key={item.key} className="q-frag">
                          {item.render()}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <PageFooter doc={doc} page={pg} totalPages={totalPages} />
            </div>
          </div>
        );
      });

      // End solutions pages
      endPages.forEach((page, pIdx) => {
        const pg = pageCounter++;
        rendered.push(
          <div className="a4-sheet" key={`endsol-page-${pIdx}`}>
            <div className="a4-sheet-inner">
              <PageHeader doc={doc} page={pg} totalPages={totalPages} />
              <div className="a4-content-area">
                <div className={doc.layout.columns === 2 ? 'a4-two-col' : 'a4-one-col'}>
                  {page.columns.map((col, ci) => (
                    <div key={ci} className="a4-col">
                      {col.blocks.map((item) => (
                        <div key={item.key}>{item.render()}</div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <PageFooter doc={doc} page={pg} totalPages={totalPages} />
            </div>
          </div>
        );
      });

      // End custom pages
      endCustomPages.forEach((p) => {
        const pg = pageCounter++;
        rendered.push(
          <div className="a4-sheet" key={`end-${p.id}`}>
            <div className="a4-sheet-inner">
              <PageHeader doc={doc} page={pg} totalPages={totalPages} />
              <div className="a4-content-area">
                <CustomPageBlock title={p.title} content={p.content} />
              </div>
              <PageFooter doc={doc} page={pg} totalPages={totalPages} />
            </div>
          </div>
        );
      });

      setPages(rendered);
    };

    // Coalesce rapid changes: (re)arm a single debounce timer per doc
    // change. Only once ~200ms pass with no further change does the real
    // settle chain start — measure after paint, and again shortly after
    // (fonts/katex/images settle async). A keystroke that arrives before
    // the debounce elapses clears and re-arms it (via this same effect
    // re-running and cleanup firing), so a fast typist never triggers the
    // chain mid-word; it runs once, ~200ms after the pause.
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      raf = requestAnimationFrame(() => measureAndPlan());
      t1 = setTimeout(measureAndPlan, 180);
      t2 = setTimeout(measureAndPlan, 550);
    }, 200);

    return () => {
      cancelled = true;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      cancelAnimationFrame(raf);
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }, [bodyFlowItems, endSolutionItems, columnWidthPx, doc, measurePortalReady, version, layoutGeometryKey]);

  return (
    <>
      {/* Hidden measurement host: renders every fragment at true column
          width, off-screen, so we can read real heights before deciding
          page/column placement. */}
      {measurePortalReady &&
        createPortal(
          <div
            ref={measureHostRef}
            aria-hidden
            style={
              {
                position: 'fixed',
                top: 0,
                left: -99999,
                width: columnWidthPx,
                visibility: 'hidden',
                pointerEvents: 'none',
                zIndex: -1,
                fontSize: `${doc.layout.fontSizePt}pt`,
                lineHeight: doc.layout.lineHeight,
                fontFamily: resolvedFontFamily,
                '--accent': doc.branding.accentColor,
              } as React.CSSProperties
            }
          >
            <style>{`[data-flow-key] { margin-bottom: 2.4mm; }`}</style>
            {bodyFlowItems.map((item) => (
              <div key={item.key} data-flow-key={item.key}>
                {item.render()}
              </div>
            ))}
            {endSolutionItems.map((item) => (
              <div key={item.key} data-flow-key={item.key}>
                {item.render()}
              </div>
            ))}
          </div>,
          document.body
        )}

      {/* Hidden chrome host: renders one real header + footer at full
          page width, off-screen, purely so we can measure their actual
          heights (see the comment above measureAndPlan) instead of
          guessing with a fixed reserve. */}
      {measurePortalReady &&
        createPortal(
          <div
            ref={chromeHostRef}
            aria-hidden
            style={
              {
                position: 'fixed',
                top: 0,
                left: -99999,
                width: fullWidthPx,
                visibility: 'hidden',
                pointerEvents: 'none',
                zIndex: -1,
                fontSize: `${doc.layout.fontSizePt}pt`,
                lineHeight: doc.layout.lineHeight,
                fontFamily: resolvedFontFamily,
                '--accent': doc.branding.accentColor,
              } as React.CSSProperties
            }
          >
            <div data-chrome="header">
              <PageHeader doc={doc} page={1} totalPages={1} />
            </div>
            <div data-chrome="footer">
              <PageFooter doc={doc} page={1} totalPages={1} />
            </div>
          </div>,
          document.body
        )}

      <div
        id="print-root"
        className="flex flex-col items-center gap-8 py-8"
        style={
          {
            '--accent': doc.branding.accentColor,
            fontSize: `${doc.layout.fontSizePt}pt`,
            lineHeight: doc.layout.lineHeight,
            fontFamily: resolvedFontFamily,
          } as React.CSSProperties
        }
      >
        {pages}
      </div>
    </>
  );
}
