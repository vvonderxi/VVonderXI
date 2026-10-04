/*  WHICH SECTION DID EACH NUMBER COME FROM? Read-only, writes one ledger.
    ======================================================================
    A number taken from a block nothing else corroborates is only as good as the TABLE it came
    from, and SS C records the case that matters: `Sc Heerenveen in het seizoen 2010/11` parsed
    to eight rows whose "numbers" were GOAL TALLIES. Every structural guard passed it. So for
    every number this job would write from a SINGLE uncorroborated block, name the section it
    sits under and refuse the ranked tables.
    THE HEADING IS FOUND BY SPLITTING THE WIKITEXT INTO SECTIONS AND EXTRACTING INSIDE EACH ,
    not by searching for a surname, which finds the first mention anywhere on the page and
    reported a first-team squad as sitting under "Pre-season".
*/
const fs=require('fs');
const {extract}=require('./extract.js');
const {matchOne}=require('./backfill.js');
const UA={'User-Agent':'VVonderXI-squadnum/1.0 (hello@vvonderxi.com)'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const D='migrations/squad_numbers_split_2026-09-22';
/*  RANKED TABLES , the numbers in these are a POSITION or a COUNT, never a shirt. */
/*  `cards` WAS IN THIS LIST AND IT OVER-MATCHED , removed 2026-09-22. "Appearances, goals and
    cards" is a SQUAD table keyed by shirt number, and the regex flagged Andy Carroll's correct
    #9 at Newcastle 2010/11 as a ranked table. `disciplin` already covers the real disciplinary
    tables. THE FLAG'S ONE HIT WAS MY OWN PATTERN.  */
const RANKED=/goalscor|top scor|scorers|assists|disciplin|hat-?trick|clean sheet|award|player of the|capocannonier|marcator|torjager|doelpunten|classifica/i;
(async()=>{
  const found=fs.readFileSync(D+'/found.jsonl','utf8').trim().split('\n').map(JSON.parse);
  const rec=fs.existsSync(D+'/multiblock-recovered.jsonl')
    ? fs.readFileSync(D+'/multiblock-recovered.jsonl','utf8').trim().split('\n').map(JSON.parse) : [];
  const targets=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
  const cardKey={}, cardName={};
  Object.entries(targets).forEach(([k,cs])=>cs.forEach(c=>{cardKey[c.card_id]=k;cardName[c.card_id]=c.player_name;}));
  const held=fs.readFileSync(D+'/held.jsonl','utf8').trim().split('\n').map(JSON.parse);
  const titleOf={}; found.forEach(f=>titleOf[`${f.league_code}|${f.season_year}|${f.club}`]={title:f.title,wiki:f.wiki});
  /*  A CLUB-SEASON CAN APPEAR TWICE IN held.jsonl AND THE FIRST ENTRY IS NOT THE RIGHT ONE.
      Manchester City 2025/26 is held under the WOMEN'S page (pre-gate-fix, `parsed, zero cards
      matched`) and again under the men's page (`5 blocks, held for adjudication`). Taking the
      first put the W.F.C. title against Semenyo's 42 in a report , the NUMBER was right, because
      the agreement run read each held record directly, but the provenance column lied about
      where it came from. PREFER THE MULTI-BLOCK RECORD, which is the one that produced a number. */
  held.forEach(h=>{ if(!h.title) return;
    const better = /blocks, held/.test(h.reason);
    if (!titleOf[h.key] || (better && !titleOf[h.key].fromBlocks))
      titleOf[h.key]={title:h.title,wiki:h.wiki,fromBlocks:better}; });

  // every card that would get a number, with how it was obtained
  const want=[...found.map(f=>({card_id:f.card_id,n:f.shirt_number,how:'clean_page'})),
              ...rec.map(r=>({card_id:r.card_id,n:r.n,how:r.how}))];
  const byPage={};
  want.forEach(w=>{const k=cardKey[w.card_id]; if(!k)return;(byPage[k]=byPage[k]||[]).push(w);});
  const pages=Object.keys(byPage);
  console.log('pages to audit:',pages.length,'covering',want.length,'numbers');
  const out=[]; let n=0;
  for(const key of pages){
    const t=titleOf[key]; if(!t){out.push(...byPage[key].map(w=>({...w,key,section:null,ranked:null,why:'no title recorded'})));continue;}
    let p;try{p=await(await fetch(`https://${t.wiki}.wikipedia.org/w/api.php?format=json&action=parse&prop=wikitext&page=`+encodeURIComponent(t.title),{headers:UA})).json();}catch(e){continue;}
    if(p.error)continue;
    const wt=p.parse.wikitext['*'];
    const parts=wt.split(/^(==+\s*[^=\n]+?\s*=+)\s*$/m);
    const sections=[];
    for(let i=1;i<parts.length;i+=2){
      const head=parts[i].replace(/=/g,'').trim();
      extract(parts[i+1]||'').forEach(b=>sections.push({head,rows:b.rows}));
    }
    for(const w of byPage[key]){
      const hits=sections.filter(s=>{const m=matchOne(cardName[w.card_id],s.rows);
        return m.kind==='match'&&Number(m.row.no)===w.n;});
      const heads=[...new Set(hits.map(h=>h.head))];
      out.push({...w,key,title:t.title,name:cardName[w.card_id],sections:heads,
                ranked:heads.length?heads.every(h=>RANKED.test(h)):null});
    }
    if(++n%100===0)console.log('  ',n,'/',pages.length);
    await sleep(250);
  }
  fs.writeFileSync(D+'/section-audit.jsonl',out.map(x=>JSON.stringify(x)).join('\n')+'\n');
  const single=out.filter(x=>x.how!=='blocks_agree');
  const tally={}; single.forEach(x=>(x.sections.length?x.sections:['(none found)']).forEach(h=>tally[h]=(tally[h]||0)+1));
  console.log('\nSECTION HEADINGS FOR THE UNCORROBORATED NUMBERS (single block or clean page):',single.length);
  Object.entries(tally).sort((a,b)=>b[1]-a[1]).slice(0,22).forEach(([k,v])=>console.log(`  ${String(v).padStart(4)}  ${k}`));
  console.log('\n  from a RANKED table (excluded):',single.filter(x=>x.ranked===true).length);
  console.log('  section could not be located  :',single.filter(x=>!x.sections.length).length);
})();
