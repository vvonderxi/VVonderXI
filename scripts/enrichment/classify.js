// STEP 2 classify: map each pulled card_id -> {bucket, confidence}.
// bucket in {GK,FB,CB,CDM,CM,CAM,Winger,ST}; conf 'H' (write) or 'R' (review/CCC).
// Judgment by player + team + season + goals/assists + coarse label (Transfermarkt knowledge).
// READ-ONLY: reads the pull CSV, writes two CSVs, prints counts + the REVIEW list. No DB.
const fs = require('fs');
const IN = process.argv[2];
const HIGH = process.argv[3];
const REVIEW = process.argv[4];

// card_id -> [bucket, conf]
const CLS = {
  134722:['Winger','H'], 134385:['CAM','H'], 148649:['Winger','H'], 141372:['CM','H'],
  152731:['Winger','H'], 152336:['Winger','H'], 168502:['ST','H'], 167892:['ST','H'],
  155590:['Winger','H'], 134446:['ST','H'], 175638:['Winger','R'], 167715:['ST','H'],
  172746:['CAM','R'], 185904:['ST','H'], 148715:['CM','H'], 146956:['CAM','H'],
  131583:['CAM','R'], 132704:['CAM','H'], 131461:['ST','R'], 132742:['CM','H'],
  132020:['CAM','H'], 145920:['Winger','H'], 149134:['ST','H'], 161626:['ST','H'],
  169346:['CAM','R'], 151948:['CAM','R'], 142270:['ST','H'], 142840:['ST','H'],
  137533:['CM','R'], 140919:['CAM','H'], 133883:['Winger','H'], 138914:['CM','R'],
  143553:['ST','H'], 146412:['CM','H'], 146886:['CAM','H'], 173247:['CAM','R'],
  172539:['Winger','R'], 135551:['ST','H'], 135156:['ST','H'], 135135:['Winger','H'],
  150000:['Winger','H'], 141995:['ST','H'], 137008:['Winger','H'], 155320:['Winger','H'],
  155215:['ST','H'], 151651:['CAM','H'], 152033:['CAM','H'], 152401:['CAM','R'],
  180554:['Winger','R'], 168075:['ST','H'], 180654:['CAM','R'], 174592:['ST','R'],
  145154:['CM','R'], 146002:['CM','R'], 134709:['ST','H'], 134223:['CAM','R'],
  134720:['CAM','H'], 131634:['CAM','H'], 160409:['Winger','R'], 144788:['CM','R'],
  146206:['CAM','R'], 149561:['ST','H'], 174611:['Winger','R'], 168807:['ST','R'],
  141069:['Winger','R'], 163392:['CAM','R'], 136674:['CAM','H'], 130744:['CAM','H'],
  149184:['Winger','R'], 131110:['CM','H'], 108547:['Winger','R'], 149965:['ST','H'],
  139228:['Winger','H'], 142409:['Winger','H'], 137007:['CAM','H'], 156111:['ST','H'],
  154210:['CAM','R'], 151980:['Winger','H'], 167905:['ST','H'], 165230:['Winger','R'],
  154850:['Winger','H'], 155322:['ST','H'], 156662:['ST','R'], 154989:['CAM','H'],
  153064:['Winger','H'], 155952:['Winger','H'], 136764:['Winger','H'], 173285:['ST','R'],
  180202:['ST','R'], 180524:['ST','R'], 149376:['ST','H'], 148260:['Winger','H'],
  149557:['ST','H'], 145548:['CM','H'], 147729:['CM','H'], 134439:['CM','R'],
  157413:['CAM','H'], 163119:['ST','H'], 130481:['CAM','R'], 132404:['CAM','R'],
  131184:['Winger','R'], 160594:['Winger','R'], 161647:['ST','H'], 169868:['CM','R'],
  169768:['CAM','R'], 173592:['ST','H'], 153472:['CM','R'], 141996:['CAM','R'],
  141856:['ST','H'], 142373:['Winger','H'], 143810:['ST','H'], 142194:['ST','H'],
  179575:['ST','R'], 149629:['Winger','H'], 149724:['ST','R'], 144878:['Winger','H'],
  179912:['ST','R'], 175077:['Winger','R'], 179252:['ST','H'], 135644:['Winger','H'],
  131614:['CM','H'], 135891:['CAM','R'], 150598:['ST','R'], 141567:['ST','H'],
  137012:['CM','R'], 151617:['Winger','H'], 151525:['CAM','R'], 151851:['CAM','R'],
  155964:['ST','H'], 164410:['Winger','H'], 167208:['CAM','R'], 183949:['CAM','R'],
  175513:['CAM','R'], 175841:['CAM','R'], 176219:['CAM','R'], 176597:['CAM','R'],
  180896:['Winger','R'], 181162:['Winger','R'], 181398:['CAM','R'], 170986:['CM','R'],
  181739:['CAM','R'], 179772:['ST','R'], 148063:['Winger','H'], 149949:['ST','H'],
  134764:['CAM','R'], 130266:['Winger','H'], 134340:['CM','H'], 162737:['ST','H'],
  134879:['CAM','H'], 136377:['ST','H'], 136684:['ST','H'], 148775:['CM','R'],
  159395:['Winger','H'], 169343:['CM','R'], 170205:['Winger','R'], 172521:['CM','R'],
  154562:['CM','H'], 140459:['CAM','H'], 138045:['CAM','R'], 141576:['CAM','R'],
  143571:['ST','H'], 142338:['CM','H'], 142293:['ST','H'], 134751:['Winger','H'],
  182248:['Winger','R'], 141835:['CM','H'], 150878:['Winger','H'], 150820:['ST','H'],
  149621:['ST','H'], 172127:['CM','R'], 172490:['CM','R'], 172907:['Winger','R'],
  145980:['CAM','R'], 146936:['CAM','R'], 137004:['Winger','H'], 138059:['CM','H'],
  140668:['CAM','R'], 141018:['CM','H'], 142772:['CAM','R'], 143945:['Winger','H'],
  155432:['ST','H'], 150888:['Winger','H'], 153834:['Winger','H'], 156401:['Winger','H'],
  151298:['CAM','R'], 151953:['Winger','R'], 152996:['CAM','R'], 153546:['CAM','H'],
  132839:['CAM','R'], 130497:['CAM','H'], 135259:['Winger','H'], 134880:['Winger','H'],
  177013:['CAM','R'], 165196:['CAM','R'], 168803:['Winger','H'], 167555:['FB','R'],
  181533:['Winger','R'], 181717:['CAM','R'], 181845:['ST','H'], 184247:['CAM','R'],
  185057:['ST','H'], 169280:['Winger','R'], 172351:['CAM','R'], 173082:['ST','R'],
  185070:['Winger','R'], 144334:['CM','R'], 147764:['Winger','H'], 149418:['Winger','H'],
  144577:['Winger','R'], 146085:['CAM','H'], 148526:['Winger','H'], 130267:['CM','R'],
  131073:['Winger','H'], 133946:['CAM','R'], 130260:['Winger','H'], 158654:['CAM','R'],
  158503:['Winger','R'], 156845:['CM','H'], 161304:['Winger','R'], 162493:['ST','H'],
  130598:['CAM','R'], 131490:['CAM','H'], 131925:['CM','H'], 132342:['CM','H'],
  132801:['Winger','R'], 131984:['Winger','R'], 135586:['ST','H'], 134476:['Winger','R'],
  108607:['Winger','H'], 161913:['ST','H'], 163244:['ST','H'], 158595:['ST','R'],
  149427:['Winger','H'], 163158:['Winger','R'], 162034:['ST','H'], 170212:['CAM','R'],
  170654:['Winger','H'], 174565:['ST','R'], 152296:['CAM','R'], 141118:['CAM','R'],
  141020:['CM','H'], 166668:['Winger','R'], 163394:['Winger','R'], 167554:['CAM','R'],
  131157:['CAM','H'], 133173:['CAM','H'], 135213:['Winger','R'], 136284:['CAM','H'],
  186626:['ST','H'], 141376:['CM','H']
};

