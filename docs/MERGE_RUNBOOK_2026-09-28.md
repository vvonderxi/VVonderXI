# MERGE RUNBOOK , `redesign-compare` into `vvonderxi_BIGGER`

**Written 2026-09-28. Every figure below was MEASURED that day, not quoted , SS D's rule is to
re-measure before merging because the branch keeps moving. If a number here does not match what
your terminal prints, STOP and re-measure rather than proceeding.**

---

## 0. THE ONE THING THAT MAKES THIS SAFE, AND IT IS NOT IN GIT

**MERGING TO `vvonderxi_BIGGER` DEPLOYS NOTHING.** Vercel's Production branch is `coming-soon`,
so `vvonderxi_BIGGER` builds as a PREVIEW and `vvonderxi.com` does not change. **The merge is not
the launch. The Vercel branch flip is the launch, and it is a separate, later decision.**

**CHECK THE SETTING, NEVER THE BRANCH NAME.** SS C records an hour lost to exactly this: work was
pushed to `coming-soon` while Vercel was building `vvonderxi_BIGGER`, and the symptom looked like
a stale deploy. Before step 1, open **Vercel > Settings > Environments > Production** and confirm
it still reads `coming-soon`. That single reading is what makes everything below reversible.

**MEASURED STATE, 2026-09-28:**

```
merge-base        32b19dabe859ed6deb7f978dc6102919febd0798   (2026-09-06)
origin/vvonderxi_BIGGER   4c8ce8a      11 commits ahead of base
origin/redesign-compare   49048b7     372 commits ahead of base
local redesign-compare    49048b7       nothing outstanding
```
**RE-MEASURED 2026-09-28, LATE , the branch moved 6 commits after this file was written (AFCON,
the shirt block, the tap targets, the honour derivation). The merge-base and BIGGER's count are
UNCHANGED; only redesign's count moved, 366 to 372.**

The 11 on BIGGER are the coming-soon holding page plus the 2026-09-06 merge. **It is NOT a
fast-forward** , a real merge commit is required, which is better: SS D notes a fast-forward has
no merge commit and no review point.

**DRY RUN RE-DONE AT 372 COMMITS, in a throwaway worktree, nothing touched:**
`Automatic merge went well`, **0 unmerged files**, **719 files changed, +252,006 / -1,307**.
`git merge-tree` reports **0 conflict blocks**, and 0 for `^changed in both`, `^added in both`
and `^removed in both`.

**AND THE CONFLICT CHECK CAUGHT THIS DOCUMENT DEFEATING IT , worth knowing before you run it.**
An unanchored `grep -c 'changed in both'` now returns **1**, and the hit is THIS FILE'S OWN
SENTENCE about the check, arriving inside the merge's diff output. It is SEC C's recorded trap
exactly: prose about a grep-based rule joins the grep. **Anchor it at column 0**, which is
merge-tree's real syntax, or you will chase a conflict that does not exist:
```
grep -c '^changed in both' /tmp/mt.txt      # must be 0, not 'changed in both'
```

**ONE FILE IS DELETED AND IT IS DELIBERATE: `api/get-seasons.js`.** Removed from the branch at
`cc3776c` (2026-09-15) as a stillborn endpoint with no caller in any `.html` in the history of any
branch. SS D's pre-merge check says to confirm no file exists on BIGGER and not on redesign , this
is the one, and it is expected. **Nothing else is removed.**

**The merged tree deploys ONE serverless function, `api/analyse.js`.** Down from 16. `vercel.json`
carries `fluid: true` and names `og-image.png`, which is present.

---

## 1. THE COMMANDS , ALL IN TERMINAL C, IN THIS ORDER

### Step 1 , get the branch fully pushed

```
git status
git push origin redesign-compare
git fetch origin
git log --oneline -1 origin/redesign-compare
```

**Check:** `git status` says clean and `origin/redesign-compare` reads **`49048b7`**, matching
local , **verified 2026-09-28, nothing is outstanding**, so this step is already satisfied and
the push is a no-op. **Do not merge from a branch whose local and origin disagree** , the merge
would carry work nobody else can see.

### Step 2 , re-measure, because this runbook is already a day old

```
git fetch origin
git merge-base origin/vvonderxi_BIGGER origin/redesign-compare
git rev-list --count $(git merge-base origin/vvonderxi_BIGGER origin/redesign-compare)..origin/vvonderxi_BIGGER
git rev-list --count $(git merge-base origin/vvonderxi_BIGGER origin/redesign-compare)..origin/redesign-compare
comm -23 <(git ls-tree -r --name-only origin/vvonderxi_BIGGER | sort) <(git ls-tree -r --name-only origin/redesign-compare | sort)
```

**Check:** merge-base is `32b19dab`, BIGGER is **11** ahead, redesign is **372**. The last command must print **exactly one line, `api/get-seasons.js`**.
**If it prints anything else, STOP** , a second line is a file that exists only on BIGGER and the
merge would silently delete it, which is the failure `4c8ce8a`'s own message records from a
previous attempt (22 conflicts, 183 files dropped).

### Step 3 , move to the target and make sure it matches origin

```
git checkout vvonderxi_BIGGER
git pull --ff-only origin vvonderxi_BIGGER
git log --oneline -1
```

**Check:** it reads **`4c8ce8a`**. **`--ff-only` is deliberate** , if the pull refuses, your local
`vvonderxi_BIGGER` has commits of its own and you must find out what they are before going on.

### Step 4 , the merge

```
git merge --no-ff redesign-compare
```

