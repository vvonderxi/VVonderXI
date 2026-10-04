/*  ── SQUAD-TABLE EXTRACTORS, ONE PER SHAPE ──────────────────────────────────────────────
    Five editions, five shapes, and NONE of them is "no data" , which is what a search-based
    probe reported three times before anyone read a page. The template NAME is localised; what
    varies underneath is the SHAPE, and each edition uses one consistent machine-readable one.

      en   {{Efs player   |no= |name=}}                    fields, English
      tr   {{Futbol takımı kadrosu-oyuncu |no= |name=}}     fields, IDENTICAL to en
      fr   {{Feff joueur  |num= |prénom= |nom=}}            fields, French
      pt   {{Plantel de Futebol |g1num=1 |g1=[[Name]]}}     POSITIONAL keys, paired by prefix
      nl   wikitable with ! Nummer / ! Naam headers         header-keyed table
      en   wikitable with ! No. / ! Name headers            header-keyed table (the PL shape)
      en   {{Fb si player |n= |p={{sortname}}}}             fields, a third English shape

    THE RULE THAT MAKES THIS TRACTABLE: key on the FIELD, never on the template name, and key
    a table on its HEADER, never on column position. Both are the same lesson , SS F records
    the Transfermarkt incident where reading a column by position turned a player's age into
    his assist count.  */

const NUM_FIELDS  = ['no', 'num', 'nummer', 'nr', 'n'];
const NAME_FIELDS = ['name', 'nom', 'naam', 'nome', 'p'];
/*  HEADER WORDS FOR THE TABLE SHAPE, per edition. Kept short and exact rather than fuzzy: a
    loose match on "n" would hit "Nationaliteit" and read a flag as a shirt number.  */
const NUM_HEAD  = /^(no\.?|nummer|nr\.?|num(é|e)ro|numero|n°)$/i;
const NAME_HEAD = /^(name|player|naam|nom|nome|jogador|joueur|speler)$/i;

