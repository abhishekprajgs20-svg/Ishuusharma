// Core data model for the Ishuu Sharma Mock Test Generator.
// Everything the app can customize lives in these shapes.

export type SolutionPlacement = 'inline' | 'end' | 'hidden';
// Legacy 3-way mode — no longer stored on LayoutSettings (replaced by the
// independent showPrimaryLanguage/showSecondaryLanguage booleans below, so
// ANY number of real-world language pairs — Hindi, Tamil, Bengali, Urdu,
// whatever a user actually needs — can be named and toggled independently
// instead of a single hardcoded "Hindi" baked into the type). Kept only
// because SlideSettings.language (a separate, still-simple slide-deck
// setting) still uses this exact shape.
export type Language = 'en' | 'hi' | 'bilingual';

export interface QImage {
  id: string;
  /** data: URL (base64) so everything stays local, no external hosting needed */
  src: string;
  alt?: string;
  widthPct?: number; // 20-100, relative to column width
}

export interface QOption {
  id: string;
  text: string; // markdown + latex
  textHi?: string; // optional hindi variant for bilingual
  image?: QImage;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  sectionId: string;
  text: string; // markdown + latex, english (or single-language mode)
  textHi?: string; // hindi variant, used when bilingual
  images: QImage[]; // images attached directly under the question stem
  options: QOption[];
  explanation?: string; // markdown + latex
  explanationHi?: string;
  solutionPlacement?: SolutionPlacement; // overrides section/global default when set
  marks?: number;
  negativeMarks?: number;
  highlighted?: boolean; // bold/highlight the question block
  tag?: string; // topic tag, optional
}

export interface Section {
  id: string;
  title: string;
  titleHi?: string;
  instructions?: string; // shown under section header
  defaultSolutionPlacement: SolutionPlacement;
  marksPerQuestion?: number;
  negativeMarksPerQuestion?: number;
  timeLimitMinutes?: number;
  showSectionHeader: boolean;
  pageBreakBefore: boolean;
}

export interface CustomPage {
  id: string;
  title: string;
  /** raw markdown body rendered full-width, own page */
  content: string;
  position: 'start' | 'end';
}

export interface BrandingSettings {
  instituteName: string;
  instituteNameHi?: string;
  tagline?: string;
  logoDataUrl?: string;
  watermarkDataUrl?: string;
  watermarkOpacity: number; // 0-1
  address?: string;
  website?: string;
  phone?: string;
  email?: string;
  accentColor: string; // hex
  showRollNoGrid: boolean;
  rollNoDigits: number;
  showSignatureBox: boolean;
  showOMRHint: boolean;
}

export interface HeaderFooterSettings {
  headerEnabled: boolean;
  headerText: string; // supports {{testName}} {{instituteName}} {{page}} {{totalPages}} {{date}}
  footerEnabled: boolean;
  footerText: string;
  showPageNumbers: boolean;
  showDateInHeader: boolean;
  repeatBrandingOnEveryPage: boolean;
}

export type SolutionBoxStyle = 'sidebar' | 'boxed' | 'shaded' | 'plain';
export type QuestionTextEmphasis = 'normal' | 'bold' | 'colored' | 'bold-colored';
/** Generic alias — the emphasis type isn't specific to the question stem
 * any more (it's applied independently per language now), so new code
 * should reach for this name; QuestionTextEmphasis stays exported too so
 * nothing existing breaks. */
export type TextEmphasis = QuestionTextEmphasis;
export type StylePreset = 'classic' | 'modern' | 'compact' | 'exam-authority';
/** How the correct option is visually marked when highlightCorrectOption is on. */
export type HighlightStyle = 'fill' | 'underline' | 'border' | 'checkmark';
export type OptionsPerRow = 1 | 2;
/** 'google-custom' loads whatever exact family name the user types (see
 * lib/googleFont.ts) via the public Google Fonts CSS2 API — no API key
 * needed, works for any script Google Fonts hosts (Latin, Devanagari,
 * Tamil, Bengali, Arabic script for Urdu, etc), not just the 4 bundled
 * choices below. */
export type FontChoice = 'inter' | 'sora' | 'system-serif' | 'system-mono' | 'google-custom';
/** How the secondary (translation) language's own font is chosen,
 * independent of the primary/body font above. 'devanagari' is the one
 * built-in, bundled-offline choice (works with zero network access,
 * covers Hindi/Marathi/Sanskrit/Nepali out of the box); 'same-as-primary'
 * reuses whatever the Body Font is set to; 'google-custom' loads any
 * exact Google Font name the user provides — this is what makes Tamil,
 * Bengali, Telugu, Kannada, Malayalam, Gujarati, Punjabi, Urdu, or any
 * other language actually usable as the "secondary" language, not just
 * Hindi. */
