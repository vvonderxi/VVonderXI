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

## THE TABLES ARE DROPPED , DECIDED AND RUN 2026-09-15

**`comparison_log` and `search_log` no longer exist.** `drop table if exists ... cascade` through
the `exec_sql` RPC, both verified gone by a SELECT that now **ERRORS** with `42P01 relation does
not exist` rather than returning empty , an empty read cannot distinguish "dropped" from
"present but unreadable", which is the same trap CLAUDE.md records for matview grants.

**THE BEHAVIOURAL RECORD NOW LIVES IN THIS DIRECTORY, NOT IN THE DATABASE.** If anyone wants to
know which pairs people actually compared, the answer is
`log_tables_capture_2026-09-15.json` , **43 distinct pairings across 33 sessions**, every row
carrying both player names, a winner and a deciding factor. There is no longer any live table to
query, and a future session looking for one must read this file instead. `log_tables_shape_2026-09-15.json`
holds the column list of both tables so the shape is recoverable as well as the content.

**VERIFIED BEFORE DROPPING, on the same discipline as the notes-orphan delete:** the capture was
re-read against the live tables **row-for-row and id-for-id, 44 and 11, identical on both**, and
content-checked (44 of 44 rows carry both names, a winner and a deciding factor) so it could not
be a file of empty shells. **Only then was anything dropped.**

**WHY DROPPING WAS RIGHT: live tables no code reads add nothing, and they are a session-linked
personal-data surface nobody chose to keep.** `session_id` is a client-generated token with no
account behind it, so the sensitivity is low , but low is not a reason to keep data with no
consumer, and the endpoint that wrote them has not existed since `a69b45c`.
