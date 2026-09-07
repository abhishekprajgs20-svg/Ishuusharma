'use client';

import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { genId, createDefaultDocument, createDefaultQuestion, createDefaultSection } from '@/lib/defaults';
import type {
  TestDocument,
  Section,
  Question,
  QOption,
  CustomPage,
  BrandingSettings,
  HeaderFooterSettings,
  LayoutSettings,
  SlideSettings,
  TestMeta,
} from '@/lib/types';

const STORAGE_KEY = 'chillax-mock-test-doc-v1';
let saveTimer: ReturnType<typeof setTimeout> | null = null;

// Backfills fields added after a document may have been saved (e.g. layout's
// solutionBoxStyle/questionTextEmphasis, or the whole slideSettings object
// for PPT export) so an older saved test hydrates with sane defaults
// instead of `undefined` silently breaking the new feature. Add a line
// here whenever LayoutSettings/SlideSettings grows a required field —
// cheaper and safer than a full migration system for flat settings objects.
function withLayoutDefaults(doc: TestDocument): TestDocument {
  const defaults = createDefaultDocument();

  // Migrate the old 3-way `language` enum (removed from LayoutSettings —
  // see the type's own comment) to the new independent
  // showPrimaryLanguage/showSecondaryLanguage booleans, for any document
  // saved before this change. Only runs when the OLD field is present and
  // the NEW fields aren't, so it's a no-op for every document already on
  // the new shape.
  const rawLayout = doc.layout as unknown as { language?: 'en' | 'hi' | 'bilingual' } & typeof doc.layout;
  let migratedLayout = doc.layout;
  if (rawLayout?.language && migratedLayout.showPrimaryLanguage === undefined) {
    const oldLang = rawLayout.language;
    migratedLayout = {
      ...migratedLayout,
      showPrimaryLanguage: oldLang !== 'hi',
      showSecondaryLanguage: oldLang === 'hi' || oldLang === 'bilingual',
    };
  }

  return {
    ...doc,
    layout: { ...defaults.layout, ...migratedLayout },
    slideSettings: { ...defaults.slideSettings, ...doc.slideSettings },
  };
}

interface TestStore {
  doc: TestDocument;
  hydrated: boolean;
  activeQuestionId: string | null;
  hydrate: () => Promise<void>;

  updateMeta: (patch: Partial<TestMeta>) => void;
  updateBranding: (patch: Partial<BrandingSettings>) => void;
  updateHeaderFooter: (patch: Partial<HeaderFooterSettings>) => void;
  updateLayout: (patch: Partial<LayoutSettings>) => void;
  updateSlideSettings: (patch: Partial<SlideSettings>) => void;

  addSection: () => string;
  updateSection: (id: string, patch: Partial<Section>) => void;
  removeSection: (id: string) => void;
  duplicateSection: (id: string) => void;
  reorderSections: (fromIdx: number, toIdx: number) => void;

  addQuestion: (sectionId: string, atIndex?: number) => string;
  duplicateQuestion: (id: string) => void;
  updateQuestion: (id: string, patch: Partial<Question>) => void;
  removeQuestion: (id: string) => void;
  reorderQuestion: (fromIdx: number, toIdx: number) => void;
  moveQuestionToSection: (id: string, sectionId: string) => void;
  setActiveQuestion: (id: string | null) => void;

  addOption: (questionId: string) => void;
  updateOption: (questionId: string, optionId: string, patch: Partial<QOption>) => void;
  removeOption: (questionId: string, optionId: string) => void;
  setCorrectOption: (questionId: string, optionId: string) => void;

  addCustomPage: (position: 'start' | 'end') => void;
  updateCustomPage: (id: string, patch: Partial<CustomPage>) => void;
  removeCustomPage: (id: string) => void;

  bulkImportQuestions: (sectionId: string, parsed: Partial<Question>[]) => void;
  resetDocument: () => void;
  importDocument: (doc: TestDocument) => void;
}

function persist(doc: TestDocument) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    idbSet(STORAGE_KEY, doc).catch(() => {});
  }, 400);
}