// ── STEP 3 revision ──────────────────────────────────────────────
// HOLD the bad-team row out entirely (wrong team, needs a data fix not a position).
const HELD = new Set([108547]);                        // H. Onyekuru / Arsenal (never played there)
// Rule 1: deep-lying regista in front of the defense -> CDM (Çalhanoğlu at Inter).
const REGISTA_CDM = new Set([145154, 146002, 144334]); // Çalhanoğlu, Inter 2324/2122/2526
// Overrides applied AFTER CLS: the 3 regista->CDM moves + the 28 triage REVIEW->HIGH promotions.
const OVERRIDES = {
  145154:['CDM','H'], 146002:['CDM','H'], 144334:['CDM','H'],           // regista rule
  137533:['CAM','H'],                                                    // Bellingham 24/25
  151525:['CAM','H'], 151851:['CAM','H'],                               // Musiala
  131583:['CAM','H'], 132404:['CAM','H'], 130598:['CAM','H'],           // Foden
  131184:['CAM','H'], 132801:['CAM','H'], 131984:['CAM','H'],           // Bernardo Silva
  130267:['CAM','H'], 152296:['CAM','H'],                               // Szoboszlai
  146206:['CM','H'],                                                     // Zieliński
  148775:['CAM','H'],                                                    // Hamšík
  132839:['CAM','H'],                                                    // Mount
  158654:['CAM','H'],                                                    // Paquetá
  172127:['CAM','H'], 172490:['CAM','H'],                               // van de Beek
  172539:['Winger','H'], 172907:['Winger','H'],                        // Ziyech
  181162:['Winger','H'], 181533:['Winger','H'],                        // Tadić
  180896:['Winger','H'],                                                // Asensio
  141069:['CAM','H'],                                                   // Sarabia
  131461:['ST','H'],                                                    // J. Álvarez
  134476:['ST','H'],                                                    // Martial
  149184:['Winger','H'],                                                // Ménez
  173285:['Winger','H'],                                                // Kuyt
  150598:['ST','H']                                                     // Totti (false-9 that season -> ST)
};

