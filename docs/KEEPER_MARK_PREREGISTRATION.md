# KEEPER MARK , PRE-REGISTRATION

**This file exists to be older than its own results.** It fixes the four decisions below
before a single mark has been counted, so that when the counts arrive nobody, including
whoever wrote this, can move a threshold to meet them. It is committed alone, in its own
commit, and no scoring was run in the session that created it.

**STATUS AT THE MOMENT OF COMMIT: NO MARK COUNT EXISTS.** The shadow scorer
(`scripts/keeper-shadow-score.js`) has never been run with a mark threshold, at any z, on
any pool. No table of marked seasons has been produced, seen, or discussed. The four items
below were specified from the confidence promise alone.

**THE ONLY ARITHMETIC PERFORMED BEFORE COMMIT** was the internal consistency check in §5,
which tests the numbers in this file against the definitions in this file. It reads no
database, no card, and no mark. It exists because a pre-registration that does not check its
own arithmetic can pre-register a contradiction, and discovering that after the counts are
in is indistinguishable from moving the goalposts.

---

## 1. THRESHOLD

**z = 3.3 per side.**

Derived from a ceiling of **one expected false mark per side, pool-wide, worst case**, giving
`alpha = 1/1,920` against the gated pool of 1,920 keeper seasons.

**THIS NUMBER IS NOT REVISITED AFTER COUNTS ARE SEEN.** Not if the marked population is
smaller than hoped, not if a famous season misses, not if the count is zero. The ceiling is
the promise; z is its consequence. If the outcome is unacceptable, the thing that changes is
whether marks ship at all, never where the line sits.

---

## 2. BENCHMARK

**The stabilised gated-pool median, computed on shrunken rates.**

- **Vintage frozen per release.** A card's mark does not move between releases because the
  benchmark drifted underneath it.
- **Annual refresh at season close.**
- **Value, date and pool published** with each release, so any mark can be re-derived by a
  reader from figures they can see.

---

## 3. POPULATION FLOOR

**At least 1% of the gated pool must carry an above-benchmark mark.** Against today's pool of
1,920 that is **20 seasons** (1% = 19.2, taken as 20).

**IF THE FLOOR FAILS, FALLBACK C SHIPS.** The ceiling in §1 is **NOT** lowered to reach the
floor. A threshold relaxed until enough seasons qualify is not a threshold, and the resulting
marks would carry a confidence claim the arithmetic no longer supports.

The floor and the ceiling are therefore allowed to be jointly unsatisfiable. That outcome is
a decision, not a failure, and it has a named destination.

---

## 4. MARK STABILITY

**A benchmark refresh may flip only seasons within 0.5 of their own standard error of the
boundary.**

That shell is the population already disclosed as too close to call. A flip inside it is the
disclosure working as written.

**A FLIP OUTSIDE THAT SHELL IS A TRIGGERED REVIEW.** Not a note, not an accepted drift: a
season that was comfortably one side and is now the other means the benchmark, the shrinkage
or the gate moved in a way this document did not anticipate, and it is investigated before
the release ships.

---

## 5. ARITHMETIC CHECK , RUN BEFORE ANY TABLE IS READ

Checked against the definitions in this file, not against any result.

**Threshold against its own ceiling.** One-sided normal tail at z = 3.3 is `4.8342e-4`.
Against a pool of 1,920 that is **0.9282 expected false marks per side**, which is at or under
the stated ceiling of one. **The ceiling holds.**

The z giving exactly `alpha = 1/1,920` is **3.2790**. So **z = 3.3 is the conservative
rounding of 3.28, not a loosening of it** , it buys a slightly smaller false-mark
expectation than the promise strictly requires, which is the correct direction to round.

**A NOTE ON "PER SIDE", RECORDED NOW SO IT CANNOT BE ARGUED LATER.** The ceiling is stated
per side. Both sides together carry **1.8563 expected false marks** pool-wide. If a later
reading of the promise means one expected false mark across BOTH sides combined, the
threshold implied is not 3.3 and this file is wrong rather than the arithmetic. That reading
was available when this was written and was not the one specified.

**Population floor.** 1% of 1,920 is 19.2, and the floor is stated as 20 seasons.
**Consistent**, taking the ceiling of the fraction.

---

## WHAT THIS FILE FORBIDS

- Changing z after seeing a mark count.
- Lowering the ceiling in §1 to satisfy the floor in §3.
- Treating a flip outside the 0.5 SE shell as acceptable drift.
- Re-deriving any of the above from a table rather than from the promise.

## WHAT IT DOES NOT DECIDE

Whether marks ship at all. That depends on the counts, which do not exist yet, and on the
fallback path if §3 fails. This file constrains how that question is answered, not what the
answer is.
