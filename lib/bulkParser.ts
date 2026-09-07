import type { Question, QOption, SolutionPlacement } from './types';
import { genId } from './defaults';

// -----------------------------------------------------------------------
// Bulk paste template (documented, shown to user in the UI with a
// "copy template" button). Format is deliberately close to how people
// already type MCQs in WhatsApp / Word / notes apps.
//
// Q1) Question text here, supports **markdown**, $inline math$, $$block$$,
//     GFM tables (e.g. "Match the Following"), and plain numbered
//     statement/assertion lines (1. / 2. / 3. ...) — any line that isn't
//     recognized as an option/Ans/Sol/Tag/HI line is treated as more
//     question-stem text, so numbered statements just become part of the
//     stem exactly as typed.
// HI) वैकल्पिक हिंदी अनुवाद (optional line, only if bilingual)
// A) Option one
// B) Option two
// C) Option three
// D) Option four (a trailing ✅/✔/✓ on an option line marks it correct,
//     as an alternative to a separate "Ans:" line — e.g. "D) ... ✅")
// Ans: B
// Sol: Explanation text here (optional) — "Ex:"/"Explanation:" work too,
//      as an alias for the same field
// SolHi: वैकल्पिक हिंदी व्याख्या (optional — only used in Hindi-only/Bilingual
//        mode; if omitted, the English Sol:/Ex: text is shown instead, it
//        never falls back to some other question's explanation)
// Tag: Topic name (optional)
// ---  (triple-dash separator between questions, optional but recommended)
// -----------------------------------------------------------------------

export const BULK_TEMPLATE = `Q1) Which of the following rivers is known as the "Sorrow of Bihar"?
HI) निम्नलिखित में से किस नदी को "बिहार का शोक" कहा जाता है?
A) Ganga
B) Kosi
C) Son
D) Gandak
Ans: B
Sol: The Kosi river is called the "Sorrow of Bihar" due to its frequent floods.
SolHi: कोसी नदी को इसके बार-बार आने वाले विनाशकारी बाढ़ के कारण "बिहार का शोक" कहा जाता है।
Tag: Geography
---
Q2) If $x^2 - 5x + 6 = 0$, find the product of the roots.
A) $5$
B) $6$
C) $-6$
D) $11$
Ans: B
Sol: Product of roots $= c/a = 6/1 = 6$.
Tag: Quadratic Equations
---
Q3) With reference to the causes of the 1857 Revolt, which of the following statements are correct?
1. The "General Service Enlistment Act" required sepoys to serve overseas, which conflicted with religious beliefs regarding "crossing the black water."
2. The Annexation of Awadh by Lord Dalhousie on grounds of "misgovernment" deeply hurt the sentiments of the sepoys, many of whom came from that region.
3. The Lex Loci Act of 1850 allowed Christian converts to inherit ancestral property, causing resentment among Hindus and Muslims.
A) 1 and 2 only
B) 2 and 3 only
C) 1 and 3 only
D) 1, 2, and 3 ✅
Ex: All three were significant triggers. The General Service Enlistment Act (1856) created professional discontent, the annexation of Awadh (1856) created social and political unrest, and the Lex Loci Act was seen as an attack on traditional religious laws.
---`;

interface ParsedBlock {
  text: string;
  textHi?: string;
  options: QOption[];
  explanation?: string;
  explanationHi?: string;
  tag?: string;
  solutionPlacement?: SolutionPlacement;
}

function stripLeadingLabel(line: string): string {
  // Q1) / Q1. / Q1: / Q) all accepted
  return line.replace(/^Q\d*[).:]\s*/i, '').trim();
}

/**
 * Splits raw pasted text into per-question blocks. Primary separator is a
 * "---" line (as documented/templated). But plenty of real-world pasted
 * sets (WhatsApp forwards, notes-app exports) never use "---" at all —
 * they just leave a blank line between questions. So when the whole
 * input has NO "---" separator anywhere, fall back to splitting on a
 * blank line, but ONLY right before a line that starts a new question
 * (Q1) / Q2. / Q) / etc) — a blank line that just separates the stem from
 * the options, or sits inside an explanation, must never be treated as a
 * question boundary.
 */
