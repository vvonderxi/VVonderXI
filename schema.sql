-- ══════════════════════════════════════════════════════════════════════
--  VVonderXI — BIGGER Branch Supabase Schema
--  Normalized · Lean · Storage-efficient
--  Target: 35,000–50,000 player-season cards · ~120–200 MB total
--  Run once in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────
--  1. TEAMS
--  One row per club. Colours stored once, not on every card.
--  Storage impact: ~100 rows × ~200 bytes = ~20 KB
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id                SERIAL PRIMARY KEY,
  api_team_id       INTEGER UNIQUE,         -- BSD/API-Football team ID
  name              TEXT NOT NULL UNIQUE,
  short_name        TEXT,                   -- e.g. "Man Utd", "PSG"
  country           TEXT,
  primary_colour    TEXT DEFAULT '#1a1a2e', -- hex
  secondary_colour  TEXT DEFAULT '#ffffff',
  accent_colour     TEXT DEFAULT '#e94560',
  created_at        TIMESTAMP DEFAULT NOW()
);

-- Pre-seed top club colours (safe to re-run — uses INSERT ... ON CONFLICT DO NOTHING)
INSERT INTO teams (name, short_name, country, primary_colour, secondary_colour, accent_colour) VALUES
  ('Manchester United',   'Man Utd',    'ENG', '#DA291C', '#000000', '#FBE122'),
  ('Liverpool',           'Liverpool',  'ENG', '#C8102E', '#FFFFFF', '#F6EB61'),
  ('Arsenal',             'Arsenal',    'ENG', '#EF0107', '#FFFFFF', '#063672'),
  ('Chelsea',             'Chelsea',    'ENG', '#034694', '#FFFFFF', '#DBA111'),
  ('Manchester City',     'Man City',   'ENG', '#6CABDD', '#FFFFFF', '#1C2C5B'),
  ('Tottenham Hotspur',   'Spurs',      'ENG', '#132257', '#FFFFFF', '#FFFFFF'),
  ('Newcastle United',    'Newcastle',  'ENG', '#241F20', '#FFFFFF', '#41B6E6'),
  ('Aston Villa',         'Villa',      'ENG', '#95BFE5', '#670E36', '#95BFE5'),
  ('Real Madrid',         'R. Madrid',  'ESP', '#FFFFFF', '#00529F', '#FEBE10'),
  ('Barcelona',           'Barça',      'ESP', '#A50044', '#004D98', '#EDBB00'),
  ('Atletico Madrid',     'Atletico',   'ESP', '#CB3524', '#FFFFFF', '#272E61'),
  ('Juventus',            'Juventus',   'ITA', '#000000', '#FFFFFF', '#F3C300'),
  ('AC Milan',            'AC Milan',   'ITA', '#FB090B', '#000000', '#FFFFFF'),
  ('Inter Milan',         'Inter',      'ITA', '#010E80', '#000000', '#FFFFFF'),
  ('Bayern Munich',       'Bayern',     'GER', '#DC052D', '#FFFFFF', '#0066B2'),
  ('Borussia Dortmund',   'Dortmund',   'GER', '#FDE100', '#000000', '#FFFFFF'),
  ('Bayer Leverkusen',    'Leverkusen', 'GER', '#E32221', '#FFFFFF', '#000000'),
  ('Paris Saint-Germain', 'PSG',        'FRA', '#004170', '#DA291C', '#FFFFFF'),
  ('Monaco',              'Monaco',     'FRA', '#D4011D', '#FFFFFF', '#D4AF37'),
  ('Ajax',                'Ajax',       'NED', '#D2122E', '#FFFFFF', '#000000'),
  ('Feyenoord',           'Feyenoord',  'NED', '#C8102E', '#FFFFFF', '#000000'),
  ('Porto',               'Porto',      'PRT', '#003087', '#FFFFFF', '#FDB913'),
  ('Benfica',             'Benfica',    'PRT', '#C8102E', '#FFFFFF', '#C8102E'),
  ('Sporting CP',         'Sporting',   'PRT', '#008000', '#FFFFFF', '#FFFF00'),
  ('Club Brugge',         'Brugge',     'BEL', '#003E7A', '#FFFFFF', '#000000'),
  ('Anderlecht',          'Anderlecht', 'BEL', '#6E005C', '#FFFFFF', '#FFFFFF'),
  ('RB Leipzig',          'Leipzig',    'GER', '#DD0741', '#FFFFFF', '#000000'),
  ('Napoli',              'Napoli',     'ITA', '#12A0C0', '#FFFFFF', '#FFC400'),
  ('AS Roma',             'Roma',       'ITA', '#8E1F2F', '#FFFFFF', '#F5A623'),
  ('Lazio',               'Lazio',      'ITA', '#87C8E5', '#FFFFFF', '#142568'),
  ('Villarreal',          'Villarreal', 'ESP', '#FFDB00', '#000000', '#004F9F'),
  ('Sevilla',             'Sevilla',    'ESP', '#D20000', '#FFFFFF', '#D20000'),
  ('Real Sociedad',       'R. Sociedad','ESP', '#005FA0', '#FFFFFF', '#005FA0'),
  ('Borussia Monchengladbach', 'Gladbach', 'GER', '#000000', '#FFFFFF', '#009933'),
  ('Eintracht Frankfurt', 'Frankfurt',  'GER', '#E1000F', '#000000', '#000000')
