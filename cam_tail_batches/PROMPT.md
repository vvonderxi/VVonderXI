# CAM-tail position verification , prompt for each batch

Paste this, then the batch CSV.

---

You are verifying football player positions, per season, for a ratings database.

For every row in the CSV below, tell me the position that player played MOST in that
specific season, in that specific league. Not their career position. Not what they are
best known for. The role they actually occupied in the most league appearances that season.

## Vocabulary , use EXACTLY one of these eight, spelled exactly like this

    GK   FB   CB   CDM   CM   CAM   Winger   ST

Mapping if your source uses other words: right-back / left-back / wing-back -> FB.
Defensive midfield / anchor / holding -> CDM. Central midfield / box-to-box / the 8 -> CM.
Attacking midfield / the 10 / trequartista -> CAM. Right wing / left wing / wide forward /
inside forward -> Winger. Centre-forward / striker / second striker / false 9 -> ST.

## UNSURE IS A CORRECT ANSWER, AND OFTEN THE RIGHT ONE

Write `UNSURE` in verified_position whenever you cannot establish the season's main role
from actual evidence. **This matters more than any other instruction in this prompt.**

Most of these players are not famous, and many played in Portugal, Turkey, Belgium, the
Netherlands or lower-profile clubs in the big five. That is exactly where reliable
per-season role information runs out. When it does, say so.

- An honest `UNSURE` leaves the card as it is, at lower confidence. Nothing breaks.
- A confident guess WRITES A WRONG POSITION into a live database, and a wrong position
  is not visibly wrong afterwards. It looks like data.

Do not reason from a player's name, nationality, shirt number, or from the goals and
assists in the CSV. Those columns are context for you to sanity-check against, never
evidence for a position. A midfielder with 12 goals is not thereby a striker.

Do not infer from the current_pool column either. That column is what we currently
believe and is the thing being tested. If you cannot verify independently, say UNSURE.

If you know the player but not this particular season, that is UNSURE for that season.
Players move roles. A player can be Winger in one season and CAM the next, and several
players in this list genuinely did.

## Confidence , one of: high, medium, low

- `high`   , you have specific evidence for THIS season: a formation, a documented role,
             a season report, a reliable profile naming the position for that campaign.
- `medium` , consistent secondary evidence, or the role is clear but the split with a
             neighbouring role is not.
- `low`    , weak or indirect. Pair with UNSURE unless you have a real reason not to.

Only `high` rows will be written. Everything else is held. So there is no cost to you in
being cautious, and a real cost to being confident when you are not.

## OUTPUT , the identity columns are a contract

Return the SAME CSV, same row order, same number of rows, with the last three columns
filled: verified_position, confidence, evidence.

**Echo `api_player_id` and `card_id` back EXACTLY as given. Do not renumber them, do not
reformat them, do not reorder rows, do not drop rows, do not merge duplicate names, and
do not "correct" anything in those two columns.**

That is not a formatting preference. The write resolves on `api_player_id`, never on
player name, because player names are not unique in this database and the collisions are
live: `J. Rodríguez` is THREE different players (James, Jay, and a third), `João Mário`
is two, `Nenê` is two, `L. Pellegrini` is two. **In every one of those cases the collision
partner plays a DIFFERENT position** , one of them is a full-back, another a striker. A
name-keyed write therefore puts a wrong position on a wrong player and looks entirely
plausible in the diff. `api_player_id` is the only thing standing between us and that.

If you see the same display name twice with different `api_player_id` values, they are
different people. Treat them separately. Say so in evidence.

`evidence` , one short line: the formation, the source, or why you are unsure. Keep it
under about 25 words. If UNSURE, say what specifically you could not establish.

Do not add commentary before or after the CSV. Do not summarise. Just the CSV.