function splitBlocks(raw: string): string[] {
  if (/^\s*---+\s*$/m.test(raw)) {
    return raw
      .split(/^\s*---+\s*$/m)
      .map((b) => b.trim())
      .filter(Boolean);
  }

  const lines = raw.split('\n');
  const blocks: string[] = [];
  let current: string[] = [];
  let sawBlank = false;

  const startsNewQuestion = (line: string) => /^\s*Q\d*[).:]/i.test(line);

  for (const line of lines) {
    if (line.trim() === '') {
      sawBlank = true;
      continue;
    }
    if (sawBlank && startsNewQuestion(line) && current.length > 0) {
      blocks.push(current.join('\n'));
      current = [];
    }
    // A blank line NOT followed by a new question (e.g. between stem and
    // options, or inside a multi-line explanation) is simply dropped here
    // — downstream per-block parsing already filters blank lines out, so
    // there's nothing to preserve by keeping it.
    sawBlank = false;
    current.push(line);
  }
  if (current.length > 0) blocks.push(current.join('\n'));

  return blocks.map((b) => b.trim()).filter(Boolean);
}

export function parseBulkQuestions(raw: string): Partial<Question>[] {
  const blocks = splitBlocks(raw);

  const results: Partial<Question>[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) continue;

    const parsed: ParsedBlock = { text: '', options: [] };
    const textLines: string[] = [];
    const explanationLines: string[] = [];
    const explanationHiLines: string[] = [];
    // 'explanation-hi' is a distinct mode from 'explanation' so a SolHi:
    // block's continuation lines never bleed into the English Sol: text
    // (and vice versa) — see the SolHi:/HISol: match below.
    let mode: 'question' | 'explanation' | 'explanation-hi' = 'question';

    for (const line of lines) {
      const optionMatch = line.match(/^([A-Fa-f])[).]\s*(.*)$/);
      const ansMatch = line.match(/^Ans(?:wer)?\s*[:.]\s*(.+)$/i);
      // Hindi solution line — accepts SolHi:/Sol-Hi:/HISol:/HI-Sol: so
      // whichever order someone naturally types is understood. Must be
      // checked BEFORE the plain Sol: match below (it would otherwise
      // never be reached, since "SolHi:" also loosely resembles "Sol").
      const solHiMatch = line.match(/^(?:Sol[\s-]?Hi|HI[\s-]?Sol)\s*[:.]\s*(.*)$/i);
      // "Sol:"/"Solution:" and the shorter "Ex:"/"Explanation:" are treated
      // as the same field — some templates (e.g. the "Ex:" convention used
      // for assertion/statement-style questions) use "Ex:" instead of
      // "Sol:" for the same purpose, so both feed explanationLines.
      const solMatch = line.match(/^(?:Sol(?:ution)?|Ex(?:planation)?)\s*[:.]\s*(.*)$/i);
      const tagMatch = line.match(/^Tag\s*[:.]\s*(.+)$/i);
      const hiMatch = line.match(/^HI\s*[).:]\s*(.+)$/i);
      const qMatch = line.match(/^Q\d*[).:]\s*(.*)$/i);

      if (qMatch) {
        textLines.push(stripLeadingLabel(line));
        mode = 'question';
      } else if (hiMatch) {
        parsed.textHi = hiMatch[1].trim();
      } else if (optionMatch) {
        // A trailing ✅ (or ✔/✓) on an option line marks it correct inline,
        // as an alternative to a separate "Ans: X" line — e.g.
        // "D) 1, 2, and 3 ✅". The marker itself is stripped from the
        // option's displayed text.
        const rawOptionText = optionMatch[2].trim();
        const checkMatch = rawOptionText.match(/^(.*?)\s*[✅✔✓]\s*$/);
        parsed.options.push({
          id: genId(),
          text: (checkMatch ? checkMatch[1] : rawOptionText).trim(),
          isCorrect: !!checkMatch,
        });
        mode = 'question';
      } else if (ansMatch) {
        const ansLabel = ansMatch[1].trim().toUpperCase();
        // Support "B" or full text match
        const byLetter = 'ABCDEF'.indexOf(ansLabel[0]);
        if (byLetter >= 0 && byLetter < parsed.options.length && ansLabel.length <= 2) {
          parsed.options[byLetter].isCorrect = true;
        } else {
          // match by text
          const found = parsed.options.find((o) => o.text.toLowerCase() === ansMatch[1].trim().toLowerCase());
          if (found) found.isCorrect = true;
        }
      } else if (solHiMatch) {
        mode = 'explanation-hi';
        if (solHiMatch[1]) explanationHiLines.push(solHiMatch[1].trim());
      } else if (solMatch) {
        mode = 'explanation';
        if (solMatch[1]) explanationLines.push(solMatch[1].trim());
      } else if (tagMatch) {
        parsed.tag = tagMatch[1].trim();
        mode = 'question';
      } else {
        // continuation line - depends on mode
        if (mode === 'explanation') {
          explanationLines.push(line);
        } else if (mode === 'explanation-hi') {
          explanationHiLines.push(line);
        } else {
          textLines.push(line);
        }
      }
    }
    let splitIndex = textLines.findIndex(l => l === '😂');
    if (splitIndex !== -1) {
      const optionLines = textLines.slice(splitIndex + 1);
      textLines.splice(splitIndex);
      for (const opt of optionLines) {
        const checkMatch = opt.match(/^(.*?)\s*[✅✔✓]\s*$/);
        parsed.options.push({
          id: genId(),
          text: (checkMatch ? checkMatch[1] : opt).trim(),
          isCorrect: !!checkMatch,
        });
      }
    } else if (parsed.options.length === 0 && textLines.length >= 4) {
      const last4 = textLines.slice(-4);
      if (last4.some(l => /[✅✔✓]/.test(l))) {
        textLines.splice(-4, 4);
        for (const opt of last4) {
          const checkMatch = opt.match(/^(.*?)\s*[✅✔✓]\s*$/);
          parsed.options.push({
            id: genId(),
            text: (checkMatch ? checkMatch[1] : opt).trim(),
            isCorrect: !!checkMatch,
          });
        }
      }
    }

    parsed.text = textLines.join('\n').trim();
    parsed.explanation = explanationLines.join('\n').trim() || undefined;
    parsed.explanationHi = explanationHiLines.join('\n').trim() || undefined;

    if (!parsed.text && parsed.options.length === 0) continue;

    // ensure at least one correct option exists; default to first if none marked
    if (parsed.options.length > 0 && !parsed.options.some((o) => o.isCorrect)) {
      parsed.options[0].isCorrect = true;
    }

    results.push({
      text: parsed.text || 'Untitled question',
      textHi: parsed.textHi,
      options: parsed.options.length > 0 ? parsed.options : [
        { id: genId(), text: 'Option A', isCorrect: true },
        { id: genId(), text: 'Option B', isCorrect: false },
      ],
      explanation: parsed.explanation,
      // Explicitly set (even when undefined) — this key must always be
      // present on the returned object. createDefaultQuestion() merges
      // this partial OVER its own baked-in sample defaults, and a plain
      // object spread only overwrites a key that actually exists on the
      // source object. Omitting this key here is exactly what caused
      // every bulk-imported question to silently inherit the hardcoded
      // sample's Hindi explanation (the "Kosi Nadi" text) as its own.
      explanationHi: parsed.explanationHi,
      tag: parsed.tag,
      images: [],
    });
  }

  return results;
}
