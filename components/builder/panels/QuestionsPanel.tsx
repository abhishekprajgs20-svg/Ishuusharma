'use client';

import { useMemo, useState } from 'react';
import { useTestStore } from '@/store/testStore';
import { Button, Select, Field } from '../ui';
import QuestionEditor from '../QuestionEditor';
import BulkPasteModal from '../BulkPasteModal';
import { Plus, ClipboardPaste, Search } from 'lucide-react';

export default function QuestionsPanel() {
  const questions = useTestStore((s) => s.doc.questions);
  const sections = useTestStore((s) => s.doc.sections);
  const addQuestion = useTestStore((s) => s.addQuestion);
  const [filterSection, setFilterSection] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (filterSection !== 'all' && q.sectionId !== filterSection) return false;
      if (search && !q.text.toLowerCase().includes(search.toLowerCase()) && !(q.tag || '').toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [questions, filterSection, search]);

  const defaultSection = sections[0]?.id;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 min-w-0">
        <Button variant="primary" onClick={() => defaultSection && addQuestion(defaultSection)} disabled={!defaultSection} className="flex-1 min-w-0">
          <Plus size={15} /> <span className="truncate">Add Question</span>
        </Button>
        <Button variant="secondary" onClick={() => setBulkOpen(true)} disabled={sections.length === 0} className="shrink-0">
          <ClipboardPaste size={15} /> <span className="hidden xs:inline">Bulk Paste</span>
        </Button>
      </div>

      {/* Search + section filter: stacks to two full-width rows below the
          `xs` breakpoint instead of squeezing a fixed-width <select> next
          to the search box — a native <select> doesn't reliably honor a
          narrow declared width on mobile browsers, so at ~320-360px this
          row used to be exactly what forced the whole panel to scroll
          sideways. */}
      <div className="flex flex-col xs:flex-row gap-2 mb-4 min-w-0">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-300 dark:text-ink-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions or tags..."
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-ink-200 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <Select value={filterSection} onChange={(e) => setFilterSection(e.target.value)} className="w-full xs:w-40 xs:shrink-0">
          <option value="all">All sections</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </Select>
      </div>

      <div className="text-[12px] text-ink-400 dark:text-ink-500 font-medium mb-2">
        {filtered.length} of {questions.length} question{questions.length === 1 ? '' : 's'}
      </div>

      {sections.length === 0 && (
        <p className="text-[13px] text-ink-400 dark:text-ink-500 italic py-8 text-center">Create a section first to start adding questions.</p>
      )}

      {filtered.map((q) => {
        const globalIdx = questions.findIndex((qq) => qq.id === q.id);
        return <QuestionEditor key={q.id} question={q} index={globalIdx} />;
      })}

      {bulkOpen && <BulkPasteModal onClose={() => setBulkOpen(false)} />}
    </div>
  );
}