const clean = (s) => String(s || '')
  .replace(/\{\{\s*sortname\s*\|([^}|]*)\|([^}|]*)(\|[^}]*)?\}\}/gi, '$1 $2')
  .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2').replace(/\[\[([^\]]*)\]\]/g, '$1')
  .replace(/<ref[\s\S]*?(\/>|<\/ref>)/gi, '').replace(/\{\{[^{}]*\}\}/g, '')
  .replace(/<[^>]*>/g, '').replace(/'''?/g, '').replace(/[†‡*]/g, '')
  .replace(/\s+/g, ' ').trim();

/*  Walk brace depth rather than using a non-greedy [^}]* , a row containing {{flagicon|X}}
    would otherwise be cut off at the inner close and lose its name.  */
function templates(wt) {
  const out = []; const re = /\{\{\s*([^|{}\n]{2,60}?)\s*\|/g; let m;
  while ((m = re.exec(wt))) {
    let d = 1, j = m.index + 2;
    while (j < wt.length && d > 0) {
      if (wt.startsWith('{{', j)) { d++; j += 2; }
      else if (wt.startsWith('}}', j)) { d--; j += 2; }
      else j++;
    }
    out.push({ name: m[1].trim(), body: wt.slice(m.index + 2, j - 2), at: m.index });
  }
  return out;
}
const fields = (body) => {
  const f = {}; let depth = 0, cur = '';
  for (let i = 0; i < body.length; i++) {
    if (body.startsWith('{{', i) || body.startsWith('[[', i)) { depth++; cur += body[i]; continue; }
    if (body.startsWith('}}', i) || body.startsWith(']]', i)) { depth--; cur += body[i]; continue; }
    if (body[i] === '|' && depth <= 0) { const k = cur.indexOf('='); if (k > 0) f[cur.slice(0, k).trim().toLowerCase()] = cur.slice(k + 1).trim(); cur = ''; continue; }
    cur += body[i];
  }
  const k = cur.indexOf('='); if (k > 0) f[cur.slice(0, k).trim().toLowerCase()] = cur.slice(k + 1).trim();
  return f;
};

/*  SHAPE 1 , one template per player, a number field and a name field. en, tr, fr.
    ROWS ARE CLUSTERED BY DISTANCE, NOT BY MARKER NAME. A season page often carries the squad
    AND an appearances table AND a reserve list in the same template family, and keying on the
    block markers ({{Efs start}}, {{Feff début}}, {{Futbol takımı kadrosu-başlangıç}}) means
    knowing every edition's word for "start". Squad rows sit a few hundred characters apart;
    a separate table is thousands away. CLUSTERING NEEDS NO VOCABULARY and works on an edition
    nobody has read yet, which is the whole point after three editions reported "no data".  */
/*  BOUND BY A BLOCK MARKER WHEN THE EDITION HAS ONE, CLUSTER WHEN IT DOES NOT. Clustering
    alone put 33 rows in one cluster on the HSV page , the squad's 29 plus the first four of
    the appearances table, because the two blocks sit closer together than any sane gap. The
    markers are known for the editions that have been READ; clustering is the fallback for the
    ones that have not, which is the state every edition starts in.  */
const BLOCK_START = /\{\{\s*(Efs start|fs start|Feff début|Feff debut|Futbol takımı kadrosu-başlangıç)\b/gi;
const BLOCK_END   = /\{\{\s*(Efs end|fs end|Feff fin|Futbol takımı kadrosu-son)\b/i;
const CLUSTER_GAP = 1200;
function cluster(items) {
  const out = []; let cur = [];
  for (const it of items) {
    if (cur.length && it.at - cur[cur.length - 1].at > CLUSTER_GAP) { out.push(cur); cur = []; }
    cur.push(it);
  }
  if (cur.length) out.push(cur);
  return out;
}
/*  A TRANSFER ROW IS NOT A SQUAD ROW, AND ITS NUMBER BELONGS TO ANOTHER CLUB. The HSV page
    carries {{fb in2 player}} x8 and {{fb out2 player}} x13 alongside {{Efs player}} x29, and
    all three declare `no=` and `name=`, so a matcher keyed purely on the FIELDS swallowed 50
    rows for a 29-man squad. An incoming player's number is the one he wore where he came
    FROM; an outgoing player's is the one he is taking away. THIS IS THE SAME DEFECT CLASS
    MEASURED ON OUR OWN DATA TODAY , a shirt number attached to a club the player was not at ,
    arriving by a different route, and reading these would inject it deliberately.  */
const TRANSFER_TPL = /\b(in|out|transfer|transfers|loan|loans|entrada|saida|saída|entrées|sorties)\d*\b/i;
function byFields(wt) {
  const rows = [];
  for (const t of templates(wt)) {
    if (TRANSFER_TPL.test(t.name)) continue;
    const f = fields(t.body);
    const numK = NUM_FIELDS.find((k) => f[k] !== undefined && /^\d{1,2}$/.test(String(f[k]).trim()));
    if (!numK) continue;
    let name = '';
    for (const k of NAME_FIELDS) if (f[k]) { name = clean(f[k]); break; }
    if (!name && f['nom']) name = clean(((f['prénom'] || f['prenom'] || '') + ' ' + f['nom']).trim());
    if (!name) continue;
    if (f['prénom'] || f['prenom']) name = clean(((f['prénom'] || f['prenom']) + ' ' + (f['nom'] || name)).trim());
    rows.push({ no: String(f[numK]).trim(), name, at: t.at });
  }
  const marks = [...wt.matchAll(BLOCK_START)].map((m) => m.index);
  if (marks.length) {
    const out = [];
    for (const start of marks) {
      const rest = wt.slice(start);
      const e = rest.search(BLOCK_END);
      const end = start + (e > 0 ? e : rest.length);
      /*  A START MARKER DOES NOT GUARANTEE AN END MARKER , the HSV page opens {{Efs start}}
          and never closes it, so bounding on the end alone swallowed the rest of the article
          and returned 50 rows for a 29-man squad. The start ANCHORS and the gap CLOSES.  */
      let inBlock = rows.filter((r) => r.at >= start && r.at < end);
      const first = cluster(inBlock)[0] || [];
      inBlock = first;
      if (inBlock.length >= 8) out.push({ kind: 'fields', rows: inBlock.map(({ no, name }) => ({ no, name })) });
    }
    if (out.length) return out;
  }
  return cluster(rows).filter((c) => c.length >= 8)
    .map((c) => ({ kind: 'fields', rows: c.map(({ no, name }) => ({ no, name })) }));
}

/*  SHAPE 2 , ONE template for the WHOLE squad, positional keys. pt's {{Plantel de Futebol}}
    pairs `g1num=1` with `g1=[[Artur Moraes|Artur]]`; the prefix encodes the position (g
    keeper, c centre-back, le left-back, t midfielder) and carries no information we need.  */
function byPositionalKeys(wt) {
  const rows = [];
  for (const t of templates(wt)) {
    const f = fields(t.body);
    const local = [];
    for (const k of Object.keys(f)) {
      const m = k.match(/^([a-z]{1,3})(\d{1,2})num$/);
      if (!m) continue;
      const partner = f[m[1] + m[2]];
      if (partner === undefined) continue;
      const no = String(f[k]).trim(); const name = clean(partner);
      if (/^\d{1,2}$/.test(no) && name) local.push({ no, name });
    }
    if (local.length >= 8) rows.push(...local);
  }
  return rows.length >= 8 ? [{ kind: 'positional', rows }] : [];
}

/*  SHAPE 3 , a wikitable keyed on its OWN HEADER. nl's "Nummer / Naam", en's "No. / Name".
    Cells come one per line after a leading `|` OR several on one line split by `||`, and
    taking only the first form collapsed an entire Manchester United row into one cell.  */
function byTableHeader(wt) {
  const out = [];
  for (const tbl of (wt.match(/\{\|[\s\S]*?\n\|\}/g) || [])) {
    const hdr = [];
    for (const l of tbl.split('\n')) if (/^\s*!/.test(l))
      l.replace(/^\s*!/, '').split('!!').forEach((c) => hdr.push(clean(c.replace(/^[^|\[{]*\|(?!\|)/, ''))));
    const iNo = hdr.findIndex((h) => NUM_HEAD.test(h));
    const iNm = hdr.findIndex((h) => NAME_HEAD.test(h));
    if (iNo < 0 || iNm < 0) continue;
    const rows = [];
    for (const chunk of tbl.split(/\n\|-/)) {
      if (/^\s*!/.test(chunk)) continue;
      const cells = [];
      for (const l of chunk.split('\n')) {
        if (!/^\s*\|/.test(l) || /^\s*\|\}/.test(l)) continue;
        l.replace(/^\s*\|/, '').split('||').forEach((c) => cells.push(clean(c.replace(/^[^|\[{]*\|(?!\|)/, ''))));
      }
      if (cells.length <= Math.max(iNo, iNm)) continue;
      const no = cells[iNo], nm = cells[iNm];
      if (!/^\d{1,2}$/.test(no) || !nm || nm.length < 3) continue;
      rows.push({ no, name: nm });
    }
    if (rows.length >= 8) out.push({ kind: 'table', rows });
  }
  return out;
}

/*  A BLOCK WHOSE NAMES ARE NOT NAMES IS REJECTED, NOT RETURNED. Burnley's table put an
    appearances figure in the name column and 18 junk rows read as a club whose players were
    simply absent , a name matcher finds no match and reports "no row" rather than erroring. */
const looksLikeNames = (rows) =>
  rows.filter((r) => /[A-Za-zÀ-ÿ]{2,}/.test(r.name) && !/\d/.test(r.name)).length / rows.length >= 0.8;

function extract(wt) {
  for (const fn of [byFields, byPositionalKeys, byTableHeader]) {
    const b = fn(wt).filter((x) => looksLikeNames(x.rows));
    if (b.length) return b;
  }
  return [];
}
module.exports = { extract, byFields, byPositionalKeys, byTableHeader, looksLikeNames, clean };
