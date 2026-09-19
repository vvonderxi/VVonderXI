# THE MATVIEW SITTING , RUN 2026-09-19, AND THE DOWNTIME IS MEASURED FOR THE FIRST TIME

**OUTAGE: ROUGHLY 42 SECONDS.** Steps 2 to 5 in the Supabase SQL editor, timed by Lucas:

| step | what | time |
|---|---|---|
| 2 | `DROP` + `CREATE MATERIALIZED VIEW` (87 columns, 57,055 rows) | **11s** |
| 3 | eleven indexes, including the three GIN trigram | **30s** |
| 4 | grants | **1s** |
| | **total matview unavailable** | **~42s** |

**THE 11 SECONDS IS THE NUMBER TO CARRY FORWARD, AND IT SETTLES THE LANE QUESTION PERMANENTLY.**
The service role's `statement_timeout` is **8 seconds**, so the `CREATE` alone exceeds it by
three. Step 1, the `CREATE OR REPLACE VIEW`, ran fine through `exec_sql` in **812ms** , it
rewrites a catalog entry and never computes the body. **Steps 2 and 3 could not have run from
Claude Code, and a `CREATE` killed at 8 seconds leaves no matview and no route back from that
lane.** The split was right, and it was right by three seconds rather than by principle.

**THE INDEXES ARE THE EXPENSIVE HALF , 30s of the 42, not the rebuild.** Anyone budgeting a
future sitting should size it on the index count, not on the row count.

**It is 87 columns. Not 85, and not 78.** The count has been wrong once already and the
arithmetic is written out in `SITTING.sql` so it cannot drift again: **76 existing + 11 new**.

## THE THREE PASSENGERS

This is one DROP + CREATE with three unrelated jobs riding it, because a matview's query is
frozen at creation and appending a column means rebuilding the whole thing. Doing them
separately would mean three rebuilds and three windows where a write can land in the base table
while the matview serves the old value.

| | columns | what it unblocks |
|---|---|---|
| **Item 26**, the transfer flag | 1 , `pos_row_appearances` | lets a card tell whether its shirt number may belong to the club the player left. 841 cards, 33% wrong against 0.5% elsewhere |
| **The Proof percentiles** | 8 | the Proof panel's deferred half. The eight come from `PROOF_DIMS` in `card.html`, which names exactly eight distinct stats , that list is the count, not an estimate |
| **Item 8**, continental honours | 2 , `h_euro_winner`, `h_copa_winner` | the honours filter. **Without these the filter cannot offer them at all** |

## WHY THE THIRD PASSENGER IS A BLOCKER RATHER THAN A NICETY

`euro_winner` and `copa_winner` are fully built everywhere else , `HONOUR_META`, the mark set,
the oneliners, the Drury prose, and they render on cards today. **They have no `h_*` column.**

The honours filter's chip list now DERIVES from `HONOUR_META` rather than being hand-listed, and
that is exactly why the column matters: **a derived list over an incomplete schema generates a
chip that filters on a column which does not exist, which is a broken query rather than a
missing feature.** A missing feature is visible and inert. A broken query returns an error to a
reader who pressed a filter chip.

So they render as **inert `soon` chips** until these two columns land.

**[CORRECTED 2026-09-19. THIS SAID THEY GO LIVE "WITH NO CODE CHANGE" AND THAT IS FALSE ,
MEASURED AFTER THE SITTING, NOT REASONED.]** The columns exist, they are populated
(`h_euro_winner` 73 cards, `h_copa_winner` 82), and they are reachable through PostgREST as the
site's own role. **The chips are still inert**, because `soon` is derived from
`HONOUR_FILTER_COLUMNS` , a hardcoded seven-element list in `vv-core.js` , and not from the
database. Two keys have to be added by hand.

**THE SAME PARAGRAPH CONTRADICTED ITSELF AND NOBODY CAUGHT IT.** The comment above that list
says, correctly, "THE ONE HAND-MAINTAINED LIST LEFT IS HONOUR_FILTER_COLUMNS, AND IT IS KEYED ON
THE DATABASE", and then four lines later says the chips "go live the moment the column lands,
with no edit here". **Both cannot be true: a hand-maintained list keyed on the database is
exactly a list that must be edited when the database changes.** The first sentence is right.

This is CLAUDE.md's own recorded shape , a predicate that governs behaviour going stale when the
behaviour changes, and a hardcoded list of a vocabulary's members surviving an addition to that
vocabulary. **The rule it breaks is the one directly above it: when a type is added, grep for
every hardcoded list of that type.** The derivation removed three such lists and left one, and
the one it left is the one that gates the feature.

## RUNNING IT

**The SQL editor's lane, not Claude Code's.** The refresh exceeds the service role's
`statement_timeout` and cannot go through `exec_sql`. Every step asserts its own expected count;
if one disagrees, stop and re-read rather than continuing.

`before-columns.txt` and `before-indexes.sql` are the capture taken before anything was written.
**Build the view edit from a FRESH `pg_get_viewdef`, never from a repo copy** , the expressions
in `SITTING.sql` are the SHAPE of what to append, not a transcription to paste.

## AFTER IT RUNS

Three things become true and each needs its own follow-up, none of them automatic:

1. **Regenerate all three embedded snapshots in the same pass** , `RADAR_POOL_REF`,
   `KEEPER_SAVE_LADDER` and the index figures. None of them complains when stale.
2. **The honours filter's two `soon` chips need their emoji chosen** , deliberately deferred,
   because picking glyphs that do not collide with the World Cup globe or the League trophy at
   chip size is a visual choice and this platform demos those before building them.
3. **The transfer flag is a flag, not a rendering.** Carrying it costs nothing visible. Changing
   what 841 card faces show is a separate decision and it is Lucas's, to be answered together
   with the blank-shield question.
