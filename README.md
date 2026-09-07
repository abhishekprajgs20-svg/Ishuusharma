# Mock Test Series Generator

A professional, fully customizable mock test / question-booklet generator built with Next.js 14 (App Router) + TypeScript + Tailwind CSS. Live A4 print-accurate preview, bilingual question support (any language pair, not just Hindi), full GFM Markdown + LaTeX math (via KaTeX), per-question images, and instant one-click PDF download — no server, no external PDF service, everything runs in the browser.

**Live demo:** [Ishuu Sharma](https://t.me/Shrma_Ishuu_bot)
**Telegram:** [RestBots](https://t.me/restbots)

As far as the author is aware, nothing quite like this exists elsewhere on GitHub as a free, open-source project — most tools in this space (mock-test/question-paper builders for competitive exams) are closed-source SaaS products. This is built specifically for teachers, coaching institutes, and developers who want to run their own, for free, and modify it however they need.

## Why this exists

Coaching institutes and independent teachers across India spend real money every month on closed, subscription-gated tools just to typeset a bilingual question paper with math and get a clean PDF out of it. This project does the same job — live print-accurate preview, bilingual layout, LaTeX math, bulk import, branding — entirely in the browser, for free, and the full source is here for anyone to self-host, extend, or build on top of.

## Features

- **Live A4 preview that matches print exactly.** The builder renders true-to-size A4 sheets on screen using real millimeter dimensions. Every question is measured (actual rendered height, not guessed) and auto-paginated across pages and two-column layout, so nothing is ever cut off — a question that doesn't fit cleanly moves whole to the next column/page.
- **Instant PDF download.** The Download button uses the browser's native print engine (`window.print()` → Save as PDF) against a dedicated print stylesheet that is pixel-identical to the live preview. No Puppeteer, no server-side rendering, no extra dependency — works offline.
- **Bilingual questions, any language pair.** Every question, option, and explanation can carry a primary and a secondary-language variant, shown stacked or independently. The secondary language isn't hardcoded to Hindi — label it and font it as Tamil, Bengali, Urdu, or anything else you need, with Google Fonts loaded dynamically for whichever script you pick.
- **Full Markdown + LaTeX support (GFM).** Question text, options, and explanations support bold/italic, GFM tables (handy for "Match the Following" questions), numbered statement/assertion lists, and math via `$inline$` and `$$block$$` LaTeX, rendered with KaTeX (self-hosted, works offline).
- **Per-question control.** Attach images to the question stem or to individual options, mark the correct option, highlight/bold a question, override marks/negative-marks, and choose where its solution appears — inline right after the question, in an answer-key section at the end, or hidden entirely. This can be set globally, per-section, or per-question (most specific wins).
- **Bulk paste, from text or file.** Paste many questions at once using a simple, documented plain-text template (see the in-app "Bulk Paste" modal, or `lib/bulkParser.ts`), or upload a `.txt`/`.md` file in the same format — instead of adding every question one by one. Supports assertion/statement-style questions, an inline ✅ correct-answer marker, and either `---` or a blank line to separate questions.
- **Slide-style PDF export.** Turn the same question set into a separate, landscape "one question per slide" PDF (`components/SlidePrintView.tsx`) — big, whiteboard-style layout with a configurable color scheme, optional answer reveal, and explanation slides. Independent print target from the main A4 exam-paper export, so it never affects it.
- **Deep customization.** Institute name/logo/watermark, address, accent color, roll-number grid, signature boxes, custom header/footer text with placeholders (`{{testName}}`, `{{page}}`, `{{totalPages}}`, etc.), custom starter and end pages, section-level marking schemes and page breaks, font size/line height, 1 or 2 column layout, and option label style (A/B/C/D, I/II/III/IV, or 1/2/3/4).
- **App-like mobile UI.** A bottom navigation bar switches between the editor panels and the live preview, so the whole builder is usable on a phone.
- **Everything local.** All test data is held in the browser and persisted to IndexedDB — no backend, no account, no data leaves the device. Refreshing the page does not lose your work.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

To build for production:

```bash
npm run build
npm start
```

This is a static-data, client-only app (no API routes, no database), so it deploys anywhere Next.js can run.

## Deployment

### Vercel / Netlify (easiest)

Push this repo to GitHub and import it directly — both platforms auto-detect Next.js, run `npm run build`, and need no configuration or environment variables.

### Heroku

A `Procfile` is already included (`web: next start -p $PORT`) along with an `engines` field in `package.json`, so Heroku's Node buildpack picks it up automatically:

```bash
heroku create your-app-name
git push heroku main
```

That's it — no config vars needed, since the app has no backend/database.

### VPS (your own server, e.g. DigitalOcean/Hetzner/AWS EC2)

```bash
git clone <your-fork-url>
cd chill2-fx3
npm install
npm run build
```

Then run it under a process manager so it survives reboots/crashes, e.g. with PM2:

```bash
npm install -g pm2
pm2 start "npm start" --name mock-test-generator
pm2 save
```

Put Nginx (or Caddy) in front as a reverse proxy to `localhost:3000` for TLS/domain routing.

### Any other Next.js-supporting host (Railway, Render, Fly.io, etc.)

The app needs nothing beyond `npm install && npm run build` then `npm start` (respecting the `$PORT` env var, which `next start` already reads automatically) — any host that runs a standard Next.js app works with zero extra configuration.

## Bulk paste template

Open the "Bulk Paste" button inside the Questions panel to get a "Copy template" button and a ".txt / .md file upload" option, or use this format directly:

```
Q1) Which of the following rivers is known as the "Sorrow of Bihar"?
HI) निम्नलिखित में से किस नदी को "बिहार का शोक" कहा जाता है?
A) Ganga
B) Kosi
C) Son
D) Gandak
Ans: B
Sol: The Kosi river is called the "Sorrow of Bihar" due to its frequent floods.
Tag: Geography
---
Q2) With reference to the causes of the 1857 Revolt, which of the following statements are correct?
1. The "General Service Enlistment Act" required sepoys to serve overseas, which conflicted with religious beliefs regarding "crossing the black water."
2. The Annexation of Awadh by Lord Dalhousie on grounds of "misgovernment" deeply hurt the sentiments of the sepoys.
3. The Lex Loci Act of 1850 allowed Christian converts to inherit ancestral property, causing resentment.
A) 1 and 2 only
B) 2 and 3 only
C) 1 and 3 only
D) 1, 2, and 3 ✅
Ex: All three were significant triggers behind the revolt.
```

- `Q1)` / `Q1.` / `Q1:` — question text (markdown + `$LaTeX$` + GFM tables supported). Any plain numbered line (`1.` `2.` `3.` ...) that follows is treated as more question-stem text, so assertion/statement-style questions and "Match the Following" tables just work.
- `HI)` — optional secondary-language translation of the question
- `A) B) C) D)` — options (up to 6, `A`–`F`). A trailing ✅ / ✔ / ✓ on an option line marks it correct inline, instead of a separate `Ans:` line.
- `Ans:` — correct option letter, or the option's exact text (alternative to the ✅ marker above)
- `Sol:` / `Ex:` — explanation/solution (optional, can span multiple lines; `Ex:`/`Explanation:` are accepted as aliases of `Sol:`/`Solution:`)
- `SolHi:` — optional secondary-language explanation
- `Tag:` — topic tag (optional)
- Questions are separated either by a `---` line, or simply by a blank line before the next `Q...)` — whichever you naturally type.

## Project structure

```
app/                    Next.js App Router pages, global styles (incl. print CSS)
components/             Shared rendering components (question blocks, cover page, live preview engine)
components/builder/     The builder UI: sidebar, panels, question editor, bulk-paste modal
lib/                    Types, default/seed data, bulk-paste parser, pagination engine
store/                  Zustand store (single source of truth, persisted to IndexedDB)
```

### How live pagination works (`lib/paginate.ts`, `components/LivePreview.tsx`)

Rather than estimating text height mathematically (unreliable with variable-length math/images), every question/section/solution block is first rendered off-screen at the real column width, its actual rendered height is measured via `getBoundingClientRect`, and a greedy bin-packing pass then decides which page/column each block lands in. A block that doesn't fit in the remaining space moves whole to the next column or page — questions are never split mid-content. This measurement re-runs automatically whenever you edit any part of the test.

### How PDF export works

The Download button calls `window.print()`. The `@media print` stylesheet in `app/globals.css` neutralizes the on-screen scroll/zoom wrapper and reuses the exact same `.a4-sheet` page geometry as the live preview, with `page-break-after: always` between sheets — so what you see in the live preview is exactly what gets printed / saved as PDF.

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Zustand (state) + idb-keyval (IndexedDB persistence)
- react-markdown + remark-gfm + remark-math + rehype-katex (Markdown + LaTeX rendering)
- KaTeX (self-hosted CSS/fonts via the npm package — no CDN dependency)
- lucide-react (icons)

## Contributing

Issues and pull requests are welcome — this is meant to be a community-maintained tool, not a one-person project. If you build a feature coaching institutes or teachers need, send it in.

## Support this project

If this saves you or your institute money on paid test-generator tools, consider buying the maintainer a coffee — it directly funds continued development and keeping this free and open-source.

- **BTC:** `12ufT9Vm5UqxqrnxJ3FAES6PrjoX6KNJfQ`
- **ETH:** `0x5d4c4f0d05ed05e0673b5e0c2275ee1b204e0fdc`
- *USDT:** `TQ7CFhQVsv7XwUdaZmp5ixz41LbppB4TkM`

## License

MIT — see [LICENSE](./LICENSE). Free to use, modify, and self-host for personal or commercial use (including at your own coaching institute), with attribution.

---

## Originally built by Gagan (year 2024) fixed and modified by Claude Agentic AI.
