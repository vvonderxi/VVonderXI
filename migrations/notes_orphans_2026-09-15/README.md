# notes_cache ORPHAN DELETE , 2026-09-15, RUN AND VERIFIED

**194 rows deleted from `notes_cache`. Reversible from the backup beside this file.**

## WHAT WAS DELETED

Every row carrying `cache_version IS NULL`, written between **2026-06-28 and 2026-07-28**,
before the stamping scheme landed. All 194 also carried `stats_hash IS NULL`.

- before: **366 rows**, 194 of them orphans
- after: **172 rows**, **zero** orphans, every remaining row stamped

## WHY , AND NOT FOR THE REASON IT FIRST LOOKED LIKE

**The case was argued first as "unidentifiable prose is being served as current". That is
false, and checking it is what produced the real reason.** Both cache read paths in
`api/analyse.js` compute

    unstamped = !row || row.stats_hash == null || row.cache_version == null

and treat it as a **MISS**. A null-`cache_version` row is never returned to a visitor. These
rows were inert. `migrations/pathb_winner_2026-09-11/INVALIDATE.sql` already relies on exactly
this property , it nulls the stamp *in order to* make rows unservable while deliberately
leaving the prose in place.

**So the safety case was empty and the real case is a CORRUPTED DENOMINATOR.** The orphans made
every count taken over this table wrong. "366 cached notes" reads as a populated cache when 194
of them are dead, and that figure sat in the denominator of the item 25 measurement. Deleting
them changed no behaviour and moved the honest reading of cache health from **17 of 366 (4.6%)**
to **17 of 172 (9.9%)** , the same seventeen rows.

**The population is CLOSED and cannot regrow.** `NOTES_VERSION` is always a string, so the write
path can no longer produce an orphan. This is a one-time cleanup, not a recurring chore.

## WHY THE VERDICT ORPHANS WERE *NOT* DELETED

`verdict_cache` holds 67 orphans of 124 rows and they were **kept**, deliberately.

They have a **second consumer that is not a cache read**:
`scripts/separability/real_pairings.js` reads `card_id_a, card_id_b, winner_card_id` as the
record of **which pairs people actually compared**, and re-derives rt from live data. 59 of the
67 orphans carry a `winner_card_id`. Deleting them removes **54% of the input** to the
margin-class evidence base, and that input is behaviour rather than data , it cannot be
recreated from anything else.

`notes_cache` has no second consumer at all. Nothing anywhere reads it but `api/analyse.js`.
**The two populations look identical and are not, and that asymmetry is the whole decision.**

**The counting hazard on `verdict_cache` is handled by FILTERING, not by deletion: any count of
cache health over that table must exclude `cache_version IS NULL` rows and must group by prompt
BASE (the first two dash-delimited segments), never by the whole version string.** Revisit the
delete when the separability work closes.

## METHOD

1. Read all 366 rows **paginated** past the 1000-row cap.
2. Assert the orphan count is exactly 194, **abort and write nothing otherwise**.
3. Write the backup, **read it back off disk and compare row-for-row** before deleting anything.
4. Delete in batches of 100, filtered on **`.is('cache_version', null)`** as well as by id, so a
   row restamped between backup and delete is left alone.
5. Re-read the whole table and assert zero orphans remain.

## REVERSAL

    node -e "require('dotenv').config();const fs=require('fs');
    const {createClient}=require('@supabase/supabase-js');
    const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);
    const rows=JSON.parse(fs.readFileSync('migrations/notes_orphans_2026-09-15/notes_cache_orphans_backup_2026-09-15.json','utf8'));
    (async()=>{for(let i=0;i<rows.length;i+=100){
      const {error}=await sb.from('notes_cache').upsert(rows.slice(i,i+100),{onConflict:'card_id'});
      if(error){console.error(error.message);process.exit(1);}}
      console.log('restored',rows.length);})();"

**Restoring is almost certainly the wrong move** , these rows can never be served, so restoring
them only puts the corrupted denominator back. The backup exists because a delete without one is
not a decision, it is a bet.

## BACKUP

`notes_cache_orphans_backup_2026-09-15.json` , 194 rows, 396,950 bytes, full row content
including the prose, captured with the service role and verified row-for-row against the live
read immediately before the delete.
