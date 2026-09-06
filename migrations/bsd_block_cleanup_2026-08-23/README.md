# BSD block cleanup , 2026-08-23

## What the block was

Not fabricated data. A **duplicate import under a foreign provider's id namespace.**
`api/import-players.js` at `b4d507d` (2026-06-08 17:10) fetched from **BSD**,
`https://sports.bzzoiro.com/api/v2`, and wrote `bsdPlayer.id` into `api_player_id` , a
column that means API-Football's id everywhere else. BSD 803 is Jordan Pickford;
API-Football 803 is L. Pernica.

On 2026-06-11 the importer was switched to API-Football and re-ran. `upsertPlayer` upserts
`onConflict:'api_player_id'`, so wherever a BSD id numerically collided with a real
API-Football id the row was **silently overwritten** with the API-Football player's name.
**211 of 213 rows outside the block were repaired by that accident.** The 181 whose ids
API-Football never re-issued kept their BSD identity, and their cards are the block.

Both guards that would have caught it shipped in `9911736`.

## What was verified

All 185 block cards checked **individually** against the provider , `/players/profiles` for
the name, `/players?id=&season=2025` for the club , plus all 20 PL 2025/26 squads (552
provider player-seasons). Not sampled.

| set | n | disposition |
|---|---|---|
| unattributable | 176 | **DELETED** (step 1) |
| provider-confirmed, held nowhere else | 6 | **KEPT**, no action |
| mid-season transfer halves | 3 | **LEFT IN PLACE**, blocked (see below) |

## Step 1 result

`57,234 -> 57,058`. Eleven assertions passed against a full-population before/after snapshot:
all 176 gone, all 6 KEEP and all 3 pending survive, nothing else removed, null rt held at
3,061, range 11-97. **501 surviving cards moved rt** (percentile shift from a smaller scored
pool) and **3 crossed a public band, all upward** , 84->85 and two 79->80. Rank-pinned bands
held exactly at 12 / 150 / 650. **PL 2025/26 went 600 -> 428** (172 of the 176 were PL; the other 4 were BL, SA and PRT), back inside its own 384-441
history and inside guard 2's 311-518 band.

## Why the re-key could NOT be done

`player_season_cards` carries **`UNIQUE (api_player_id, season, league_code)`**, so one player
cannot hold two cards in one league-season, and all three targets already have a card:

| player | correct api | we hold | block card holds |
|---|---|---|---|
| Douglas Luiz | 47522 | Nottingham Forest 331min | Aston Villa 613min |
| Oscar Bobb | 278133 | Manchester City 472min | Fulham 579min |
| James Ward-Prowse | 2938 | West Ham 415min | Burnley 694min |

All three are **same-league mid-season transfers**. The importer's `resolveSeasonStat` SUMS a
genuine split into ONE card, so the correct end state is a single summed card (Douglas Luiz
944min, Bobb 1050min, Ward-Prowse 1109min), **not two rows**. Re-keying cannot produce that and
would violate the constraint.

**So a second defect is exposed and NOT fixed here: the normal import produced only one half of
each of these three transfers.** Merging them rewrites stats on existing rows and moves rt, so
it belongs in its own gated pass , cross-ref the WRONG-BLOCK pass in `INGESTION_RECOVERY.md`.
The 3 block cards are left in place, untouched, so nothing is lost while the decision is open.

Snapshots (`before.csv`, `after_delete.csv`) are kept locally and gitignored.
