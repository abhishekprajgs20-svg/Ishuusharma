'use client';

// Fragment-based rendering for the live-preview / print pagination path.
//
// Why this exists: the original pagination engine treated a whole question
// as one atomic, unsplittable block. That's exactly why blank space showed
// up on large papers — a single oversized question (image, table, long
// bilingual text) that didn't quite fit the remaining column height got
// deferred *whole* to the next column, leaving whatever room was left
// behind empty. The explicit ask was: let a question continue across the
// column/page break like a real printed exam does, never leaving wasted
// space behind.
//
// The fix here is to split each question into small, independently
// placeable FRAGMENTS — the stem, then each option, then the inline
// solution (if any) — and let the bin-packer place fragments instead of
// whole questions. A fragment itself still never splits mid-render
// (break-inside: avoid on each fragment — you'll never see a single
// option's text cut in half), but a question as a WHOLE can now continue:
// its stem lands at the bottom of column 1, its remaining options
// continue at the top of column 2, exactly where the packer had room.
//
// This keeps every fragment visually complete (no half-rendered KaTeX or
// mid-word cuts) while eliminating the "whole question deferred, gap left
// behind" failure mode almost entirely — the only unavoidable slack left
// is at most the height of one fragment (typically a single option row).

import MarkdownMath from './MarkdownMath';
import type { Question, Section, LayoutSettings, SolutionPlacement, QOption } from '@/lib/types';
import { OPTION_LABELS, FONT_CHOICES } from '@/lib/types';
import { seededShuffle } from '@/lib/shuffle';
import { primaryFontCssFamily, secondaryFontCssFamily } from '@/lib/googleFont';

/** The exact same shuffled-or-original option order used for rendering a
 * question's options — extracted here so every place that needs to know
 * "which option is correct, in DISPLAY order" (the printed question
 * itself, the answer-key page, anything else added later) computes the
 * identical order from the identical inputs. Previously the answer-key
 * page recomputed its own correct-option index straight from
 * `question.options` (never shuffled), so turning Shuffle Option Order on
 * silently made the answer key wrong — it kept citing the PRE-shuffle
 * letter while the printed question showed the option at a different
 * letter. Anything that needs "the correct option's displayed letter"
 * must go through this function, not `question.options` directly. */
export function getDisplayOptions(question: Question, layout: LayoutSettings): QOption[] {
  return layout.shuffleOptions ? seededShuffle(question.options, question.id, layout.shuffleSeed) : question.options;
}

/** Resolves the CSS emphasis classes (bold / accent-color) for a given
 * TextEmphasis value — shared so primary and secondary language text can
 * each independently ask "what classes do I need for MY emphasis
 * setting" rather than one shared bold flag controlling both. */
function emphasisClasses(emphasis: LayoutSettings['questionTextEmphasis']): string {
  const bold = emphasis === 'bold' || emphasis === 'bold-colored';
  const colored = emphasis === 'colored' || emphasis === 'bold-colored';
  return [bold ? 'q-stem-bold' : '', colored ? 'q-stem-colored' : ''].filter(Boolean).join(' ');
}

export interface QuestionFragment {
  /** stable key, unique within the whole document flow */
  key: string;
  node: React.ReactNode;
  /** true only for the first fragment of a question — used to attach the
   * question number badge / continuation styling correctly */
  isFirst: boolean;
}

/**
 * The subset of LayoutSettings that can change how a question's fragments
 * are RENDERED (text/markup, box styling, shuffle order, etc). Deliberately
 * excludes purely page-geometry fields (columns, fontSizePt, lineHeight,
 * fontFamily) — those change every fragment's MEASURED HEIGHT without
 * changing its content, and are handled separately by forcing a full
 * re-measure (see LivePreview's `layoutGeometryKey`). Listed here so a
 * single question's edit never has to guess which layout knobs it depends
 * on — this is the one place that answers that question.
 */
