import { nanoid } from 'nanoid';
import type { TestDocument, SlideSettings } from './types';

export const genId = () => nanoid(8);

export function createDefaultSection(overrides: Partial<TestDocument['sections'][number]> = {}) {
  return {
    id: genId(),
    title: 'Section I — General Awareness',
    titleHi: 'खंड I — सामान्य ज्ञान',
    instructions: 'Attempt all questions. Each question carries equal marks unless stated otherwise.',
    defaultSolutionPlacement: 'end' as const,
    marksPerQuestion: 1,
    negativeMarksPerQuestion: 0.25,
    timeLimitMinutes: undefined,
    showSectionHeader: true,
    pageBreakBefore: false,
    ...overrides,
  };
}

// NOTE ON THIS FUNCTION'S SHAPE — read before touching the defaults below.
// This used to bake real-looking sample content ("Kosi river / Sorrow of
// Bihar") directly into the base object that every overrides object gets
// spread ONTO. That is safe only as long as every single caller (bulk
// import, manual "add question", duplication, seed data...) explicitly
// sets every field it cares about — because a plain `{...base, ...over}`
// spread only overwrites a key that the overrides object actually HAS.
// A parser or call site that forgets one field (this happened with
// `explanationHi`, which `lib/bulkParser.ts` never used to emit) silently
// inherits the sample content instead of getting `undefined` — so every
// bulk-imported question ended up with the same hardcoded Hindi solution
// glued onto it, regardless of its own topic.
//
// Fixed at the root: the base object below has NO sample trivia content
// baked in — every real content field defaults to empty/undefined, so a
// caller that forgets a field gets nothing (visibly blank), never someone
// else's content. The actual "Sorrow of Bihar" demo question — the one
// meant to show a first-time user what a filled-in question looks like —
// is constructed separately below as `createSampleKosiQuestion()` and is
// ONLY ever called explicitly from seed/demo document construction, never
// used as a silent fallback.
export function createDefaultQuestion(sectionId: string, overrides: Partial<TestDocument['questions'][number]> = {}) {
  return {
    id: genId(),
    sectionId,
    text: '',
    textHi: undefined,
    images: [],
    options: [
      { id: genId(), text: '', isCorrect: true },
      { id: genId(), text: '', isCorrect: false },
    ],
    explanation: undefined,
    explanationHi: undefined,
    solutionPlacement: undefined,
    marks: undefined,
    negativeMarks: undefined,
    highlighted: false,
    tag: '',
    ...overrides,
  };
}

// The one real place the "Sorrow of Bihar" demo content is allowed to
// exist — used explicitly by seed/demo document construction only. Never
// call this from bulkImportQuestions, addQuestion, or anywhere a real
// user-authored question flows through, or the same leak comes right back.
export function createSampleKosiQuestion(sectionId: string) {
  return createDefaultQuestion(sectionId, {
    text: 'Which of the following rivers is known as the "Sorrow of Bihar"?',
    textHi: 'निम्नलिखित में से किस नदी को "बिहार का शोक" कहा जाता है?',
    options: [
      { id: genId(), text: 'Ganga', isCorrect: false },
      { id: genId(), text: 'Kosi', isCorrect: true },
      { id: genId(), text: 'Son', isCorrect: false },
      { id: genId(), text: 'Gandak', isCorrect: false },
    ],
    explanation: 'The **Kosi river** is called the "Sorrow of Bihar" due to its frequent and devastating floods caused by shifting river channels.',
    explanationHi: '**कोसी नदी** को इसके बार-बार आने वाले विनाशकारी बाढ़ के कारण "बिहार का शोक" कहा जाता है।',
    tag: 'Geography',
  });
}

export function createSampleMathQuestion(sectionId: string) {
  return createDefaultQuestion(sectionId, {
    text: 'If $x^2 - 5x + 6 = 0$, find the sum of the roots multiplied by their product.\n\n$$\\text{Evaluate: } (\\alpha + \\beta) \\times (\\alpha \\beta)$$',
    textHi: 'यदि $x^2 - 5x + 6 = 0$ है, तो मूलों के योग और गुणनफल का गुणनफल ज्ञात कीजिए।',
    options: [
      { id: genId(), text: '$15$', isCorrect: false },
      { id: genId(), text: '$30$', isCorrect: true },
      { id: genId(), text: '$11$', isCorrect: false },
      { id: genId(), text: '$6$', isCorrect: false },
    ],
    explanation: 'Sum of roots $\\alpha+\\beta = 5$, product $\\alpha\\beta = 6$. So $(\\alpha+\\beta)(\\alpha\\beta) = 5 \\times 6 = 30$.',
    tag: 'Quadratic Equations',
  });
}

