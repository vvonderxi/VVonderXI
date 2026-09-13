/*  ── SEASON-PAGE RESOLUTION, PER EDITION ────────────────────────────────────────────────
    A generic `"<club> 2016 2017"` search found 0 of 14 Portuguese clubs while the pages were
    plainly there , `Temporada do Sporting Clube de Portugal de 2016–17` came back third on a
    differently phrased query. THE FAILURE WAS THE QUESTION, NOT THE DATA, which is the third
    time that distinction has decided something on this job.

    EACH EDITION NAMES A SEASON ITS OWN WAY and the convention word is the strongest term in
    the query, so it goes in rather than being left to ranking:
      en  "2016–17 Everton F.C. season"
      tr  "Trabzonspor 2016-17 sezonu"
      pt  "Temporada do Sporting Clube de Portugal de 2016–17"
      nl  "FC Utrecht in het seizoen 2016/17"
      fr  "Saison 2016-2017 du Standard de Liège"
      es  "Temporada 2016-17 del Athletic Club"
      it  "Stagione 2016-2017 della Sampdoria"
    SEVERAL PHRASINGS ARE TRIED PER EDITION, because a convention is a habit and not a rule;
    the first that RESOLVES wins, and resolution means the guard accepts it.  */

const UA = { 'User-Agent': 'VVonderXI-squadnum/1.0 (hello@vvonderxi.com)' };

/*  Season strings differ per edition too , en uses an en dash, nl a slash, fr full years.
    y is the START year, so 2016 means the 2016/17 season.  */
const SEASON = {
  en: (y) => `${y}–${String(y + 1).slice(2)}`,
  tr: (y) => `${y}-${String(y + 1).slice(2)}`,
  pt: (y) => `${y}–${String(y + 1).slice(2)}`,
  nl: (y) => `${y}/${String(y + 1).slice(2)}`,
  fr: (y) => `${y}-${y + 1}`,
  es: (y) => `${y}-${String(y + 1).slice(2)}`,
  it: (y) => `${y}-${y + 1}`,
};
const QUERIES = {
  en: (c, s) => [`intitle:"${s}" intitle:season ${c}`, `${c} ${s} season`],
  tr: (c, s) => [`${c} ${s} sezonu`, `intitle:sezonu ${c} ${s}`],
  pt: (c, s) => [`Temporada ${c} ${s}`, `intitle:Temporada ${c} ${s}`, `${c} ${s} temporada`],
  nl: (c, s) => [`${c} in het seizoen ${s}`, `intitle:seizoen ${c} ${s}`],
  fr: (c, s) => [`Saison ${s} ${c}`, `intitle:Saison ${c} ${s}`],
  es: (c, s) => [`Temporada ${s} ${c}`, `intitle:Temporada ${c} ${s}`],
  it: (c, s) => [`Stagione ${s} ${c}`, `intitle:Stagione ${c} ${s}`],
};
/*  THE EDITIONS WORTH ASKING, PER LEAGUE, IN ORDER. Belgium is bilingual, so both nl and fr
    are tried , Standard de Liège resolved on fr and KRC Genk on nl, and a single-edition
    guess would have lost one of them whichever way it went.  */
const EDITIONS = { PL:['en'], LL:['en','es'], SA:['en','it'], BL:['en','de'],
                   L1:['en','fr'], PRT:['en','pt'], ERE:['en','nl'], TR:['en','tr'],
                   BPL:['en','nl','fr'] };

const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/ı/gi, 'i').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const toks = (s) => fold(s).split(' ').filter((t) => t.length >= 4);

const api = async (w, p) =>
  (await fetch(`https://${w}.wikipedia.org/w/api.php?format=json&` + new URLSearchParams(p), { headers: UA })).json();

/*  A YEAR IN THE TITLE IS REQUIRED, and it is checked against the SEASON rather than against
    "any four digits" , `Boavista Futebol Clube da Praia` carries no year and ranked first on
    a loose query, and a club's own article would otherwise pass as its season page.  */
async function resolve(club, league, year, gate) {
  const tried = [];
  for (const w of (EDITIONS[league] || ['en'])) {
    const s = SEASON[w] ? SEASON[w](year) : String(year);
    for (const q of (QUERIES[w] || QUERIES.en)(club, s)) {
      tried.push(w + ': ' + q);
      let j; try { j = await api(w, { action: 'query', list: 'search', srlimit: '8', srsearch: q }); }
      catch (e) { continue; }
      const hits = ((j.query && j.query.search) || []).map((h) => h.title)
        .filter((t) => new RegExp(String(year)).test(t));
      const ct = toks(club);
      for (const t of hits) {
        if (!ct.some((x) => fold(t).includes(x))) continue;
        if (gate) { const g = await gate(club, t, {}, { checkSport: false }); if (!g.ok) continue; }
        return { wiki: w, title: t, tried };
      }
      await new Promise((r) => setTimeout(r, 90));
    }
  }
  return { wiki: null, title: null, tried };
}
module.exports = { resolve, EDITIONS, SEASON, QUERIES };