function layoutContentKey(layout: LayoutSettings): string {
  return [
    layout.showQuestionNumberBadge,
    layout.showMarksPerQuestion,
    layout.optionStyle,
    layout.showPrimaryLanguage,
    layout.showSecondaryLanguage,
    layout.bilingualLayout,
    layout.highlightCorrectOption,
    layout.highlightStyle,
    layout.highlightColor,
    layout.solutionBoxStyle,
    layout.questionTextEmphasis,
    layout.secondaryTextEmphasis,
    layout.boldOptionLabels,
    layout.optionsPerRow,
    layout.shuffleOptions,
    layout.shuffleSeed,
    // Font CHOICE (which slot) belongs here as content — a custom-font
    // NAME change is handled as a geometry change instead (see
    // LivePreview's layoutGeometryKey), since it can change every
    // fragment's measured height, not just its content hash.
    layout.secondaryFontChoice,
  ].join('|');
}

/**
 * Stable content hash for one question's fragment-building inputs: the
 * question's own data (everything that can appear in its fragments) plus
 * the section fields that leak into fragment rendering (marksPerQuestion /
 * defaultSolutionPlacement fallback) plus every layout field from
 * layoutContentKey, and the question's own index (the number badge).
 * Two calls with the same hash are guaranteed to build identical
 * fragments, so this is exactly the cache key both the fragment-build
 * cache (C) and the measured-height cache (B) need.
 */
export function questionContentHash(
  question: Question,
  section: Section | undefined,
  layout: LayoutSettings,
  globalSolutionPlacement: SolutionPlacement,
  index: number
): string {
  return JSON.stringify([
    question,
    section?.defaultSolutionPlacement,
    section?.marksPerQuestion,
    globalSolutionPlacement,
    index,
    layoutContentKey(layout),
  ]);
}

/**
 * Builds the ordered list of placeable fragments for one question. The
 * caller (LivePreview) measures each fragment's real height independently
 * and feeds them all into the same bin-packer as everything else.
 */
