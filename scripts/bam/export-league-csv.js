/*  BAM EXPORT v2 , CSV, ONE WAY, READ-ONLY.
    Holds no Supabase client and no write path into VVonderXI. Every write is
    asserted to land inside exports/bam/.

    FORMAT: football-data.co.uk column shape. PLAYED matches only, one row each.
    Counts, through-date and the missing flag live in meta_<SEASON>.json beside
    the CSV, never as rows inside it.

    SHOTS COST ONE CALL PER MATCH. /fixtures/statistics takes a fixture id and
    nothing else , a league+season request is refused ("The Fixture field is
    required"). There is no bulk route, so HS/AS/HST/AST are the entire cost of
    this export.

    xG IS NOT SERVED. Probed on Eredivisie, Premier League and La Liga: the
    statistics payload carries 16 types and none is expected_goals. HxG and AxG
    ship EMPTY and the sidecar says so. They are not derived from shots, because
    a number we invented is not the same thing as BAM computing its own proxy.
*/
'use strict';
const fs = require('fs'), path = require('path');
require('dotenv').config();

const BASE='https://v3.football.api-sports.io';
const KEY=process.env.APIFOOTBALL_KEY;
if(!KEY){console.error('APIFOOTBALL_KEY not set');process.exit(1);}
const ROOT=path.resolve(__dirname,'..','..','exports','bam');

function writeOut(rel,text){
  const full=path.resolve(ROOT,rel);
  if(full!==ROOT && !full.startsWith(ROOT+path.sep))
    throw new Error('refusing to write outside exports/bam/: '+full);
  fs.mkdirSync(path.dirname(full),{recursive:true});
  fs.writeFileSync(full,text);
}
const arg=(n,d)=>{const a=process.argv.slice(2),i=a.indexOf('--'+n);return i<0?d:a[i+1];};
const LEAGUE=Number(arg('league')), SLUG=arg('slug'),
      FROM=Number(arg('from')), TO=Number(arg('to'));

const PLAYED=new Set(['FT','AET','PEN']);
const KNOWN_NR=new Set(['PST','CANC','ABD','SUSP','INT','TBD','AWD','WO']);

let calls=0;

/*  GLOBAL PACER. The ceiling is 450 requests/minute and my first version paced
    per-worker: 6 workers each sleeping 80ms between calls is ~1,200/min, not the
    ~300 the comment claimed. It died at fixture 164726. Rate is a property of the
    WHOLE job, so it is enforced here, once, across every worker.  */
const PER_MIN=330, SPACING=Math.ceil(60000/PER_MIN);
let nextSlot=0;
async function slot(){
  const now=Date.now();
  const at=Math.max(now,nextSlot);
  nextSlot=at+SPACING;
  if(at>now) await new Promise(r=>setTimeout(r,at-now));
}

async function api(p){
  for(let a=1;a<=6;a++){
    await slot();
    let j;
    try{
      const r=await fetch(BASE+p,{headers:{'x-apisports-key':KEY},signal:AbortSignal.timeout(30000)});
      if(r.status===429){ nextSlot=Date.now()+15000; continue; }
      j=await r.json();
    }catch(e){ if(a===6) throw e; nextSlot=Date.now()+2000; continue; }
    calls++;
    const e=j.errors, bad=Array.isArray(e)?e.length>0:(e&&Object.keys(e).length>0);
    /*  THE RATE LIMIT ARRIVES AS HTTP 200 WITH AN `errors.rateLimit` BODY, NOT AS
        A 429. My first version treated every body error as fatal, so the 429
        branch above could never fire and a transient limit killed the run.  */
    if(bad && e.rateLimit){ nextSlot=Date.now()+15000; continue; }
    if(bad) throw new Error('API error on '+p+': '+JSON.stringify(e));
    /*  PAGE SIZE IS PER-ENDPOINT, NOT PER-API, AND A GUARD VERIFIED ON ONE ENDPOINT
        DOES NOT TRANSFER. The v1 JSON exporter had this check; the v2 CSV rewrite
        dropped it, so a paged response would have had page one written as the whole
        season with nothing failing , the season file would simply be short.

        THE TELL IS A ROUND NUMBER WHERE THE DOMAIN DOES NOT PRODUCE ONE. A league
        season is 182 or 306 or 552 matches; it is never exactly 100. The same shape
        is already recorded in CLAUDE.md for PostgREST ("a query that returns EXACTLY
        1000 rows has hit the cap, not the end of the data"). The cap VALUE is not
        the lesson and differs per endpoint , the INSTRUMENT is: suspect any count
        that is suspiciously round, and check paging rather than the row count.

        This throws rather than paginating, deliberately: silently fetching page two
        would hide that an endpoint's behaviour had changed. A loud stop is the
        correct outcome for something that should not happen.  */
    if(j.paging && j.paging.total > 1)
      throw new Error(`PAGED RESPONSE , ${j.paging.total} pages on ${p}. `
        + `Page size is per-endpoint; this endpoint is no longer returning a whole `
        + `season in one call. Do not write this season until it is handled.`);
    return j;
  }
  throw new Error('rate limited after 6 attempts: '+p);
}
/* DD/MM/YYYY, from the UTC kickoff instant. */
const ddmmyyyy=iso=>{const d=new Date(iso);
  return String(d.getUTCDate()).padStart(2,'0')+'/'+String(d.getUTCMonth()+1).padStart(2,'0')+'/'+d.getUTCFullYear();};
