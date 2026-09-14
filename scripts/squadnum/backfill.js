/*  ── THE SQUAD-NUMBER BACKFILL , ONE BATCH AT A TIME ─────────────────────────────────────
    Unit is the CLUB-SEASON, never the card: a squad where 18 of 20 have numbers reads as a
    squad and 8 of 20 reads as an outage, so completing one club beats spreading across many.
    ORDER IS WORST-COVERED FIRST , PRT, BPL, TR, ERE. Learning the method fails on Portugal at
    batch 1 is cheaper than learning it at batch 18, and if those leagues come back near-empty
    that is a finding rather than a failure.  */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { resolve } = require('./resolve.js');
const { gate, reviewFlag } = require('./resolve-guard.js');
const { extract } = require('./extract.js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const UA = { 'User-Agent': 'VVonderXI-squadnum/1.0 (hello@vvonderxi.com)' };
const DIR = path.join(__dirname, '..', '..', 'migrations', 'squad_numbers_2026-09-14');
const APPLY = process.argv.includes('--apply');
const SIZE = Number((process.argv.find((a) => a.startsWith('--size=')) || '--size=50').split('=')[1]);
const ORDER = ['PRT', 'BPL', 'TR', 'ERE', 'L1', 'LL', 'SA', 'BL', 'PL'];

const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/gi, 'i')
  .toLowerCase().replace(/[^a-z0-9 -]/g, ' ').replace(/\s+/g, ' ').trim();
const PART = new Set(['van', 'der', 'den', 'de', 'di', 'da', 'del', 'le', 'la', 'von', 'ten', 'ter']);
function split(n) {
  const t = fold(n).split(' ').filter(Boolean);
  if (t.length <= 1) return { fore: '', sur: t[0] || '' };
  let i = t.length - 1; while (i > 0 && PART.has(t[i - 1])) i--;
  return { fore: t.slice(0, i).join(' '), sur: t.slice(i).join(' ') };
}
const isAb = (n) => /^[A-Z]\.\s/.test(String(n).trim());

/*  THE STRICT MATCHER , an abbreviated name of ours may match on an initial, a FULL name must
    match in full, anything else sharing a surname is AMBIGUOUS and is HELD. Letting a full
    forename fall back to its initial matched Diego Lopez to David Lopez on the pilot , wrong
    PLAYER, not wrong number, and it reported as a data disagreement.  */
function matchOne(ourName, rows) {
  const ours = split(ourName), ab = isAb(ourName);
  const sur = rows.filter((r) => split(r.name).sur === ours.sur);
  if (!sur.length) return { kind: 'norow' };
  let h;
  if (!ours.fore) h = sur;
  else if (ab) h = sur.filter((r) => split(r.name).fore.charAt(0) === ours.fore.charAt(0));
  else {
    h = sur.filter((r) => split(r.name).fore === ours.fore);
    if (!h.length) h = sur.filter((r) => split(r.name).fore.split(' ')[0] === ours.fore.split(' ')[0]);
  }
  if (h.length !== 1) return { kind: 'ambiguous' };
  return { kind: 'match', row: h[0] };
}

async function targets() {
  const all = []; let from = 0;
  for (;;) {
    const { data, error } = await sb.from('player_card_mv')
      .select('card_id,api_player_id,player_name,team_name,season_year,league_code')
      .gte('season_year', 2010).lte('season_year', 2015).is('shirt_number', null)
      .order('card_id', { ascending: true }).range(from, from + 999);
    if (error) throw new Error(error.message);
    all.push(...data); if (data.length < 1000) break; from += 1000;
  }
  const by = {};
  all.forEach((c) => { const k = c.league_code + '|' + c.season_year + '|' + c.team_name; (by[k] = by[k] || []).push(c); });
  return Object.entries(by).sort((a, b) => {
    const la = ORDER.indexOf(a[0].split('|')[0]), lb = ORDER.indexOf(b[0].split('|')[0]);
    return la !== lb ? la - lb : a[0].localeCompare(b[0]);
  });
}

