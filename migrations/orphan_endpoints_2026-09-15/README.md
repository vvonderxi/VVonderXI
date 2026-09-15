# ORPHANED ENDPOINTS , DELETED 2026-09-15

**`api/get-seasons.js` is deleted. `api/log.js` was ALREADY GONE and the doc did not know.**
Deployed serverless functions: **2 -> 1**. `api/analyse.js` is the only one left.

## `api/get-seasons.js` , DELETED, AND IT WAS NEVER WIRED

**It had no caller in any `.html` in the ENTIRE HISTORY of any branch** , not merely at the
tips. `git log --all -S"get-seasons" -- '*.html'` returns nothing. It is not an endpoint that
lost its caller; it is one that never had one. **Stillborn, not orphaned.**

**IT WAS FIXED HOURS BEFORE IT WAS DELETED, AND THAT MUST NOT BE READ AS EVIDENCE IT WAS LIVE.**
Commit `034b91e` corrected three real defects in it , `goals`/`assists` coalesced to 0 across
**3,061** and **31,040** rows (54.8% of the database), an unvalidated `parseInt` returning NaN
to PostgREST as a 500, and an em-dash , and logged a fourth (the keeper strip is a denylist over
`select('*')`, so a new keeper scalar would ship public by default). **Those fixes were correct
and they were never served to anyone.** The decision to delete came after, on the separate
ground that an orphaned public endpoint is worse than a missing one.

**The sequence is the point and it is why this file exists: the defects were found BECAUSE the
endpoint was swept, and the sweep is what established it had no caller.** Fixing first and
deleting second is not wasted work, it is the order in which the facts arrived. A later reader
finding `034b91e` in the log must not conclude the endpoint was in use.

## `api/log.js` , ALREADY DELETED, AND TWO SS E ENTRIES ARE STALE

It was removed in **`a69b45c`**, *"refactor(api): remove auth, log and refresh-players ,
deployed functions 6 to 3"*. It exists on **no branch and not on disk**.

**SS E describes it as a currently deployed public endpoint writing session-linked comparison
records.** That entry is stale: the privacy surface it warns about was closed before the entry
was ever acted on. **The same entry's claim that `api/bsd-probe.js`, `api/search-player.js` and
`api/debug-player.js` "all still exist on `vvonderxi_BIGGER`" is ALSO stale** , all three are
ABSENT from BIGGER, which adopted the branch's tree at the 2026-09-06 merge. **Both branches now
carry exactly two api files, and after this commit, one.**

## THE DATA WAS CAPTURED FIRST, AND IT IS WORTH KEEPING

`log_tables_capture_2026-09-15.json` , **`comparison_log` 44 rows, `search_log` 11 rows**, full
content, paginated, asserted against expected counts and read back off disk.

- **`comparison_log`: 43 distinct pairings across 33 sessions**, 2026-06-08 to 2026-08-30.
- **43 of the 44 rows are June.** The single August row (2026-08-30) carries `p2_season = 'peak'`,
  not a year , a malformed value that reads as a smoke test against the production redeploy that
  happened that same day, not as a visitor.
- `search_log`: 11 rows, 5 sessions, 2026-06-08 to 2026-06-11 only.

**This is behavioural data of the same kind as the `verdict_cache` orphans** , a record of what
pairs people actually chose, recoverable from nothing else , which is why it was captured before
the endpoint went rather than after.

## WHAT IS NOT DONE , A DECISION REMAINS

**The two TABLES still exist and still hold 55 session-linked rows.** Removing the endpoint stops
new writes; it does not remove what is stored. `session_id` is a client-generated token with no
account behind it, so this is low-sensitivity, but it is still data nobody chose to keep.
**Drop-or-keep on `comparison_log` and `search_log` is a separate decision and has not been
taken.** The capture beside this file means dropping them later costs nothing.
