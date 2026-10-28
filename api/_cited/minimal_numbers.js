/*  THE MINIMAL NUMBER EXTRACTOR (2026-10-28, Lucas: "Build the minimal extractor, c5. The count decided it.").
    Counted from the run files (docs/UNVERIFIED_SURFACES_2026-10-12.md, area 9, "THE NUMBER TOKENIZER, COUNTED"): the
    server's number rule earns its place and the tokenizer's binding inside it does not. Of the current rule's 17 extra
    deletions over 3,649 cited sentences, 15 were the binding's false positives ("81 out of 100 and the tag" bound 100 to
    tags, "a 93 Reliability" to honours, "two percentile figures" read as a percentile); the one restart that was the
    tokenizer's alone (pass 8 to 9, the 1 of "Ligue 1") and both false deaths on the serving path came from it.
    So: a number is a digit string or a number word, and it carries a KIND only by explicit adjacency, "four tags",
    "four further honours", "three dimensions", "97 per cent", "97%", "96th percentile", or by ellipsis when a BARE count
    of twelve or under follows a possessive, "to", "against" or "and" in a clause that already counted that kind ("four tags
    to Rodri's three", "Kane's four against Mertens's two"). Nothing else is bound; everything else is value membership
    against the cited facts. Seasons (12/13), years (19xx, 20xx) and the 90 of "per 90" are not numbers. A digit that is
    part of a name ("Ligue 1") is a number, and passes by membership when the sentence cites the fact that prints it,
    which the club rule already requires.  */
const W = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100 };
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const kindWord = w => /^tags?$/.test(w) ? 'tags' : /^honours?$/.test(w) ? 'honours' : /^(dimensions?|attributes?)$/.test(w) ? 'dimensions' : null;
function minimalNumbers(text) {
  const t = String(text).replace(/[“”]/g, '"').replace(/[’‘]/g, "'").replace(/(\d),(\d{3})\b/g, '$1$2').replace(/([A-Za-z0-9])-(?=[A-Za-z0-9])/g, '$1 ');
  const re = /\d+(?:\.\d+)?(?:st|nd|rd|th)?|%|[A-Za-zÀ-ÿ']+|[.,;:!?()"]/g, toks = []; let m;
  while ((m = re.exec(t))) toks.push({ s: m[0], lw: m[0].toLowerCase(), i: m.index, end: m.index + m[0].length });
  const out = [];
  for (let k = 0; k < toks.length; k++) {
    const tk = toks[k]; let v = null, j = k, ordinal = false;
    const b1 = (toks[k - 1] || {}).lw || '';
    if (/^\d/.test(tk.s)) {
      if (t[tk.i - 1] === '/' || t[tk.end] === '/' || /^(19|20)\d\d$/.test(tk.s)) continue;      // seasons and years
      if (b1 === 'per' && /^(90|ninety)$/.test(tk.lw)) continue;                                   // the 90 of per 90
      ordinal = /(st|nd|rd|th)$/.test(tk.s); v = parseFloat(tk.s);
    } else if (TENS[tk.lw] != null && toks[k + 1] && W[toks[k + 1].lw] != null && W[toks[k + 1].lw] < 10 && W[toks[k + 1].lw] > 0) { v = TENS[tk.lw] + W[toks[k + 1].lw]; j = k + 1; }
    else if (W[tk.lw] != null) {
      v = W[tk.lw];
      if (b1 === 'per' && v === 90) continue;
      if (tk.lw === 'one' && !/^(more|fewer|additional|less)$/.test((toks[k + 1] || {}).lw || '')) continue;   // "one lane each", "one of"
    } else continue;
    if (toks[j + 1] && toks[j + 1].lw === 'hundred') { v *= 100; j++; }
    const a1 = (toks[j + 1] || {}).lw || '', a2 = (toks[j + 2] || {}).lw || '', a3 = (toks[j + 3] || {}).lw || '';
    let unit = null;
    if (ordinal) unit = a1 === 'percentile' ? 'percentile' : 'ordinal';
    else if (a1 === '%' || (a1 === 'per' && a2 === 'cent') || a1 === 'percent') unit = 'pct';
    else if (kindWord(a1)) unit = kindWord(a1);
    else if (/^(further|more|other|shared|such|individual|collective|separate|of)$/.test(a1) && kindWord(a2)) unit = kindWord(a2);
    else if (a1 === 'of' && /^(his|her|their|the|its)$/.test(a2) && kindWord(a3)) unit = kindWord(a3);
    else {
      // ellipsis: only a BARE count of twelve or under (the next token is punctuation, the end, or a joining word, never the
      // number's own noun: "35 goals", "seven assists more"), after a possessive or a joining word, in a clause that already
      // counted that kind. A tag or honour total never exceeds twelve; "Neymar's 87" is a score.
      const NOUN = /^(goals?|assists?|shots?|minutes?|appearances?|apps|games?|matches|starts?|honours?|tags?|dimensions?|attributes?|percentiles?|points?|years?|per|key|passes|tackles?|interceptions?|blocks?|seasons?|clubs?|campaigns?|titles?|medals?|awards?|trophies|caps?|wins?|clean|saves?|times)$/;
      const bare = !NOUN.test(a1) && (!a1 || /^[.,;:!?()"]$/.test(a1) || /^(to|against|and|or|than|in|on|of|this|that|where|while|yet|but|more|fewer)$/.test(a1) || /'s$/.test(b1));   // "Salah's four speak to", "Mbappé's four also include"
      if (bare && v <= 12 && (/'s$/.test(b1) || /^(to|against|and|versus|with|holds|carries|those|these)$/.test(b1))) {
        let a = k; while (a > 0 && !/^[.;:]$/.test(toks[a - 1].s)) a--;
        for (let q = k - 1; q >= a; q--) { const kw = kindWord(toks[q].lw); if (kw && q > 0 && (/^\d+$/.test(toks[q - 1].s) || W[toks[q - 1].lw] != null)) { unit = kw; break; } }
      }
    }
    out.push({ value: v, raw: t.slice(tk.i, toks[j].end), unit });
    k = j;
  }
  return out;
}
module.exports = { minimalNumbers };
