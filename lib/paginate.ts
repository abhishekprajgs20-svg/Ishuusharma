// Live pagination engine — fragment-based.
//
// Earlier version measured each QUESTION as one atomic block and placed it
// whole or deferred it whole to the next column/page. That's what caused
// visible blank space on large papers: a question that didn't quite fit
// the remaining column height got deferred entirely, leaving the leftover
// room empty, and there was no way for a question to ever continue across
// a break the way it does in a real printed exam.
//
// This version bin-packs FRAGMENTS instead (see components/QuestionFragments.tsx
// for how a question is split into a stem + one fragment per option + an
// optional inline-solution fragment). Fragments are placed strictly in
// order and never reordered, so a question's fragments always still read
// top-to-bottom, left-to-right — but the packer is now free to fill a
// column right up to its last few millimetres with the stem + first two
// options, and continue the remaining options at the top of the next
// column/page. Nothing is ever left "on purpose" blank; the only
// unavoidable slack is less than one fragment's height (usually a single
// option row), which is exactly how a real newspaper/law-review layout
// behaves.
//
// Individual fragments never split mid-render (break-inside: avoid),
// which is what keeps KaTeX/tables/images always fully intact — you'll
// never see a half-rendered equation or a cut-off image.

export interface MeasuredBlock<T> {
  item: T;
  height: number; // px, measured at column width
  breakBefore?: boolean; // hard page break immediately before this item (e.g. "force page break before section")
  groupKey?: string; // fragments sharing a groupKey belong to the same question
  groupIsFirst?: boolean; // true for the first fragment in its group
}

export interface PageColumn<T> {
  blocks: T[];
}

export interface PageLayout<T> {
  columns: PageColumn<T>[]; // length 1 or 2
}

/**
 * Fills one page's columns for a given slice of fragments, balancing
 * height across columns. Fragments are packed strictly in order — a
 * question's fragments are never reordered or split across non-adjacent
 * columns — so continuation always reads naturally.
 *
 * Never looks past a `breakBefore` item — that item and everything after
 * it belongs on a later page, so a forced section break always lands
 * exactly at the section boundary.
 */
function fillPageBalanced<T>(
  items: MeasuredBlock<T>[],
  columnHeightPx: number,
  columnsPerPage: number
): { used: number; columns: PageColumn<T>[] } {
  const columns: PageColumn<T>[] = Array.from({ length: columnsPerPage }, () => ({ blocks: [] }));

  let hardStop = items.length;
  for (let i = 1; i < items.length; i++) {
    if (items[i].breakBefore) {
      hardStop = i;
      break;
    }
  }
  const candidates = items.slice(0, hardStop);

  if (columnsPerPage === 1) {
    let used = 0;
    let h = 0;
    for (; used < candidates.length; used++) {
      const next = candidates[used];
      if (h > 0 && h + next.height > columnHeightPx) break;
      columns[0].blocks.push(next.item);
      h += next.height;
    }
    return { used: Math.max(used, hardStop < items.length && used === 0 ? 1 : used), columns };
  }

  // Pack column-by-column, always filling each column as full as possible
  // before moving to the next — this is what lets a question's later
  // fragments continue right at the top of the next column instead of
  // being held back to "balance" heights. A little unevenness between
  // columns is far less noticeable than a half-empty column, and it's
  // exactly how real print layouts fill space.
  let idx = 0;
  let used = 0;
  for (let c = 0; c < columnsPerPage; c++) {
    let h = 0;
    while (idx < candidates.length) {
      const next = candidates[idx];
      if (h > 0 && h + next.height > columnHeightPx) break; // hard cap, never overflow the column
      columns[c].blocks.push(next.item);
      h += next.height;
      idx++;
      used++;
    }
  }

  return { used, columns };
}

export function planPages<T>(
  measured: MeasuredBlock<T>[],
  columnHeightPx: number,
  columnsPerPage: 1 | 2
): PageLayout<T>[] {
  const pages: PageLayout<T>[] = [];
  let remaining = measured;

  while (remaining.length > 0) {
    const { used, columns } = fillPageBalanced(remaining, columnHeightPx, columnsPerPage);
    pages.push({ columns });
    remaining = remaining.slice(Math.max(used, 1)); // Math.max guards against a stuck loop
  }

  if (pages.length === 0) {
    pages.push({ columns: Array.from({ length: columnsPerPage }, () => ({ blocks: [] })) });
  }

  return pages;
}

// mm -> px conversion at 96 CSS dpi (standard browser mm-to-px)
export const MM_TO_PX = 96 / 25.4;
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