export function buildQuestionFragments(
  question: Question,
  section: Section | undefined,
  layout: LayoutSettings,
  globalSolutionPlacement: SolutionPlacement,
  index: number
): QuestionFragment[] {
  const placement: SolutionPlacement =
    question.solutionPlacement || section?.defaultSolutionPlacement || globalSolutionPlacement;
  const labels = OPTION_LABELS[layout.optionStyle];
  const marks = question.marks ?? section?.marksPerQuestion;
  const fragments: QuestionFragment[] = [];

  // Shuffle is applied here (not to stored data) so option labels
  // (A)/(B)/(C)/(D) always match the rendered order, isCorrect still
  // travels with its own option through the shuffle, and turning the
  // toggle back off instantly restores the question's original,
  // as-entered order with nothing lost. Uses the shared helper so this
  // stays IDENTICAL to what the answer-key page computes (see
  // getDisplayOptions' own comment for the bug this fixes).
  const displayOptions = getDisplayOptions(question, layout);

  // --- Language toggles ---------------------------------------------------
  // Independent primary/secondary visibility (see LayoutSettings' own
  // comment for why this replaced the old 3-way `language` enum). Falls
  // back to showing primary whenever both would otherwise be hidden for a
  // given field (secondary-only mode + that field never translated), so a
  // question/option/explanation never silently renders blank.
  const showPrimary = layout.showPrimaryLanguage;
  const showSecondaryBase = layout.showSecondaryLanguage;

  const hasSecondaryStem = !!question.textHi;
  const showStemPrimary = showPrimary || !(showSecondaryBase && hasSecondaryStem);
  const showStemSecondary = showSecondaryBase && hasSecondaryStem;

  const hasSecondaryExplanation = !!question.explanationHi;
  const showExplanationPrimary = showPrimary || !(showSecondaryBase && hasSecondaryExplanation);
  const showExplanationSecondary = showSecondaryBase && hasSecondaryExplanation;
  const explanationPrimary = question.explanation;

  // Primary and secondary emphasis are now fully independent controls
  // (layout.questionTextEmphasis / layout.secondaryTextEmphasis) instead of
  // one shared bold flag that used to force both languages to match.
  const primaryEmphasisClass = emphasisClasses(layout.questionTextEmphasis);
  const secondaryEmphasisClass = emphasisClasses(layout.secondaryTextEmphasis);
  const secondaryColored = layout.secondaryTextEmphasis === 'colored' || layout.secondaryTextEmphasis === 'bold-colored';
  // 'same-as-primary' means "inherit from the ancestor" (which already
  // carries the resolved primary font-family), so no inline style at all
  // — anything else resolves to a real, explicit font-family value.
  const secondaryFontStyle: React.CSSProperties | undefined =
    layout.secondaryFontChoice === 'same-as-primary'
      ? undefined
      : { fontFamily: secondaryFontCssFamily(layout.secondaryFontChoice, layout.secondaryCustomFontName, '') };

  // --- Fragment 0: stem (badge + question text + question images) -----
  fragments.push({
    key: `q-${question.id}-stem`,
    isFirst: true,
    node: (
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
          {showStemPrimary && (
            <div className="flex items-start justify-between gap-2">
              <MarkdownMath text={question.text} className={`flex-1${primaryEmphasisClass ? ` ${primaryEmphasisClass}` : ''}`} />
              {layout.showMarksPerQuestion && marks != null && (
                <span className="text-[0.78em] text-ink-500 whitespace-nowrap shrink-0 font-medium">[{marks}m]</span>
              )}
            </div>
          )}
          {showStemSecondary && (
            <div
              className={`text-[0.97em]${showStemPrimary ? ' mt-0.5' : ''}${!secondaryColored ? ' text-ink-700 dark:text-ink-300' : ''}${secondaryEmphasisClass ? ` ${secondaryEmphasisClass}` : ''}`}
              style={secondaryFontStyle}
            >
              <div className="flex items-start justify-between gap-2">
                <MarkdownMath text={question.textHi} className="flex-1" />
                {!showStemPrimary && layout.showMarksPerQuestion && marks != null && (
                  <span className="text-[0.78em] text-ink-500 whitespace-nowrap shrink-0 font-medium">[{marks}m]</span>
                )}
              </div>
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
        </div>
      </div>
    ),
  });

  // --- Options -------------------------------------------------------------
  // Highlight styling for the correct option: 'checkmark' is the classic
  // bold-text + tick mark; 'fill'/'underline'/'border' instead use
  // layout.highlightColor as a real visual treatment so the highlight
  // reads as deliberate exam-key styling rather than just bold text.
  const renderOption = (opt: (typeof question.options)[number], i: number) => {
    const markCorrect = layout.highlightCorrectOption && placement !== 'hidden' && opt.isCorrect;
    const hStyle = layout.highlightStyle;
    const hColor = layout.highlightColor || 'var(--accent, #3d4bfa)';

    const wrapperStyle: React.CSSProperties = {};
    let wrapperClass = 'flex items-start gap-1.5 text-[0.97em]';
    if (markCorrect) {
      if (hStyle === 'checkmark') {
        wrapperClass += ' font-semibold';
        wrapperStyle.color = hColor;
      } else if (hStyle === 'fill') {
        wrapperStyle.background = `${hColor}22`;
        wrapperStyle.borderRadius = '3px';
        wrapperStyle.padding = '0.5mm 1mm';
        wrapperStyle.marginLeft = '-1mm';
      } else if (hStyle === 'underline') {
        wrapperStyle.textDecoration = 'underline';
        wrapperStyle.textDecorationColor = hColor;
        wrapperStyle.textDecorationThickness = '2px';
        wrapperStyle.textUnderlineOffset = '2px';
      } else if (hStyle === 'border') {
        wrapperStyle.border = `1px solid ${hColor}`;
        wrapperStyle.borderRadius = '3px';
        wrapperStyle.padding = '0.5mm 1mm';
        wrapperStyle.marginLeft = '-1mm';
      }
    }

    const hasSecondaryOpt = !!opt.textHi;
    const showOptPrimary = showPrimary || !(showSecondaryBase && hasSecondaryOpt);
    const showOptSecondary = showSecondaryBase && hasSecondaryOpt;

    return (
      <div key={opt.id} className={`${wrapperClass} min-w-0`} style={wrapperStyle}>
        <span className={`shrink-0${layout.boldOptionLabels ? ' font-bold' : ' font-medium'}`}>({labels[i]})</span>
        <div className="flex-1 min-w-0">
          {showOptPrimary && (
            <MarkdownMath text={opt.text} className={primaryEmphasisClass} />
          )}
          {showOptSecondary && (
            <div
              className={`text-[0.94em]${!secondaryColored ? ' text-ink-600' : ''}${secondaryEmphasisClass ? ` ${secondaryEmphasisClass}` : ''}`}
              style={secondaryFontStyle}
            >
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
        {markCorrect && hStyle === 'checkmark' && <span className="shrink-0 text-[0.85em]">&#10003;</span>}
      </div>
    );
  };

  if (layout.optionsPerRow === 2) {
    // Pair consecutive options into one fragment so (A)/(B) always land on
    // the same row side-by-side — splitting a pair across a column/page
    // break would defeat the whole point of a 2-up option grid.
    for (let i = 0; i < displayOptions.length; i += 2) {
      const pair = displayOptions.slice(i, i + 2);
      fragments.push({
        key: `q-${question.id}-optrow-${i}`,
        isFirst: false,
        node: (
          <div className={layout.showQuestionNumberBadge ? 'pl-[6.5mm]' : ''}>
            <div className="grid grid-cols-2 gap-x-3">
              {pair.map((opt, j) => renderOption(opt, i + j))}
            </div>
          </div>
        ),
      });
    }
  } else {
    displayOptions.forEach((opt, i) => {
      fragments.push({
        key: `q-${question.id}-opt-${opt.id}`,
        isFirst: false,
        node: <div className={layout.showQuestionNumberBadge ? 'pl-[6.5mm]' : ''}>{renderOption(opt, i)}</div>,
      });
    });
  }

  // --- Inline solution, if applicable -----------------------------------
  if (placement === 'inline' && (question.explanation || question.explanationHi)) {
    const indentClass = layout.showQuestionNumberBadge ? ' ml-[6.5mm]' : '';
    const boxStyle = layout.solutionBoxStyle;

    // sol-box-* classes carry the visual treatment (see globals.css);
    // kept as real CSS classes rather than inline styles so print output
    // matches the live preview pixel-for-pixel with no extra JS work.
    const boxClass = {
      sidebar: 'sol-box-sidebar',
      boxed: 'sol-box-boxed',
      shaded: 'sol-box-shaded',
      plain: 'sol-box-plain',
    }[boxStyle];

    const primaryExplanationRendered = showExplanationPrimary && !!explanationPrimary;
    fragments.push({
      key: `q-${question.id}-sol`,
      isFirst: false,
      node: (
        <div className={`mt-1 text-[0.92em] ${boxClass}${indentClass}`}>
          {primaryExplanationRendered && (
            <>
              <span className="font-semibold sol-label">Solution: </span>
              <MarkdownMath text={explanationPrimary} className={`inline${primaryEmphasisClass ? ` ${primaryEmphasisClass}` : ''}`} />
            </>
          )}
          {showExplanationSecondary && (
            <div
              className={`${primaryExplanationRendered ? 'mt-0.5' : ''}${secondaryEmphasisClass ? ` ${secondaryEmphasisClass}` : ''}`}
              style={secondaryFontStyle}
            >
              {!primaryExplanationRendered && <span className="font-semibold sol-label">Solution: </span>}
              <MarkdownMath text={question.explanationHi} className="inline" />
            </div>
          )}
        </div>
      ),
    });
  }

  return fragments;
}
