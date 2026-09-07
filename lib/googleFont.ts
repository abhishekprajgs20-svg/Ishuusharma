// Dynamic Google Font loading — what makes "type the exact font name from
// Google Fonts" actually work for both the primary and secondary (Hindi,
// Tamil, Bengali, Urdu, or any other Indic/Arabic-script language) text,
// without a build step, an API key, or bundling a font file per language.
//
// Google Fonts' CSS2 endpoint (https://fonts.googleapis.com/css2?family=...)
// is public and free — no key needed. Given a family name it returns a
// stylesheet of @font-face rules; injecting a <link> to it is exactly what
// fonts.google.com's own "embed" instructions tell you to do. Because this
// runs in the live document (not at build time), the SAME loaded font is
// still present when window.print() fires — print never gets a separate
// page load, so nothing extra is needed to make it "work in the PDF too".

'use client';

import { useEffect } from 'react';

/** Turns a user-typed family name into the CSS2 API URL. Spaces become
 * '+' per Google's own convention; everything else is left for
 * encodeURIComponent to escape safely. Requests weights 400/500/600/700
 * so Bold/Bold+accent emphasis (which just sets font-weight) has a real
 * bold face to switch to instead of the browser faking one. */
function googleFontUrl(familyName: string): string {
  const family = familyName.trim().replace(/\s+/g, '+');
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%2B/g, '+')}:wght@400;500;600;700&display=swap`;
}

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/** Injects (once) a <link rel="stylesheet"> for the given Google Font
 * family name, so it becomes available to any `font-family` that
 * references it — anywhere in the document, including print. Safe to
 * call with the same name repeatedly (it's a no-op after the first
 * successful injection per name) and safe to call with an empty/invalid
 * name (does nothing). Never removes a previously-loaded font — the user
 * may still have text using it even after changing the setting, and an
 * extra harmless <link> costs nothing. */
export function useGoogleFont(familyName: string | undefined | null) {
  useEffect(() => {
    const name = familyName?.trim();
    if (!name) return;
    const id = `google-font-${slugify(name)}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = googleFontUrl(name);
    document.head.appendChild(link);
  }, [familyName]);
}

/** Resolves the actual CSS font-family value for the PRIMARY language,
 * given the layout's fontFamily choice. Falls back to Inter whenever a
 * custom name is chosen but left blank, so an incomplete setting never
 * makes text disappear. */
export function primaryFontCssFamily(
  fontFamily: string,
  customFontName: string | undefined,
  builtins: Record<string, { cssFamily: string }>
): string {
  if (fontFamily === 'google-custom') {
    const name = customFontName?.trim();
    if (name) return `'${name}', ${builtins.inter.cssFamily}`;
    return builtins.inter.cssFamily;
  }
  return builtins[fontFamily]?.cssFamily || builtins.inter.cssFamily;
}

const DEVANAGARI_STACK = "'Noto Sans Devanagari', 'Inter', sans-serif";

/** Resolves the actual CSS font-family value for the SECONDARY (translated)
 * language. 'devanagari' is the one bundled-offline option (works with no
 * network at all — matches the pre-existing .font-devanagari behavior);
 * 'same-as-primary' just reuses whatever the primary font resolves to;
 * 'google-custom' uses whatever exact name the user typed, so ANY
 * language Google Fonts covers works, not only Hindi. */
export function secondaryFontCssFamily(
  secondaryFontChoice: string,
  secondaryCustomFontName: string | undefined,
  primaryResolved: string
): string {
  if (secondaryFontChoice === 'google-custom') {
    const name = secondaryCustomFontName?.trim();
    if (name) return `'${name}', ${DEVANAGARI_STACK}`;
    return DEVANAGARI_STACK;
  }
  if (secondaryFontChoice === 'same-as-primary') return primaryResolved;
  return DEVANAGARI_STACK;
}
