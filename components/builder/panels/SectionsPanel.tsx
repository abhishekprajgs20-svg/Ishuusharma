'use client';

import { useTestStore } from '@/store/testStore';
import { Field, FieldRow, TextInput, TextArea, Select, SectionCard, Toggle, Button } from '../ui';
import { Trash2, Plus, ArrowRight, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { secondaryFontCssFamily } from '@/lib/googleFont';

export default function SectionsPanel({ onGoToQuestions }: { onGoToQuestions: () => void }) {
  const sections = useTestStore((s) => s.doc.sections);
  const questions = useTestStore((s) => s.doc.questions);
  const addSection = useTestStore((s) => s.addSection);
  const updateSection = useTestStore((s) => s.updateSection);
  const removeSection = useTestStore((s) => s.removeSection);
  const duplicateSection = useTestStore((s) => s.duplicateSection);
  const reorderSections = useTestStore((s) => s.reorderSections);
  const layout = useTestStore((s) => s.doc.layout);
  const secondaryLabel = layout.secondaryLanguageLabel || 'Secondary';
  const secondaryFontStyle =
    layout.secondaryFontChoice === 'same-as-primary'
      ? undefined
      : { fontFamily: secondaryFontCssFamily(layout.secondaryFontChoice, layout.secondaryCustomFontName, '') };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-ink-500 dark:text-ink-400">
          Organize questions into sections, each with its own marking scheme, header, and time limit.
        </p>
      </div>

      {sections.map((sec, idx) => {
        const count = questions.filter((q) => q.sectionId === sec.id).length;
        return (
          <SectionCard
            key={sec.id}
            title={`${idx + 1}. ${sec.title || 'Untitled Section'}`}
            action={
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => idx > 0 && reorderSections(idx, idx - 1)}
                  disabled={idx === 0}
                  className="text-ink-400 dark:text-ink-500 hover:text-brand-600 dark:hover:text-brand-400 p-1 disabled:opacity-30 disabled:hover:text-ink-400 dark:disabled:hover:text-ink-500"
                  title="Move up"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  onClick={() => idx < sections.length - 1 && reorderSections(idx, idx + 1)}
                  disabled={idx === sections.length - 1}
                  className="text-ink-400 dark:text-ink-500 hover:text-brand-600 dark:hover:text-brand-400 p-1 disabled:opacity-30 disabled:hover:text-ink-400 dark:disabled:hover:text-ink-500"
                  title="Move down"
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  onClick={() => duplicateSection(sec.id)}
                  className="text-ink-400 dark:text-ink-500 hover:text-brand-600 dark:hover:text-brand-400 p-1"
                  title="Duplicate section (with its questions)"
                >
                  <Copy size={15} />
                </button>
                <button
                  onClick={() => removeSection(sec.id)}
                  className="text-red-400 dark:text-red-400/80 hover:text-red-600 dark:hover:text-red-400 p-1"
                  title="Delete section"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            }
          >
            <FieldRow>
              <Field label="Section Title (Primary)">
                <TextInput value={sec.title} onChange={(e) => updateSection(sec.id, { title: e.target.value })} />
              </Field>
              <Field label={`Section Title (${secondaryLabel})`}>
                <TextInput
                  style={secondaryFontStyle}
                  value={sec.titleHi || ''}
                  onChange={(e) => updateSection(sec.id, { titleHi: e.target.value })}
                />
              </Field>
            </FieldRow>

            <Field label="Instructions (shown under header)">
              <TextArea rows={2} value={sec.instructions || ''} onChange={(e) => updateSection(sec.id, { instructions: e.target.value })} />
            </Field>

            <FieldRow cols={3}>
              <Field label="Marks / Q">
                <TextInput
                  type="number"
                  step="0.25"
                  value={sec.marksPerQuestion ?? ''}
                  onChange={(e) => updateSection(sec.id, { marksPerQuestion: e.target.value ? Number(e.target.value) : undefined })}
                />
              </Field>
              <Field label="Negative">
                <TextInput
                  type="number"
                  step="0.25"
                  value={sec.negativeMarksPerQuestion ?? ''}
                  onChange={(e) =>
                    updateSection(sec.id, { negativeMarksPerQuestion: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </Field>
              <Field label="Time (min)">
                <TextInput
                  type="number"
                  min={0}
                  value={sec.timeLimitMinutes ?? ''}
                  onChange={(e) =>
                    updateSection(sec.id, { timeLimitMinutes: e.target.value ? Number(e.target.value) : undefined })
                  }
                  placeholder="—"
                />
              </Field>
            </FieldRow>

            <Field label="Default Solution Placement (for this section)">
              <Select
                value={sec.defaultSolutionPlacement}
                onChange={(e) => updateSection(sec.id, { defaultSolutionPlacement: e.target.value as any })}
              >
                <option value="inline">Inline</option>
                <option value="end">At the end</option>
                <option value="hidden">Hidden</option>
              </Select>
            </Field>

            <FieldRow>
              <Toggle
                label="Show Section Header"
                checked={sec.showSectionHeader}
                onChange={(v) => updateSection(sec.id, { showSectionHeader: v })}
              />
              <Toggle
                label="Page Break Before"
                checked={sec.pageBreakBefore}
                onChange={(v) => updateSection(sec.id, { pageBreakBefore: v })}
              />
            </FieldRow>

            <div className="flex items-center justify-between mt-2 pt-3 border-t border-ink-200 dark:border-ink-700">
              <span className="text-[12.5px] text-ink-500 dark:text-ink-400 font-medium">{count} question{count === 1 ? '' : 's'}</span>
              <Button size="sm" variant="secondary" onClick={onGoToQuestions}>
                Edit questions <ArrowRight size={13} />
              </Button>
            </div>
          </SectionCard>
        );
      })}

      <Button variant="secondary" onClick={() => addSection()} className="w-full">
        <Plus size={15} /> Add Section
      </Button>
    </div>
  );
}
