# ANON LOCKDOWN , WHAT WAS APPLIED AND WHAT IT MEASURED (2026-10-03)

## APPLY.sql , steps 1 to 5, run by Lucas in the SQL editor

Control after: **4 reads ok, 8 denied, exit 0.** Before the block the same control
read 4 ok and 8 **OPEN**, which is the baseline the eight flipping proves against.

## APPLY_2.sql step 3 , run through the `exec_sql` RPC

**This section exists because its commit no longer does.** `8b682b1` recorded it and
contained only `waitlist_before.json`, a rollback capture holding four other people's
email addresses. Removing that file from history emptied the commit and `--prune-empty`
dropped it, correctly. **The record belongs in the migration directory rather than in a
commit message anyway**, which is the only reason this is not a loss.

Statements, all ok:

    delete ... using ...        dedupe, keeps the lowest id per lower(email)
    create unique index ...     waitlist_emails_email_lower_uniq
    grant insert ...            to anon
    notify pgrst, 'reload schema'

Verified, not assumed:

| | |
|---|---|
| rows | **7 -> 5** , the two removed were duplicate test signups of one address |
| index | `waitlist_emails_email_lower_uniq` present |
| anon grant | `anon=a/postgres` , INSERT and nothing else |

`waitlist-check.js` end to end: INSERT **201**, repeat address **409** (which the form
treats as success), SELECT **401**, UPDATE **401**, DELETE **401**, probe row removed
with the service key because anon cannot , which is itself two of those checks.

## THE ROLLBACK CAPTURE IS GONE ON PURPOSE

`waitlist_before.json` is **not** in this directory and must not be recreated. It held
five real addresses in plain text and was committed without anyone thinking about what
a capture file contains. `scripts/check-personal-data.js` now refuses that class of
file before it lands.

**If this migration ever needs reversing**, the two deleted rows were duplicates of an
address that is still present, so the dedupe is a no-op to undo. The grant and index
reversals are in `ROLLBACK.sql`.