const csvCell=v=>{const s=v==null?'':String(v);
  return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};

/* Paced fan-out. 450/min is the ceiling; this targets ~300/min. */
async function mapLimit(items,limit,fn){
  const out=new Array(items.length); let i=0;
  await Promise.all(Array.from({length:limit},async()=>{
    while(i<items.length){const k=i++; out[k]=await fn(items[k]);}
  }));
  return out;
}

(async()=>{
  const retrievedAt=new Date().toISOString();
  const nameSeen=new Map();   // club string -> {matches, seasons:Set, id}
  const manifest={league_id:LEAGUE,slug:SLUG,format:'football-data.co.uk columns',
    retrieved_at:retrievedAt,xg:'NOT SERVED by API-Football; HxG/AxG are empty by design',
    seasons:[]};

  for(let year=FROM;year<=TO;year++){
    /*  RESUME. A run that dies partway must not re-spend a call per match on the
        seasons it already finished. A season counts as done only if BOTH files
        exist AND the meta parses and names this season.  */
    const csvP=path.resolve(ROOT,SLUG,`${SLUG}_${year}.csv`);
    const metaP=path.resolve(ROOT,SLUG,`meta_${year}.json`);
    if(!process.argv.includes('--force') && fs.existsSync(csvP) && fs.existsSync(metaP)){
      try{
        const m=JSON.parse(fs.readFileSync(metaP,'utf8'));
        if(m.season===year){
          manifest.seasons.push({season:year,through:m.through,match_count:m.match_count,
            missing_count:m.missing_count,shots:m.shots_coverage.available,
            rows_with_shots:m.shots_coverage.rows_with_shots});
          for(const line of fs.readFileSync(csvP,'utf8').trim().split('\n').slice(1)){
            const c=line.split(','); for(const nm of [c[1],c[2]]){
              if(!nameSeen.has(nm)) nameSeen.set(nm,{matches:0,seasons:new Set(),id:''});
              const e=nameSeen.get(nm); e.matches++; e.seasons.add(year); } }
          console.log(`  ${year}: already done, skipped (${m.match_count} played)`);
          continue;
        }
      }catch(e){/* unreadable meta: fall through and redo the season */}
    }
    const fx=await api(`/fixtures?league=${LEAGUE}&season=${year}`);
    const rows=fx.response||[];
    if(!rows.length){console.log(`  ${year}: EMPTY`);continue;}
    const all=rows.slice().sort((a,b)=>a.fixture.date.localeCompare(b.fixture.date));
    const played=all.filter(f=>PLAYED.has(f.fixture.status.short));

    /* Probe ONE fixture before spending a call per match: if the season has no
       statistics coverage, every one of those calls returns an empty payload. */
    let shots=false;
    if(played.length){
      const p=await api(`/fixtures/statistics?fixture=${played[0].fixture.id}`);
      shots=(p.results||0)>0;
    }
    let stats={};
    if(shots){
      const got=await mapLimit(played,4,async f=>{
        try{ const s=await api(`/fixtures/statistics?fixture=${f.fixture.id}`);
             return [f.fixture.id,s.response||[]]; }
        catch(e){ return [f.fixture.id,null]; }
      });
      stats=Object.fromEntries(got);
    }
    const pick=(arr,type)=>{ if(!arr)return '';
      const s=arr.find(x=>x.type===type); const v=s?s.value:null; return v==null?'':v; };

    /*  Round and RegularSeason are APPENDED so the agreed column order is unchanged.
    LABEL AND KEEP, NEVER FILTER AT EXPORT. A play-off between two top-flight clubs
    is a real match correctly labelled; dropping it here would make the export the
    place information is lost, and BAM could not recover it. With these two columns
    every filtering policy is one predicate on the consumer's side:
      fd-consistent  RegularSeason = 1
      no 2nd-tier    RegularSeason = 1 OR both clubs in the regular-season set
      everything     no predicate
    (fd itself keeps play-offs , B1_2425.csv holds 312 rows against 240 regular-season
     matches , so filtering here would have made us LESS consistent with fd, not more.) */
    const lines=['Date,HomeTeam,AwayTeam,FTHG,FTAG,HTHG,HTAG,HS,AS,HST,AST,HxG,AxG,Round,RegularSeason'];
    let shotRows=0;
    /*  EVERY LISTED FIXTURE IS A ROW, PLAYED OR NOT (2026-09-17). BAM cannot price a
        match it cannot see, and the scheduled ones are in the SAME response that carried
        the results , they were being filtered out, so this costs no extra call. An
        unplayed row carries its date and both clubs and leaves every score and shot
        column EMPTY, never 0: a 0 is a result and an empty cell is not.
        STATISTICS ARE STILL FETCHED FOR PLAYED FIXTURES ONLY, so the call cost is
        unchanged , an unplayed match has no statistics to fetch.  */
    for(const f of all){
      const st=stats[f.fixture.id];
      const h=st?st.find(t=>t.team.id===f.teams.home.id)?.statistics:null;
      const a=st?st.find(t=>t.team.id===f.teams.away.id)?.statistics:null;
      const isPlayed=PLAYED.has(f.fixture.status.short);
      const HS=isPlayed?pick(h,'Total Shots'):'',  AS=isPlayed?pick(a,'Total Shots'):'';
      const HST=isPlayed?pick(h,'Shots on Goal'):'',AST=isPlayed?pick(a,'Shots on Goal'):'';
      if(HS!==''||AS!=='') shotRows++;
      /*  HALF-TIME COMES FREE , score.halftime is in the SAME /fixtures payload as the
          full-time score. No second endpoint, no extra call. Verified on 54 of 54 played
          Eredivisie fixtures before this was written.  */
      /*  REGULAR SEASON IS DECIDED BY THE API'S OWN ROUND LABEL, not by a list we
          maintain. 'Regular Season - N' is the league phase; everything else is a
          play-off, group or final. Verified on four league-seasons: the regular-season
          rounds match KNOWN_SIZE exactly (ERE 2022 = 18, BPL 2025 = 16, BL 2018 = 18,
          PL 2015 = 20) while the full fixture list does not.  */
      const round=(f.league&&f.league.round)||'';
      const isRegular=/^Regular Season/i.test(round);
      const ht=f.score&&f.score.halftime||{};
      const HTHG=isPlayed&&ht.home!=null?ht.home:'', HTAG=isPlayed&&ht.away!=null?ht.away:'';
      for(const [nm,id] of [[f.teams.home.name,f.teams.home.id],[f.teams.away.name,f.teams.away.id]]){
        if(!nameSeen.has(nm)) nameSeen.set(nm,{matches:0,seasons:new Set(),id});
        const e=nameSeen.get(nm); e.matches++; e.seasons.add(year);
      }
      lines.push([ddmmyyyy(f.fixture.date),f.teams.home.name,f.teams.away.name,
        isPlayed&&f.goals.home!=null?f.goals.home:'',
        isPlayed&&f.goals.away!=null?f.goals.away:'',
        HTHG,HTAG,HS,AS,HST,AST,'','',
        round, isRegular?1:0].map(csvCell).join(','));
    }
    writeOut(path.join(SLUG,`${SLUG}_${year}.csv`),lines.join('\n')+'\n');

    const nowMs=Date.now();
    const missing=rows.filter(f=>Date.parse(f.fixture.date)<nowMs
      && !PLAYED.has(f.fixture.status.short) && !KNOWN_NR.has(f.fixture.status.short));
    const reason={};
    for(const f of rows){const s=f.fixture.status.short; if(KNOWN_NR.has(s)) reason[s]=(reason[s]||0)+1;}
    const through=played.length?ddmmyyyy(played[played.length-1].fixture.date):null;

    const meta={league_id:LEAGUE,slug:SLUG,season:year,
      season_label:`${year}/${String(year+1).slice(2)}`,
      csv_file:`${SLUG}_${year}.csv`, date_format:'DD/MM/YYYY',
      /*  WHAT THE PROVIDER RETURNED, beside what we wrote. Without this a season
          with no fixtures is ambiguous between "the API had none" and "we dropped
          them", and only the second is a defect. Recorded so the coverage check can
          prove which, rather than infer it from the date.  */
      api_results: rows.length,
      through, match_count:played.length, fixtures_listed:rows.length,
      not_yet_played:rows.filter(f=>Date.parse(f.fixture.date)>=nowMs).length,
      unplayed_with_reason:reason,
      missing_count:missing.length,
      missing:missing.map(f=>({fixture_id:f.fixture.id,date:ddmmyyyy(f.fixture.date),
        status:f.fixture.status.short,home:f.teams.home.name,away:f.teams.away.name})),
      shots_coverage:{available:shots, rows_with_shots:shotRows, rows_total:played.length,
        note: shots ? 'HS/AS/HST/AST populated from /fixtures/statistics'
                    : 'API-Football serves NO fixture statistics for this league-season. '
                      +'HS/AS/HST/AST are EMPTY. Columns retained deliberately.'},
      xg_coverage:{available:false,
        note:'API-Football does not serve xG on this plan. Probed on Eredivisie, Premier League '
            +'and La Liga: 16 statistic types, none expected_goals. HxG/AxG are EMPTY and were '
            +'NOT derived from shots.'},
      missing_flag_definition:'listed, kicked off, no result and no stated reason. Future-dated '
        +'fixtures are not-yet-played and are excluded. Compared against the returned fixture '
        +'list, which is the only fixture source; a match never listed cannot be detected.',
      /*  THE ONE FAILURE MODE IN THIS FORMAT WITH NO SYMPTOM: if a fixture list names a
          club differently from the results, BAM splits that club's rating in two and
          nothing errors. Checked here per season rather than trusted , both sets come
          from the same response, so a mismatch would mean the provider disagreeing with
          itself, but "should be impossible" is not a measurement.  */
      /*  MEMBERSHIP, RECORDED NOT FILTERED. The regular-season club set is the honest
          division membership and comes from the API's own round labels , no external
          table. Everything a consumer needs to reproduce any filtering policy.  */
      regular_season:(function(){
        const reg=all.filter(f=>/^Regular Season/i.test((f.league&&f.league.round)||''));
        const clubs=new Set(); const rounds=new Set();
        for(const f of reg){ clubs.add(f.teams.home.name); clubs.add(f.teams.away.name);
                             rounds.add(f.league.round); }
        const byRound={};
        for(const f of all){ const r=(f.league&&f.league.round)||'(none)';
                             byRound[r]=(byRound[r]||0)+1; }
        return {club_set:[...clubs].sort(), club_count:clubs.size,
                round_count:rounds.size, matches:reg.length,
                matches_by_round_label:byRound,
                note:'club_set is the regular-season membership. Matches outside it are kept '
                    +'in the CSV and marked RegularSeason=0.'};
      })(),
      club_names:(function(){
        const P=new Set(),U=new Set();
        for(const f of all){ const t=PLAYED.has(f.fixture.status.short)?P:U;
          t.add(f.teams.home.name); t.add(f.teams.away.name); }
        const onlyU=[...U].filter(x=>!P.has(x)), onlyP=[...P].filter(x=>!U.has(x));
        return {played:P.size, unplayed:U.size, only_in_unplayed:onlyU, only_in_played:onlyP,
          match: onlyU.length===0 && onlyP.length===0};
      })(),
      retrieved_at:retrievedAt};
    writeOut(path.join(SLUG,`meta_${year}.json`),JSON.stringify(meta,null,2));
    manifest.seasons.push({season:year,through,match_count:played.length,
      missing_count:missing.length,shots:shots,rows_with_shots:shotRows});
    console.log(`  ${year}: ${played.length} played, shots ${shots?shotRows:'NONE'}, `
      +`through ${through}, missing ${missing.length}  [calls ${calls}]`);
  }

  const nl=['ClubName,ApiTeamId,Matches,FirstSeason,LastSeason'];
  for(const [nm,e] of [...nameSeen.entries()].sort((a,b)=>a[0].localeCompare(b[0]))){
    const ys=[...e.seasons].sort();
    nl.push([nm,e.id,e.matches,ys[0],ys[ys.length-1]].map(csvCell).join(','));
  }
  writeOut(`names_${SLUG}.csv`,nl.join('\n')+'\n');
  manifest.total_calls=calls;
  manifest.through=manifest.seasons.map(s=>s.through).filter(Boolean).pop();
  writeOut(path.join(SLUG,'manifest.json'),JSON.stringify(manifest,null,2));
  console.log(`\nDONE. ${manifest.seasons.length} seasons, ${nameSeen.size} club strings, ${calls} API calls.`);
})().catch(e=>{console.error('FAILED:',e.message);process.exit(1);});
