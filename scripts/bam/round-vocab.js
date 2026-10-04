/*  ROUND VOCABULARY LOOKUP , RUNS BEFORE THE UEFA EXPORT, NOT AFTER.
    ================================================================
    WHY IT GATES THE EXPORT: the round string is load-bearing twice. It decides
    whether a tie is a final (neutral venue) and whether it is a knockout tie
    (extra time, so the 90-minute score and the final score differ). A wrong
    round label turns a knockout tie into a group match and changes the SCORE.
    That is a scores defect wearing a labelling defect's clothes, and no
    downstream check would catch it , both numbers are plausible.

    ALREADY PROVEN NECESSARY, WITHOUT A SINGLE CALL: "Semi-finals" and
    "Quarter-finals" both CONTAIN the word "final". A naive /final/i test flags
    every knockout round as a neutral-venue final. That was caught by a negative
    control in neutral-venues.js before this script existed, which is exactly why
    the vocabulary is enumerated rather than assumed.

    IT STOPS RATHER THAN GUESSING. Any round string that does not match a known
    pattern is reported as AMBIGUOUS and the script exits non-zero. There should
    be very few; a guess on one of them is the failure this lookup exists to
    prevent, so it is not permitted to make one.
*/
'use strict';
require('dotenv').config();
const BASE='https://v3.football.api-sports.io', KEY=process.env.APIFOOTBALL_KEY;
const COMPS=[{id:2,name:'Champions League',from:2014},
             {id:3,name:'Europa League',from:2014},
             {id:848,name:'Conference League',from:2021}];
const TO=2026;

/*  CLASSIFICATION CARRIES STRUCTURE, NOT JUST STAGE NAME , AND THAT DISTINCTION
    IS THE WHOLE POINT. What a consumer needs is not "which stage" but "is this a
    two-legged knockout", because THAT decides whether extra time applies and
    therefore whether the 90-minute score and the final score differ.

    PRELIMINARY ROUND AND PLAY-OFF ROUND ARE TWO-LEGGED KNOCKOUTS. They are
    classified as knockout on TIE STRUCTURE, not because of the word in the label.
    Anyone later reading "Play-offs -> knockout" must not conclude it was a naming
    convention: a UEFA qualifying tie is two legs with extra time in the second,
    and a consumer that read the stage name and treated qualifying as "not
    knockout" would apply the wrong extra-time rule. That is the same scores
    defect in labelling clothes this lookup exists to prevent, and naming buckets
    after stages rather than structure is how it gets reintroduced.

    `single_match` is the other half: a FINAL is one match at a neutral ground, so
    extra time applies but there is no aggregate. Group and league-phase games are
    single matches with no extra time at all.

    Anything not matched is AMBIGUOUS and the script STOPS. There is no fallback.  */
const RULES=[
  [/^group\b|group stage/i,                 {stage:'GROUP',        knockout:false, two_legged:false, extra_time:false}],
  [/league (stage|phase)/i,                 {stage:'LEAGUE_PHASE', knockout:false, two_legged:false, extra_time:false}],
  [/^final$|^final stage$/i,                {stage:'FINAL',        knockout:true,  two_legged:false, extra_time:true}],
  [/semi-?finals?/i,                        {stage:'SEMI_FINAL',   knockout:true,  two_legged:true,  extra_time:true}],
  [/quarter-?finals?/i,                     {stage:'QUARTER_FINAL',knockout:true,  two_legged:true,  extra_time:true}],
  [/round of \d+|1\/8|1\/16|knockout round play-?offs/i,
                                            {stage:'KNOCKOUT_ROUND',knockout:true, two_legged:true,  extra_time:true}],
  /*  QUALIFYING LAST, so a knockout-round play-off is caught above it. These are
      two-legged knockouts despite the stage name , see the note above.  */
  [/qualifying|preliminary|play-?offs? round|play-?off round/i,
                                            {stage:'QUALIFYING',   knockout:true,  two_legged:true,  extra_time:true}],
];
function classify(s){ for(const [re,k] of RULES) if(re.test(s)) return k; return null; }

let calls=0,nextSlot=0; const SP=Math.ceil(60000/330);
const slot=async()=>{const n=Date.now(),a=Math.max(n,nextSlot);nextSlot=a+SP;if(a>n)await new Promise(r=>setTimeout(r,a-n));};
async function api(p){for(let i=0;i<4;i++){await slot();
  const r=await fetch(BASE+p,{headers:{'x-apisports-key':KEY},signal:AbortSignal.timeout(30000)});
  const j=await r.json(); const e=j.errors,bad=Array.isArray(e)?e.length>0:(e&&Object.keys(e).length>0);
  if(bad&&e.rateLimit){nextSlot=Date.now()+15000;continue;}
  if(bad) throw new Error(JSON.stringify(e));
  calls++; return j;} throw new Error('rate limited: '+p);}

(async()=>{
  const ambiguous=[], vocab={};
  for(const c of COMPS){
    vocab[c.name]={};
    for(let y=c.from;y<=TO;y++){
      let j; try{ j=await api(`/fixtures/rounds?league=${c.id}&season=${y}`); }
      catch(e){ console.log(`  ${c.name} ${y}: FAILED , ${e.message}`); continue; }
      const rounds=j.response||[];
      vocab[c.name][y]=rounds;
      for(const r of rounds){ const k=classify(r); if(!k) ambiguous.push({comp:c.name,season:y,round:r});
        else (vocab[c.name]._cls=vocab[c.name]._cls||{})[r]=k.stage+(k.two_legged?' (two-legged, ET)':k.extra_time?' (single match, ET)':'');}
    }
  }
  console.log('=== ROUND VOCABULARY, per competition per season ===');
  for(const [comp,seasons] of Object.entries(vocab)){
    console.log(`\n${comp}`);
    const seen={};
    for(const [y,rounds] of Object.entries(seasons)){
      console.log(`  ${y}: ${rounds.length} rounds , ${rounds.join(' | ')}`);
      for(const r of rounds) (seen[r]=seen[r]||[]).push(y);
    }
    const shifting=Object.entries(seen).filter(([,ys])=>ys.length<Object.keys(seasons).length);
    if(shifting.length){
      console.log(`  VOCABULARY SHIFTS , strings not present in every season:`);
      for(const [r,ys] of shifting) console.log(`     ${JSON.stringify(r)} in ${ys.join(', ')}`);
    }
  }
  console.log(`\ncalls: ${calls}`);
  if(ambiguous.length){
    console.log(`\nAMBIGUOUS ROUND STRINGS , ${ambiguous.length}. STOPPING RATHER THAN CHOOSING:`);
    for(const a of ambiguous) console.log(`  ${a.comp} ${a.season}: ${JSON.stringify(a.round)}`);
    console.log('\nEach needs a ruling: group, qualifying, knockout, or final. A guess here');
    console.log('changes the extra-time rule and therefore the score.');
    process.exit(1);
  }
  console.log('\nOK , every round string classified, none ambiguous.');
})().catch(e=>{console.error('FAILED:',e.message);process.exit(1);});