export function createDefaultSlideSettings(overrides: Partial<SlideSettings> = {}): SlideSettings {
  return {
    colorScheme: 'branded',
    accentColor: '#3d4bfa',
    questionsPerSlide: 1,
    showAnswerOnSlide: false,
    includeExplanation: true,
    language: 'bilingual',
    showSlideNumbers: true,
    fontFamily: 'inter',
    headerText: 'Ishuu Sharma',
    footerText: 'Ishuu Sharma',
    titleSlideSubtitle: '',
    ...overrides,
  };
}

export function createDefaultDocument(): TestDocument {
  const sectionA = createDefaultSection({ title: 'Section I — General Awareness', titleHi: 'खंड I — सामान्य ज्ञान' });
  const sectionB = createDefaultSection({
    title: 'Section II — Quantitative Aptitude',
    titleHi: 'खंड II — मात्रात्मक योग्यता',
    pageBreakBefore: true,
  });

  return {
    meta: {
      id: genId(),
      testName: 'SSC CGL Tier I — Full Length Mock Test 01',
      testNameHi: 'एसएससी सीजीएल टियर I — पूर्ण लंबाई मॉक टेस्ट 01',
      subject: 'General Studies + Quantitative Aptitude',
      examName: 'SSC CGL 2026',
      duration: '60 minutes',
      totalMarks: 100,
      date: new Date().toISOString().slice(0, 10),
      instructionsMarkdown: `## Instructions to Candidates

1. This test booklet contains **100 questions** divided into multiple sections. Each question carries **1 mark**, with a negative marking of **0.25 marks** for every wrong answer.
2. Use of calculator, mobile phone, or any electronic device is **strictly prohibited**.
3. Darken the appropriate circle on the OMR sheet using a **black/blue ball point pen only**. Rough work should be done only on the space provided.
4. Do not open the booklet until instructed to do so by the invigilator.

---

*All the best!*`,
      instructionsMarkdownHi: `## परीक्षार्थियों के लिए निर्देश

1. इस परीक्षा पुस्तिका में कई खंडों में विभाजित **100 प्रश्न** हैं। प्रत्येक प्रश्न के लिए **1 अंक** निर्धारित है, तथा प्रत्येक गलत उत्तर के लिए **0.25 अंक** की नकारात्मक अंकन होगी।
2. कैलकुलेटर, मोबाइल फोन या किसी भी इलेक्ट्रॉनिक उपकरण का उपयोग **सख्त वर्जित** है।
3. OMR शीट पर उपयुक्त गोले को केवल **काले/नीले बॉल पॉइंट पेन** से भरें। रफ कार्य केवल दिए गए स्थान पर करें।
4. निरीक्षक द्वारा निर्देश दिए जाने तक पुस्तिका न खोलें।

---

*शुभकामनाएँ!*`,
      globalSolutionPlacement: 'end',
    },
    branding: {
      instituteName: 'Ishuu Sharma',
      instituteNameHi: 'चिल्लैक्स आर्यन',
      tagline: 'Learn Smart. Crack Fast.',
      logoDataUrl: undefined,
      watermarkDataUrl: undefined,
      watermarkOpacity: 0.06,
      address: 'Ishuu Sharma · Telegram: @Shrma_Ishuu_bot',
      website: 'Ishuu Sharma',
      phone: '',
      email: '',
      accentColor: '#3d4bfa',
      showRollNoGrid: true,
      rollNoDigits: 10,
      showSignatureBox: true,
      showOMRHint: true,
    },
    headerFooter: {
      headerEnabled: true,
      headerText: '{{instituteName}} · {{testName}}',
      footerEnabled: true,
      footerText: '{{instituteName}} — {{examName}} | Page {{page}} of {{totalPages}}',
      showPageNumbers: true,
      showDateInHeader: true,
      repeatBrandingOnEveryPage: true,
    },
    layout: {
      columns: 2,
      fontSizePt: 10.5,
      lineHeight: 1.45,
      showQuestionNumberBadge: true,
      showMarksPerQuestion: true,
      optionStyle: 'abcd',
      bilingualLayout: 'stacked',
      showPrimaryLanguage: true,
      showSecondaryLanguage: true,
      secondaryLanguageLabel: 'Hindi',
      secondaryFontChoice: 'devanagari',
      secondaryTextEmphasis: 'normal',
      highlightCorrectOption: false,
      highlightStyle: 'checkmark',
      highlightColor: '#3d4bfa',
      solutionBoxStyle: 'sidebar',
      questionTextEmphasis: 'normal',
      boldOptionLabels: false,
      optionsPerRow: 1,
      fontFamily: 'inter',
      shuffleOptions: false,
      shuffleSeed: 1,
      stylePreset: 'classic',
    },
    slideSettings: createDefaultSlideSettings({
      headerText: 'Ishuu Sharma',
      footerText: 'Ishuu Sharma · @Shrma_Ishuu_bot',
    }),
    sections: [sectionA, sectionB],
    questions: [
      // Obviously-a-placeholder sample question — every NEW document starts
      // with a small set of demo questions so the live preview never opens
      // empty, but this first one is deliberately labeled as a sample
      // (rather than reusing real trivia content) so it's never mistaken
      // for a rendering bug or leftover content when someone starts fresh.
      createDefaultQuestion(sectionA.id, {
        text: 'This is a sample question — edit or delete it from the Questions panel. Supports **markdown**, $inline math$, and $$block math$$.',
        textHi: 'यह एक नमूना प्रश्न है — इसे प्रश्न पैनल से संपादित करें या हटाएं।',
        options: [
          { id: genId(), text: 'Sample option A', isCorrect: false },
          { id: genId(), text: 'Sample option B (correct)', isCorrect: true },
          { id: genId(), text: 'Sample option C', isCorrect: false },
          { id: genId(), text: 'Sample option D', isCorrect: false },
        ],
        explanation: 'This is where the solution/explanation text goes — shown inline or in the answer key depending on your Solution Placement setting.',
        explanationHi: 'यहां समाधान/व्याख्या टेक्स्ट आता है।',
        tag: 'Sample',
      }),
      createDefaultQuestion(sectionA.id, {
        text: 'Consider the image below showing the structure of a plant cell. Identify the organelle labeled **X**.',
        textHi: 'नीचे दिए गए चित्र में पादप कोशिका की संरचना दिखाई गई है। **X** से चिह्नित अंगक को पहचानें।',
        images: [],
        options: [
          { id: genId(), text: 'Mitochondria', isCorrect: false },
          { id: genId(), text: 'Chloroplast', isCorrect: true },
          { id: genId(), text: 'Nucleus', isCorrect: false },
          { id: genId(), text: 'Golgi Body', isCorrect: false },
        ],
        explanation: 'The **chloroplast** is the organelle responsible for photosynthesis in plant cells, containing chlorophyll pigments.',
        tag: 'Biology',
      }),
      createDefaultQuestion(sectionA.id, {
        text: 'Match the following freedom fighters with their associated movements:\n\n| Person | Movement |\n|---|---|\n| A. Mangal Pandey | 1. Quit India |\n| B. Gandhi | 2. Revolt of 1857 |',
        textHi: undefined,
        options: [
          { id: genId(), text: 'A-2, B-1', isCorrect: true },
          { id: genId(), text: 'A-1, B-2', isCorrect: false },
          { id: genId(), text: 'A-1, B-1', isCorrect: false },
          { id: genId(), text: 'A-2, B-2', isCorrect: false },
        ],
        explanation: 'Mangal Pandey is associated with the Revolt of 1857; Gandhi led the Quit India Movement of 1942.',
        tag: 'Modern History',
      }),
      createSampleMathQuestion(sectionB.id),
      createDefaultQuestion(sectionB.id, {
        text: 'A train travels at a speed of $72 \\text{ km/h}$. What distance will it cover in $45$ minutes?\n\n$$\\text{Distance} = \\text{Speed} \\times \\text{Time}$$',
        textHi: 'एक ट्रेन $72$ किमी/घंटा की गति से चलती है। यह $45$ मिनट में कितनी दूरी तय करेगी?',
        options: [
          { id: genId(), text: '$54 \\text{ km}$', isCorrect: true },
          { id: genId(), text: '$45 \\text{ km}$', isCorrect: false },
          { id: genId(), text: '$60 \\text{ km}$', isCorrect: false },
          { id: genId(), text: '$36 \\text{ km}$', isCorrect: false },
        ],
        explanation: 'Speed $= 72 \\text{ km/h} = 20 \\text{ m/s}$. Time $= 45 \\text{ min} = 2700 \\text{ s}$.\n\n$$\\text{Distance} = 20 \\times 2700 = 54000 \\text{ m} = 54 \\text{ km}$$',
        tag: 'Speed, Time & Distance',
        highlighted: true,
      }),
    ],
    customPages: [
      {
        id: genId(),
        title: 'Cover Page Notes',
        content: `**Instructions to Candidates**

- Read all instructions on the reverse of this page carefully before attempting the test.
- This booklet is the property of **Ishuu Sharma** and must be returned after the exam.`,
        position: 'start',
      },
      {
        id: genId(),
        title: 'Answer Key & Feedback',
        content: `Thank you for attempting this mock test.

For detailed solutions, video explanations, and rank analysis, visit **Ishuu Sharma** or join our Telegram community **@Shrma_Ishuu_bot**.`,
        position: 'end',
      },
    ],
    updatedAt: Date.now(),
  };
}