ON CONFLICT (name) DO NOTHING;


-- ─────────────────────────────────────────────────
--  2. LEAGUES
--  One row per league. Strength factor stored once.
--  Storage impact: ~20 rows × ~150 bytes = ~3 KB
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leagues (
  id                    SERIAL PRIMARY KEY,
  api_league_id         INTEGER UNIQUE,
  code                  TEXT NOT NULL UNIQUE,  -- PL, LL, BL, SA, L1 etc.
  name                  TEXT NOT NULL,
  country               TEXT,
  flag_emoji            TEXT,
  league_strength_weight NUMERIC(5,3) DEFAULT 0.850,
  seasons_available     TEXT[],               -- e.g. ['2425','2324','2223']
  created_at            TIMESTAMP DEFAULT NOW()
);

INSERT INTO leagues (api_league_id, code, name, country, flag_emoji, league_strength_weight) VALUES
  (39,   'PL',  'Premier League',      'England',     '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 1.000),
  (140,  'LL',  'La Liga',             'Spain',       '🇪🇸', 0.978),
  (78,   'BL',  'Bundesliga',          'Germany',     '🇩🇪', 0.940),
  (135,  'SA',  'Serie A',             'Italy',       '🇮🇹', 0.935),
  (61,   'L1',  'Ligue 1',             'France',      '🇫🇷', 0.878),
  (94,   'PRT', 'Primeira Liga',       'Portugal',    '🇵🇹', 0.845),
  (88,   'ERE', 'Eredivisie',          'Netherlands', '🇳🇱', 0.820),
  (144,  'BPL', 'Belgian Pro League',  'Belgium',     '🇧🇪', 0.790),
  (2,    'CL',  'Champions League',    'Europe',      '🏆', 1.050),
  (3,    'UEL', 'Europa League',       'Europe',      '🏆', 0.920),
  (307,  'SPL', 'Saudi Pro League',    'Saudi Arabia','🇸🇦', 0.720),
  (253,  'MLS', 'MLS',                 'USA',         '🇺🇸', 0.700),
  (179,  'SPM', 'Scottish Premiership','Scotland',    '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 0.740),
  (203,  'TSL', 'Süper Lig',           'Turkey',      '🇹🇷', 0.760)
ON CONFLICT (code) DO NOTHING;


-- ─────────────────────────────────────────────────
--  3. PLAYERS
--  One row per player. Flags for retired/legacy stored here.
--  Storage impact: ~12,000 rows × ~300 bytes = ~3.6 MB
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  id              SERIAL PRIMARY KEY,
  api_player_id   INTEGER UNIQUE,         -- BSD player ID
  name            TEXT NOT NULL,
  full_name       TEXT,
  nationality     TEXT,                   -- ISO code: ENG, ESP, BRA etc.
  position        TEXT,                   -- broad: GK, DEF, MID, FWD
  date_of_birth   DATE,
  -- Status flags (only flags we CAN'T calculate from stats)
  is_retired      BOOLEAN DEFAULT FALSE,
  is_legacy       BOOLEAN DEFAULT FALSE,  -- VVonderXI Legacy Collection
  legacy_tier     TEXT CHECK (legacy_tier IN ('global_icon','era_defining','fan_favourite') OR legacy_tier IS NULL),
  -- Metadata
  search_count    INTEGER DEFAULT 0,
  refresh_tier    INTEGER DEFAULT 3,      -- 1=daily, 2=weekly, 3=on-demand
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);


-- ─────────────────────────────────────────────────
--  4. PLAYER_SEASON_CARDS
--  The main table. One row per player × season × league.
--  THIS IS WHERE THE STORAGE LIVES.
--  Target: 35,000–50,000 rows × ~500 bytes = ~17.5–25 MB raw
--  With Postgres overhead: ~80–120 MB realistic
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_season_cards (
  id              SERIAL PRIMARY KEY,
  player_id       INTEGER REFERENCES players(id) ON DELETE CASCADE,
  team_id         INTEGER REFERENCES teams(id),
  league_id       INTEGER REFERENCES leagues(id),
  -- Denormalised for fast queries (avoid joins on every lookup)
  api_player_id   INTEGER NOT NULL,
  season          TEXT NOT NULL,          -- '2425', '2324', '2223' etc.
  season_year     INTEGER NOT NULL,       -- 2024, 2023, 2022 etc.
  league_code     TEXT NOT NULL,          -- PL, LL, BL etc.
  team_name       TEXT,
  -- Core card stats (the lean fields)
  position        TEXT,                   -- position that season
  age             INTEGER,
  appearances     INTEGER DEFAULT 0,
  minutes         INTEGER DEFAULT 0,
  goals           INTEGER DEFAULT 0,
  assists         INTEGER DEFAULT 0,
  rating          NUMERIC(4,2),           -- API raw rating (0-10 scale)
  rt              INTEGER,                -- VVonderXI 0-100 scale
  -- Constraint: one card per player per season per league
  UNIQUE(api_player_id, season, league_code),
  created_at      TIMESTAMP DEFAULT NOW()
);

-- NOTE: Do NOT store these as columns — calculate them dynamically:
--   career_stage        → from age
--   season_scout_report → from goals/assists/position/league/age
--   market_momentum     → from age/league/trajectory
--   trajectory          → from last 3 seasons
--   verdict_tags        → from comparison logic
--   AI analysis text    → generated live by Anthropic


-- ─────────────────────────────────────────────────
--  5. IMPORT_LOG
--  Tracks import progress so bulk import is resumable.
--  Storage impact: ~500 rows × ~100 bytes = ~50 KB
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_log (
  id              SERIAL PRIMARY KEY,
  league_code     TEXT NOT NULL,
  season          TEXT NOT NULL,
  page            INTEGER DEFAULT 1,
  status          TEXT DEFAULT 'pending', -- pending, complete, error
  players_found   INTEGER DEFAULT 0,
  cards_inserted  INTEGER DEFAULT 0,
  error_message   TEXT,
  started_at      TIMESTAMP,
  completed_at    TIMESTAMP,
  UNIQUE(league_code, season, page)
);


-- ─────────────────────────────────────────────────
--  6. SEARCH_CACHE
--  Tracks which search terms have been run (for smart refresh)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS search_cache (
  id              SERIAL PRIMARY KEY,
  search_term     TEXT NOT NULL UNIQUE,
  last_searched   TIMESTAMP DEFAULT NOW(),
  result_count    INTEGER DEFAULT 0
);


-- ══════════════════════════════════════════════════════════════════════
--  INDEXES
--  Add only the indexes you actually filter on.
--  Over-indexing wastes storage and slows writes.
-- ══════════════════════════════════════════════════════════════════════

-- Players: name search (full-text for partial matches)
CREATE INDEX IF NOT EXISTS idx_players_name_fts
  ON players USING gin(to_tsvector('simple', name));

-- Players: API ID lookup (most frequent)
CREATE INDEX IF NOT EXISTS idx_players_api_id
  ON players(api_player_id);

-- Players: retired/legacy flags for filter
CREATE INDEX IF NOT EXISTS idx_players_flags
  ON players(is_retired, is_legacy);

-- Cards: the big table — index on the fields used in filter queries
CREATE INDEX IF NOT EXISTS idx_cards_player
  ON player_season_cards(player_id);

CREATE INDEX IF NOT EXISTS idx_cards_api_player
  ON player_season_cards(api_player_id);

CREATE INDEX IF NOT EXISTS idx_cards_season
  ON player_season_cards(season);

CREATE INDEX IF NOT EXISTS idx_cards_league
  ON player_season_cards(league_code);

CREATE INDEX IF NOT EXISTS idx_cards_season_league
  ON player_season_cards(season, league_code);  -- most common combined filter

CREATE INDEX IF NOT EXISTS idx_cards_position
  ON player_season_cards(position);

CREATE INDEX IF NOT EXISTS idx_cards_age
  ON player_season_cards(age);

-- Goals + assists combined (for scout rankings queries)
CREATE INDEX IF NOT EXISTS idx_cards_goals_assists
  ON player_season_cards(goals DESC, assists DESC);


-- ══════════════════════════════════════════════════════════════════════
--  VIEW: player_card_view
--  The main query surface for the app — joins all tables into one clean view.
--  Use this instead of writing manual joins in every API route.
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW player_card_view AS
SELECT
  psc.id                          AS card_id,
  p.id                            AS player_id,
  p.api_player_id,
  p.name                          AS player_name,
  p.nationality,
  p.date_of_birth,
  p.is_retired,
  p.is_legacy,
  p.legacy_tier,
  psc.season,
  psc.season_year,
  psc.league_code,
  l.name                          AS league_name,
  l.flag_emoji                    AS league_flag,
  l.league_strength_weight,
  psc.team_name,
  t.primary_colour,
  t.secondary_colour,
  t.accent_colour,
  psc.position,
  psc.age,
  psc.appearances,
  psc.minutes,
  psc.goals,
  psc.assists,
  psc.goals + psc.assists         AS output,
  ROUND((psc.goals + psc.assists) * l.league_strength_weight) AS adj_output,
  psc.rating,
  psc.rt
FROM player_season_cards psc
LEFT JOIN players p ON psc.player_id = p.id
LEFT JOIN leagues l ON psc.league_id = l.id
LEFT JOIN teams t ON psc.team_id = t.id;


-- ══════════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE players             ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams               ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues             ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_season_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_cache        ENABLE ROW LEVEL SECURITY;

-- Public reads (frontend can read everything)
CREATE POLICY "Public read players"  ON players             FOR SELECT USING (true);
CREATE POLICY "Public read teams"    ON teams               FOR SELECT USING (true);
CREATE POLICY "Public read leagues"  ON leagues             FOR SELECT USING (true);
CREATE POLICY "Public read cards"    ON player_season_cards FOR SELECT USING (true);
CREATE POLICY "Public read search"   ON search_cache        FOR SELECT USING (true);

-- Service role writes (Vercel functions use service key — never expose to frontend)
CREATE POLICY "Service insert players"  ON players             FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update players"  ON players             FOR UPDATE USING (true);
CREATE POLICY "Service insert teams"    ON teams               FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update teams"    ON teams               FOR UPDATE USING (true);
CREATE POLICY "Service insert leagues"  ON leagues             FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert cards"    ON player_season_cards FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update cards"    ON player_season_cards FOR UPDATE USING (true);
CREATE POLICY "Service insert log"      ON import_log          FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update log"      ON import_log          FOR UPDATE USING (true);
CREATE POLICY "Public read log"         ON import_log          FOR SELECT USING (true);
CREATE POLICY "Service insert search"   ON search_cache        FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update search"   ON search_cache        FOR UPDATE USING (true);


-- ══════════════════════════════════════════════════════════════════════
--  AUTO-UPDATE TRIGGERS
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update refresh_tier based on search count
CREATE OR REPLACE FUNCTION update_refresh_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.search_count >= 50 THEN
    NEW.refresh_tier := 1;
  ELSIF NEW.search_count >= 10 THEN
    NEW.refresh_tier := 2;
  ELSE
    NEW.refresh_tier := 3;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_tier
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_refresh_tier();


-- ══════════════════════════════════════════════════════════════════════
--  STORAGE SIZE ESTIMATE QUERY
--  Run this after import to check your database size:
-- ══════════════════════════════════════════════════════════════════════
/*
SELECT
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_size_pretty(pg_relation_size(relid)) AS data_size,
  pg_size_pretty(pg_indexes_size(relid)) AS index_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
*/

-- ══════════════════════════════════════════════════════════════════════
--  MIGRATION NOTE
--  If upgrading from the original schema (player_seasons table):
--  The old table is named player_seasons.
--  The new table is named player_season_cards.
--  Run this migration to copy existing data if needed:
-- ══════════════════════════════════════════════════════════════════════
/*
INSERT INTO player_season_cards (
  player_id, api_player_id, season, season_year,
  league_code, team_name, position, age,
  appearances, minutes, goals, assists, rating, rt, created_at
)
SELECT
  player_id,
  api_id,
  season,
  season_year,
  league_code,
  club,
  pos,
  age,
  appearances,
  minutes,
  goals,
  assists,
  rating,
  rt,
  created_at
FROM player_seasons
ON CONFLICT (api_player_id, season, league_code) DO NOTHING;
*/