export type SecondaryFontChoice = 'devanagari' | 'same-as-primary' | 'google-custom';

export interface LayoutSettings {
  columns: 1 | 2;
  fontSizePt: number; // base font size in pt for print
  lineHeight: number;
  showQuestionNumberBadge: boolean;
  showMarksPerQuestion: boolean;
  optionStyle: 'abcd' | 'roman' | 'numeric';
  bilingualLayout: 'stacked' | 'side-by-side'; // how EN/HI render per question
  /**
   * Independent language toggles, replacing the old 3-way `language`
   * enum ('en'/'hi'/'bilingual'). Two plain booleans instead of one enum
   * scale to any language pair without a code change, and let both be on
   * (bilingual), either alone, in any combination — the reducer/UI only
   * prevents BOTH being off at once (a document must show at least one
   * language). "Primary" is always the question's `text`/`options[].text`
   * fields (English by convention, but really just "the first language a
   * question was authored in"); "secondary" is the `textHi`/`explanationHi`
   * etc fields, which despite the "Hi" name can hold ANY language now —
   * see secondaryLanguageLabel/secondaryFontChoice below for how that
   * language is named and rendered with its own real font. When secondary
   * is shown alone and a question/option/explanation was never given a
   * secondary translation, primary content is used as a fallback so a
   * question never silently renders blank.
   */
  showPrimaryLanguage: boolean;
  showSecondaryLanguage: boolean;
  /** Free-text name for whatever the secondary language actually is —
   * "Hindi", "Tamil", "Bengali", "Urdu", anything — shown throughout the
   * builder UI (field labels, hints) instead of a hardcoded "Hindi". */
  secondaryLanguageLabel: string;
  /** Which font renders secondary-language text. See SecondaryFontChoice. */
  secondaryFontChoice: SecondaryFontChoice;
  /** Exact Google Font family name (e.g. "Noto Sans Tamil", "Hind
   * Siliguri", "Noto Nastaliq Urdu") — used only when secondaryFontChoice
   * is 'google-custom'. Typed by the user, loaded dynamically at runtime
   * (see lib/googleFont.ts); no bundling/build step needed per language. */
  secondaryCustomFontName?: string;
  /**
   * Text emphasis (bold/color) for the secondary language, INDEPENDENT of
   * questionTextEmphasis (which now controls only the primary language).
   * Applied consistently to the secondary line of the question stem,
   * every option, and the explanation — one control for "how the
   * secondary language looks" as a whole, rather than a separate dropdown
   * per element (which would be a lot of UI for a rarely-mixed setting).
   */
  secondaryTextEmphasis: TextEmphasis;
  /**
   * Whether the correct option is visually marked (bold/accent color +
   * checkmark) directly in the question's option list. Independent of
   * solutionPlacement — a real mock test usually wants this OFF (so the
   * printed paper looks like a real blank exam) even when explanations
   * are shown inline or in an answer key, since "solution shown" and
   * "answer visibly marked next to the option" are different asks.
   */
  highlightCorrectOption: boolean;
  /** How the correct option is visually marked when highlightCorrectOption is on. */
  highlightStyle: HighlightStyle;
  /** Color used for the correct-option highlight. Defaults to the accent color. */
  highlightColor: string;
  /** Visual treatment of the inline "Solution:" block under a question. */
  solutionBoxStyle: SolutionBoxStyle;
  /** Emphasis applied to the PRIMARY language's question stem, option
   * text, and explanation text — secondaryTextEmphasis above is the
   * independent equivalent for the secondary language, so (for example)
   * English can be bold while the secondary line stays normal weight, or
   * vice versa. Kept the QuestionTextEmphasis name for backward
   * compatibility with already-saved documents. */
  questionTextEmphasis: QuestionTextEmphasis;
  /** Bold the option label, e.g. "(A)", regardless of correctness. */
  boldOptionLabels: boolean;
  /** 1 = options stack vertically (classic), 2 = options render two per row. */
  optionsPerRow: OptionsPerRow;
  /** Body text font family used across the printed paper — the PRIMARY
   * language's font. 'google-custom' uses customFontName below instead of
   * one of the 4 bundled choices. */
  fontFamily: FontChoice;
  /** Exact Google Font family name for the primary language — used only
   * when fontFamily is 'google-custom'. See lib/googleFont.ts. */
  customFontName?: string;
  /**
   * When true, each question's options render in a randomized order
   * instead of the order they were entered/imported in — the classic
   * "AI/bulk-imported sets always put the answer at B" problem. The
   * shuffle is deterministic per question (seeded from the question id
   * + shuffleSeed) so the live preview, pagination measurement, and
   * print output all agree on the same order; it never mutates the
   * question's actual stored option order, so turning this off restores
   * the original order exactly.
   */
  shuffleOptions: boolean;
  /** Bump this (e.g. a "Reshuffle" button) to get a different randomized
   * order without touching shuffleOptions itself. */
  shuffleSeed: number;
  /** One-click bundle of the above styling knobs; 'custom' once the user
   * hand-tunes anything so the preset selector doesn't silently relabel
   * their choices as a preset they didn't pick. */
  stylePreset: StylePreset | 'custom';
}

