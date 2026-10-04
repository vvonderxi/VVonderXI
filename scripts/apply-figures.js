/*  APPLY FIGURES , the missing half of item 24.
    ================================================================
    gen-index-figures.js writes scripts/figures/index-figures.json. Until today
    NOTHING READ IT. The one file that claimed to , docs/pdf/vv-index.html , says
    "EVERY LIVE NUMBER IS INTERPOLATED ... none is typed" and carried 18,725,
    32.8% and 872 as typed literals, with no fetch and no build step. A file that
    asserts it is generated and is not is worse than one that admits it is typed:
    the claim is what stops anyone checking. Same shape as the backfill comment
    that said "every key is checked for an existing row first".

    HOW IT WORKS, and why not a fetch: these pages have no build step and must
    work as static HTML. So the figure lives in the markup as real text inside
    <span data-fig="key">, and this script REWRITES that text from the JSON.
    Shipped HTML stays static; refreshing is one command.

    --check exits 1 if any rendered figure differs from the generated value.
    THAT is the tripwire the hand-typed numbers never had , a figure can now
    drift only if someone edits the markup and skips the check.

    WHAT IT DELIBERATELY DOES NOT TOUCH , the three classes are not the same:
      LIVE      counts over the matview          -> data-fig, rewritten here
      EVENTS    "780 recovered", "10,770 moved"  -> NEVER. Re-deriving a record
                of something that happened against today's data rewrites history.
      CONSTANTS 300-min floor, band thresholds,
                and the rank-anchored 12/150/650/138
                                                 -> NEVER. SS C: the band
                populations are fixed BY CONSTRUCTION because the edges are rank
                anchors, so a query returns them by definition. Generating them
                would present a structural constant as a measurement. They move
                only on a RECUT, and then every copy changes in one commit.
*/
'use strict';
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const FIG=path.join(ROOT,'scripts','figures','index-figures.json');
const CHECK=process.argv.includes('--check');
const TARGETS=process.argv.includes('--only')
  ? [process.argv[process.argv.indexOf('--only')+1]]
  /*  playbook.html JOINED 2026-10-02, WHEN THE SCORING WALK MOVED THERE FROM THE VV INDEX.
      The walk carries generated figures, and a page that is not scanned turns them into
      hardcoded numbers the moment they arrive , the exact failure this script exists to
      prevent, arriving by a move rather than by an edit. ANY PAGE THAT GAINS A data-fig
      HOST MUST BE ADDED HERE IN THE SAME CHANGE.  */
  : ['docs/pdf/vv-index.html','_demo_vvindex.html','vvindex.html','playbook.html'];

/*  A FILE WITH NO data-fig SPANS IS A FAILURE UNLESS IT IS EXEMPTED HERE, BY NAME, WITH A
    REASON. Until 2026-09-20 --check printed "no data-fig spans" and exited 0, so the tripwire
    reported OK while the page it exists for carried none , a check that passes by finding
    nothing. The live VV Index is unwired ON PURPOSE (its rebuild is punchlist item 14 and the
    wiring lands with it, rather than being done twice), and that intent belongs in code where
    the check can hold it, not in a commit message nobody re-reads.
    WHEN ITEM 14 SHIPS, DELETE THE ENTRY , the check then fails until the page is wired, which
    is the reminder.  */
/*  vvindex.html WAS EXEMPT UNTIL 2026-09-27 , the exemption named item 14 as its trigger and
    item 14 has now landed, so it is gone. Every figure on that page is generated.
    IT EARNED ITSELF ON THE WAY OUT: the page had been carrying 18,725 and 872, generated on
    2026-09-19, and a fresh run returns 19,138 and 878. The numbers had aged by 413 and 6 while
    reading as facts, which is the entire argument for this file.  */
const UNWIRED={};

const doc=JSON.parse(fs.readFileSync(FIG,'utf8'));
const byKey={}; for(const f of doc.figures) byKey[f.key]=f;

/*  Formatting is part of the figure, not of the page , a count reads 18,725 and
    a share reads 32.8. Keeping it here means two pages cannot format the same
    number differently, which is its own kind of drift.  */
function render(key){
  const f=byKey[key];
  if(!f) throw new Error(`unknown figure key: ${key}`);
  return /_share$/.test(key) ? String(f.value) : f.value.toLocaleString('en-GB');
}

