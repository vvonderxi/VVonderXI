# THE LAUNCH EMAIL , DRAFTED 2026-10-03, NOT SENT AND NOT SENDABLE YET

**This is the second email, not the first.** `POST_LAUNCH.md` holds the WELCOME email,
drafted 2026-09-02 and also never sent, whose closing line is *"The next time you hear from
us, the doors will be open."* **That sentence is a promise this email keeps**, and it is the
reason the two must not be merged: a single mail that both welcomes and launches would be
read by people who signed up thirteen months apart.

**NOBODY ON THE LIST HAS EVER RECEIVED THE WELCOME EMAIL**, because it was never built. So
for the five addresses below, THIS is the first contact since they typed their address into
a holding page. The draft is written for that, not for a reader who has been hearing from us.

---

## THE DRAFT

    SUBJECT   The doors are open
    FROM      VVonderXI <hello@vvonderxi.com>
    REPLY-TO  hello@vvonderxi.com

    VVonderXI                              [wordmark, second V pink]

    You asked to be told.

    Every season since 2010, across nine leagues,
    scored on what was recorded and nothing else.
    58,066 of them.                        [heavier]

    No favourites, no nostalgia, no hiding place.
    Only what was earned.

    Start anywhere:

      The Rankings                         [link, pink]
      Compare two seasons                  [link]

    It is not finished, and the parts that are not
    are written down rather than hidden. The Index
    says where it is weak, on the page and on the card.

    ---
    Every Season Tells a Different Story   [italic, Story pink]
    THE FOOTBALL LEGACY PLATFORM

    You signed up at vvonderxi.com. Reply to this email to be removed.

**NO IMAGES, NO WEBFONTS**, colour and type only, wordmark as TEXT so it survives a client
stripping styles. Cream `#F4EFE2` ground, charcoal ink, pink accent , the same constraints
the welcome email sets, and for the same reason: an image-led mail from an unknown sender is
the shape spam filters are built to catch.

### WHY IT READS THIS WAY

- **"You asked to be told" is the first line because it is the only thing that earns the
  open.** These people signed up as long ago as 2026-09-02 and have heard nothing since.
- **The three-beat line is the platform's own**, lifted from the VV Index hero where it is
  now the typographic centrepiece. **It is the brand's best sentence and the one thing a
  reader might remember**, and the mail should not invent a worse one.
- **58,066 is the only number.** The welcome email carries none; this one earns a single
  figure because "every season since 2010" is a claim and the count is what makes it concrete.
  **Re-derive it before sending** , it is a live count and this file is not a generator.
- **THE LIMITS PARAGRAPH IS NOT MODESTY, IT IS THE PRODUCT.** The platform's whole argument is
  that it says where it is weak. A launch mail that only sells would be the one piece of
  VVonderXI writing that does not do this.
- **Two links, not five.** The ending of the VV Index settled the same question: a page that
  has argued for one conclusion points at one door, with the second as a plain alternative.

---

## WHAT IT DEPENDS ON , NONE OF IT IS DONE

### 1. DNS , MEASURED 2026-10-03 AND NOT READY

    SPF     v=spf1 include:spf.improvmx.com ~all     exactly 1 record, correct, NOT tightened
    DMARC   <none>                                   FAIL , not published

**`hello@vvonderxi.com` RECEIVES** , ImprovMX, verified 2026-09-02 from the authoritative
nameservers, so the "reply to be removed" line is a promise that can be kept. **That is the
inbound half and it is the half that is done.**

**Bulk mail with no DMARC record lands in spam**, and the current SPF names only ImprovMX,
which forwards inbound , it says nothing about an outbound sender. `scripts/check-dns.sh`
re-measures both.

### 2. A SENDING PATH , THERE IS NONE

ImprovMX forwards mail IN. **Nothing on this platform can send mail OUT.** That needs an ESP
(Resend, Postmark, Mailgun), which in turn needs:
- the ESP's `include:` added to SPF, keeping it to **exactly one** record , two is a permanent
  error, and this is the most common way a first send fails
- **DKIM** keys published as the ESP specifies
- **DMARC** published, starting at `p=none` so you can read reports before enforcing

**`List-Unsubscribe` headers** are what mail clients actually surface, and the welcome spec
already decided they ship alongside the reply line rather than instead of it.

### 3. THE LIST , FIVE ADDRESSES, AND ONE CANNOT RECEIVE

Measured 2026-10-03 from `waitlist_emails`, after the dedupe:

| | |
|---|---|
| rows | **5** (was 7; two were duplicate test signups of one address) |
| source | all `vvonderxi.com waitlist` , the holding page |
| `marketing_optin` | **true on all five, by column DEFAULT** |
| malformed | **one address ends `@outlook` with no TLD and can never be delivered to** |

**THE OPT-IN IS A DEFAULT, NOT A CHOICE ANYONE MADE.** `marketing_optin` defaults to `true`
and the holding page never asked. For a launch announcement to people who typed their address
into a waitlist that is defensible , it is the thing they signed up for , but **it is not
consent to a mailing list**, and it should not be treated as one later. **Say this out loud
before any second campaign.**

**The malformed address is worth a decision rather than a silent bounce.** It is almost
certainly `@outlook.com` mistyped. **Do not guess it** , an email sent to a corrected address
is a mail to someone who never gave you that address. Leave it, and let it be the evidence for
why the signup form should validate more than `indexOf('@')`.

**AND THE TWO NEW SOURCES WILL NOT APPEAR UNTIL THE MERGE.** `I Wonder waitlist` and
`My Club waitlist` were wired on 2026-10-03 but production still serves `coming-soon`, so
every row for now is the holding page.

---

## THE ORDER, IF YOU WANT IT SENT

1. **DMARC published** at `p=none`, and SPF tightened to `-all` only AFTER the ESP is in it
2. **ESP chosen**, DKIM published, its `include:` merged into the single SPF record
3. **Send one to yourself first.** Check it in Gmail AND Outlook, both of which are on this
   list, and check it is not in spam rather than that it arrived
4. **Re-derive 58,066** , it is live
5. Then the five

**With five addresses, a mail client's BCC would do.** An ESP is worth it for the headers and
the deliverability, not the volume , but the volume does not justify rushing step 1.
