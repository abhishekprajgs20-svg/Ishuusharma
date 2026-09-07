'use client';

import type { TestDocument } from '@/lib/types';
import MarkdownMath from './MarkdownMath';
import { secondaryFontCssFamily } from '@/lib/googleFont';

export default function CoverPage({ doc }: { doc: TestDocument }) {
  const { meta, branding, layout } = doc;
  const rollDigits = Array.from({ length: branding.rollNoDigits });
  const showPrimary = layout.showPrimaryLanguage;
  const showSecondaryBase = layout.showSecondaryLanguage;
  const secondaryFontStyle =
    layout.secondaryFontChoice === 'same-as-primary'
      ? undefined
      : { fontFamily: secondaryFontCssFamily(layout.secondaryFontChoice, layout.secondaryCustomFontName, '') };

  const hasInstituteSecondary = !!branding.instituteNameHi;
  const showInstitutePrimary = showPrimary || !(showSecondaryBase && hasInstituteSecondary);
  const showBilingualInstitute = showSecondaryBase && hasInstituteSecondary;

  const hasTestNameSecondary = !!meta.testNameHi;
  const showTestNamePrimary = showPrimary || !(showSecondaryBase && hasTestNameSecondary);
  const showBilingualTestName = showSecondaryBase && hasTestNameSecondary;

  const hasInstructionsSecondary = !!meta.instructionsMarkdownHi;
  const showInstructionsPrimary = showPrimary || !(showSecondaryBase && hasInstructionsSecondary);
  const showInstructionsSecondary = showSecondaryBase && hasInstructionsSecondary;
  const showBilingualInstructions = showInstructionsPrimary && showInstructionsSecondary;
  const instructionsPrimary = meta.instructionsMarkdown;

  return (
    <div className="a4-sheet-inner">
      {branding.watermarkDataUrl && (
        <div className="a4-watermark" style={{ opacity: branding.watermarkOpacity }}>
          <img src={branding.watermarkDataUrl} alt="" />
        </div>
      )}

      <div className="relative z-10 h-full flex flex-col">
        {/* Top brand bar */}
        <div className="flex items-center justify-between border-b-4 pb-2.5" style={{ borderColor: branding.accentColor }}>
          <div className="flex items-center gap-3">
            {branding.logoDataUrl && <img src={branding.logoDataUrl} alt="logo" className="h-12 w-12 object-contain" />}
            <div>
              {showInstitutePrimary && (
                <div className="font-display font-extrabold text-[1.45em] leading-tight" style={{ color: branding.accentColor }}>
                  {branding.instituteName}
                </div>
              )}
              {showBilingualInstitute && (
                <div className="font-semibold text-[0.95em] text-ink-700" style={secondaryFontStyle}>
                  {branding.instituteNameHi}
                </div>
              )}
              {branding.tagline && <div className="text-[0.8em] text-ink-500 italic">{branding.tagline}</div>}
            </div>
          </div>
          {meta.examName && (
            <div
              className="text-white font-bold px-3.5 py-1.5 rounded-lg text-[0.88em] whitespace-nowrap"
              style={{ background: branding.accentColor }}
            >
              {meta.examName}
            </div>
          )}
        </div>

        {/* Test title block */}
        <div className="text-center mt-4">
          {showTestNamePrimary && <h1 className="font-display font-extrabold text-[1.55em] text-ink-900">{meta.testName}</h1>}
          {showBilingualTestName && (
            <h2 className="font-bold text-[1.1em] text-ink-700 mt-0.5" style={secondaryFontStyle}>
              {meta.testNameHi}
            </h2>
          )}
          {meta.subject && <p className="text-[0.92em] text-ink-500 mt-1">{meta.subject}</p>}
        </div>

        {/* Meta strip */}
        <div className="flex justify-center gap-8 mt-3.5 text-[0.88em]">
          {meta.duration && (
            <div className="text-center">
              <div className="text-ink-400 text-[0.8em] uppercase tracking-wide">Duration</div>
              <div className="font-bold text-ink-900">{meta.duration}</div>
            </div>
          )}
          {meta.totalMarks != null && (
            <div className="text-center">
              <div className="text-ink-400 text-[0.8em] uppercase tracking-wide">Total Marks</div>
              <div className="font-bold text-ink-900">{meta.totalMarks}</div>
            </div>
          )}
          {meta.date && (
            <div className="text-center">
              <div className="text-ink-400 text-[0.8em] uppercase tracking-wide">Date</div>
              <div className="font-bold text-ink-900">{meta.date}</div>
            </div>
          )}
        </div>

        {/* Candidate details + roll no grid */}
        <div className="mt-4 grid grid-cols-2 gap-8">
          <div className="space-y-2 text-[0.88em]">
            <div>
              <span className="text-ink-500">Candidate Name: </span>
              <span className="inline-block border-b border-ink-300 w-52 align-bottom">&nbsp;</span>
            </div>
            <div>
              <span className="text-ink-500">Center / Batch: </span>
              <span className="inline-block border-b border-ink-300 w-52 align-bottom">&nbsp;</span>
            </div>
            {branding.showSignatureBox && (
              <div className="flex gap-8 pt-3">
                <div>
                  <span className="inline-block border-b border-ink-300 w-32 align-bottom">&nbsp;</span>
                  <div className="text-[0.78em] text-ink-400 mt-0.5">Candidate&apos;s Signature</div>
                </div>
                <div>
                  <span className="inline-block border-b border-ink-300 w-32 align-bottom">&nbsp;</span>
                  <div className="text-[0.78em] text-ink-400 mt-0.5">Invigilator&apos;s Signature</div>
                </div>
              </div>
            )}
          </div>

          {branding.showRollNoGrid && (
            <div className="flex flex-col items-end">
              <div className="text-[0.8em] text-ink-500 mb-1 uppercase tracking-wide">Roll Number</div>
              <div className="flex gap-1">
                {rollDigits.map((_, i) => (
                  <div key={i} className="w-6 h-8 border-2 border-ink-300 rounded flex items-center justify-center" />
                ))}
              </div>
              {branding.showOMRHint && (
                <div className="text-[0.72em] text-ink-400 mt-1.5 max-w-[200px] text-right">
                  Shade the corresponding circle for each digit on the OMR sheet.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instructions — merged onto the cover/roll-no page instead of a
            separate dedicated page, so the booklet has one page fewer and
            candidates see the rules right where they fill in their details. */}
        {(showInstructionsPrimary ? instructionsPrimary : meta.instructionsMarkdownHi) && (
          <div className="mt-4 pt-3 border-t border-ink-200 flex-1 min-h-0">
            <h3 className="font-display font-bold text-[0.98em] mb-1.5" style={{ color: branding.accentColor }}>
              Instructions
            </h3>
            {showBilingualInstructions ? (
              <div className="grid grid-cols-2 gap-6 text-[0.82em] leading-snug">
                <div>
                  <MarkdownMath text={meta.instructionsMarkdown} />
                </div>
                <div style={secondaryFontStyle}>
                  <MarkdownMath text={meta.instructionsMarkdownHi} />
                </div>
              </div>
            ) : (
              <div className="text-[0.82em] leading-snug" style={showInstructionsPrimary ? undefined : secondaryFontStyle}>
                <MarkdownMath text={showInstructionsPrimary ? instructionsPrimary : meta.instructionsMarkdownHi} />
              </div>
            )}
          </div>
        )}

        {branding.address && (
          <div className="text-center text-[0.75em] text-ink-400 border-t border-ink-200 pt-2 mt-2 shrink-0">
            {branding.address}
          </div>
        )}
      </div>
    </div>
  );
}
