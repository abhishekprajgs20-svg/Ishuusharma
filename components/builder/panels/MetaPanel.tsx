'use client';

import { useTestStore } from '@/store/testStore';
import { Field, FieldRow, TextInput, TextArea, Select, SectionCard } from '../ui';
import { secondaryFontCssFamily } from '@/lib/googleFont';

export default function MetaPanel() {
  const meta = useTestStore((s) => s.doc.meta);
  const updateMeta = useTestStore((s) => s.updateMeta);
  const layout = useTestStore((s) => s.doc.layout);
  const secondaryLabel = layout.secondaryLanguageLabel || 'Secondary';
  const secondaryFontStyle =
    layout.secondaryFontChoice === 'same-as-primary'
      ? undefined
      : { fontFamily: secondaryFontCssFamily(layout.secondaryFontChoice, layout.secondaryCustomFontName, '') };

  return (
    <div>
      <SectionCard title="Test Identity">
        <FieldRow>
          <Field label="Test Name (Primary)">
            <TextInput value={meta.testName} onChange={(e) => updateMeta({ testName: e.target.value })} />
          </Field>
          <Field label={`Test Name (${secondaryLabel})`} hint="Shown on cover page when Secondary Language is on">
            <TextInput
              style={secondaryFontStyle}
              value={meta.testNameHi || ''}
              onChange={(e) => updateMeta({ testNameHi: e.target.value })}
            />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Exam Name">
            <TextInput value={meta.examName || ''} onChange={(e) => updateMeta({ examName: e.target.value })} placeholder="e.g. UPSC Prelims 2026" />
          </Field>
          <Field label="Subject / Description">
            <TextInput value={meta.subject || ''} onChange={(e) => updateMeta({ subject: e.target.value })} />
          </Field>
        </FieldRow>
      </SectionCard>

      <SectionCard title="Test Parameters">
        <FieldRow cols={3}>
          <Field label="Duration">
            <TextInput value={meta.duration || ''} onChange={(e) => updateMeta({ duration: e.target.value })} placeholder="120 minutes" />
          </Field>
          <Field label="Total Marks">
            <TextInput
              type="number"
              value={meta.totalMarks ?? ''}
              onChange={(e) => updateMeta({ totalMarks: e.target.value ? Number(e.target.value) : undefined })}
            />
          </Field>
          <Field label="Date">
            <TextInput type="date" value={meta.date || ''} onChange={(e) => updateMeta({ date: e.target.value })} />
          </Field>
        </FieldRow>
        <Field label="Default Solution Placement" hint="Can still be overridden per-section or per-question">
          <Select
            value={meta.globalSolutionPlacement}
            onChange={(e) => updateMeta({ globalSolutionPlacement: e.target.value as any })}
          >
            <option value="inline">Inline (right after each question)</option>
            <option value="end">At the end (answer key section)</option>
            <option value="hidden">Hidden (no answers shown)</option>
          </Select>
        </Field>
      </SectionCard>

      <SectionCard title="Instructions">
        <Field
          label="Instructions — Primary (Markdown supported)"
          hint="Shown on the cover page itself, below the roll-number grid — no separate page. Supports # headings, --- dividers, lists, bold/italic."
        >
          <TextArea
            rows={10}
            value={meta.instructionsMarkdown}
            onChange={(e) => updateMeta({ instructionsMarkdown: e.target.value })}
          />
        </Field>
        <Field
          label={`Instructions — ${secondaryLabel} (optional)`}
          hint="When filled and both languages are on, instructions render as two columns side by side. Leave blank for primary-only instructions."
        >
          <TextArea
            rows={10}
            style={secondaryFontStyle}
            value={meta.instructionsMarkdownHi || ''}
            onChange={(e) => updateMeta({ instructionsMarkdownHi: e.target.value })}
          />
        </Field>
      </SectionCard>
    </div>
  );
}
