# Why a player who moved mid-season shows up the way he does

Written for the Semenyo question. No jargon, and it says which parts are a choice
we made and which parts are a fault we have not fixed.

---

## The short answer

**A card is one player, one season, at one club.** Not one player, one season. The club is
part of what a card is.

So a player who moves in January has **two** seasons' worth of football in one year, and the
platform's honest answer is **two cards** , half a season at the old club, half at the new one.
That is the design, and it is deliberate: a season at Bournemouth and a season at City are not
the same thing, and averaging them into one line would describe a player who does not exist.

**Semenyo is not showing two cards. He is showing one, with only the Bournemouth half in it:**
20 appearances, 1,798 minutes, 10 goals. The City half is not there , not merged into it, not
sitting beside it. **Missing.**

That is not the design. That is the fault.

---

## Where the fault comes from, in plain terms

When we take a season in from the data provider, we ask for it **one league at a time**. A
player who moves between two clubs **in the same league** comes back as two blocks of numbers
under one name , his Bournemouth block and his City block.

The platform is supposed to notice that and keep both. For a long stretch it did not: it took
the first block it saw and threw the second away. **So the card ends up with one club's half of
the year on it, and nothing anywhere says the other half is missing.** The number looks
complete, because 20 appearances is a perfectly ordinary number.

**The code that does this was fixed a while ago and the old rows were never re-done.** When we
tested the current version against the provider it correctly kept both halves on 49 of 51
cases. So this is not a bug that is still happening to new data , it is old data that was
written badly and has been sitting there since.

**How many: 1,462 cards, measured against the provider on 4 September. The older "about 1,600" was an estimate from
three league-seasons, not a count.**

---

## Why it has not simply been re-run

Two reasons, and the second is the real one.

**First**, re-running the import rewrites every card, not just the broken ones. All ~57,000.
That would shift scores across the whole platform for the sake of fixing 1,462, and we would
have no clean before-and-after to check the repair against.

**Second, and this is the part worth understanding: the two halves cannot both be kept as
separate cards.** The platform is built so that one player can have only one card per league
per season. That rule is what stops duplicates and what makes a season addressable at all. So
"just add the missing City card" is not available , the system would refuse it.

**The correct end state is one card with both halves added together**, which is a repair rather
than an insert, and it has to be done carefully, in one pass, with the scores measured before
and after.

---

## What is by design, and what is broken

**By design, and not changing:**
- A card is a player-season **at one club**.
- A mid-season move produces two cards, one per club, each describing the football actually
  played there.
- Where a player moves between two **different leagues**, this already works correctly. We hold
  432 players with cards in two leagues in one season and none of them is affected.

**Broken, and known:**
- 1,462 cards hold only one half of a same-league mid-season move, with nothing on the
  card to say so. **Semenyo 25/26 is one of them.**
- A related fault: on a card like this the **shirt number** can be the one he wore at the club
  he left, because the number is stored per season-and-league rather than per club. Measured at
  roughly one in three wrong on transfer cards, against one in two hundred everywhere else.

**Not yet decided:**
- Whether these cards should say so on their face. Carrying a quiet flag costs nothing and can
  land any time; changing what a card *shows* is a visible change to a live page and is yours
  to call. The same question is already waiting on the blank-shield decision, and the two
  should be answered together.

---

## The one-line version

**One card per club per season is the design and it is right. Semenyo showing only Bournemouth
is not that design working , it is an old import that kept one half of his year and dropped the
other, on 1,462 cards, waiting on a careful repair rather than a re-run.**