// parse CSV (simple, our data has no embedded newlines; quoted commas handled)
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const head = lines[0].split(',');
  return lines.slice(1).map(line => {
    const cells = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"' && line[i+1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else { if (c === '"') q = true; else if (c === ',') { cells.push(cur); cur = ''; } else cur += c; }
    }
    cells.push(cur);
    const o = {}; head.forEach((h, i) => o[h] = cells[i]); return o;
  });
}
const esc = v => { v = (v == null) ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };

const rows = parseCSV(fs.readFileSync(IN, 'utf8'));
const missing = [];
const high = [], review = [], held = [];
const ruleMoves = [], triageMoves = [];
for (const r of rows) {
  const cid = Number(r.card_id);
  if (HELD.has(cid)) { held.push(r); continue; }
  const base = CLS[cid];
  if (!base) { missing.push(cid); continue; }
  let bucket = base[0], conf = base[1];
  const ov = OVERRIDES[cid];
  if (ov) {
    const before = bucket;
    bucket = ov[0]; conf = ov[1];
    const m = { cid, name: r.player_name, team: r.team_name, season: r.season, before, after: bucket };
    (REGISTA_CDM.has(cid) ? ruleMoves : triageMoves).push(m);
  }
  const out = { ...r, assigned_position: bucket, confidence: conf === 'H' ? 'HIGH' : 'REVIEW' };
  (conf === 'H' ? high : review).push(out);
}
const clsIds = new Set(Object.keys(CLS).map(Number));
const extra = [...clsIds].filter(id => !rows.some(r => Number(r.card_id) === id));

const cols = ['card_id','api_player_id','season_year','league_code','player_name','team_name','season','rt','goals','assists','current_position','assigned_position','confidence'];
function writeCsv(path, list) {
  const lines = [cols.join(',')];
  list.forEach(r => lines.push(cols.map(c => esc(r[c])).join(',')));
  fs.writeFileSync(path, lines.join('\n') + '\n');
}
writeCsv(HIGH, high);
writeCsv(REVIEW, review);

console.error('pulled rows: ' + rows.length);
console.error('classified HIGH (write): ' + high.length);
console.error('classified REVIEW (CCC): ' + review.length);
console.error('HELD (bad-team, excluded): ' + held.length + (held.length ? ' [' + held.map(h => h.card_id + ' ' + h.player_name + '/' + h.team_name).join('; ') + ']' : ''));
console.error('SUM (high+review+held): ' + (high.length + review.length + held.length));
console.error('UNCLASSIFIED pulled card_ids (should be 0): ' + (missing.length ? missing.join(',') : 'none'));
console.error('CLS ids not in pull (should be 0): ' + (extra.length ? extra.join(',') : 'none'));

// assigned-bucket distribution
const dist = {};
[...high, ...review].forEach(r => { dist[r.assigned_position] = (dist[r.assigned_position] || 0) + 1; });
console.error('assigned bucket distribution: ' + JSON.stringify(dist));

console.error('\n── moved by RULE (regista->CDM / false-9->ST) ──');
if (!ruleMoves.length) console.error('  (none)');
ruleMoves.forEach(m => console.error('  ' + m.cid + '  ' + m.before + ' -> ' + m.after + '   ' + m.name + '  ' + m.team + '  ' + m.season));
console.error('\n── promoted REVIEW->HIGH by triage (' + triageMoves.length + ') ──');
triageMoves.forEach(m => console.error('  ' + m.cid + '  ' + (m.before === m.after ? m.after + ' (bucket kept)' : m.before + ' -> ' + m.after) + '   ' + m.name + '  ' + m.team + '  ' + m.season));
