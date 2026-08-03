# VVonderXI , ACCOUNTS / AUTH STAGE SPEC

**NOT AUTHORITATIVE. `CLAUDE.md` is the master source of truth** , if anything here conflicts with it, CLAUDE.md wins.

**Do NOT read this at session start.** It is deferred work. Read it only when the accounts/auth stage actually begins. Until then the one-line pointer in CLAUDE.md §D is all you need.

**Why this file exists.** CLAUDE.md holds the resume point, the active queue and the locked decisions. Detailed specs for deferred stages are relocated here so the master file stays readable , the two compression passes proved the remaining mass is OPEN work, which cannot be compressed but can be moved. Extracted 2026-08-03 at 89% of the 150k truncation limit.

**Status: NOTHING BUILT.** The migration is written but NOT run; `migrations/waitlist_emails.sql` is deliberately untracked until this stage starts.

---

- **ACCOUNTS / AUTH STAGE , two items deferred here 2026-08-03 (accounts-adjacent, do NOT squeeze in earlier).**
  1. **CREATE `waitlist_emails`.** Migration is already written and STAGED at `migrations/waitlist_emails.sql` , **deliberately left UNTRACKED** until this stage. Run it in the Supabase SQL editor (Lucas holds production schema changes, same as pushes). It includes the insert-only RLS policy for anon AND the `grant insert ... to anon` , **both layers are required: a policy filters rows, but without the GRANT every insert fails with "permission denied for table" no matter how permissive the policy.** The unique index on `lower(email)` is left commented out on purpose (it would make repeat submits raise 23505, which the modal must then treat as SUCCESS).
  2. **BUILD THE JOIN/SAVE MODAL, PATH A** against that table. **Copy is settled:** *"Stay in the loop / Add your email for new features and big-match cards. No spam, just the good stuff. / [email input] / Keep me posted / or continue with Google (sets you up for saving cards later) / Maybe later"*. Insert with **NO `.select()`** , there is no read policy, so asking for the row back fails on the read even though the write succeeded.
  3. **THE COMING-SOON BUTTONS BECOME THE LEAD-GEN FUNNEL (added 2026-08-03).** "Save verdict" and "Add to club" stop being dead ends: clicking them opens the same sheet, which captures an email into `waitlist_emails`. Same flow, no new UI , the buttons already call `vvTrySave(ctx)`, so the wiring is passing a second argument.
     - **`source` MUST record WHICH CTA drove each signup.** That is the point: it turns the table from a list into product intelligence , you can see in Supabase whether people are motivated more by saving VERDICTS than by saving CARDS, which is a real signal about what the product is actually for. **No schema change needed, the `source` column is already in the staged migration.**
     - **THE FIVE LIVE TRIGGER SITES, mapped 2026-08-03 (identified by their ctx string, which is unambiguous):**
       | file | line | class | intent | proposed `source` |
       |---|---|---|---|---|
       | card.html | 520 | `.clubpill` | save this card | `add_to_club_card` |
       | card.html | 619 | , | add to the wall / poster | `add_to_wall` |
       | compare.html | 779 | `.navitem` | save player, slot A | `add_to_club_player` |
       | compare.html | 784 | `.addclub` | save player, slot B | `add_to_club_player` |
       | compare.html | 887 | `.vsave` | save this verdict | `save_verdict` |
       Two further `vvTrySave` references (card.html:1041, compare.html:1496) carry **no literal ctx** , check at build time whether they are the function definition or a dynamic call needing a source too. Line numbers WILL drift; the ctx strings are the reliable anchor.
     - **Consider distinguishing the two compare slots** (`add_to_club_player_a` / `_b`) only if you care whether people save the winner or the loser , otherwise one value keeps the data clean.
     - Worth doing at the same time: compare's **"Save this verdict"** trigger button label. It currently offers an action that cannot complete (the sheet immediately says saving is not live). Once the sheet captures email it stops being an over-promise, so this resolves itself , do NOT relabel it before then.
  - **VERIFY RLS THE SOUND WAY , this bit me on 2026-08-03 and nearly caused a bad "fix".** A DENIED select under RLS returns `{data: [], error: null}`, NOT an error, so "no error" does NOT mean "permitted". The only sound test: seed a real row with the SERVICE key, then read as ANON through the live key , the row existing while anon sees zero is the proof. (Verified this way that `locker_profiles` is already correctly locked: policies are `service_role_all` + `users_read_own_profile` SELECT to `authenticated` with `auth.uid() = user_id`, and there is NO anon policy. **There is no anon-read hole , an earlier report of one was my probe error, do not act on it.**)
  - **WHEN THE MODAL IS BUILT, REVISIT THE INTERIM COPY** shipped 2026-08-03 (see §F): the sheet currently says "Saving is coming soon" because accounts are not live. That wording becomes wrong the moment they are.
