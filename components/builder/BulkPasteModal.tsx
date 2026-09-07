'use client';

import { useRef, useState } from 'react';
import { X, Copy, Check, FileUp } from 'lucide-react';
import { BULK_TEMPLATE, parseBulkQuestions } from '@/lib/bulkParser';
import { useTestStore } from '@/store/testStore';
import { Button, TextArea, Select, Field } from './ui';

export default function BulkPasteModal({ onClose }: { onClose: () => void }) {
  const sections = useTestStore((s) => s.doc.sections);
  const bulkImportQuestions = useTestStore((s) => s.bulkImportQuestions);
  const [sectionId, setSectionId] = useState(sections[0]?.id || '');
  const [raw, setRaw] = useState('');
  const [copied, setCopied] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(BULK_TEMPLATE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const handleParse = (text: string = raw) => {
    const parsed = parseBulkQuestions(text);
    setPreviewCount(parsed.length);
    return parsed;
  };

  // Lets the user pick a .txt/.md file straight from disk instead of
  // copy-pasting — same bulk format, just loaded from a file. Reads it as
  // plain text (works fine for .md too, since parseBulkQuestions already
  // expects markdown-flavored text) and immediately runs Preview so the
  // detected-question-count feedback shows right away, same as manual paste.
  const handleFilePicked = async (file: File) => {
    setFileError(null);
    const name = file.name.toLowerCase();
    if (!name.endsWith('.txt') && !name.endsWith('.md')) {
      setFileError('Only .txt or .md files are supported.');
      return;
    }
    try {
      const text = await file.text();
      setRaw(text);
      handleParse(text);
    } catch {
      setFileError('Could not read that file — please try again.');
    }
  };

  const handleImport = () => {
    const parsed = parseBulkQuestions(raw);
    if (parsed.length === 0 || !sectionId) return;
    bulkImportQuestions(sectionId, parsed);
    onClose();
  };

  const handlePreviewClick = () => handleParse();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-ink-900 rounded-xl2 shadow-card max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-slide-up min-w-0">
        <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-ink-200 dark:border-ink-700 min-w-0">
          <h2 className="font-display font-bold text-[15px] sm:text-[16px] text-ink-900 dark:text-ink-100 truncate">Bulk Paste Questions</h2>
          <button onClick={onClose} className="text-ink-400 dark:text-ink-500 hover:text-ink-700 dark:hover:text-ink-200 p-1 shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto overflow-x-hidden styled-scroll flex-1 min-w-0">
          <div className="bg-brand-50 dark:bg-brand-500/10 rounded-lg p-3 mb-4 text-[12.5px] text-ink-600 dark:text-ink-200 leading-relaxed">
            Paste multiple questions using the template format below. Supports <strong>markdown</strong>, GFM tables, $inline
            math$ and $$block math$$. Separate questions with a line of three dashes (<code>---</code>).
            <button
              onClick={handleCopyTemplate}
              className="ml-2 inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 font-semibold hover:underline"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied!' : 'Copy template'}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="ml-2 inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 font-semibold hover:underline"
            >
              <FileUp size={13} /> Upload .txt / .md file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFilePicked(f);
                e.target.value = '';
              }}
            />
          </div>

          {fileError && (
            <div className="text-[12.5px] font-medium text-red-600 dark:text-red-400 mb-3 -mt-2">{fileError}</div>
          )}

          <Field label="Import Into Section">
            <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Paste Your Questions">
            <TextArea
              rows={14}
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value);
                setPreviewCount(null);
                setFileError(null);
              }}
              placeholder={BULK_TEMPLATE}
            />
          </Field>

          {previewCount !== null && (
            <div className="text-[13px] font-medium text-brand-600 dark:text-brand-400 mb-2">
              Detected {previewCount} question{previewCount === 1 ? '' : 's'} ready to import.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 sm:px-5 py-3.5 sm:py-4 border-t border-ink-200 dark:border-ink-700 bg-ink-50 dark:bg-ink-800">
          <Button variant="secondary" onClick={handlePreviewClick} disabled={!raw.trim()} className="flex-1 sm:flex-none">
            Preview
          </Button>
          <Button variant="primary" onClick={handleImport} disabled={!raw.trim() || !sectionId} className="flex-1 sm:flex-none">
            Import Questions
          </Button>
        </div>
      </div>
    </div>
  );
}
