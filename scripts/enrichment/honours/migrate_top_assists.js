// Migrate top_assists counts from honour_context ("N assists") -> numeric assists column; clear context.
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { error: aErr } = await sb.from('honours').select('assists').limit(1);
  if (aErr) { console.error('ABORT: honours.assists column still MISSING (' + aErr.message + ')'); process.exit(1); }
  console.error('honours.assists column: exists');

  const { data: rows, error } = await sb.from('honours').select('id, honour_context, player_name').eq('honour_type', 'top_assists');
  if (error) { console.error('read err ' + error.message); process.exit(1); }
  console.error('top_assists rows to migrate: ' + rows.length);

  let migrated = 0, bad = [];
  for (const r of rows) {
    const m = /^(\d+)\s+assists$/.exec((r.honour_context || '').trim());
    if (!m) { bad.push(r.id + ' "' + r.honour_context + '"'); continue; }
    const n = parseInt(m[1], 10);
    const { error: uErr } = await sb.from('honours').update({ assists: n, honour_context: null }).eq('id', r.id);
    if (uErr) { console.error('update err id ' + r.id + ': ' + uErr.message); process.exit(1); }
    migrated++;
  }
  console.error('migrated: ' + migrated + (bad.length ? '  UNPARSED: ' + bad.join(', ') : ''));

  // verify
  const { data: kdb } = await sb.from('honours').select('player_name, assists, honour_context').eq('honour_type', 'top_assists').eq('league_code', 'PL').eq('season_year', 2019);
  console.error('\nverify De Bruyne PL 2019: ' + JSON.stringify(kdb));
  const { data: tie } = await sb.from('honours').select('player_name, assists, honour_context').eq('honour_type', 'top_assists').eq('league_code', 'SA').eq('season_year', 2023);
  console.error('verify SA 2023 tie: ' + JSON.stringify(tie));
  const { count: ctxLeft } = await sb.from('honours').select('*', { count: 'exact', head: true }).eq('honour_type', 'top_assists').not('honour_context', 'is', null);
  const { count: nullAssist } = await sb.from('honours').select('*', { count: 'exact', head: true }).eq('honour_type', 'top_assists').is('assists', null);
  console.error('\ntop_assists rows still with honour_context: ' + ctxLeft + '  | with NULL assists: ' + nullAssist + '  (both should be 0)');
})();
