'use client';

import { forwardRef } from 'react';
import clsx from 'clsx';
import MarkdownMath from './MarkdownMath';
import type { Question, Section, LayoutSettings, SolutionPlacement } from '@/lib/types';
import { OPTION_LABELS } from '@/lib/types';

interface Props {
  question: Question;
  section: Section | undefined;
  layout: LayoutSettings;
  globalSolutionPlacement: SolutionPlacement;
  index: number; // 1-based display number
  forcePlacement?: SolutionPlacement; // used when rendering the "end" solutions pass
  renderSolutionInline?: boolean; // true = render inline sol now if applicable
}

const QuestionBlock = forwardRef<HTMLDivElement, Props>(function QuestionBlock(
  { question, section, layout, globalSolutionPlacement, index, renderSolutionInline = true },
  ref
) {
  const placement: SolutionPlacement =
    question.solutionPlacement || section?.defaultSolutionPlacement || globalSolutionPlacement;
  const labels = OPTION_LABELS[layout.optionStyle];
  // NOTE: this component is currently unused (superseded by the fragment-
  // based renderer in QuestionFragments.tsx / LivePreview.tsx) — kept
  // around but not wired into the new per-language font/emphasis controls;
  // this is just enough of a fix to keep it type-checking.
  const showBilingual = layout.showSecondaryLanguage && !!question.textHi;
  const marks = question.marks ?? section?.marksPerQuestion;

  return (
    <div ref={ref} className={clsx('q-block text-[1em]', question.highlighted && 'highlighted')} data-qid={question.id}>
      <div className="flex items-start gap-1.5">
        {layout.showQuestionNumberBadge && (
          <span
            className="inline-flex items-center justify-center rounded-full font-bold shrink-0"
            style={{
              width: '5mm',
              height: '5mm',
              fontSize: '0.85em',
              background: '#eef0ff',
              color: 'var(--accent, #3d4bfa)',
              marginTop: '0.15em',
            }}
          >
            {index}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <MarkdownMath text={question.text} className="flex-1" />
            {layout.showMarksPerQuestion && marks != null && (
              <span className="text-[0.78em] text-ink-500 whitespace-nowrap shrink-0 font-medium">[{marks}m]</span>
            )}
          </div>
          {showBilingual && (
            <div className="font-devanagari text-[0.97em] mt-0.5 text-ink-700">
              <MarkdownMath text={question.textHi} />
            </div>
          )}

          {question.images.length > 0 && (
            <div className="flex flex-wrap gap-2 my-1.5">
              {question.images.map((img) => (
                <img
                  key={img.id}
                  src={img.src}
                  alt={img.alt || 'question figure'}
                  style={{ width: `${img.widthPct || 60}%` }}
                  className="rounded border border-ink-200"
                />
              ))}
            </div>
          )}

          <div className="mt-1.5 space-y-0.5">
            {question.options.map((opt, i) => {
              const markCorrect = layout.highlightCorrectOption && placement !== 'hidden' && opt.isCorrect;
              return (
                <div
                  key={opt.id}
                  className={clsx('flex items-start gap-1.5 text-[0.97em]', markCorrect && 'font-semibold')}
                  style={markCorrect ? { color: 'var(--accent, #3d4bfa)' } : undefined}
                >
                  <span className="shrink-0 font-medium">({labels[i]})</span>
                  <div className="flex-1 min-w-0">
                    <MarkdownMath text={opt.text} />
                    {showBilingual && opt.textHi && (
                      <div className="font-devanagari text-[0.94em] text-ink-600">
                        <MarkdownMath text={opt.textHi} />
                      </div>
                    )}
                    {opt.image && (
                      <img
                        src={opt.image.src}
                        alt={opt.image.alt || 'option figure'}
                        style={{ width: `${opt.image.widthPct || 40}%` }}
                        className="rounded border border-ink-200 mt-0.5"
                      />
                    )}
                  </div>
                  {markCorrect && <span className="shrink-0 text-[0.85em]">&#10003;</span>}
                </div>
              );
            })}
          </div>

          {renderSolutionInline && placement === 'inline' && question.explanation && (
            <div className="mt-1.5 pl-1.5 border-l-2 text-[0.92em]" style={{ borderColor: 'var(--accent, #3d4bfa)' }}>
              <span className="font-semibold" style={{ color: 'var(--accent, #3d4bfa)' }}>
                Solution:{' '}
              </span>
              <MarkdownMath text={question.explanation} className="inline" />
              {showBilingual && question.explanationHi && (
                <div className="font-devanagari mt-0.5">
                  <MarkdownMath text={question.explanationHi} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default QuestionBlock;
