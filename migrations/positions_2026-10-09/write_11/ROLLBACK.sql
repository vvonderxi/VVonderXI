-- Restores the 11 positions from before_positions.json, guarded on the corrected value. Then refresh
-- player_card_mv and regenerate RADAR_POOL_REF and the index figures, as after the write.
update public.player_positions p set position=v.was, updated_at=now() from (values (289,2021,'PL','FB','CB'),(289,2019,'PL','FB','CB'),(289,2018,'PL','FB','CB'),(2296,2018,'PL','Winger','ST'),(289,2017,'PL','FB','CB'),(289,2016,'PL','FB','CB'),(743,2020,'LL','FB','CB'),(743,2018,'LL','FB','CB'),(743,2017,'LL','FB','CB'),(743,2016,'LL','FB','CB'),(343027,2024,'L1','Winger','CM')) v(api,yr,lg,tgt,was) where p.api_player_id=v.api and p.season_year=v.yr and p.league_code=v.lg and p.position=v.tgt;
delete from public.position_overrides where source='checked correction 2026-10-09';