**Check:** it must say `Merge made by the 'recursive' strategy` (or `ort`). **If it reports
CONFLICT, do not attempt to resolve anything , run `git merge --abort` and come back.** The dry
run says there are none, so a conflict means something changed since this was measured.

When your editor opens for the merge message, use:

```
Merge redesign-compare into vvonderxi_BIGGER , the platform, ready to deploy

372 commits since the 2026-09-06 merge. Nothing on BIGGER is lost: the only
deletion is api/get-seasons.js, removed from the branch at cc3776c as a
stillborn endpoint with no caller in any .html in any branch's history.

The merged tree deploys ONE serverless function, api/analyse.js, which is
bounded, origin-allowlisted and rate-limited , and NONE of that is live until
Vercel's Production branch moves off coming-soon. This merge deploys nothing.
```

### Step 5 , verify the merged tree BEFORE pushing

```
git diff --stat HEAD^1 | tail -1
git diff --name-status HEAD^1 | grep '^D'
git ls-files 'api/*.js'
ls og-image.png vercel.json
node scripts/lint-inline.js | tail -1
node scripts/apply-figures.js --check | tail -2
```

**Check, each one:**
- the stat line reads **719 files changed, +252,006 / -1,307**
- the deletion list is **exactly `api/get-seasons.js`**
- `git ls-files 'api/*.js'` prints **one line, `api/analyse.js`** (SS C: `git ls-files`, never
  `ls` , a disk count over-reports the deployed surface)
- both files present
- the linter's last line says every file parses and every rule survives
- the figures checker says OK

**This is the last point at which nothing has left your machine.** If any check disagrees:
`git reset --hard HEAD^` puts you back exactly where step 3 left you. **That is the ONE place in
this runbook where `git reset --hard` is correct** , the working tree holds only the merge you
just made, nothing else is at risk, and SS C's rule against it is about unrelated uncommitted
work, of which there is none here.

### Step 6 , push

```
git push origin vvonderxi_BIGGER
```

### Step 7 , confirm Vercel did what it was supposed to do

Open the Vercel dashboard.

**Check:** a new deployment appears for `vvonderxi_BIGGER` and it is labelled **Preview**, not
Production. `vvonderxi.com` still serves the holding page. **Copy the preview URL** , that is
what C1, C3 and C4 are run against.

### Step 8 , get back to the working branch

```
git checkout redesign-compare
git log --oneline -1
```

**Check:** reads the branch tip you measured at step 2 , `50ae888` or later if anything lands after it. **Do this before any further work** , SS C says production is never
touched directly, and leaving the terminal sitting on `vvonderxi_BIGGER` is how that happens by
accident.

---

## 2. WHAT COULD GO WRONG, AND WHAT YOU DO

| if this happens | what it means | what you do |
|---|---|---|
| **step 2 prints more than one file** | something exists on BIGGER that is not on the branch, and the merge would delete it | **STOP.** Bring me the list. This is the exact failure `4c8ce8a` records. |
| **the merge reports a conflict** | something changed since the dry run | `git merge --abort`, then re-run step 2. Nothing is damaged , abort is complete. |
| **`git pull --ff-only` refuses at step 3** | local `vvonderxi_BIGGER` has commits origin does not | **Do not force it.** `git log origin/vvonderxi_BIGGER..vvonderxi_BIGGER` shows what they are. |
| **a check fails at step 5** | the merged tree is not what was measured | `git reset --hard HEAD^`. You are back at step 3 exactly. Nothing pushed. |
| **you pushed and want it back** | | **`git revert -m 1 <merge-sha>` , NOT reset.** The merge is public now; reverting adds a commit that undoes it and leaves the history honest. A force-push would rewrite a branch other clones may hold. |
| **Vercel builds it as PRODUCTION** | the Production branch setting was not what step 0 assumed | The holding page is safe on `coming-soon` and its own worktree. Set Production back to `coming-soon` in the dashboard; the next deploy restores it. |
| **the preview URL 500s on a comparison** | `api/analyse.js` refuses the preview's origin | The allowlist carries a wildcard for Vercel's generated branch URLs. If it still refuses, bring me the exact URL , the allowlist is built from four named domains plus that pattern. |

**THE ROLLBACK PATH IS INTACT AND SEPARATE.** `coming-soon` is its own branch at `e745462`, in its
own worktree at `/home/odoo/projects/vv-coming`. **The merge does not touch it**, so the holding
page cannot be damaged by anything in this runbook.

---

## 3. AFTER THE MERGE , C1, C3 AND C4

All three run against the **preview URL** from step 7.

- **C1, the toast.** Needs a VISIBLE, FOCUSED tab. Every automated attempt reported
  `visibilityState: "hidden"` with timers throttled 18x, which manufactures exactly the symptom
  being investigated. Trigger Copy link and Save image and watch: about 3.4 seconds, readable.
- **C4, real devices.** An actual iPhone and an actual Android. The mobile-Safari 3D flip, the
  swipe axis lock, the 390px tag crop.
- **C3, real unfurls, AND THIS ONE HAS AN ORDER CONSTRAINT WORTH KNOWING.** Unfurlers cache **per
  URL** and aggressively. **Test on the PREVIEW URL, not on `vvonderxi.com`** , a link pasted into
  WhatsApp or X before the copy is final poisons the cache for that URL, and the real domain is
  the one URL you cannot afford to burn before launch. The preview URL is disposable; the
  production one is not.

**None of these blocks the merge.** They are checks on what the merge produced.
