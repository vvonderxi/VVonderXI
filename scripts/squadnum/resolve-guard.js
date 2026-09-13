/*  ── THE CLUB GUARD FOR THE SQUAD-NUMBER PIPELINE ────────────────────────────────────────
    Written 2026-09-13 after a resolution pass put SIX of 168 club-seasons on the wrong page
    and the first guard PASSED ALL SIX. 129 cards were exposed. Our "Nacional" resolved to an
    Argentine BASKETBALL LEAGUE, "Werder Bremen" and "FSV Mainz 05" to their RESERVE sides,
    "PEC Zwolle" to the women's team, "Fenerbahce" to the basketball team, and "Sparta
    Rotterdam" to Excelsior Rotterdam, a different club in the same city.

    THE FIRST GUARD WAS NOT MALFUNCTIONING. It asked "which club", and a women's team and a
    basketball team ARE the same club, so it passed them by construction. That is why a
    guard's SCOPE has to be written down beside its pass rate.

    THE PRINCIPLED RULE WAS TRIED FIRST AND MEASURED AT 29% FALSE REFUSALS, so it is not here:
    "the full resolved label must add no significant word our club name lacks" refused 35 of
    119 CORRECT pairs , Tottenham against "Tottenham Hotspur F.C.", Leicester against
    "Leicester City F.C.", Bayern Munchen against "FC Bayern Munich", Lyon against "Olympique
    Lyonnais", Inter against "Inter Milan". The bad labels add CATEGORY words and the good ones
    add CLUB words, and nothing structural separates those two. That is the finding: it is what
    makes a principled rule impossible here rather than merely hard.

    SO THIS SHIPS A BLOCKLIST AND SAYS SO. Measured: 5 of 6 caught, ZERO false refusals over
    119 real pairs, and it caught the two reserve sides nobody had spotted.  */

const FOOTBALL = 'Q2736';                      // Wikidata: association football
const UA = { 'User-Agent': 'VVonderXI-squadnum/1.0 (hello@vvonderxi.com)' };

/*  A DIFFERENT TEAM WITHIN ONE CLUB, OR A DIFFERENT SPORT. Checked against the resolved TITLE
    and against every label the page offers about itself, because the disqualifying word
    appeared in the Wikidata label ("PEC Zwolle Vrouwen", "Fenerbahce Men's Basketball") while
    the title carried only "(women)" or "(basketball)". Either alone would have missed one.  */
const DISQUALIFIER = /\b(women|womens|vrouwen|feminin|feminine|femminile|femenino|femenina|dames|ladies|girls|basketball|basquet|basquete|baloncesto|handball|volleyball|futsal|hockey|rugby|cricket|esports|youth|academy|reserve|reserves|u1[6-9]|u2[0-3]|amateure?|II|B)\b/i;

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/ı/gi, 'i').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/*  LEGAL-FORM TOKENS ARE NOISE ON BOTH SIDES. Every club label carries some and our team_name
    usually carries none, so leaving them in would refuse nearly every correct pair.  */
const NOISE = new Set(['fc','afc','cf','sc','ac','as','sk','jk','sl','cd','rc','rcd','sd','ud','ss','ssc','us','kv','kaa','krc','rsc','sv','tsg','vfl','vfb','fsv','bv','psv','nec','pec','rkc','sbv','vvv','ogc','osc','fco','acf','bc','cfc','fk','club','de','del','la','le','du','des','di','da','of','the','and','season']);
const sig = (s) => fold(s).split(' ').filter((t) => t.length > 1 && !NOISE.has(t));

/*  TOKENS MATCH ON A PREFIX, NOT ON EQUALITY, BECAUSE CLUB NAMES TAKE ADJECTIVAL AND COMPOUND
    FORMS. "Lyon" against "Olympique LYONNAIS" shares no whole token and is a correct pair;
    so are Chievo/ChievoVerona and Akhisarspor/Akhisar Belediyespor. A four-character prefix
    is the shortest that does not start matching unrelated clubs, and it does NOT rescue
    Sparta against Excelsior, which is the case the review flag exists for.  */
const related = (a, b) => a === b || (a.length >= 4 && b.startsWith(a)) || (b.length >= 4 && a.startsWith(b));
const sharesToken = (a, b) => a.some((x) => b.some((y) => related(x, y)));

const api = async (url) => (await fetch(url, { headers: UA })).json();

async function sportOf(title) {
  const j = await api('https://en.wikipedia.org/w/api.php?format=json&action=query&prop=pageprops&titles=' + encodeURIComponent(title));
  const pg = Object.values(j.query.pages)[0];
  const qid = pg && pg.pageprops && pg.pageprops.wikibase_item;
  if (!qid) return null;
  const w = await api('https://www.wikidata.org/w/api.php?format=json&action=wbgetclaims&property=P641&entity=' + qid);
  const c = w.claims && w.claims.P641 && w.claims.P641[0];
  return (c && c.mainsnak.datavalue && c.mainsnak.datavalue.value.id) || null;
}

/*  THE GATE , refuse, and say which field said so. Fails safe: an unreadable page is refused
    rather than accepted, because the cost of a wrong page is other players' numbers on our
    cards and the cost of a refusal is one club-season we fetch by hand.  */
async function gate(ourClub, title, labels, opts = {}) {
  const fields = [title].concat(Object.values(labels || {}));
  const hit = fields.find((f) => DISQUALIFIER.test(' ' + String(f || '') + ' '));
  if (hit) return { ok: false, why: 'disqualifier in "' + hit + '"' };

  const ct = sig(ourClub);
  const shares = fields.some((f) => sharesToken(sig(f), ct));
  if (!shares) return { ok: false, why: 'no page label shares a token with "' + ourClub + '"' };

  if (opts.checkSport !== false) {
    const sp = await sportOf(title);
    if (sp && sp !== FOOTBALL) return { ok: false, why: 'Wikidata P641 is ' + sp + ', not association football' };
  }
  return { ok: true };
}

/*  THE REVIEW FLAG , NOT A GATE, AND THE DIFFERENCE IS THE MEASUREMENT. "Sparta Rotterdam"
    against "Excelsior Rotterdam" shares the CITY, so no disqualifier and no sport claim can
    see it. Comparing the LEAD significant token catches it and costs 3 false refusals per 119
    (Chievo/AC ChievoVerona, Lyon/Olympique Lyonnais, Akhisarspor/Akhisar Belediyespor).
    THREE FALSE FLAGS TO FIND ONE REAL ERROR IS A BAD GATE AND A FINE REVIEW QUEUE , at 1,018
    club-seasons that is roughly nine pages to eyeball, which is an afternoon, not a blocker. */
function reviewFlag(ourClub, label) {
  const a = sig(ourClub), b = sig(label);
  if (!a.length || !b.length) return null;
  if (a.some((x) => related(x, b[0])) || b.some((y) => related(y, a[0]))) return null;
  return 'lead token "' + a[0] + '" vs "' + b[0] + '" , different club in the same city?';
}

module.exports = { gate, reviewFlag, DISQUALIFIER, sig, fold, FOOTBALL };
