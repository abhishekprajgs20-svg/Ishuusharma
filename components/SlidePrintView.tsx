'use client';

// "Slide PDF" export — an ADDITIVE, separate print target from the main
// mock-test A4 pipeline (lib/paginate.ts, components/LivePreview.tsx,
// components/QuestionFragments.tsx). Reuses the SAME trusted mechanism as
// the existing "Print / Save PDF" button (native window.print(), real
// vector text, real KaTeX, real Devanagari shaping) — just with a
// different page layout: one question per LANDSCAPE page, big and centred
// like a teacher's whiteboard slide, instead of the dense multi-column A4
// exam-paper layout. Nothing here is imported by, or imports from, the
// existing print pipeline, and it never renders on screen — it exists
// purely as a second, independently-triggered print target (see
// #slide-print-root below and the `body.slide-print-active` toggle in
// app/globals.css) so triggering it can never affect the normal Print /
// Save PDF output in any way.
//
// Why not PPTX-with-screenshots: html2canvas (the only client-side way to
// turn a DOM node into an image) has a confirmed, unfixable text-kerning
// bug in Chromium that was already found and rejected earlier for the
// Instant Download PDF feature (see lib/exportPdf.ts's own comment for the
// history) — reusing it here would silently reintroduce that same visual
// defect. A real print-to-PDF has none of that risk since it's the
// browser's own vector text renderer, so that's what this uses instead.

import type { TestDocument, Question, Section } from '@/lib/types';
import { OPTION_LABELS } from '@/lib/types';
import { seededShuffle } from '@/lib/shuffle';
import MarkdownMath from './MarkdownMath';

function useLanguageResolution(mode: TestDocument['slideSettings']['language']) {
  return {
    stem: (q: Question) => ({
      primary: mode === 'hi' && q.textHi ? q.textHi : q.text,
      primaryIsHindi: mode === 'hi' && !!q.textHi,
      secondary: mode === 'bilingual' && q.textHi ? q.textHi : undefined,
    }),
    explanation: (q: Question) => ({
      primary: mode === 'hi' && q.explanationHi ? q.explanationHi : q.explanation,
      primaryIsHindi: mode === 'hi' && !!q.explanationHi,
      secondary: mode === 'bilingual' && q.explanationHi ? q.explanationHi : undefined,
    }),
    option: (opt: Question['options'][number]) => ({
      primary: mode === 'hi' && opt.textHi ? opt.textHi : opt.text,
      primaryIsHindi: mode === 'hi' && !!opt.textHi,
      secondary: mode === 'bilingual' && opt.textHi ? opt.textHi : undefined,
    }),
  };
}

function TitleSlide({ doc }: { doc: TestDocument }) {
  const { meta, branding, slideSettings } = doc;
  return (
    <div className="slide-sheet slide-title-sheet" style={{ background: slideSettings.accentColor }}>
      <div className="slide-title-inner">
        {branding.logoDataUrl && <img src={branding.logoDataUrl} alt="" className="slide-title-logo" />}
        <div className="slide-title-institute">{branding.instituteName || 'Mock Test'}</div>
        {branding.tagline && <div className="slide-title-tagline">{branding.tagline}</div>}
        <div className="slide-title-testname">{meta.testName}</div>
        <div className="slide-title-meta">
          {[meta.examName, meta.subject].filter(Boolean).join('  ·  ')}
        </div>
        {slideSettings.titleSlideSubtitle && (
          <div className="slide-title-subtitle">{slideSettings.titleSlideSubtitle}</div>
        )}
      </div>
    </div>
  );
}

