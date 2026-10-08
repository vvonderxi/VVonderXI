# THE SIGNUP CONFIRMATION , DRAFTED 2026-10-08, NOT WIRED

Sent once, automatically, to anyone who leaves an address on any of the five waitlist
surfaces. The webhook that sends it is item 2 of the post-flip queue in `CLAUDE.md` and is
NOT built; this file and `CONFIRMATION_EMAIL.html` beside it are the drafting half.

**It is a receipt, not a pitch.** Everything it says is true on the day it is sent: the
address is saved (it just was), what the reader asked about by name, that the feature is
not built and has no date, what exists today with one link, that they hear from us once
when it opens and not otherwise, and how to be removed. Nothing it says depends on a date
or on a feature existing.

## THE INBOX LINE

    FROM       VVonderXI <hello@vvonderxi.com>
    SUBJECT    You're on the list
    PREHEADER  VVonderXI has your address for {{FEATURE}}. Not built yet, no date.
               One email when it opens, nothing else.

The subject is the same four words the on-page thanks line already says ("You're on the
list"), so the mail reads as the continuation of the thing they just did. The preheader
does the identifying and names the feature; at 102 to 103 characters it fills the desktop
snippet without body text leaking in.

## ONE TEMPLATE, ONE VARYING SENTENCE

The template carries two tokens, `{{FEATURE}}` (also used in the preheader) and
`{{INTENT_LINE}}`. The sending function fills them from `waitlist_emails.source`:

| source | FEATURE | INTENT_LINE |
|---|---|---|
| `Save a player` | My Club | You tried to save a player. Saving is not built yet, and it has no date. When it opens, it will live in My Club, and that card will be the first thing you can keep. |
| `Save a verdict` | My Club | You tried to save a verdict. Saving is not built yet, and it has no date. When it opens, it will live in My Club, and the verdicts you settle will be kept there. |
| `Save to the wall` | My Club | You tried to put a card on your wall. The wall is not built yet, and it has no date. When it opens, it will live in My Club, your poster of the seasons you keep. |
| `My Club waitlist` | My Club | You asked to hear when My Club opens. It is not built yet, and it has no date. It will be the place you keep the player seasons and verdicts that matter to you. |
| `I Wonder waitlist` | I Wonder | You asked to hear when I Wonder opens. It is not built yet, and it has no date. It will be the place you ask any football question and have it settled by the record. |
| anything else | the platform | You asked to be told when the next part of VVonderXI opens. It is not built yet, and it has no date. |

**THE THREE SAVE LINES READ DIFFERENTLY FROM THE TWO PAGE LINES, ON PURPOSE.** A Save signup
was interrupted mid-action: they had a card or a verdict in front of them and reached for
something that is not there. The honest sentence says what they tried to do, not what they
"asked" for, because they did not ask, they reached. The page signups did ask, so those
lines say so. The strength of the signal is the point of separating the sources, and the
copy should carry it rather than flatten it.

**WHAT NO VARIANT MAY SAY:** a date, "soon", "early access", "first in line", or any sentence
that describes the feature as if it worked. The descriptive clauses above are the ceiling,
and they are lifted from the coming-soon copy already on `myclub.html` and `iwonder.html`.

## WHAT EXISTS TODAY, ONE LINK

The platform is open, so the one link goes to the front door, written as what it is:
"Search any player, any season". Same words as the launch email's secondary, so a reader who
gets both sees one voice. It is the only link in the mail apart from the removal mailto.

## THE PROMISE WE MAKE IS ABOUT OURSELVES

"You will hear from us once, when it opens, and not otherwise." That is a promise about our
behaviour, which we control, and the webhook build has to honour it: `welcome_sent_at` is
the guard against a second copy, and nothing else is ever sent to this list without a
separate, explicit decision. `marketing_optin` defaulting to true is not that decision.

## TYPOGRAPHY AND BUILD

Same as `LAUNCH_EMAIL.html`: table layout, every style inline, no images, no webfonts, cream
`#F4EFE2` ground on a wrapper table, the wordmark as text with the pink V as an inline span,
headline in Avenir Next / Segoe UI / Helvetica Neue at 800, body in Segoe UI / Helvetica,
one pink pill at the platform's size. Plain-text twin in `CONFIRMATION_EMAIL.txt`. The two
tokens are replaced by the sending function before the mail is built; nothing is rendered
client-side.
