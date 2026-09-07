'use client';

import { Presentation } from 'lucide-react';
import { useTestStore } from '@/store/testStore';
import { FONT_CHOICES, SLIDE_THEMES, type SlideColorScheme } from '@/lib/types';
import { Field, FieldRow, Select, SectionCard, Toggle, ColorInput, Button } from '../ui';

const SCHEME_ORDER: SlideColorScheme[] = ['branded', 'light', 'dark'];

const SCHEME_PREVIEW: Record<SlideColorScheme, { background: string; text: string; label: string; description: string }> = {
  branded: {
    background: '#F4F5FA',
    text: '#1A1A2E',
    label: 'Branded',
    description: 'Derived from your accent color below — background/text/muted tones built to match it.',
  },
  light: {
    background: SLIDE_THEMES.light.background,
    text: SLIDE_THEMES.light.text,
    label: SLIDE_THEMES.light.label,
    description: 'Clean white background, dark text — safe, high-contrast default.',
  },
  dark: {
    background: SLIDE_THEMES.dark.background,
    text: SLIDE_THEMES.dark.text,
    label: SLIDE_THEMES.dark.label,
    description: 'Deep navy background, light text — good for projector / dim-room presenting.',
  },
};

export default function SlideSettingsPanel() {
  const slideSettings = useTestStore((s) => s.doc.slideSettings);
  const updateSlideSettings = useTestStore((s) => s.updateSlideSettings);

  const handleExport = () => {
    // A real PDF via the browser's own print engine — same trusted
    // mechanism as Print / Save PDF, just a different page layout (one
    // question per landscape "slide" page). See components/SlidePrintView.tsx
    // and the body.slide-print-active CSS toggle in app/globals.css.
    document.body.classList.add('slide-print-active');
    const cleanup = () => {
      document.body.classList.remove('slide-print-active');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    requestAnimationFrame(() => window.print());
  };

  return (
    <div>
      <SectionCard title="Export">
        <p className="text-[12px] text-ink-500 dark:text-ink-400 mb-3.5 leading-relaxed">
          Generates a real PDF — one question per big landscape page, teaching-slide style — via the same trusted
          Print/Save PDF engine, so LaTeX math, tables, and Hindi all render perfectly. Opens your browser's print
          dialog once.
        </p>
        <Button variant="primary" onClick={handleExport} className="w-full">
          <Presentation size={15} />
          Print Slide PDF
        </Button>
      </SectionCard>

      <SectionCard title="Slide Theme">
        <div className="grid grid-cols-3 gap-2 mb-3.5">
          {SCHEME_ORDER.map((key) => {
            const preview = SCHEME_PREVIEW[key];
            const active = slideSettings.colorScheme === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => updateSlideSettings({ colorScheme: key })}
                className={`text-left rounded-lg border px-2.5 py-2 transition ${
                  active
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                    : 'border-ink-200 dark:border-ink-700 hover:border-brand-300'
                }`}
              >
                <div
                  className="w-full h-6 rounded mb-1.5 border border-ink-200/50 dark:border-ink-700/50"
                  style={{ background: preview.background }}
                >
                  <div className="w-4 h-1 rounded-full mt-1 ml-1.5" style={{ background: preview.text }} />
                </div>
                <div className={`text-[12px] font-semibold ${active ? 'text-brand-600 dark:text-brand-400' : 'text-ink-800 dark:text-ink-200'}`}>
                  {preview.label}
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-[11.5px] text-ink-400 dark:text-ink-500 -mt-2 mb-3">
          {SCHEME_PREVIEW[slideSettings.colorScheme].description}
        </p>
        <Field label="Slide Accent Color" hint="Used for the question badge, header/footer bars, and the correct-answer highlight">
          <ColorInput value={slideSettings.accentColor} onChange={(v) => updateSlideSettings({ accentColor: v })} />
        </Field>
        <Field label="Slide Font">
          <Select value={slideSettings.fontFamily} onChange={(e) => updateSlideSettings({ fontFamily: e.target.value as any })}>
            {Object.entries(FONT_CHOICES).map(([key, f]) => (
              <option key={key} value={key}>
                {f.label}
              </option>
            ))}
          </Select>
        </Field>
      </SectionCard>

      <SectionCard title="Content & Layout">
        <Toggle
          label="Show Answer on Question Slide"
          checked={slideSettings.showAnswerOnSlide}
          onChange={(v) => updateSlideSettings({ showAnswerOnSlide: v })}
        />
        <p className="text-[11.5px] text-ink-400 dark:text-ink-500 -mt-2 mb-3.5">
          {slideSettings.showAnswerOnSlide
            ? 'The correct option is highlighted directly on each question slide.'
            : 'Answers are withheld until a compact Answer Key section at the end of the deck.'}
        </p>
        <Toggle
          label="Include Explanation / Solution"
          checked={slideSettings.includeExplanation}
          onChange={(v) => updateSlideSettings({ includeExplanation: v })}
        />
        <p className="text-[11.5px] text-ink-400 dark:text-ink-500 -mt-2 mb-3.5">
          {slideSettings.showAnswerOnSlide
            ? 'Shown below the highlighted answer on each question slide.'
            : 'Adds a dedicated explanation slide per question after the answer key grid.'}
        </p>
        <Toggle
          label="Show Slide Numbers"
          checked={slideSettings.showSlideNumbers}
          onChange={(v) => updateSlideSettings({ showSlideNumbers: v })}
        />
      </SectionCard>

      <SectionCard title="Header & Footer">
        <p className="text-[11.5px] text-ink-400 dark:text-ink-500 -mt-1 mb-3.5 leading-relaxed">
          Shown as thin bars at the top and bottom of every slide — institute/coaching details, website, or a
          tagline.
        </p>
        <Field label="Header Text" hint="Shown top-left of every slide, e.g. institute name">
          <input
            className="w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100 px-3 py-2 text-[13px] font-mono"
            value={slideSettings.headerText}
            onChange={(e) => updateSlideSettings({ headerText: e.target.value })}
          />
        </Field>
        <Field label="Footer Text" hint="Shown bottom-left of every slide, e.g. website / social handle">
          <input
            className="w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100 px-3 py-2 text-[13px] font-mono"
            value={slideSettings.footerText}
            onChange={(e) => updateSlideSettings({ footerText: e.target.value })}
          />
        </Field>
        <Field label="Title Slide Subtitle (optional)" hint="Extra line shown under the test name on the opening slide">
          <input
            className="w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100 px-3 py-2 text-[13px]"
            value={slideSettings.titleSlideSubtitle || ''}
            onChange={(e) => updateSlideSettings({ titleSlideSubtitle: e.target.value })}
            placeholder="e.g. Batch 2026 — Live Class Test Series"
          />
        </Field>
      </SectionCard>

      <SectionCard title="Language">
        <Field
          label="Question Language Mode"
          hint="Hindi only falls back to English for any question/option/solution that was never translated, so nothing silently disappears"
        >
          <Select value={slideSettings.language} onChange={(e) => updateSlideSettings({ language: e.target.value as any })}>
            <option value="en">English only</option>
            <option value="hi">Hindi only</option>
            <option value="bilingual">Bilingual (English + Hindi)</option>
          </Select>
        </Field>
      </SectionCard>
    </div>
  );
}
