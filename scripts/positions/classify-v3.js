/*  POSITION CLASSIFIER v3 , FORMATION-AWARE (2026-10-09, position fix step 2).
 *
 *  v2 (scripts/import/import-positions-v2.js) classified a midfielder by DEPTH between the
 *  defensive and forward rows and ignored the formation string. Two structural faults followed:
 *    - wing-backs in a back three sit in a 4- or 5-wide midfield row, so v2 called them LW/RW, and
 *      full-backs were under-counted on every league and season (13% FB against 20% CB);
 *    - from 2022 the provider's row numbering changed enough that v2's depth threshold stopped
 *      emitting CAM at all (0.5% of rows, against 17 to 25% in 2019 to 2021).
 *  v3 reads the formation the provider sends with every lineup and assigns by LINE, which is what
 *  the formation actually declares.
 *
 *  WHAT NO CLASSIFIER CAN FIX: the provider's grid is sometimes wrong inside a row. Liverpool
 *  2018/19 lists its back four as Alexander-Arnold, Gomez, Robertson, van Dijk, so Robertson sits in
 *  an inner column and reads as a centre-back on every reading of the grid. Those cases go to
 *  public.position_overrides, which always wins.
 */

function parseFormation(f) {
  if (!f || !/^\d(-\d){1,4}$/.test(f)) return null;
  return f.split('-').map(Number);
}

/* One slot -> one of the eight buckets, or null when it cannot be read. */
function classify(slot) {
  const { formation, grid_row: row, grid_col: col, row_width: width, pos } = slot;
  if (pos === 'G' || row === 1) return 'GK';
  const lines = parseFormation(formation);
  if (!lines || row == null || col == null || !width) return fallback(slot);
  const nLines = lines.length;            // lines after the keeper; row r is lines[r-2]
  const idx = row - 2;
  if (idx < 0 || idx >= nLines) return fallback(slot);
  const outer = width >= 2 && (col === 1 || col === width);
  const back = lines[0];

  // the back line
  if (idx === 0) return (width >= 4 && outer) ? 'FB' : 'CB';

  // the front line
  if (idx === nLines - 1) {
    if (width >= 3 && outer) return 'Winger';
    return 'ST';
  }

  // midfield lines: idx 1 .. nLines-2
  const firstMid = idx === 1, lastMid = idx === nLines - 2, midCount = nLines - 2;
  const attack = lines[nLines - 1];

  // a back three's wing-backs: the first midfield line wide enough to hold them
  if (back === 3 && width >= 4 && outer) {
    const firstWide = lines.findIndex((w, i) => i >= 1 && i <= nLines - 2 && w >= 4);
    if (firstWide === idx) return 'FB';
  }

  if (midCount >= 2) {
    if (firstMid && !lastMid) {
      if (width <= 2) return 'CDM';                       // 4-2-3-1, 4-1-4-1, 4-2-2-2, 3-1-4-2
      if (width >= 4 && outer && back !== 3) return 'Winger';
      return 'CM';                                        // 4-3-1-2, 4-3-2-1, 3-4-x inner
    }
    if (lastMid) {
      if (width === 1) return 'CAM';                      // 4-3-1-2, 4-4-1-1, 3-5-1-1
      if (width === 2) {
        if (lines.join('-') === '4-2-2-2') return 'Winger';
        if (back === 3 && attack === 1) return 'Winger';  // 3-4-2-1 inside forwards
        return 'CAM';                                     // 4-3-2-1 christmas tree, 3-4-1-2 pair
      }
      if (width === 3) return outer ? 'Winger' : 'CAM';   // 4-2-3-1
      return outer ? 'Winger' : 'CM';                     // 4-1-4-1's four
    }
    return outer && width >= 4 ? 'Winger' : 'CM';
  }

  // one midfield line: 4-4-2, 4-3-3, 4-5-1, 5-3-2, 5-4-1, 3-5-2, 3-4-3
  if (width >= 4 && outer) return back === 3 ? 'FB' : 'Winger';
  return 'CM';
}

/* No usable formation: fall back to the provider's coarse letter, honestly coarse. */
function fallback(slot) {
  const p = slot.pos;
  if (p === 'G') return 'GK';
  if (p === 'D') return (slot.row_width >= 4 && (slot.grid_col === 1 || slot.grid_col === slot.row_width)) ? 'FB' : 'CB';
  if (p === 'F') return 'ST';
  if (p === 'M') return 'CM';
  return null;
}

/* A season's position: the most frequent bucket. A tie returns null (left to the caller). */
function seasonPosition(slots) {
  const n = {};
  for (const s of slots) { const b = classify(s); if (b) n[b] = (n[b] || 0) + 1; }
  const e = Object.entries(n).sort((a, b) => b[1] - a[1]);
  if (!e.length) return { pos: null, counts: n, share: 0 };
  const tot = e.reduce((a, x) => a + x[1], 0);
  if (e.length > 1 && e[0][1] === e[1][1]) return { pos: null, counts: n, share: e[0][1] / tot, tie: true };
  return { pos: e[0][0], counts: n, share: e[0][1] / tot };
}

module.exports = { classify, seasonPosition, parseFormation };
