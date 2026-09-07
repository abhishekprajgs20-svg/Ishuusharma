'use client';

import { memo, useRef } from 'react';
import { useTestStore } from '@/store/testStore';
import type { Question } from '@/lib/types';
import { Field, FieldRow, TextInput, TextArea, Select, Toggle, Button } from './ui';
import { Trash2, Copy, ImagePlus, X, ChevronUp, ChevronDown } from 'lucide-react';
import { genId } from '@/lib/defaults';
import { secondaryFontCssFamily } from '@/lib/googleFont';

// Memoized: QuestionsPanel maps over doc.questions, and every store update
// gives that array a new reference (even for edits to a single question),
// so without memoization EVERY question row would re-render on every
// keystroke in ANY question's field, not just its own. The store's
// updateQuestion/addOption/etc. actions only replace the ONE affected
// question object (via .map, `q.id === id ? {...q, ...patch} : q`) and
// leave every other question's object reference untouched, so a plain
// shallow-prop comparison here (default React.memo behavior — `question`
// and `index` are the only props) is exactly correct: a row only
// re-renders when its OWN question object or its own index actually
// changed identity.
function QuestionEditor({ question, index }: { question: Question; index: number }) {
  const updateQuestion = useTestStore((s) => s.updateQuestion);
  const removeQuestion = useTestStore((s) => s.removeQuestion);
  const duplicateQuestion = useTestStore((s) => s.duplicateQuestion);
  const addOption = useTestStore((s) => s.addOption);
  const updateOption = useTestStore((s) => s.updateOption);
  const removeOption = useTestStore((s) => s.removeOption);
  const setCorrectOption = useTestStore((s) => s.setCorrectOption);
  const layout = useTestStore((s) => s.doc.layout);
  const sections = useTestStore((s) => s.doc.sections);
  const moveQuestionToSection = useTestStore((s) => s.moveQuestionToSection);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const secondaryLabel = layout.secondaryLanguageLabel || 'Secondary';
  const secondaryFontStyle =
    layout.secondaryFontChoice === 'same-as-primary'
      ? undefined
      : { fontFamily: secondaryFontCssFamily(layout.secondaryFontChoice, layout.secondaryCustomFontName, '') };

  const handleAddImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      updateQuestion(question.id, {
        images: [...question.images, { id: genId(), src: reader.result as string, widthPct: 60 }],
      });
    };
    reader.readAsDataURL(file);
  };

  const handleOptionImage = (optionId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      updateOption(question.id, optionId, { image: { id: genId(), src: reader.result as string, widthPct: 40 } });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white dark:bg-ink-800 rounded-xl2 border border-ink-200 dark:border-ink-700 shadow-soft mb-4 overflow-hidden max-w-full">
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 bg-ink-50 dark:bg-ink-900 border-b border-ink-100 dark:border-ink-800 min-w-0">
        <span className="font-bold text-[13.5px] text-ink-700 dark:text-ink-200 shrink-0">Q{index + 1}</span>
        <div className="flex items-center gap-0.5 sm:gap-1 min-w-0 shrink-0">
          <button
            onClick={() => updateQuestion(question.id, { highlighted: !question.highlighted })}
            className={`text-[11px] font-semibold px-1.5 sm:px-2 py-1 rounded-md transition whitespace-nowrap ${
              question.highlighted ? 'bg-amber-100 text-amber-700' : 'text-ink-400 dark:text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800'
            }`}
            title="Toggle highlight"
          >
            ★ <span className="hidden xs:inline">Highlight</span>
          </button>
          <button onClick={() => duplicateQuestion(question.id)} className="p-1.5 text-ink-400 dark:text-ink-500 hover:text-brand-500" title="Duplicate">
            <Copy size={15} />
          </button>
          <button onClick={() => removeQuestion(question.id)} className="p-1.5 text-ink-400 dark:text-ink-500 hover:text-red-500" title="Delete">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-4 min-w-0">
        <Field label="Question Text (English) — markdown & $LaTeX$ supported">
          <TextArea rows={3} value={question.text} onChange={(e) => updateQuestion(question.id, { text: e.target.value })} />
        </Field>

        {layout.showSecondaryLanguage && (
          <Field label={`Question Text (${secondaryLabel})`}>
            <TextArea
              rows={2}
              style={secondaryFontStyle}
              value={question.textHi || ''}
              onChange={(e) => updateQuestion(question.id, { textHi: e.target.value })}
            />
          </Field>
        )}

        {question.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {question.images.map((img) => (
              <div key={img.id} className="relative group">
                <img src={img.src} className="h-16 rounded border border-ink-200 dark:border-ink-700 object-contain bg-ink-50 dark:bg-ink-900" />
                <button
                  onClick={() =>
                    updateQuestion(question.id, { images: question.images.filter((i) => i.id !== img.id) })
                  }
                  className="absolute -top-1.5 -right-1.5 bg-white dark:bg-ink-800 rounded-full shadow-soft p-0.5 text-red-500"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-600 dark:text-brand-400 mb-4 hover:underline"
        >
          <ImagePlus size={14} /> Attach image to question
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleAddImage(f);
          }}
        />

        <div className="space-y-2.5 mb-3">
          <span className="block text-[13px] font-semibold text-ink-700 dark:text-ink-200">Options</span>
          {question.options.map((opt, i) => (
            <div key={opt.id} className="flex items-start gap-1.5 sm:gap-2 min-w-0">
              <button
                onClick={() => setCorrectOption(question.id, opt.id)}
                className={`mt-2 w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center text-[11px] font-bold transition ${
                  opt.isCorrect ? 'bg-green-500 border-green-500 text-white' : 'border-ink-300 dark:border-ink-600 text-ink-400 dark:text-ink-500 hover:border-green-400'
                }`}
                title="Mark as correct"
              >
                {String.fromCharCode(65 + i)}
              </button>
              <div className="flex-1 min-w-0">
                <TextInput value={opt.text} onChange={(e) => updateOption(question.id, opt.id, { text: e.target.value })} />
                {opt.image && (
                  <div className="relative inline-block mt-1">
                    <img src={opt.image.src} className="h-10 rounded border border-ink-200 dark:border-ink-700" />
                    <button
                      onClick={() => updateOption(question.id, opt.id, { image: undefined })}
                      className="absolute -top-1.5 -right-1.5 bg-white dark:bg-ink-800 rounded-full shadow-soft p-0.5 text-red-500"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>
              <label className="mt-2 p-1.5 text-ink-400 dark:text-ink-500 hover:text-brand-500 cursor-pointer shrink-0">
                <ImagePlus size={15} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleOptionImage(opt.id, f);
                  }}
                />
              </label>
              <button
                onClick={() => removeOption(question.id, opt.id)}
                className="mt-2 p-1.5 text-ink-300 dark:text-ink-600 hover:text-red-500 shrink-0"
              >
                <X size={15} />
              </button>
            </div>
          ))}
          <Button size="sm" variant="secondary" onClick={() => addOption(question.id)}>
            + Add option
          </Button>
        </div>

        <Field label="Explanation / Solution — markdown & $LaTeX$ supported">
          <TextArea rows={2} value={question.explanation || ''} onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })} />
        </Field>

        <Field
          label={`Explanation / Solution — ${secondaryLabel} (optional)`}
          hint={`Only used when Show Secondary Language is on. Leave blank to fall back to the primary-language explanation above — it never shows unrelated content.`}
        >
          <TextArea
            rows={2}
            style={secondaryFontStyle}
            value={question.explanationHi || ''}
            onChange={(e) => updateQuestion(question.id, { explanationHi: e.target.value || undefined })}
          />
        </Field>

        <FieldRow>
          <Field label="Solution Placement (this question)">
            <Select
              value={question.solutionPlacement || ''}
              onChange={(e) => updateQuestion(question.id, { solutionPlacement: (e.target.value || undefined) as any })}
            >
              <option value="">Use section/global default</option>
              <option value="inline">Inline</option>
              <option value="end">At the end</option>
              <option value="hidden">Hidden</option>
            </Select>
          </Field>
          <Field label="Section">
            <Select value={question.sectionId} onChange={(e) => moveQuestionToSection(question.id, e.target.value)}>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </Select>
          </Field>
        </FieldRow>

        <FieldRow cols={3}>
          <Field label="Marks (override)">
            <TextInput
              type="number"
              step="0.25"
              value={question.marks ?? ''}
              onChange={(e) => updateQuestion(question.id, { marks: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="auto"
            />
          </Field>
          <Field label="Negative (override)">
            <TextInput
              type="number"
              step="0.25"
              value={question.negativeMarks ?? ''}
              onChange={(e) => updateQuestion(question.id, { negativeMarks: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="auto"
            />
          </Field>
          <Field label="Tag / Topic">
            <TextInput value={question.tag || ''} onChange={(e) => updateQuestion(question.id, { tag: e.target.value })} />
          </Field>
        </FieldRow>
      </div>
    </div>
  );
}

export default memo(QuestionEditor);