let bad=0, touched=0, files=0;
for(const rel of TARGETS){
  const p=path.join(ROOT,rel);
  if(!fs.existsSync(p)){ console.log(`  ${rel}: not present, skipped`); continue; }
  let s=fs.readFileSync(p,'utf8');
  const re=/(<span\b[^>]*\bdata-fig="([a-z_]+)"[^>]*>)([\s\S]*?)(<\/span>)/g;
  let n=0, mism=0, out=s.replace(re,(m,open,key,cur,close)=>{
    const want=render(key); n++;
    if(cur!==want){ mism++; if(CHECK) console.log(`  DRIFT ${rel} ${key}: page "${cur}" vs generated "${want}"`); }
    return open+want+close;
  });
  /*  SERIES, NOT ONLY SCALARS , and this exists because a DRAWING goes stale exactly the way
      a number does, only more quietly. The career-spread strip plots twelve real rt values.
      Typed into the markup they would be a fourth embedded snapshot, and SS C records that
      every one of those has gone stale in silence. A `data-series` attribute is rewritten and
      checked here by the same mechanism as a span, so a recalibration cannot leave the
      picture confidently drawing last month's career.
      RAW, NOT FORMATTED: a series is machine input for the renderer, so it must not go
      through render(), which inserts thousands separators.  */
  /*  SERIES, NOT ONLY SCALARS , and this exists because a DRAWING goes stale exactly the way
      a number does, only more quietly. The strips on the VV Index plot real rt values and real
      league counts. Typed into the markup they would be embedded snapshots, and SS C records
      that every one of those on this platform has gone stale in silence.

      THE SUFFIX FORM IS THE WHOLE POINT AND THE FIRST VERSION MISSED IT. A figure often needs
      a PARALLEL series , values plus their year labels, counts plus their league names , so
      the attribute is `data-fig-series-<name>` paired with `data-<name>`, and the bare
      `data-fig-series` pairs with `data-series`. Two such pairs were live and untracked while
      this checker reported OK, which is the failure mode it exists to prevent: a check that
      passes over the thing it cannot see.

      RAW, NOT FORMATTED: a series is machine input for a renderer, so it must not go through
      render(), which inserts thousands separators.  */
  /*  LAZY, NOT GREEDY, AND THE GREEDY VERSION FAILED SILENTLY. With `[^>]*` the engine
      skipped PAST `data-series` to a later `data-years` on the same element, the suffix
      check then refused the pair, and both series went untracked while the run reported
      "0 drifted". A quantifier is a correctness decision here, not a style one.  */
  /*  NO TAG ANCHOR, AND THAT ANCHOR MADE THIS A CHECK THAT COULD NOT FAIL. Anchoring on
      `<tag` meant the scan resumed INSIDE the element it had just matched, so a second
      series on the SAME element was unreachable , the career strip's year labels and the
      league split's names were both invisible. Proven rather than reasoned: two deliberate
      drifts were planted and the run reported "17 figures, 0 drifted". The pair is matched
      on its own, bounded by the tag because `[^>]` cannot leave it.  */
  const reS=/(\bdata-fig-series(?:-([a-z]+))?="([a-z_]+)"[^>]*?\bdata-([a-z]+)=")([^"]*)(")/g;
  out=out.replace(reS,(m,open,suffix,key,attr,cur,close)=>{
    const want=(suffix||'series');
    if(attr!==want) return m;            // the pair does not match, leave it and let the audit below shout
    const f=byKey[key]; if(!f) throw new Error(`unknown figure key: ${key}`);
    const val=String(f.value); n++;
    if(cur!==val){ mism++; if(CHECK) console.log(`  DRIFT ${rel} ${key}: page "${cur}" vs generated "${val}"`); }
    return open+val+close;
  });
  /*  AND AN UNPAIRED SERIES IS A FAILURE, NOT A SHRUG. A `data-fig-series-x` with no matching
      `data-x` is a figure the generator believes it owns and does not.  */
  const declared=(out.match(/data-fig-series(?:-[a-z]+)?="/g)||[]).length;
  const paired=(out.match(/data-fig-series(?:-[a-z]+)?="[a-z_]+"[^>]*?\bdata-[a-z]+="/g)||[]).length;
  if(declared!==paired){ console.log(`  ${rel}: ${declared-paired} series declared with no matching data- attribute`); bad++; }

  files++;
  if(n===0){
    if(UNWIRED[rel]) console.log(`  ${rel}: no data-fig spans , EXEMPT (${UNWIRED[rel]})`);
    else { console.log(`  ${rel}: NO data-fig SPANS and not exempt , the figures here are typed, not generated`); bad++; }
    continue;
  }
  if(UNWIRED[rel]){ console.log(`  ${rel}: ${n} data-fig span(s) found, but it is listed UNWIRED , remove the exemption`); bad++; }
  if(CHECK){ bad+=mism; console.log(`  ${rel}: ${n} figures, ${mism} drifted`); }
  else { if(out!==s){ fs.writeFileSync(p,out); touched++; } console.log(`  ${rel}: ${n} figures written`); }
}
/*  NOTHING CARRYING FIGURES MAY SIT OUTSIDE THE TARGET LIST. TARGETS is hand-written, which
    makes it the same shape of blind spot as the anchored regex: a new page with data-fig spans
    would be rewritten by nobody and checked by nobody, and every run would still say OK.
    Measured 2026-09-27: the three files carrying figures ARE the three targets, so this guard
    starts clean , which is exactly when to add it, rather than after a page has drifted.  */
/*  AND THE GUARD IS SCOPED TO A FULL RUN. Under --only TARGETS is one file, so the other two
    carried-figures pages read as unguarded and the run failed on its own narrowing , a guard
    that fires when nothing is wrong teaches everyone to ignore it, which SEC C records as worse
    than no guard at all.  */
if(!process.argv.includes('--only')){
  const roots=['.','docs/pdf'];
  const seen=new Set(TARGETS.map(t=>path.normalize(t)));
  for(const dir of roots){
    const abs=path.join(ROOT,dir);
    if(!fs.existsSync(abs)) continue;
    for(const f of fs.readdirSync(abs)){
      if(!f.endsWith('.html')) continue;
      const rel=path.normalize(path.join(dir,f));
      if(seen.has(rel)) continue;
      const body=fs.readFileSync(path.join(abs,f),'utf8');
      if(/\bdata-fig(-series)?(-[a-z]+)?="/.test(body)){
        console.log(`  ${rel}: carries generated figures but is NOT in TARGETS , nothing checks it`);
        bad++;
      }
    }
  }
}

if(CHECK){
  console.log(bad? `\nFAIL , ${bad} problem(s): a figure drifted, or a file is unwired without an exemption.`
                 : `\nOK , every data-fig figure matches the generator (${files} files).`);
  process.exit(bad?1:0);
}
console.log(`\ndone , ${files} file(s) scanned, ${touched} rewritten.`);
