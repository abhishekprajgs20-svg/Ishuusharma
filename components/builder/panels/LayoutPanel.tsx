'use client';

import clsx from 'clsx';
import { Shuffle } from 'lucide-react';
import { useTestStore } from '@/store/testStore';
import { STYLE_PRESETS, FONT_CHOICES, type StylePreset } from '@/lib/types';
import { Field, FieldRow, Select, SectionCard, Toggle, ColorInput, Button } from '../ui';

const PRESET_ORDER: StylePreset[] = ['classic', 'modern', 'compact', 'exam-authority'];

export default function LayoutPanel() {
  const layout = useTestStore((s) => s.doc.layout);
  const updateLayout = useTestStore((s) => s.updateLayout);
  const headerFooter = useTestStore((s) => s.doc.headerFooter);
  const updateHeaderFooter = useTestStore((s) => s.updateHeaderFooter);

  const applyPreset = (preset: StylePreset) => {
    updateLayout({ ...STYLE_PRESETS[preset].patch, stylePreset: preset });
  };

  // Any hand-tuned styling knob breaks out of the active preset — this
  // wrapper marks the doc 'custom' alongside the actual field change so
  // the preset row never claims credit for a look the user tweaked away
  // from. Structural controls (columns, badges, marks) don't affect the
  // "which template look is this" question, so they use updateLayout
  // directly instead.
  const updateStyle = (patch: Parameters<typeof updateLayout>[0]) => {
    updateLayout({ ...patch, stylePreset: 'custom' });
  };

  return (
    <div>
      <SectionCard title="Style Templates">
        <div className="grid grid-cols-2 gap-2">
          {PRESET_ORDER.map((key) => {
            const preset = STYLE_PRESETS[key];
            const active = layout.stylePreset === key;
            return (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className={clsx(
                  'text-left rounded-lg border px-3 py-2 transition',
                  active
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                    : 'border-ink-200 dark:border-ink-700 hover:border-brand-300'
                )}
              >
                <div className={clsx('text-[13px] font-semibold', active ? 'text-brand-600 dark:text-brand-400' : 'text-ink-800 dark:text-ink-200')}>
                  {preset.label}
                </div>
                <div className="text-[11px] text-ink-400 dark:text-ink-500 mt-0.5 leading-snug">{preset.description}</div>
              </button>
            );
          })}
        </div>
        {layout.stylePreset === 'custom' && (
          <p className="text-[11.5px] text-ink-400 dark:text-ink-500 mt-2">
            Custom styling applied — pick a template above to reset to a bundled look.
          </p>
        )}
      </SectionCard>

      <SectionCard title="Page Layout">
        <FieldRow>
          <Field label="Columns">
            <Select value={String(layout.columns)} onChange={(e) => updateLayout({ columns: Number(e.target.value) as 1 | 2 })}>
              <option value="2">Two column</option>
              <option value="1">Single column</option>
            </Select>
          </Field>
          <Field label="Option Label Style">
            <Select value={layout.optionStyle} onChange={(e) => updateLayout({ optionStyle: e.target.value as any })}>
              <option value="abcd">A) B) C) D)</option>
              <option value="roman">I) II) III) IV)</option>
              <option value="numeric">1) 2) 3) 4)</option>
            </Select>
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Options Per Row" hint="2-up places (A)/(B) side by side, (C)/(D) on the next row">
            <Select
              value={String(layout.optionsPerRow)}
              onChange={(e) => updateLayout({ optionsPerRow: Number(e.target.value) as 1 | 2 })}
            >
              <option value="1">Stacked (1 per row)</option>
              <option value="2">Side by side (2 per row)</option>
            </Select>
          </Field>
          <Field label="Body Font (primary language)">
            <Select value={layout.fontFamily} onChange={(e) => updateStyle({ fontFamily: e.target.value as any })}>
              {Object.entries(FONT_CHOICES).map(([key, f]) => (
                <option key={key} value={key}>
                  {f.label}
                </option>
              ))}
            </Select>
          </Field>
        </FieldRow>
        {layout.fontFamily === 'google-custom' && (
          <Field
            label="Custom Font Name"
            hint="Type the exact family name shown on fonts.google.com, e.g. 'Poppins', 'Merriweather', 'Manrope'."
          >
            <input
              className="w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100 px-3 py-2 text-[14px]"
              value={layout.customFontName || ''}
              onChange={(e) => updateStyle({ customFontName: e.target.value })}
              placeholder="e.g. Poppins"
            />
          </Field>
        )}
        <FieldRow>
          <Field label="Base Font Size (pt)">
            <input
              type="range"
              min={8.5}
              max={13}
              step={0.5}
              value={layout.fontSizePt}
              onChange={(e) => updateStyle({ fontSizePt: Number(e.target.value) })}
              className="w-full accent-brand-500"
            />
            <div className="text-[12px] text-ink-400 dark:text-ink-500 mt-1">{layout.fontSizePt}pt</div>
          </Field>
          <Field label="Line Height">
            <input
              type="range"
              min={1.2}
              max={1.8}
              step={0.05}
              value={layout.lineHeight}
              onChange={(e) => updateStyle({ lineHeight: Number(e.target.value) })}
              className="w-full accent-brand-500"
            />
            <div className="text-[12px] text-ink-400 dark:text-ink-500 mt-1">{layout.lineHeight}</div>
          </Field>
        </FieldRow>
        <FieldRow>
          <Toggle
            label="Show Question Badge"
            checked={layout.showQuestionNumberBadge}
            onChange={(v) => updateLayout({ showQuestionNumberBadge: v })}
          />
          <Toggle
            label="Show Marks / Question"
            checked={layout.showMarksPerQuestion}
            onChange={(v) => updateLayout({ showMarksPerQuestion: v })}
          />
        </FieldRow>
      </SectionCard>

      <SectionCard title="Question Styling">
        <FieldRow>
          <Field
            label="Primary Language Text Style"
            hint={layout.showSecondaryLanguage ? 'Applies to the primary-language line only — see Secondary Language Style below for independent control of the other language.' : undefined}
          >
            <Select
              value={layout.questionTextEmphasis}
              onChange={(e) => updateStyle({ questionTextEmphasis: e.target.value as any })}
            >
              <option value="normal">Normal</option>
              <option value="bold">Bold</option>
              <option value="colored">Accent color</option>
              <option value="bold-colored">Bold + accent color</option>
            </Select>
          </Field>
          <Field label="Solution Box Style">
            <Select
              value={layout.solutionBoxStyle}
              onChange={(e) => updateStyle({ solutionBoxStyle: e.target.value as any })}
            >
              <option value="sidebar">Sidebar line</option>
              <option value="boxed">Boxed border</option>
              <option value="shaded">Shaded background</option>
              <option value="plain">Plain (label only)</option>
            </Select>
          </Field>
        </FieldRow>
        <Toggle
          label="Bold Option Labels — (A) (B) (C) (D)"
          checked={layout.boldOptionLabels}
          onChange={(v) => updateStyle({ boldOptionLabels: v })}
        />
        <Toggle
          label="Shuffle Option Order"
          checked={layout.shuffleOptions}
          onChange={(v) => updateLayout({ shuffleOptions: v })}
        />
        <p className="text-[11.5px] text-ink-400 dark:text-ink-500 -mt-2 mb-1">
          Randomizes each question&apos;s option order in the printed paper — useful for AI-generated or bulk-pasted
          question sets where the correct answer tends to always land on the same letter. The (A)(B)(C)(D) labels
          follow the shuffled order, so nothing about a question&apos;s content changes — only its option order. Your
          original order is never touched and is restored instantly if you turn this off. The Answer Key page always
          cites the shuffled letter too, so it stays correct however this is set.
        </p>
        {layout.shuffleOptions && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => updateLayout({ shuffleSeed: layout.shuffleSeed + 1 })}
          >
            <Shuffle size={13} /> Reshuffle
          </Button>
        )}
      </SectionCard>

      <SectionCard title="Language">
        <FieldRow>
          <Toggle
            label="Show Primary Language"
            checked={layout.showPrimaryLanguage}
            onChange={(v) => {
              // Never allow both to end up off — force secondary on
              // instead of silently doing nothing, so there's always a
              // language actually showing.
              if (!v && !layout.showSecondaryLanguage) {
                updateLayout({ showPrimaryLanguage: false, showSecondaryLanguage: true });
              } else {
                updateLayout({ showPrimaryLanguage: v });
              }
            }}
          />
          <Toggle
            label={`Show Secondary Language${layout.showSecondaryLanguage ? ` (${layout.secondaryLanguageLabel || 'untitled'})` : ''}`}
            checked={layout.showSecondaryLanguage}
            onChange={(v) => {
              if (!v && !layout.showPrimaryLanguage) {
                updateLayout({ showSecondaryLanguage: false, showPrimaryLanguage: true });
              } else {
                updateLayout({ showSecondaryLanguage: v });
              }
            }}
          />
        </FieldRow>
        <p className="text-[11.5px] text-ink-400 dark:text-ink-500 -mt-2 mb-1">
          Both on renders bilingually (primary line + secondary line under it, on the question, every option, and the
          explanation). Secondary alone falls back to primary for any question/option/explanation that was never
          translated, so nothing silently disappears. At least one must stay on.
        </p>

        {layout.showSecondaryLanguage && (
          <>
            <Field
              label="Secondary Language Name"
              hint="Freeform — this is just a label used across the builder (field names, hints). Doesn't need to be Hindi."
            >
              <input
                className="w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100 px-3 py-2 text-[14px]"
                value={layout.secondaryLanguageLabel}
                onChange={(e) => updateLayout({ secondaryLanguageLabel: e.target.value })}
                placeholder="e.g. Hindi, Tamil, Bengali, Urdu"
              />
            </Field>
            <FieldRow>
              <Field label="Secondary Language Font">
                <Select
                  value={layout.secondaryFontChoice}
                  onChange={(e) => updateLayout({ secondaryFontChoice: e.target.value as any })}
                >
                  <option value="devanagari">Devanagari (built-in, Hindi/Marathi/Sanskrit)</option>
                  <option value="same-as-primary">Same as primary font</option>
                  <option value="google-custom">Custom Google Font…</option>
                </Select>
              </Field>
              <Field label="Secondary Language Style" hint="Independent of the primary style above — bold one without the other, etc.">
                <Select
                  value={layout.secondaryTextEmphasis}
                  onChange={(e) => updateLayout({ secondaryTextEmphasis: e.target.value as any })}
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                  <option value="colored">Accent color</option>
                  <option value="bold-colored">Bold + accent color</option>
                </Select>
              </Field>
            </FieldRow>
            {layout.secondaryFontChoice === 'google-custom' && (
              <Field
                label="Secondary Custom Font Name"
                hint="Type the exact family name shown on fonts.google.com — e.g. 'Noto Sans Tamil', 'Noto Sans Bengali', 'Hind Siliguri', 'Noto Nastaliq Urdu', 'Noto Sans Telugu'. Works for any script Google Fonts hosts."
              >
                <input
                  className="w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100 px-3 py-2 text-[14px]"
                  value={layout.secondaryCustomFontName || ''}
                  onChange={(e) => updateLayout({ secondaryCustomFontName: e.target.value })}
                  placeholder="e.g. Noto Sans Tamil"
                />
              </Field>
            )}
          </>
        )}
      </SectionCard>

      <SectionCard title="Answers">
        <Toggle
          label="Highlight Correct Option in Question List"
          checked={layout.highlightCorrectOption}
          onChange={(v) => updateLayout({ highlightCorrectOption: v })}
        />
        <p className="text-[11.5px] text-ink-400 -mt-2 mb-1">
          Off by default — a real mock test should look like a blank exam. Turning this on marks the correct option
          directly next to each question, separately from whether solutions appear (set in Test Details → Default
          Solution Placement, or per-section / per-question).
        </p>
        {layout.highlightCorrectOption && (
          <FieldRow>
            <Field label="Highlight Style">
              <Select value={layout.highlightStyle} onChange={(e) => updateLayout({ highlightStyle: e.target.value as any })}>
                <option value="checkmark">Bold text + checkmark</option>
                <option value="fill">Color fill (background highlight)</option>
                <option value="underline">Colored underline</option>
                <option value="border">Colored border box</option>
              </Select>
            </Field>
            <Field label="Highlight Color">
              <ColorInput value={layout.highlightColor} onChange={(v) => updateLayout({ highlightColor: v })} />
            </Field>
          </FieldRow>
        )}
      </SectionCard>

      <SectionCard title="Header & Footer">
        <FieldRow>
          <Toggle label="Enable Header" checked={headerFooter.headerEnabled} onChange={(v) => updateHeaderFooter({ headerEnabled: v })} />
          <Toggle label="Enable Footer" checked={headerFooter.footerEnabled} onChange={(v) => updateHeaderFooter({ footerEnabled: v })} />
        </FieldRow>
        {headerFooter.headerEnabled && (
          <Field label="Header Text" hint="Placeholders: {{testName}} {{instituteName}} {{examName}} {{page}} {{totalPages}} {{date}}">
            <input
              className="w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100 px-3 py-2 text-[13px] font-mono"
              value={headerFooter.headerText}
              onChange={(e) => updateHeaderFooter({ headerText: e.target.value })}
            />
          </Field>
        )}
        {headerFooter.footerEnabled && (
          <Field label="Footer Text">
            <input
              className="w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100 px-3 py-2 text-[13px] font-mono"
              value={headerFooter.footerText}
              onChange={(e) => updateHeaderFooter({ footerText: e.target.value })}
            />
          </Field>
        )}
        <FieldRow>
          <Toggle
            label="Show Page Numbers"
            checked={headerFooter.showPageNumbers}
            onChange={(v) => updateHeaderFooter({ showPageNumbers: v })}
          />
          <Toggle
            label="Show Date in Header"
            checked={headerFooter.showDateInHeader}
            onChange={(v) => updateHeaderFooter({ showDateInHeader: v })}
          />
        </FieldRow>
      </SectionCard>
    </div>
  );
}