export interface TestMeta {
  id: string;
  testName: string;
  testNameHi?: string;
  subject?: string;
  examName?: string; // e.g. UPSC Prelims, SSC CGL Tier 1
  duration?: string; // "120 minutes"
  totalMarks?: number;
  date?: string;
  instructionsMarkdown: string; // the instructions page body (English, or single-language mode)
  instructionsMarkdownHi?: string; // Hindi variant; when present + language=bilingual, renders as a second column
  globalSolutionPlacement: SolutionPlacement;
}

export interface TestDocument {
  meta: TestMeta;
  branding: BrandingSettings;
  headerFooter: HeaderFooterSettings;
  layout: LayoutSettings;
  sections: Section[];
  questions: Question[];
  customPages: CustomPage[]; // start + end pages, can add more of either
  /** Settings for the PPT Slides export mode (lib/exportPptx.ts) — entirely
   * separate from the PDF/print pipeline above, which never reads this. */
  slideSettings: SlideSettings;
  updatedAt: number;
}

export const OPTION_LABELS: Record<LayoutSettings['optionStyle'], string[]> = {
  abcd: ['A', 'B', 'C', 'D', 'E', 'F'],
  roman: ['I', 'II', 'III', 'IV', 'V', 'VI'],
  numeric: ['1', '2', '3', '4', '5', '6'],
};

/**
 * One-click style bundles. Applying a preset patches just the visual
 * knobs below (never content, sections, or page setup) so switching
 * presets is always a safe, reversible cosmetic change.
 */
export const STYLE_PRESETS: Record<
  StylePreset,
  {
    label: string;
    description: string;
    patch: Pick<
      LayoutSettings,
      | 'fontSizePt'
      | 'lineHeight'
      | 'solutionBoxStyle'
      | 'questionTextEmphasis'
      | 'boldOptionLabels'
      | 'showQuestionNumberBadge'
      | 'fontFamily'
      | 'highlightStyle'
    >;
  }
> = {
  classic: {
    label: 'Classic',
    description: 'Plain, exam-authority look — the original default styling.',
    patch: {
      fontSizePt: 10.5,
      lineHeight: 1.45,
      solutionBoxStyle: 'sidebar',
      questionTextEmphasis: 'normal',
      boldOptionLabels: false,
      showQuestionNumberBadge: true,
      fontFamily: 'inter',
      highlightStyle: 'checkmark',
    },
  },
  modern: {
    label: 'Modern',
    description: 'Bold question stems, boxed solutions, bold option labels — punchier for coaching-brand papers.',
    patch: {
      fontSizePt: 10.5,
      lineHeight: 1.5,
      solutionBoxStyle: 'boxed',
      questionTextEmphasis: 'bold',
      boldOptionLabels: true,
      showQuestionNumberBadge: true,
      fontFamily: 'sora',
      highlightStyle: 'fill',
    },
  },
  compact: {
    label: 'Compact',
    description: 'Smaller font and tighter lines to fit more questions per page — good for long papers.',
    patch: {
      fontSizePt: 9,
      lineHeight: 1.25,
      solutionBoxStyle: 'sidebar',
      questionTextEmphasis: 'normal',
      boldOptionLabels: false,
      showQuestionNumberBadge: true,
      fontFamily: 'inter',
      highlightStyle: 'checkmark',
    },
  },
  'exam-authority': {
    label: 'Exam Authority',
    description: 'Colored, bold question numbers and shaded solution blocks — mimics official exam-board papers.',
    patch: {
      fontSizePt: 10.5,
      lineHeight: 1.45,
      solutionBoxStyle: 'shaded',
      questionTextEmphasis: 'bold-colored',
      boldOptionLabels: false,
      showQuestionNumberBadge: true,
      fontFamily: 'system-serif',
      highlightStyle: 'border',
    },
  },
};

