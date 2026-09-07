'use client';

import { useMemo, useState } from 'react';
import { Copy, Check, Sparkles } from 'lucide-react';
import { Field, FieldRow, Select, TextInput, TextArea, SectionCard, Button } from '../ui';
import { useTestStore } from '@/store/testStore';

type Difficulty = 'easy' | 'moderate' | 'hard' | 'mixed';
type Lang = 'en' | 'secondary' | 'bilingual';

// Kept in sync with lib/bulkParser.ts's actual accepted format — if that
// format ever changes, this prompt needs to change with it, since the
// whole point is that pasting the AI's output straight into Bulk Paste
// works without any manual reformatting. The "HI)"/"SolHi:" markers are
// the parser's fixed syntax (unrelated to what the secondary language is
// actually named) — the WORDING below tells the AI which real language to
// write on those lines, so this works for Tamil/Bengali/Urdu/etc, not just
// Hindi, without needing a different bulk-paste syntax.
const formatBlock = (secondaryLabel: string) => `Q1) <question text — markdown and $LaTeX$ math supported>
HI) <${secondaryLabel} translation of the question — omit this line entirely if not bilingual>
A) <option A>
B) <option B>
C) <option C>
D) <option D>
Ans: <the correct option letter, e.g. B>
Sol: <explanation of the correct answer, markdown and $LaTeX$ supported>
SolHi: <${secondaryLabel} translation of the explanation — omit this line entirely if not bilingual>
Tag: <short topic tag, e.g. Modern History>
---
Q2) <next question...>
...
---`;

export default function PromptBuilderPanel() {
  const secondaryLabel = useTestStore((s) => s.doc.layout.secondaryLanguageLabel) || 'Hindi';
  const [topic, setTopic] = useState('Indian Polity — Fundamental Rights');
  const [examName, setExamName] = useState('SSC CGL / UPSC Prelims');
  const [difficulty, setDifficulty] = useState<Difficulty>('mixed');
  const [count, setCount] = useState(10);
  const [language, setLanguage] = useState<Lang>('bilingual');
  const [extraInstructions, setExtraInstructions] = useState('');
  const [copied, setCopied] = useState(false);

  const prompt = useMemo(() => {
    const langLine =
      language === 'bilingual'
        ? `Write each question in English AND include a ${secondaryLabel} translation on the "HI)" line right after the question line. Also include a ${secondaryLabel} translation of the explanation on a "SolHi:" line right after the "Sol:" line — every question must have BOTH Sol: and SolHi:, not just some of them, so no question is left without a ${secondaryLabel} explanation.`
        : language === 'secondary'
        ? `Write every question, option, and explanation in ${secondaryLabel} only. Do not include an "HI)" line or a separate "SolHi:" line — just put the ${secondaryLabel} text directly on the "Q)" line and after "Sol:".`
        : 'Write everything in English only. Do not include any "HI)" or "SolHi:" lines.';

    const difficultyLine =
      difficulty === 'mixed'
        ? 'Vary the difficulty across the set — roughly a third easy, a third moderate, a third hard — rather than making every question the same difficulty.'
        : `Keep every question at a consistently ${difficulty} difficulty level, appropriate for a serious competitive-exam aspirant.`;

    return `You are writing multiple-choice questions (MCQs) for a competitive exam mock test.

Topic: ${topic || '(specify a topic)'}
Target exam: ${examName || '(specify an exam)'}
Number of questions: ${count}
${difficultyLine}
${langLine}

IMPORTANT — output format:
Output ONLY the questions, formatted EXACTLY like this template, with nothing else before or after (no intro sentence, no numbered summary, no markdown code fence):

${formatBlock(secondaryLabel)}

Formatting rules to follow exactly:
- Each question starts with "Q<number>)" and ends with a line containing just three dashes "---" before the next question.
- Exactly 4 options, labeled A) B) C) D).
- "Ans:" must name exactly one correct option letter.
- IMPORTANT — vary which letter is correct across the question set (don't make every correct answer "B" or always the same position); distribute correct answers roughly evenly across A, B, C, and D.
- Math must use LaTeX between $...$ for inline or $$...$$ for block equations (e.g. $x^2 + 5x = 0$).
- Keep each "Sol:" (and "SolHi:" when present) explanation concise (1-3 sentences) but genuinely explain WHY the answer is correct, not just restate it.
- Do not repeat the same question twice, and do not reuse options from one question as the correct answer pattern in the next.${
      extraInstructions.trim() ? `\n\nAdditional instructions from me:\n${extraInstructions.trim()}` : ''
    }`;
  }, [topic, examName, difficulty, count, language, extraInstructions]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div>
      <SectionCard title="AI Prompt Builder">
        <p className="text-[12.5px] text-ink-500 dark:text-ink-400 -mt-1 mb-3.5 leading-relaxed">
          Fill in what you want, copy the generated prompt into ChatGPT / Claude / Gemini / any AI, then paste its
          reply straight into <strong>Questions → Bulk Paste</strong> — no reformatting needed, since the prompt
          tells the AI to output in this app&apos;s exact Bulk Paste format.
        </p>

        <Field label="Topic / Subject">
          <TextInput value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Modern Indian History — Freedom Movement" />
        </Field>

        <FieldRow>
          <Field label="Target Exam">
            <TextInput value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="e.g. SSC CGL, UPSC, Bank PO" />
          </Field>
          <Field label="Number of Questions">
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
              className="w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100 px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition"
            />
          </Field>
        </FieldRow>

        <FieldRow>
          <Field label="Difficulty">
            <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
              <option value="mixed">Mixed (easy/moderate/hard)</option>
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="hard">Hard</option>
            </Select>
          </Field>
          <Field label="Language">
            <Select value={language} onChange={(e) => setLanguage(e.target.value as Lang)}>
              <option value="bilingual">Bilingual (English + {secondaryLabel})</option>
              <option value="en">English only</option>
              <option value="secondary">{secondaryLabel} only</option>
            </Select>
          </Field>
        </FieldRow>

        <Field label="Additional Instructions (optional)" hint="Anything else the AI should know — a specific sub-topic, a source to base questions on, a style to match">
          <TextArea
            rows={3}
            value={extraInstructions}
            onChange={(e) => setExtraInstructions(e.target.value)}
            placeholder="e.g. Focus on Articles 14-32 of the Constitution. Include at least 2 questions with a comparison table."
          />
        </Field>
      </SectionCard>

      <SectionCard
        title="Generated Prompt"
        action={
          <Button variant="secondary" size="sm" onClick={handleCopy}>
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied!' : 'Copy Prompt'}
          </Button>
        }
      >
        <div className="flex items-start gap-2 mb-2 text-[11.5px] text-ink-500 dark:text-ink-400">
          <Sparkles size={14} className="shrink-0 mt-0.5 text-brand-500" />
          <span>
            This updates live as you fill in the fields above. Copy it, paste into your AI of choice, then bring the
            reply back here via Bulk Paste.
          </span>
        </div>
        <pre className="whitespace-pre-wrap text-[12px] font-mono leading-relaxed bg-ink-50 dark:bg-ink-900 border border-ink-200 dark:border-ink-700 rounded-lg p-3 text-ink-800 dark:text-ink-200 max-h-[420px] overflow-y-auto styled-scroll">
          {prompt}
        </pre>
      </SectionCard>
    </div>
  );
}
