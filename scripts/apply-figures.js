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
  : ['docs/pdf/vv-index.html','_demo_vvindex.html','vvindex.html'];

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
  files++;
  if(n===0){ console.log(`  ${rel}: no data-fig spans`); continue; }
  if(CHECK){ bad+=mism; console.log(`  ${rel}: ${n} figures, ${mism} drifted`); }
  else { if(out!==s){ fs.writeFileSync(p,out); touched++; } console.log(`  ${rel}: ${n} figures written`); }
}
if(CHECK){
  console.log(bad? `\nFAIL , ${bad} figure(s) drifted from the generator.`
                 : `\nOK , every data-fig figure matches the generator (${files} files).`);
  process.exit(bad?1:0);
}
console.log(`\ndone , ${files} file(s) scanned, ${touched} rewritten.`);
