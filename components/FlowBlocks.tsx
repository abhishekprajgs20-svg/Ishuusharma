'use client';

import { forwardRef } from 'react';
import MarkdownMath from './MarkdownMath';
import type { Question, Section, LayoutSettings } from '@/lib/types';
import { OPTION_LABELS } from '@/lib/types';
import { getDisplayOptions } from './QuestionFragments';
import { secondaryFontCssFamily } from '@/lib/googleFont';

export const SectionHeaderBlock = forwardRef<HTMLDivElement, { section: Section; layout: LayoutSettings }>(
  function SectionHeaderBlock({ section, layout }, ref) {
    const secondaryFontStyle =
      layout.secondaryFontChoice === 'same-as-primary'
        ? undefined
        : { fontFamily: secondaryFontCssFamily(layout.secondaryFontChoice, layout.secondaryCustomFontName, '') };
    return (
      <div ref={ref} className="q-block">
        <div className="border-b-2 pb-1 mb-1.5" style={{ borderColor: 'var(--accent, #3d4bfa)' }}>
          <h3 className="font-display font-bold text-[1.15em]" style={{ color: 'var(--accent, #3d4bfa)' }}>
            {section.title}
          </h3>
          {layout.showSecondaryLanguage && section.titleHi && (
            <h4 className="font-semibold text-[1.02em] text-ink-700" style={secondaryFontStyle}>
              {section.titleHi}
            </h4>
          )}
          {section.instructions && <p className="text-[0.85em] text-ink-500 italic mt-0.5">{section.instructions}</p>}
          <div className="flex gap-3 text-[0.8em] text-ink-500 mt-0.5">
            {section.marksPerQuestion != null && <span>Marks: +{section.marksPerQuestion}</span>}
            {section.negativeMarksPerQuestion != null && <span>Negative: -{section.negativeMarksPerQuestion}</span>}
            {section.timeLimitMinutes != null && <span>Time: {section.timeLimitMinutes} min</span>}
          </div>
        </div>
      </div>
    );
  }
);

export const EndSolutionBlock = forwardRef<HTMLDivElement, { question: Question; layout: LayoutSettings; index: number }>(
  function EndSolutionBlock({ question, layout, index }, ref) {
    const labels = OPTION_LABELS[layout.optionStyle];
    // Was `question.options.findIndex(...)` — the ORIGINAL, unshuffled
    // order — so turning on Shuffle Option Order silently made the answer
    // key cite the wrong letter (it kept the pre-shuffle position while
    // the printed question showed the option at a different letter).
    // getDisplayOptions is the exact same shuffled-or-original order the
    // printed question itself uses, so this always matches.
    const displayOptions = getDisplayOptions(question, layout);
    const correctIdx = displayOptions.findIndex((o) => o.isCorrect);
    const showSecondaryExplanation = layout.showSecondaryLanguage && !!question.explanationHi;
    const secondaryFontStyle =
      layout.secondaryFontChoice === 'same-as-primary'
        ? undefined
        : { fontFamily: secondaryFontCssFamily(layout.secondaryFontChoice, layout.secondaryCustomFontName, '') };
    return (
      <div ref={ref} className="q-block text-[0.94em]">
        <div className="flex items-baseline gap-1.5">
          <span className="font-bold shrink-0" style={{ color: 'var(--accent, #3d4bfa)' }}>
            {index}.
          </span>
          <span className="font-semibold shrink-0">
            Ans: ({correctIdx >= 0 ? labels[correctIdx] : '—'})
          </span>
        </div>
        {(question.explanation || question.explanationHi) && (
          <div className="pl-4 mt-0.5">
            {question.explanation && <MarkdownMath text={question.explanation} />}
            {showSecondaryExplanation && (
              <div className="mt-0.5 text-ink-700" style={secondaryFontStyle}>
                <MarkdownMath text={question.explanationHi} />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

export const CustomPageBlock = forwardRef<HTMLDivElement, { title: string; content: string }>(
  function CustomPageBlock({ title, content }, ref) {
    return (
      <div ref={ref} className="q-block">
        <h2 className="font-display font-bold text-[1.3em] mb-2">{title}</h2>
        <MarkdownMath text={content} />
      </div>
    );
  }
);

export const InstructionsBlock = forwardRef<HTMLDivElement, { content: string }>(function InstructionsBlock(
  { content },
  ref
) {
  return (
    <div ref={ref} className="q-block">
      <MarkdownMath text={content} />
    </div>
  );
});
