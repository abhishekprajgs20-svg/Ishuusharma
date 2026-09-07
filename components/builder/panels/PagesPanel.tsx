'use client';

import { useTestStore } from '@/store/testStore';
import { Field, TextInput, TextArea, SectionCard, Button } from '../ui';
import { Trash2, Plus } from 'lucide-react';

export default function PagesPanel() {
  const customPages = useTestStore((s) => s.doc.customPages);
  const addCustomPage = useTestStore((s) => s.addCustomPage);
  const updateCustomPage = useTestStore((s) => s.updateCustomPage);
  const removeCustomPage = useTestStore((s) => s.removeCustomPage);

  const startPages = customPages.filter((p) => p.position === 'start');
  const endPages = customPages.filter((p) => p.position === 'end');

  const renderPage = (p: (typeof customPages)[number]) => (
    <div key={p.id} className="bg-white dark:bg-ink-900 rounded-lg border border-ink-200 dark:border-ink-700 p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <TextInput
          value={p.title}
          onChange={(e) => updateCustomPage(p.id, { title: e.target.value })}
          className="font-semibold flex-1 mr-2"
        />
        <button onClick={() => removeCustomPage(p.id)} className="text-red-400 dark:text-red-400/80 hover:text-red-600 dark:hover:text-red-400 p-1.5 shrink-0">
          <Trash2 size={16} />
        </button>
      </div>
      <TextArea rows={6} value={p.content} onChange={(e) => updateCustomPage(p.id, { content: e.target.value })} />
    </div>
  );

  return (
    <div>
      <SectionCard
        title="Starter Pages"
        action={
          <Button size="sm" variant="secondary" onClick={() => addCustomPage('start')}>
            <Plus size={13} /> Add
          </Button>
        }
      >
        <p className="text-[12px] text-ink-500 dark:text-ink-400 mb-3">
          Appear right after the cover page, before the Instructions page. Great for booklet notes, terms, or a custom message.
        </p>
        {startPages.length === 0 && <p className="text-[12.5px] text-ink-400 dark:text-ink-500 italic">No starter pages yet.</p>}
        {startPages.map(renderPage)}
      </SectionCard>

      <SectionCard
        title="End Pages"
        action={
          <Button size="sm" variant="secondary" onClick={() => addCustomPage('end')}>
            <Plus size={13} /> Add
          </Button>
        }
      >
        <p className="text-[12px] text-ink-500 dark:text-ink-400 mb-3">
          Appear at the very end of the booklet, after solutions. Great for answer-key summaries, feedback links, or branding.
        </p>
        {endPages.length === 0 && <p className="text-[12.5px] text-ink-400 dark:text-ink-500 italic">No end pages yet.</p>}
        {endPages.map(renderPage)}
      </SectionCard>
    </div>
  );
}