export const useTestStore = create<TestStore>((set, get) => ({
  doc: createDefaultDocument(),
  hydrated: false,
  activeQuestionId: null,

  hydrate: async () => {
    try {
      const saved = await idbGet<TestDocument>(STORAGE_KEY);
      if (saved && saved.meta) {
        set({ doc: withLayoutDefaults(saved), hydrated: true });
        return;
      }
    } catch {
      /* ignore, fall back to default */
    }
    set({ hydrated: true });
  },

  updateMeta: (patch) =>
    set((s) => {
      const doc = { ...s.doc, meta: { ...s.doc.meta, ...patch }, updatedAt: Date.now() };
      persist(doc);
      return { doc };
    }),

  updateBranding: (patch) =>
    set((s) => {
      const doc = { ...s.doc, branding: { ...s.doc.branding, ...patch }, updatedAt: Date.now() };
      persist(doc);
      return { doc };
    }),

  updateHeaderFooter: (patch) =>
    set((s) => {
      const doc = { ...s.doc, headerFooter: { ...s.doc.headerFooter, ...patch }, updatedAt: Date.now() };
      persist(doc);
      return { doc };
    }),

  updateLayout: (patch) =>
    set((s) => {
      const doc = { ...s.doc, layout: { ...s.doc.layout, ...patch }, updatedAt: Date.now() };
      persist(doc);
      return { doc };
    }),

  updateSlideSettings: (patch) =>
    set((s) => {
      const doc = { ...s.doc, slideSettings: { ...s.doc.slideSettings, ...patch }, updatedAt: Date.now() };
      persist(doc);
      return { doc };
    }),

  addSection: () => {
    const newSection = createDefaultSection({ title: `Section ${get().doc.sections.length + 1}`, titleHi: '' });
    set((s) => {
      const doc = { ...s.doc, sections: [...s.doc.sections, newSection], updatedAt: Date.now() };
      persist(doc);
      return { doc };
    });
    return newSection.id;
  },

  updateSection: (id, patch) =>
    set((s) => {
      const doc = {
        ...s.doc,
        sections: s.doc.sections.map((sec) => (sec.id === id ? { ...sec, ...patch } : sec)),
        updatedAt: Date.now(),
      };
      persist(doc);
      return { doc };
    }),

  removeSection: (id) =>
    set((s) => {
      const doc = {
        ...s.doc,
        sections: s.doc.sections.filter((sec) => sec.id !== id),
        questions: s.doc.questions.filter((q) => q.sectionId !== id),
        updatedAt: Date.now(),
      };
      persist(doc);
      return { doc };
    }),

  duplicateSection: (id) =>
    set((s) => {
      const idx = s.doc.sections.findIndex((sec) => sec.id === id);
      if (idx === -1) return s;
      const original = s.doc.sections[idx];
      const clone: Section = { ...original, id: genId(), title: `${original.title} (Copy)` };
      const sections = [...s.doc.sections];
      sections.splice(idx + 1, 0, clone);

      // duplicate this section's questions too, so "duplicate section"
      // gives a genuinely independent copy rather than an empty shell
      const sectionQuestions = s.doc.questions.filter((q) => q.sectionId === id);
      const clonedQuestions = sectionQuestions.map((q) => ({
        ...q,
        id: genId(),
        sectionId: clone.id,
        options: q.options.map((o) => ({ ...o, id: genId() })),
        images: q.images.map((im) => ({ ...im, id: genId() })),
      }));

      const doc = {
        ...s.doc,
        sections,
        questions: [...s.doc.questions, ...clonedQuestions],
        updatedAt: Date.now(),
      };
      persist(doc);
      return { doc };
    }),

  reorderSections: (fromIdx, toIdx) =>
    set((s) => {
      const sections = [...s.doc.sections];
      const [moved] = sections.splice(fromIdx, 1);
      sections.splice(toIdx, 0, moved);
      const doc = { ...s.doc, sections, updatedAt: Date.now() };
      persist(doc);
      return { doc };
    }),

  addQuestion: (sectionId, atIndex) => {
    const q = createDefaultQuestion(sectionId, {
      text: 'New question text — type here. Supports **markdown**, $inline math$ and $$block math$$.',
      textHi: '',
      images: [],
      explanation: '',
      tag: '',
    });
    set((s) => {
      const questions = [...s.doc.questions];
      if (typeof atIndex === 'number') {
        questions.splice(atIndex, 0, q);
      } else {
        questions.push(q);
      }
      const doc = { ...s.doc, questions, updatedAt: Date.now() };
      persist(doc);
      return { doc, activeQuestionId: q.id };
    });
    return q.id;
  },

  duplicateQuestion: (id) =>
    set((s) => {
      const idx = s.doc.questions.findIndex((q) => q.id === id);
      if (idx === -1) return s;
      const original = s.doc.questions[idx];
      const clone: Question = {
        ...original,
        id: genId(),
        options: original.options.map((o) => ({ ...o, id: genId() })),
        images: original.images.map((im) => ({ ...im, id: genId() })),
      };
      const questions = [...s.doc.questions];
      questions.splice(idx + 1, 0, clone);
      const doc = { ...s.doc, questions, updatedAt: Date.now() };
      persist(doc);
      return { doc };
    }),

  updateQuestion: (id, patch) =>
    set((s) => {
      const doc = {
        ...s.doc,
        questions: s.doc.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
        updatedAt: Date.now(),
      };
      persist(doc);
      return { doc };
    }),

  removeQuestion: (id) =>
    set((s) => {
      const doc = { ...s.doc, questions: s.doc.questions.filter((q) => q.id !== id), updatedAt: Date.now() };
      persist(doc);
      return { doc, activeQuestionId: s.activeQuestionId === id ? null : s.activeQuestionId };
    }),

  reorderQuestion: (fromIdx, toIdx) =>
    set((s) => {
      const questions = [...s.doc.questions];
      const [moved] = questions.splice(fromIdx, 1);
      questions.splice(toIdx, 0, moved);
      const doc = { ...s.doc, questions, updatedAt: Date.now() };
      persist(doc);
      return { doc };
    }),

  moveQuestionToSection: (id, sectionId) =>
    set((s) => {
      const doc = {
        ...s.doc,
        questions: s.doc.questions.map((q) => (q.id === id ? { ...q, sectionId } : q)),
        updatedAt: Date.now(),
      };
      persist(doc);
      return { doc };
    }),

  setActiveQuestion: (id) => set({ activeQuestionId: id }),

  addOption: (questionId) =>
    set((s) => {
      const doc = {
        ...s.doc,
        questions: s.doc.questions.map((q) =>
          q.id === questionId ? { ...q, options: [...q.options, { id: genId(), text: 'New option', isCorrect: false }] } : q
        ),
        updatedAt: Date.now(),
      };
      persist(doc);
      return { doc };
    }),

  updateOption: (questionId, optionId, patch) =>
    set((s) => {
      const doc = {
        ...s.doc,
        questions: s.doc.questions.map((q) =>
          q.id === questionId
            ? { ...q, options: q.options.map((o) => (o.id === optionId ? { ...o, ...patch } : o)) }
            : q
        ),
        updatedAt: Date.now(),
      };
      persist(doc);
      return { doc };
    }),

  removeOption: (questionId, optionId) =>
    set((s) => {
      const doc = {
        ...s.doc,
        questions: s.doc.questions.map((q) =>
          q.id === questionId ? { ...q, options: q.options.filter((o) => o.id !== optionId) } : q
        ),
        updatedAt: Date.now(),
      };
      persist(doc);
      return { doc };
    }),

  setCorrectOption: (questionId, optionId) =>
    set((s) => {
      const doc = {
        ...s.doc,
        questions: s.doc.questions.map((q) =>
          q.id === questionId
            ? { ...q, options: q.options.map((o) => ({ ...o, isCorrect: o.id === optionId })) }
            : q
        ),
        updatedAt: Date.now(),
      };
      persist(doc);
      return { doc };
    }),

  addCustomPage: (position) =>
    set((s) => {
      const page: CustomPage = {
        id: genId(),
        title: position === 'start' ? 'New Start Page' : 'New End Page',
        content: 'Add your content here. Supports **markdown**.',
        position,
      };
      const doc = { ...s.doc, customPages: [...s.doc.customPages, page], updatedAt: Date.now() };
      persist(doc);
      return { doc };
    }),

  updateCustomPage: (id, patch) =>
    set((s) => {
      const doc = {
        ...s.doc,
        customPages: s.doc.customPages.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        updatedAt: Date.now(),
      };
      persist(doc);
      return { doc };
    }),

  removeCustomPage: (id) =>
    set((s) => {
      const doc = { ...s.doc, customPages: s.doc.customPages.filter((p) => p.id !== id), updatedAt: Date.now() };
      persist(doc);
      return { doc };
    }),

  bulkImportQuestions: (sectionId, parsed) =>
    set((s) => {
      const newQs: Question[] = parsed.map((p) =>
        createDefaultQuestion(sectionId, { ...p, id: genId() } as Partial<Question>)
      );
      const doc = { ...s.doc, questions: [...s.doc.questions, ...newQs], updatedAt: Date.now() };
      persist(doc);
      return { doc };
    }),

  resetDocument: () => {
    const doc = createDefaultDocument();
    persist(doc);
    set({ doc, activeQuestionId: null });
  },

  importDocument: (doc) => {
    persist(doc);
    set({ doc, activeQuestionId: null });
  },
}));
