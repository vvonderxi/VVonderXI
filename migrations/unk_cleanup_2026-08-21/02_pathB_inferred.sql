-- PATH B: 27 cards whose pool is inferred from the SAME player's other seasons,
-- where those seasons are unanimous. GUARDED on UNK so a re-run is a no-op.
-- HELD OUT: api 91303 Djourou 1617 , its single evidence season (1718 Antalyaspor FB)
-- contradicts six seasons of centre-back. Moved to path C.

-- -> ST (12)
update player_positions set "position" = 'ST'
where "position" = 'UNK'
  and (api_player_id, season_year, league_code) in ((47266,2017,'LL'),(47266,2018,'LL'),(104,2018,'PRT'),(195512,2021,'L1'),(392,2016,'LL'),(195512,2022,'SA'),(62259,2016,'BPL'),(104,2018,'L1'),(37163,2017,'ERE'),(392,2018,'PRT'),(37163,2018,'ERE'),(37163,2019,'ERE'));

-- -> Winger (2)
update player_positions set "position" = 'Winger'
where "position" = 'UNK'
  and (api_player_id, season_year, league_code) in ((1942,2019,'BPL'),(62009,2017,'TR'));

-- -> CB (4)
update player_positions set "position" = 'CB'
where "position" = 'UNK'
  and (api_player_id, season_year, league_code) in ((566,2018,'PRT'),(8579,2017,'BPL'),(8444,2016,'BPL'),(37222,2018,'ERE'));

-- -> CM (7)
update player_positions set "position" = 'CM'
where "position" = 'UNK'
  and (api_player_id, season_year, league_code) in ((38699,2018,'ERE'),(8597,2017,'BPL'),(8597,2018,'BPL'),(8753,2017,'BPL'),(8565,2016,'BPL'),(41126,2018,'PRT'),(1939,2019,'BPL'));

-- -> FB (2)
update player_positions set "position" = 'FB'
where "position" = 'UNK'
  and (api_player_id, season_year, league_code) in ((1692,2018,'LL'),(68419,2016,'SA'));
