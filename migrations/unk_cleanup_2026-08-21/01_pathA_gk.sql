-- PATH A: 27 coarse-GK cards, position_pool UNK -> GK
-- GUARDED: only rows still reading UNK are touched, so a re-run is a no-op.
update player_positions set "position" = 'GK'
where "position" = 'UNK'
  and (api_player_id, season_year, league_code) in ((46784,2017,'LL'),(47560,2016,'LL'),(50974,2016,'LL'),(1335,2016,'LL'),(254,2017,'SA'),(2998,2016,'SA'),(254,2016,'SA'),(90,2016,'BL'),(25902,2016,'BL'),(22242,2017,'L1'),(20519,2017,'L1'),(22242,2016,'L1'),(21484,2016,'L1'),(1253,2016,'L1'),(8551,2016,'L1'),(37112,2019,'PRT'),(44389,2017,'PRT'),(44389,2016,'PRT'),(38685,2017,'ERE'),(38685,2016,'ERE'),(36968,2016,'ERE'),(8630,2016,'BPL'),(8551,2017,'TR'),(19011,2017,'TR'),(62042,2016,'TR'),(107632,2016,'TR'),(19011,2016,'TR'));
