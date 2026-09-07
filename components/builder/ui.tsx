'use client';

import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { Sun, Moon } from 'lucide-react';

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block mb-3.5">
      <span className="block text-[13px] font-semibold text-ink-700 dark:text-ink-200 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-ink-400 dark:text-ink-500 mt-1">{hint}</span>}
    </label>
  );
}

/**
 * Lays out 2 (or more) fields side-by-side in one row, e.g. "Marks" and
 * "Negative Marks" as A/B in the same row. Genuinely wraps to a single
 * column below the `xs` breakpoint (~420px, narrower than Tailwind's
 * default `sm`) — a fixed `grid-cols-2` with no responsive variant used
 * to force two fields side-by-side even on the narrowest phones, which
 * is a real contributor to the "everything feels squeezed" mobile bug;
 * this is the fix for that.
 */
export function FieldRow({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 }) {
  return (
    <div className={clsx('grid grid-cols-1 gap-3', cols === 2 ? 'xs:grid-cols-2' : 'xs:grid-cols-2 sm:grid-cols-3')}>
      {children}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        'w-full rounded-lg border border-ink-200 dark:border-ink-700 px-3 py-2 text-[14px] text-ink-900 dark:text-ink-100',
        'placeholder:text-ink-300 dark:placeholder:text-ink-600 bg-white dark:bg-ink-800',
        'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition',
        props.className
      )}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        'w-full rounded-lg border border-ink-200 dark:border-ink-700 px-3 py-2 text-[14px] text-ink-900 dark:text-ink-100',
        'placeholder:text-ink-300 dark:placeholder:text-ink-600 bg-white dark:bg-ink-800 resize-y',
        'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition font-mono text-[13px]',
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        'w-full rounded-lg border border-ink-200 dark:border-ink-700 px-3 py-2 text-[14px] text-ink-900 dark:text-ink-100 bg-white dark:bg-ink-800',
        'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition',
        props.className
      )}
    />
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-2 mb-3.5 cursor-pointer select-none">
      <span className="text-[13px] font-semibold text-ink-700 dark:text-ink-200">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative w-10 h-6 rounded-full transition-colors shrink-0',
          checked ? 'bg-brand-500' : 'bg-ink-200 dark:bg-ink-700'
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-4'
          )}
        />
      </button>
    </label>
  );
}

export function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-[15px] font-bold font-display text-ink-900 dark:text-ink-100">{title}</h3>
        {action}
      </div>
      <div className="bg-ink-50 dark:bg-ink-800/60 rounded-xl2 p-4 border border-ink-100 dark:border-ink-700">{children}</div>
    </div>
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' }) {
  return (
    <button
      {...props}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all active:scale-[0.97]',
        size === 'sm' ? 'px-2.5 py-1.5 text-[12.5px]' : 'px-4 py-2 text-[14px]',
        variant === 'primary' && 'bg-brand-500 text-white hover:bg-brand-600 shadow-soft',
        variant === 'secondary' && 'bg-white dark:bg-ink-800 text-ink-700 dark:text-ink-200 border border-ink-200 dark:border-ink-700 hover:bg-ink-50 dark:hover:bg-ink-700',
        variant === 'ghost' && 'text-ink-500 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800',
        variant === 'danger' && 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40',
        props.disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    />
  );
}

export function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-10 rounded-lg border border-ink-200 dark:border-ink-700 cursor-pointer bg-white dark:bg-ink-800"
      />
      <TextInput value={value} onChange={(e) => onChange(e.target.value)} className="font-mono" />
    </div>
  );
}

/** Sun/moon toggle for light/dark mode. Persists to localStorage and
 * flips the `dark` class on <html> (Tailwind's darkMode:'class'). Only
 * the builder UI chrome uses dark: variants — the A4 print preview and
 * everything under #print-root stays pinned to white/black always,
 * since that's what actually prints and what the paper looks like. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('chillax-theme') : null;
    const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const initialDark = stored ? stored === 'dark' : !!prefersDark;
    setDark(initialDark);
    document.documentElement.classList.toggle('dark', initialDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('chillax-theme', next ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="w-8 h-8 rounded-lg border border-ink-200 dark:border-ink-700 shrink-0 shadow-soft flex items-center justify-center bg-white dark:bg-ink-800 hover:border-brand-400 transition text-ink-500 dark:text-ink-300"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  );
}

/** Compact swatch + native color input, sized for a header bar. Clicking
 * the swatch opens the browser's native color picker directly (the real
 * <input type=color> is layered invisibly on top), so there's no popover
 * to build or click-outside logic to manage. */
export function HeaderColorSwatch({ value, onChange, title }: { value: string; onChange: (v: string) => void; title?: string }) {
  return (
    <div
      className="relative w-8 h-8 rounded-lg border border-ink-200 shrink-0 shadow-soft overflow-hidden"
      style={{ background: value }}
      title={title || 'Accent color'}
    >
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  );
}

export function ImageDropZone({
  value,
  onChange,
  label,
}: {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  label: string;
}) {
  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <span className="block text-[13px] font-semibold text-ink-700 mb-1.5">{label}</span>
      {value ? (
        <div className="relative group">
          <img src={value} alt={label} className="max-h-24 rounded-lg border border-ink-200 object-contain bg-white p-2" />
          <button
            onClick={() => onChange(undefined)}
            className="absolute top-1 right-1 bg-white/90 rounded-full p-1 text-red-500 opacity-0 group-hover:opacity-100 transition shadow-soft text-[11px] px-2"
            type="button"
          >
            Remove
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-20 rounded-lg border-2 border-dashed border-ink-200 cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition text-ink-400 text-[12.5px]">
          <span>Click to upload</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
      )}
    </div>
  );
}
