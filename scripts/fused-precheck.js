/*  SITTING 3 PRE-CHECK , READ-ONLY. IT WRITES NOTHING.
    ================================================================================
    Run before the canary. It re-derives the three figures the build plan says to re-check
    rather than trust, and it measures one consequence the plan does not contain: what the
    300-minute floor does when a fused card is reduced to one club's share.

      node scripts/fused-precheck.js

    THE FLOOR IS THE FINDING. `scored` in player_card_view needs minutes >= 300 AND goals NOT
    NULL. A fused card carries two clubs' minutes, so reducing it to the named club can push it
    UNDER the floor and null an rt that exists today , a visible change on a live card, and the
    scope's line that "the visible exposure is almost nil" was about rt BANDS, not about cards
    losing their score.
*/
require('dotenv').config({ quiet: true });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const CAND = 'scripts/figures/fused-candidates.json';

(async () => {
  const cand = JSON.parse(fs.readFileSync(CAND, 'utf8'));
  const ids = cand.map(c => c.card_id);
  let rows = [];
  for (let i = 0; i < ids.length; i += 200){
    const { data, error } = await sb.from('player_card_mv')
      .select('card_id,api_player_id,player_name,season_year,league_code,team_name,minutes,appearances,goals,rt,position_pool,def_share_pct')
      .in('card_id', ids.slice(i, i + 200));
    if (error) throw new Error(error.message);
    rows = rows.concat(data);
  }
  const by = {}; rows.forEach(r => by[r.card_id] = r);

  let present = 0, namesLargest = 0, notLargest = [], threeClub = 0;
  let losesRt = 0, keepsRt = 0, alreadyNull = 0, newRows = 0, newUnder = 0;
  const losers = [];
  cand.forEach(c => {
    const r = by[c.card_id]; if (!r) return; present++;
    if (c.blocks.length > 2) threeClub++;
    const named = c.blocks.slice().sort((a,b) => b.min - a.min)[0];
    if (named.team === r.team_name) namesLargest++;
    else notLargest.push(c.name + ' ' + c.key + ' card ' + r.team_name + ' vs largest ' + named.team);
    c.blocks.filter(b => b !== named).forEach(b => { newRows++; if (b.min < 300) newUnder++; });
    if (r.rt == null) { alreadyNull++; return; }
    if (named.min < 300){ losesRt++; losers.push({ card_id:r.card_id, name:r.player_name, season:r.season_year,
      club:r.team_name, rt:r.rt, was:r.minutes, becomes:named.min }); }
    else keepsRt++;
  });

  console.log('RE-CHECKED, NOT TRUSTED');
  console.log('  candidates present in the matview : ' + present + ' of ' + cand.length);
  console.log('  three-club cards                  : ' + threeClub);
  console.log('  name their largest half           : ' + namesLargest + '   counter-examples ' + notLargest.length);
  notLargest.forEach(x => console.log('     ' + x));
  console.log('\nTHE 300-MINUTE FLOOR , what reduction does');
  console.log('  cards that KEEP a scored rt       : ' + keepsRt);
  console.log('  cards that LOSE a live rt         : ' + losesRt + '   (' + (losesRt/present*100).toFixed(0) + '%)');
  console.log('  cards already unscored            : ' + alreadyNull);
  console.log('  rows the split inserts            : ' + newRows + ', of which ' + newUnder +
              ' are under the floor and can never be scored (' + (newUnder/newRows*100).toFixed(0) + '%)');
  console.log('\n  every card that loses its rt:');
  losers.sort((a,b) => b.rt - a.rt).forEach(l => console.log('     ' + String(l.card_id).padStart(7) + '  ' +
    l.name + ' ' + l.season + ' ' + l.club + '   rt ' + l.rt + '   ' + l.was + 'm -> ' + l.becomes + 'm'));
  console.log('\nNOTHING WAS WRITTEN.');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
