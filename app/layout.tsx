import type { Metadata, Viewport } from 'next';
// Self-hosted from the katex npm package (bundled by Next.js, fonts
// included) rather than a CDN <link>. This keeps math rendering fully
// working offline / behind restrictive network policies, and avoids any
// scenario where a blocked or slow CDN silently leaves KaTeX's
// accessibility-only MathML tree unstyled (which visually looks like
// doubled text sitting next to the real rendered math).
import 'katex/dist/katex.min.css';

// Body/heading/Devanagari fonts, also self-hosted via @fontsource instead
// of a Google Fonts <link> tag. Two independent reasons: (1) a blocked or
// slow font CDN (some networks/sandboxes block fonts.googleapis.com
// outright) used to leave the whole app silently rendering in a fallback
// system font with no visual indication anything was wrong; (2) the
// Instant Download export rasterises the live page with html2canvas,
// which is measurably less reliable at glyph metrics/kerning against a
// CDN font that may still be mid-fetch at capture time than against a
// font that's already a same-origin, bundled static asset by the time the
// page paints.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/sora/400.css';
import '@fontsource/sora/600.css';
import '@fontsource/sora/700.css';
import '@fontsource/sora/800.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/noto-sans-devanagari/400.css';
import '@fontsource/noto-sans-devanagari/500.css';
import '@fontsource/noto-sans-devanagari/600.css';
import '@fontsource/noto-sans-devanagari/700.css';

import './globals.css';

export const metadata: Metadata = {
  title: 'Ishuu Sharma — Mock Test Generator',
  description: 'Professional bilingual mock test series generator. Fully customizable, live A4 preview, GFM + LaTeX math, instant PDF export.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#3d4bfa',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