function QuestionSlide({
  question,
  section,
  index,
  doc,
  slideNo,
  totalSlides,
}: {
  question: Question;
  section: Section | undefined;
  index: number;
  doc: TestDocument;
  slideNo: number;
  totalSlides: number;
}) {
  const { slideSettings, layout } = doc;
  const resolve = useLanguageResolution(slideSettings.language);
  const stem = resolve.stem(question);
  const explanation = resolve.explanation(question);
  const labels = OPTION_LABELS[layout.optionStyle];
  const opts = layout.shuffleOptions
    ? seededShuffle(question.options, question.id, layout.shuffleSeed)
    : question.options;
  const marks = question.marks ?? section?.marksPerQuestion;

  return (
    <div className="slide-sheet">
      <div className="slide-header" style={{ background: slideSettings.accentColor }}>
        <span>{slideSettings.headerText}</span>
        {doc.meta.examName && <span className="slide-header-right">{doc.meta.examName}</span>}
      </div>

      <div className="slide-body">
        <div className="slide-q-row">
          <span className="slide-q-badge" style={{ background: slideSettings.accentColor }}>
            {index}
          </span>
          <div className={`slide-q-text${stem.primaryIsHindi ? ' font-devanagari' : ''}`}>
            <MarkdownMath text={stem.primary} />
            {stem.secondary && (
              <div className="slide-q-text-hi font-devanagari">
                <MarkdownMath text={stem.secondary} />
              </div>
            )}
          </div>
          {marks != null && <span className="slide-q-marks">[{marks} mark{marks === 1 ? '' : 's'}]</span>}
        </div>

        <div className="slide-options-grid">
          {opts.map((opt, i) => {
            const o = resolve.option(opt);
            const correct = slideSettings.showAnswerOnSlide && opt.isCorrect;
            return (
              <div
                key={opt.id}
                className={`slide-option${correct ? ' slide-option-correct' : ''}`}
                style={correct ? { borderColor: slideSettings.accentColor } : undefined}
              >
                <span className="slide-option-label" style={correct ? { color: slideSettings.accentColor } : undefined}>
                  {labels[i]})
                </span>
                <div className={`slide-option-text${o.primaryIsHindi ? ' font-devanagari' : ''}`}>
                  <MarkdownMath text={o.primary} className="inline" />
                  {o.secondary && (
                    <div className="slide-option-text-hi font-devanagari">
                      <MarkdownMath text={o.secondary} className="inline" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {slideSettings.showAnswerOnSlide && slideSettings.includeExplanation && explanation.primary && (
          <div className="slide-explanation">
            <span className="slide-explanation-label" style={{ color: slideSettings.accentColor }}>
              Explanation:
            </span>{' '}
            <MarkdownMath text={explanation.primary} className={`inline${explanation.primaryIsHindi ? ' font-devanagari' : ''}`} />
            {explanation.secondary && (
              <div className="font-devanagari mt-1">
                <MarkdownMath text={explanation.secondary} className="inline" />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="slide-footer">
        <span>{slideSettings.footerText}</span>
        {slideSettings.showSlideNumbers && (
          <span className="slide-footer-right">
            {slideNo} / {totalSlides}
          </span>
        )}
      </div>
    </div>
  );
}

function AnswerGridSlide({
  doc,
  questions,
  startIndex,
  slideNo,
  totalSlides,
}: {
  doc: TestDocument;
  questions: Question[];
  startIndex: number;
  slideNo: number;
  totalSlides: number;
}) {
  const { slideSettings, layout } = doc;
  const labels = OPTION_LABELS[layout.optionStyle];
  return (
    <div className="slide-sheet">
      <div className="slide-header" style={{ background: slideSettings.accentColor }}>
        <span>{slideSettings.headerText}</span>
        <span className="slide-header-right">Answer Key</span>
      </div>
      <div className="slide-body">
        <div className="slide-answer-grid">
          {questions.map((q, i) => {
            const opts = layout.shuffleOptions ? seededShuffle(q.options, q.id, layout.shuffleSeed) : q.options;
            const correctIdx = opts.findIndex((o) => o.isCorrect);
            return (
              <div key={q.id} className="slide-answer-cell">
                <span className="slide-answer-num">{startIndex + i}.</span>
                <span className="slide-answer-letter" style={{ color: slideSettings.accentColor }}>
                  {correctIdx >= 0 ? labels[correctIdx] : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="slide-footer">
        <span>{slideSettings.footerText}</span>
        {slideSettings.showSlideNumbers && (
          <span className="slide-footer-right">
            {slideNo} / {totalSlides}
          </span>
        )}
      </div>
    </div>
  );
}

const ANSWER_GRID_PER_SLIDE = 40;

export default function SlidePrintView({ doc }: { doc: TestDocument }) {
  const { questions, sections, slideSettings } = doc;
  const sectionById = new Map(sections.map((s) => [s.id, s]));

  const needsAnswerGrid = !slideSettings.showAnswerOnSlide;
  const answerGridSlideCount = needsAnswerGrid ? Math.ceil(questions.length / ANSWER_GRID_PER_SLIDE) : 0;
  const totalSlides = 1 + questions.length + answerGridSlideCount;

  let slideNo = 1;

  return (
    <div id="slide-print-root">
      <TitleSlide doc={doc} />
      {questions.map((q, idx) => {
        slideNo += 1;
        return (
          <QuestionSlide
            key={q.id}
            question={q}
            section={sectionById.get(q.sectionId)}
            index={idx + 1}
            doc={doc}
            slideNo={slideNo}
            totalSlides={totalSlides}
          />
        );
      })}
      {needsAnswerGrid &&
        Array.from({ length: answerGridSlideCount }, (_, gi) => {
          slideNo += 1;
          const start = gi * ANSWER_GRID_PER_SLIDE;
          return (
            <AnswerGridSlide
              key={`grid-${gi}`}
              doc={doc}
              questions={questions.slice(start, start + ANSWER_GRID_PER_SLIDE)}
              startIndex={start + 1}
              slideNo={slideNo}
              totalSlides={totalSlides}
            />
          );
        })}
    </div>
  );
}
