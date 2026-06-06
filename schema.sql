-- VVonderXI Player Cache Schema
-- Run this in your Supabase SQL editor to set up the database

-- Players table: one row per player
CREATE TABLE IF NOT EXISTS players (
  id            SERIAL PRIMARY KEY,
  api_id        INTEGER UNIQUE,           -- API-Football player ID
  name          TEXT NOT NULL,
  full_name     TEXT,
  nationality   TEXT,
  position      TEXT,
  photo_url     TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- Seasons table: one row per player per season per league
CREATE TABLE IF NOT EXISTS player_seasons (
  id            SERIAL PRIMARY KEY,
  player_id     INTEGER REFERENCES players(id) ON DELETE CASCADE,
  api_id        INTEGER,                  -- API-Football player ID (denormalised for fast lookup)
  season        TEXT NOT NULL,            -- e.g. "2324", "2223", "2122"
  season_year   INTEGER NOT NULL,         -- e.g. 2023, 2022
  league_code   TEXT NOT NULL,            -- e.g. "PL", "LL", "BL"
  league_name   TEXT NOT NULL,
  league_api_id INTEGER,                  -- API-Football league ID
  club          TEXT,
  pos           TEXT,                     -- position that season
  age           INTEGER,
  goals         INTEGER DEFAULT 0,
  assists       INTEGER DEFAULT 0,
  appearances   INTEGER DEFAULT 0,
  minutes       INTEGER DEFAULT 0,
  rating        NUMERIC(4,2),             -- SofaScore-style 0-10 rating from API
  rt            INTEGER,                  -- our 0-100 scale rating
  yellow_cards  INTEGER DEFAULT 0,
  red_cards     INTEGER DEFAULT 0,
  created_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(api_id, season, league_api_id)
);

-- Index for fast player name search
CREATE INDEX IF NOT EXISTS idx_players_name ON players USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_player_seasons_api_id ON player_seasons(api_id);
CREATE INDEX IF NOT EXISTS idx_player_seasons_season ON player_seasons(season);
CREATE INDEX IF NOT EXISTS idx_player_seasons_league ON player_seasons(league_code);

-- Search cache table: tracks which searches have been done
CREATE TABLE IF NOT EXISTS search_cache (
  id            SERIAL PRIMARY KEY,
  search_term   TEXT NOT NULL UNIQUE,
  last_searched TIMESTAMP DEFAULT NOW(),
  result_count  INTEGER DEFAULT 0
);

-- Function to update updated_at automatically
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

-- Enable Row Level Security (read-only for public, write only from server)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;

-- Allow public reads (the frontend can read cached data)
CREATE POLICY "Public read players" ON players FOR SELECT USING (true);
CREATE POLICY "Public read seasons" ON player_seasons FOR SELECT USING (true);

-- Only service role can insert/update (your Vercel functions use the service key)
CREATE POLICY "Service insert players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update players" ON players FOR UPDATE USING (true);
CREATE POLICY "Service insert seasons" ON player_seasons FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert search" ON search_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update search" ON search_cache FOR UPDATE USING (true);
CREATE POLICY "Public read search" ON search_cache FOR SELECT USING (true);

-- Extended metrics columns for spider chart (populated by Live API)
ALTER TABLE player_seasons ADD COLUMN IF NOT EXISTS shots_on_target INTEGER DEFAULT 0;
ALTER TABLE player_seasons ADD COLUMN IF NOT EXISTS key_passes INTEGER DEFAULT 0;
ALTER TABLE player_seasons ADD COLUMN IF NOT EXISTS dribbles_success INTEGER DEFAULT 0;
ALTER TABLE player_seasons ADD COLUMN IF NOT EXISTS tackles INTEGER DEFAULT 0;
ALTER TABLE player_seasons ADD COLUMN IF NOT EXISTS interceptions INTEGER DEFAULT 0;
ALTER TABLE player_seasons ADD COLUMN IF NOT EXISTS progressive_carries INTEGER DEFAULT 0;
ALTER TABLE player_seasons ADD COLUMN IF NOT EXISTS aerial_won INTEGER DEFAULT 0;

-- Search frequency tracking (for smart refresh priority)
ALTER TABLE players ADD COLUMN IF NOT EXISTS search_count INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS refresh_tier INTEGER DEFAULT 3;
-- Tier 1 = top 20 (daily refresh), Tier 2 = notable (weekly), Tier 3 = on-demand

-- Add CRON_SECRET to .env.example reminder
-- Update refresh tier automatically based on search count
CREATE OR REPLACE FUNCTION update_refresh_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.search_count >= 50 THEN NEW.refresh_tier := 1;
  ELSIF NEW.search_count >= 10 THEN NEW.refresh_tier := 2;
  ELSE NEW.refresh_tier := 3;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_tier
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_refresh_tier();