export const FONT_CHOICES: Record<FontChoice, { label: string; cssFamily: string }> = {
  inter: { label: 'Inter (default, clean sans)', cssFamily: "'Inter', system-ui, sans-serif" },
  sora: { label: 'Sora (bold, display-friendly)', cssFamily: "'Sora', system-ui, sans-serif" },
  'system-serif': { label: 'Serif (formal, exam-authority feel)', cssFamily: "'Georgia', 'Times New Roman', serif" },
  'system-mono': { label: 'Monospace (technical / coding papers)', cssFamily: "'JetBrains Mono', 'Courier New', monospace" },
  // cssFamily here is just the Inter fallback stack — the REAL family
  // (whatever exact name the user typed) is resolved at render time via
  // lib/googleFont.ts's primaryFontCssFamily(), which reads
  // layout.customFontName. This entry only exists so FONT_CHOICES stays a
  // complete Record<FontChoice, ...> and any code that falls back to it
  // (before a custom name is set) gets a sane font instead of `undefined`.
  'google-custom': { label: 'Custom Google Font…', cssFamily: "'Inter', system-ui, sans-serif" },
};

// ---------------------------------------------------------------------------
// PPT Slides export — an ADDITIVE export mode alongside the PDF/print flow.
// Nothing below changes how the existing PDF pipeline reads TestDocument;
// this is purely new surface area consumed by lib/exportPptx.ts and
// components/builder/panels/SlideSettingsPanel.tsx.
// ---------------------------------------------------------------------------

export type SlideColorScheme = 'light' | 'dark' | 'branded';

export interface SlideSettings {
  /** Overall palette for the deck. 'branded' derives background/text/muted
   * tones from `accentColor` below so a single accent pick still yields a
   * production-looking theme. */
  colorScheme: SlideColorScheme;
  /** Accent used for badges, correct-answer highlight, header/footer bars.
   * Independent from branding.accentColor so a deck can use a different
   * accent than the printed paper, but defaults to it. */
  accentColor: string;
  /**
   * Questions per slide. Only `1` is implemented today (one question +
   * its options fully laid out on a single slide) — kept as a union
   * (rather than a bare `number`) so a future "2 per slide" / "grid"
   * mode can be added without a breaking type change.
   */
  questionsPerSlide: 1;
  /** If true, the correct option is visually marked directly on each
   * question slide. If false, answers are withheld until a compact
   * Answer Key section at the end (mirrors LayoutSettings' concept of
   * solutionPlacement, but slide decks only need the inline/end split —
   * there's no meaningful "hidden" for a slide deck since the deck is
   * inherently a single artifact, not a live exam paper). */
  showAnswerOnSlide: boolean;
  /** Whether solution/explanation text is included — either appended
   * under the answer reveal on each question slide, or as its own
   * explanation slide per question in the Answer Key section. */
  includeExplanation: boolean;
  /** Same Language type and fallback rules as LayoutSettings.language:
   * 'hi' falls back to English when a question/option was never
   * translated, 'bilingual' shows English primary + Hindi secondary. */
  language: Language;
  /** Slide number shown bottom-right of the footer bar on every slide. */
  showSlideNumbers: boolean;
  /** Reuses the same FontChoice set as the printed paper. */
  fontFamily: FontChoice;
  /** Shown in the header bar of every slide (e.g. institute name). */
  headerText: string;
  /** Shown in the footer bar of every slide (e.g. website, tagline). */
  footerText: string;
  /** Optional extra subtitle line on the opening title slide, below the
   * test name / exam name (e.g. "Batch 2026 — Live Class Test Series"). */
  titleSlideSubtitle?: string;
}

export interface SlideTheme {
  label: string;
  background: string;
  text: string;
  muted: string;
  /** Panel/card fill used behind option rows, header/footer bars. */
  panel: string;
  /** Falls back to SlideSettings.accentColor when the theme is 'branded'. */
  accent?: string;
}

/**
 * Built-in slide color themes, keyed by SlideColorScheme. 'branded' has no
 * fixed colors of its own — lib/exportPptx.ts derives its palette from
 * SlideSettings.accentColor at export time — so it isn't listed here; the
 * two fixed entries are the ready-made, non-branded looks a user can pick
 * without ever touching a color input.
 */
export const SLIDE_THEMES: Record<Exclude<SlideColorScheme, 'branded'>, SlideTheme> = {
  light: {
    label: 'Light',
    background: 'FFFFFF',
    text: '1A1A2E',
    muted: '6B7280',
    panel: 'F4F5FA',
  },
  dark: {
    label: 'Dark',
    background: '15172B',
    text: 'F5F6FA',
    muted: 'A0A3BD',
    panel: '1F2240',
  },
};
