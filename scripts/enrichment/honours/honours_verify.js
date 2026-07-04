require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const teamsOf = async (id) => { const { data } = await sb.from('player_card_view').select('season_year, team_name').eq('api_player_id', id).order('season_year'); return (data || []).map(r => r.season_year + ' ' + r.team_name); };
const nameOf = async (id) => { const { data } = await sb.from('players').select('name, full_name').eq('api_player_id', id); return data && data[0] ? (data[0].name + ' / ' + data[0].full_name) : '(not in players)'; };

(async () => {
  console.error('== Rodri candidates (ballon_dor 2023/24 -> want Man City) ==');
  for (const id of [4267, 44, 185477, 46696]) console.error('  ' + id + '  ' + await nameOf(id) + '  teams: ' + (await teamsOf(id)).slice(0, 8).join(' | '));

  console.error('\n== Salah candidates (want Mo Salah, Liverpool) ==');
  for (const id of [306, 375000]) console.error('  ' + id + '  ' + await nameOf(id) + '  teams: ' + (await teamsOf(id)).slice(0, 6).join(' | '));

  console.error('\n== Mane resolved to 116847 (flagged: no Liverpool card) ==');
  console.error('  116847 = ' + await nameOf(116847) + '  teams: ' + (await teamsOf(116847)).join(' | '));
  console.error('  search players for a "Mane" (Sadio):');
  const { data: manes } = await sb.from('players').select('api_player_id, name, full_name').ilike('full_name', '%man%');
  (manes || []).filter(m => /man[eé]$/i.test((m.name || '')) || /\bman[eé]\b/i.test((m.full_name || ''))).slice(0, 12).forEach(m => console.error('    ' + m.api_player_id + '  ' + m.name + ' / ' + m.full_name));

  console.error('\n== Cardozo 70475 (flagged: no Benfica card) ==');
  console.error('  70475 = ' + await nameOf(70475) + '  teams: ' + (await teamsOf(70475)).join(' | '));

  console.error('\n== is Sadio Mane in player_card_view at Liverpool? ==');
  const { data: lm } = await sb.from('player_card_view').select('api_player_id, player_name, season, team_name').eq('team_name', 'Liverpool').ilike('player_name', '%man%');
  [...new Set((lm || []).map(r => r.api_player_id + ' ' + r.player_name))].forEach(x => console.error('    ' + x));
})();