(async () => {
  const done = fs.existsSync(path.join(DIR, 'clubseasons-done.json'))
    ? new Set(JSON.parse(fs.readFileSync(path.join(DIR, 'clubseasons-done.json'), 'utf8'))) : new Set();
  const all = await targets();
  const batch = all.filter(([k]) => !done.has(k)).slice(0, SIZE);
  console.log((APPLY ? 'BATCH' : 'DRY RUN') + ': ' + batch.length + ' club-seasons of ' + all.length + ' remaining\n');

  const stats = { clubSeasons: batch.length, resolved: 0, parsed: 0, cards: 0, matched: 0, held: { norow: 0, ambiguous: 0 }, written: 0, skipped: [] };
  const writes = [], flags = [];
  for (const [key, cards] of batch) {
    const [lg, yr, club] = key.split('|');
    stats.cards += cards.length;
    const r = await resolve(club, lg, Number(yr), gate);
    if (!r.title) { stats.skipped.push(key + ' , no page'); continue; }
    stats.resolved++;
    let p; try { p = await (await fetch(`https://${r.wiki}.wikipedia.org/w/api.php?format=json&action=parse&prop=wikitext&page=` + encodeURIComponent(r.title), { headers: UA })).json(); }
    catch (e) { stats.skipped.push(key + ' , fetch failed'); continue; }
    if (p.error) { stats.skipped.push(key + ' , ' + p.error.code); continue; }
    const blocks = extract(p.parse.wikitext['*']);
    if (!blocks.length) { stats.skipped.push(key + ' , no squad block'); continue; }
    /*  MANY BLOCKS ARE HELD FOR FABLE, NOT GUESSED AT , it buys yield and nothing in
        precision, and running it during the backfill would put two sources of change in one
        write, so a surprise in the diff would have two possible causes instead of one.  */
    if (blocks.length > 1) { stats.skipped.push(key + ' , ' + blocks.length + ' blocks, held for adjudication'); continue; }
    const rows = blocks[0].rows;
    const nums = rows.map((x) => x.no);
    if (nums.length - new Set(nums).size) { stats.skipped.push(key + ' , duplicate numbers in the block'); continue; }
    stats.parsed++;
    const fl = reviewFlag(club, r.title); if (fl) flags.push(key + ' , ' + fl);
    for (const c of cards) {
      const m = matchOne(c.player_name, rows);
      if (m.kind !== 'match') { stats.held[m.kind]++; continue; }
      const n = Number(m.row.no);
      if (!(n >= 1 && n <= 99)) { stats.held.norow++; continue; }
      stats.matched++;
      writes.push({ api_player_id: c.api_player_id, season_year: c.season_year, league_code: c.league_code,
        shirt_number: n, card_id: c.card_id, name: c.player_name, page: m.row.name, club, title: r.title, wiki: r.wiki });
    }
    await new Promise((x) => setTimeout(x, 90));
  }

  const pc = (a, b) => (b ? (100 * a / b).toFixed(1) + '%' : 'n/a');
  console.log('  club-seasons   ' + stats.clubSeasons + '   resolved ' + stats.resolved + '   parsed ' + stats.parsed);
  console.log('  cards in scope ' + stats.cards);
  console.log('  matched        ' + stats.matched + '   (' + pc(stats.matched, stats.cards) + ' YIELD)');
  console.log('  held: no row ' + stats.held.norow + ', ambiguous ' + stats.held.ambiguous);
  console.log('  skipped club-seasons: ' + stats.skipped.length);
  stats.skipped.slice(0, 14).forEach((s) => console.log('     ' + s));
  if (flags.length) { console.log('  REVIEW FLAGS:'); flags.forEach((f) => console.log('     ' + f)); }

  if (!APPLY) { console.log('\n  DRY RUN , nothing written. Add --apply.'); 
    fs.writeFileSync(path.join(DIR, 'batch1-dryrun.json'), JSON.stringify({ stats, sample: writes.slice(0, 10) }, null, 2) + '\n');
    return; }

  /*  NEVER OVERWRITE , every key is checked for an existing row first. These are inserts and
      the rollback is a delete of exactly what was inserted; an update would make that false. */
  const keys = writes.map((w) => w.api_player_id);
  const existing = new Set();
  for (let i = 0; i < keys.length; i += 300) {
    const { data } = await sb.from('player_positions').select('api_player_id,season_year,league_code').in('api_player_id', keys.slice(i, i + 300));
    (data || []).forEach((r) => existing.add(r.api_player_id + '|' + r.season_year + '|' + r.league_code));
  }
  const fresh = writes.filter((w) => !existing.has(w.api_player_id + '|' + w.season_year + '|' + w.league_code));
  console.log('\n  would insert ' + fresh.length + ', skipping ' + (writes.length - fresh.length) + ' that already have a row');
  for (let i = 0; i < fresh.length; i += 200) {
    const chunk = fresh.slice(i, i + 200).map((w) => ({ api_player_id: w.api_player_id, season_year: w.season_year, league_code: w.league_code, shirt_number: w.shirt_number }));
    const { error } = await sb.from('player_positions').insert(chunk);
    if (error) { console.error('  INSERT FAILED at ' + i + ': ' + error.message); process.exit(1); }
    stats.written += chunk.length;
  }
  fs.appendFileSync(path.join(DIR, 'written.jsonl'), fresh.map((w) => JSON.stringify(w)).join('\n') + '\n');
  fs.writeFileSync(path.join(DIR, 'clubseasons-done.json'), JSON.stringify([...done, ...batch.map(([k]) => k)], null, 1) + '\n');
  fs.writeFileSync(path.join(DIR, 'batch1-stats.json'), JSON.stringify(stats, null, 2) + '\n');
  console.log('  WRITTEN ' + stats.written + ' rows. Logged to written.jsonl.');
})().catch((e) => { console.error('FAILED,', e.message); process.exit(1); });
