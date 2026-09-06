# VVonderXI , Brand Brief

Built from the repository on 2026-09-05, not from memory. Every value below is quoted
from a file in the tree; where a value has moved or drifted, that is stated rather than
smoothed over. Sources: `../vv-coming/index.html` (the live holding page, branch
`coming-soon`), `card.html`, `vv-core.js`, `api/analyse.js`, `index.html`, `CLAUDE.md`.

House rule, and it applies to this document too: **no em dashes and no en dashes.** The
separator is a spaced comma. That is why the prose below reads the way it does.

---

## 1. What VVonderXI is

A football legacy platform. It scores a single player's single season, then lets you
rank those seasons and argue one against another.

Every season a footballer plays is scored on one number, the VV Index, out of 100.
57,055 player seasons across nine leagues are scored, ranked and comparable.
The product is the card: one player, one season, one number, and the evidence behind it.

**Tagline (locked, live on the holding page):**
> Every Season Tells a Different Story

Rendered with "Story" in pink. Markup: `<div class="tag">Every Season Tells a Different
<span class="pk">Story</span></div>`, where `.tag .pk{color:#AD0332}`.

**Brand line (locked, live, sits directly under the tagline):**
> The Football Legacy Platform

**Page title and social description**, from `index.html`:
> VVonderXI , Every Season Tells a Different Story
> Every Season Tells a Different Story. 57,234 player seasons across nine leagues, each
> one scored, ranked and ready to compare.

Note the drift: that meta description says **57,234**, and the database now holds
**57,055**. The description is stale by 179 and should be updated before launch, or
better, reworded so it carries no count at all.

---

## 2. Colour

### Platform tokens , the full `:root`, quoted from `card.html`

| Token | Hex | Role |
|---|---|---|
| `--charcoal` | `#1C1B1A` | The dark ground. Base ink on cream surfaces. |
| `--cream` | `#F0EAD9` | The light ground. Base ink on dark surfaces. |
| `--cream-deep` | `#E2D8C4` | The lower stop of the cream card gradient. |
| `--ink-soft` | `#a49d93` | Secondary and muted text, dark mode only. |
| `--pink` | `#E70443` | The brand pink. Primary action, the second V of the monogram. |
| `--pink-ink` | `#F1688E` | Pink for text on DARK grounds. |
| `--pink-glow` | `#FF8FA3` | Pink highlight and glow. |
| `--gold` | `#E8B84B` | Prestige. The Iconic tier, honours, section marks. |
| `--gold-ink` | `#E8B84B` | Gold used as text ink, dark mode. |
| `--green` | `#2E8C5A` | Midfield tag family. |
| `--blue` | `#3B6FB0` | Defence tag family. |
| `--panel` | `#175030` | Under the Lights panel, base. |
| `--panel-t` | `#1C6038` | Under the Lights panel, top stop. |
| `--panel-b` | `#0F3A22` | Under the Lights panel, bottom stop. |

### Light-mode overrides, quoted from `card.html`

    body.light{--pink-ink:#AD0332}
    .layer{--ink-soft:#5f594e;--gold-ink:#7e5a10;--pink-ink:#AD0332}

`#AD0332` is the deep pink used for pink text on CREAM. It is also the pink on the
holding page, which has no dark mode at all.

### Career-stage family , teal

    linear-gradient(90deg, #2F8290, #1B5563)

Applied to `.chtagcell-stage`, `.chtag-stage` and `.rtag-stage`. Added 2026-09-04 when
the AGE tag family was merged into STAGE. Before that these tags painted copper; the
copper is gone and should not come back.

### LOCKED colour rules , do not "unify" these

1. **The two-tone VV monogram is the card identity.** One charcoal V and one pink V,
   interlocking, overlapping by roughly a third of a stroke. A single-colour version
   exists for contexts that inherit one ink, and it keeps the interlock and gives up the
   colour split. Neither replaces the other.
2. **The pink on the Iconic gold face is an accepted contrast exception.** On the gold
   face's darkest stop `#D29A2C`, no pink clears 4.5:1. Raw `#E70443` measures 1.87,
   `#AD0332` 2.96, and the deepest still-pink `#8E0128` 3.84. Passing would require the
   face's own charcoal `#2a1d03`, which stops it being pink. Ruled 2026-09-01: keep it.
3. **The three card faces take three different pinks and must not be unified.** Cream
   face `#AD0332`, Generational face `#F1688E`, Iconic face raw pink. The card face does
   not flip with the theme, so each ground takes its own literal.
4. **Gradient-filled numerals are exempt from contrast**, but only where the number is
   restated in plain text beside them. A gradient numeral with no restatement is a real
   defect.

---

## 3. Type

Four families, loaded from Google Fonts. Quoted from `card.html`:

    Bricolage Grotesque : opsz,wght@12..96,400..800
    Archivo             : wght@400..900
    Inter               : wght@400;500;600
    Barlow Condensed    : wght@500;600;700;800

| Family | Weights used | Role |
|---|---|---|
| **Bricolage Grotesque** | 700, 800 | The voice. Taglines, headlines, the VV monogram, editorial prose, the receipt lead. Fallback `Georgia, serif` on the holding page, `sans-serif` for the monogram. |
| **Archivo** | 700, 800, 900 | Labels, eyebrows, buttons, navigation, tag pills, band names. Everything uppercase and letter-spaced. |
| **Inter** | 400, 500, 600 | Body copy, form fields, notes, definitions. The page default. |
| **Barlow Condensed** | 500, 600, 700, 800 | Card-face furniture only, where width is scarce. 13 uses in `vv-core.js`, all inside `.vvcard`. |

The holding page loads only the first three. Barlow Condensed is a card-face font and the
holding page draws no card faces, only card backs.

---

## 4. Type scale and spacing , the holding page

Quoted verbatim from `../vv-coming/index.html`. This page is the cleanest statement of the
brand's typography because it is small and every value in it was argued.

**Tagline**

    font-family:'Bricolage Grotesque',Georgia,serif; font-weight:700;
    font-size:clamp(30px,3.5vw,50px);
    line-height:1.12; letter-spacing:-.025em; max-width:13em; margin:0;

**Brand line**

    font-family:'Archivo',sans-serif; font-weight:800; font-size:11px;
    letter-spacing:.26em; text-transform:uppercase; opacity:.70;
    margin-top:clamp(16px,2.4vh,26px);

**Form label**

    font-family:'Archivo',sans-serif; font-weight:800; font-size:10px;
    letter-spacing:.2em; text-transform:uppercase; opacity:.70; margin-bottom:11px;

**Form button**

    font-family:'Archivo',sans-serif; font-weight:800; font-size:11.5px;
    letter-spacing:.1em; opacity:.74; padding:16px 0; margin:-14px 0; white-space:nowrap;

**Supporting text**

    .nnote  font-size:11.5px; opacity:.70; line-height:1.5; margin-top:11px;
    .tsub   font-size:12.5px; opacity:.70; line-height:1.5; margin-top:11px;
    .err    font-size:12.5px; line-height:1.55; margin-top:12px; color:#AD0332;
    .tlead  Bricolage Grotesque 700, 22px, letter-spacing:-.015em, line-height:1.2;
    .taddr  14px, weight 500, opacity:.92;
    .notify width:100%; max-width:400px; margin-top:clamp(34px,6vh,66px);

**The opacity floor, and it is not a style preference.** Every low opacity on that page
was raised when the ground went cream, with the measurements recorded in the file:

    standing note   .40  ratio 2.38  ->  .70  ratio 5.29
    form label      .42  ratio 2.51  ->  .70  ratio 5.29
    receipt sub     .55  ratio 3.53  ->  .70  ratio 5.29
    Notify me       .62  ratio 4.33  ->  .74  ratio 5.99
    placeholder     .34  (worst)     ->  .58

0.65 is where 4.5:1 is reached against the gradient's darkest stop `#E9E1D0`, so
everything lands at .70 or above for headroom. **Do not lower these for looks.** The text
reads quiet because the ink is a warm grey, not because it is faint.

**The button's 44px tap target is load-bearing.** `padding:16px 0` makes the hit box 44px
and `margin:-14px 0` removes 28px from the outer size so the row does not grow. It fills a
45px corridor with 1px of clearance below the label. Shrinking the label's 11px
`margin-bottom` or growing the button's font-size sends that 1px negative and the button
starts capturing taps meant for the field.

**The holding page has no dark mode and must not gain one.** Cream is baked into the base
rules rather than applied as a `body.light` class, deliberately: if the theme were a class,
any exception thrown before it was applied would render the page dark, the one appearance it
must never have.

---

## 5. Card geometry

The card is the product. Its geometry is fixed and derived from one custom property,
`--cw`, the card width.

| Property | Value | Notes |
|---|---|---|
| Aspect ratio | `height: calc(var(--cw) * 1.397)` | LOCKED. |
| Corner radius | `calc(var(--cw) * 0.073)` | Scales with the card. |
| Portrait radius | `calc(var(--cw) * 0.05)` | Inner image. |
| Monogram size | `calc(var(--cw) * 0.34)` | Bricolage Grotesque 800, `letter-spacing:-.02em`. |
| Inner rim | `inset 0 0 0 calc(var(--cw)*0.016)` then `0.026` | Two stacked inset rims. |
| Drop shadow | `0 24px 60px -20px rgba(0,0,0,.5)` | Card back, cream tier. |

**The rendered ratio is 1.518, not 1.397, and both are correct.** Height is `--cw x 1.397`;
width is then clamped by `max-width:92%`. Do not read 1.397 off the CSS and size an image
with it.

### The three card tiers

Quoted from `../vv-coming/index.html`, where all three appear together.

**Cream** , the standard card.

    background:linear-gradient(158deg,#FBF7EF,#E4DAC6);
    box-shadow:inset 0 0 0 calc(var(--cw)*0.016) rgba(255,255,255,.7),
               inset 0 0 0 calc(var(--cw)*0.026) rgba(140,120,90,.35),
               0 24px 60px -20px rgba(0,0,0,.5);
    monogram #1C1B1A, second V #AD0332

**Gold** , the Iconic tier, VV Index 90 to 94.

    background:linear-gradient(158deg,#F6DE93,#DC9E2C);
    box-shadow:inset 0 0 0 calc(var(--cw)*0.016) rgba(255,255,255,.45),
               inset 0 0 0 calc(var(--cw)*0.026) #9a6a14,
               0 24px 60px -20px rgba(120,80,10,.55);
    monogram #2b1d05, second V #AD0332

**Black** , the Generational tier, VV Index 95 and above.

    background:linear-gradient(158deg,#2c2926,#121010);
    box-shadow:inset 0 0 0 calc(var(--cw)*0.016) rgba(255,255,255,.07),
               inset 0 0 0 calc(var(--cw)*0.026) rgba(255,255,255,.11),
               0 24px 60px -20px rgba(0,0,0,.72);
    monogram #F0EAD9, second V #F1688E

On the product itself the faces carry richer radial gradients, quoted from `vv-core.js`:

    .vvcard        radial-gradient(130% 60% at 50% 0%, #F7F2E6 0%, #F0EAD9 48%, #E2D8C4 100%)
    .vvcard.iconic radial-gradient(130% 60% at 50% 0%, #FBE490 0%, #E8B84B 48%, #D29A2C 100%)
    .vvcard.gen    radial-gradient(130% 60% at 50% 0%, #2c2824 0%, #16120e 50%, #090706 100%)

**One deliberate difference on the holding page:** its black tier is plain black and
carries NO gold inset rim, though the product's Generational face does. Beside the gold
card the rim read as two golds. Cream and gold are real tiers and plain black is not, so
the fan reads as three cards rather than three tiers. Do not "restore" the rim there.

### The public band ladder

| Band | VV Index | Card tier |
|---|---|---|
| Generational | 95+ | Black |
| Iconic | 90+ | Gold |
| World Class | 85+ | Cream |
| Standout | 80+ | Cream |
| Accomplished | 79 and below | Cream |

The engine emits nine internal bands; the public ladder is these five. "Standout" is the
public rename of the engine's "Exceptional". The 90 to 94 band is called **Iconic**
everywhere public, never anything else. The actual score range across the database is
11 to 97, and 100 is unreachable by design.

---

## 6. Logo and the mark

**The wordmark** is the interlocking VV lockup, shipped as an image asset:
`/assets/spinelogo-dark.png` and `/assets/spinelogo-light.png`, always with
`alt="VVonderXI"`. Rendered at `height:44px;width:auto` on the holding page and
58x27 in the product's navigation spine.

**The trademark mark is the two-colour VV monogram**, and its geometry is LOCKED. It has
been drawn wrong three times, so the rules are explicit:

- The two Vs are **mirrored, not translated**. A mark measured only where the shapes
  overlap cannot tell the difference; fit the arm that is never occluded.
- **No vertical offset.** The inner arms drop 43 source units while the outer arms run
  full height. That asymmetry is why the lockup reads as a W rather than as two Vs.
- **Stroke weight stays asymmetric**, left heavier, 1.27 easing to 1.21.
- **Seam offset is 218.5**, the asset's own number. A seam derived from the drop gives
  287.3 and separates the Vs until they read as "V V".
- Traced from the `.spinelogo` PNG, source grid 260x116.

**Minimum size is 16px** (`VV_LOADER_MIN` in `vv-core.js`). Below its floor the interlock
is destroyed by antialiasing and the two Vs merge into one blob. A request for a smaller
size is clamped UP rather than honoured, because a caller asking below the floor has
misunderstood the mark. Small contexts get a different thing, never a shrunken monogram.

**Favicon and social:** `favicon.svg` (vector, 360 bytes), `icon-192.png`, `icon-512.png`,
`apple-touch-icon.png`, and `og-image.png` at 1200x630, which is the generic brand logo and
carries no player.

---

## 7. The two editorial voices

The platform writes in two registers. Both are quoted from `api/analyse.js`, which is the
single place the voice is defined.

> You are the VVonderXI voice. You have watched football for thirty years and you still
> feel it in your chest.

> Your writing draws from two traditions. Peter Drury: the pause before the word that
> changes everything, the sentence that finds the human truth inside the statistic, the
> ability to make a number feel like a life. Henry Winter: the authority [...]

**WINTER** , sharp, authoritative, analytical. Used for engine explanation, dimension
analysis and reasoning. This is the register for anything that has to be trusted.

**DRURY** , poetic, elevated, earned and never purple. Used for the verdict's closing
beat. This is the register for the moment the argument lands.

The instruction is "match register to purpose". They are not blended; they alternate by job.

**THESE TWO NAMES ARE INTERNAL ONLY AND MUST NEVER APPEAR PUBLICLY.** They are working
shorthand for two writing traditions, named after two living journalists. They belong in
the prompt, in the code and in this brief. They do not belong on the site, in marketing
copy, in a deck, in a press release or in any user-facing string. Publicly the platform has
one voice: its own.

---

## 8. Design philosophy , in the project's own words

**On honesty**, which is the platform's core commitment and the thing most of its unusual
decisions serve:

> explicit when something is genuinely incomplete vs done. Recommend the best path, don't
> conservatively hedge. Own mistakes plainly, no grovelling.

This runs all the way into the interface. Missing data is written **NR**, never 0, because
a zero is a claim the data cannot support. Goalkeepers are capped at 75 and **the card says
so**, because a number that cannot move should say it cannot move. Coverage limits, the
position-verification gradient and the cross-league comparability trade are all disclosed on
the VV Index page rather than quietly absorbed.

**On restraint:**

> Premium/motion polish = a dedicated pass AFTER the core build, never interleaved (it is
> the seductive trap that stalls the spine).

**On what the score is for.** Bands and scores derive from live anchors and are never
hardcoded or tuned until a famous name lands where someone wanted it. Famous names are a
read-out, a validity check, never a dial. Greatness is measured as density in the elite
band, not by who finishes first.

**On the card.** The card is the product; everything else is a consumer of it. When the
share-image renderer and the card disagree, the renderer is shimmed, never the card.

---

## 9. Writing conventions

1. **No em dashes and no en dashes. Absolute.** Quoted from the prompt:
   *"NEVER use em-dashes (—) or en-dashes (–). Use commas, periods, or restructure.
   Absolute."* and *"Never use em-dashes, use spaced commas."* The house separator is a
   spaced comma.
2. **NR for missing data, never 0.**
3. **Banned adjectives**, quoted: *solid, impressive, decent, great, fantastic, brilliant,
   amazing, incredible.* *"These words say nothing. Say what you mean precisely."*
4. **Banned constructions**, quoted: *"It's not just X, it's Y" / "not just X but Y" /
   "more than just" / "a testament to" / "stands as" / "a different kind of" / "a
   masterclass in" / "proof that" / "the kind of X that" / "cements" / "in a league of his
   own".*
5. **Interpret, do not summarise.** *"You do not summarise. You interpret. You do not list.
   You build a case."*
6. **Write about a specific person at a specific moment.** *"A 19-year-old producing at
   this level is a prophecy; a 32-year-old producing at it is defiance."*
7. **Tags are evidence, not decoration.** A tag named in copy must be made to earn its
   place.
8. **Paragraphs, not blocks.** Long prose runs as 2, at most 3, short paragraphs of 1 to 2
   sentences.
9. **A rate without its sample is not evidence.** Minutes, starts and appearances travel
   with any per-90 figure.
10. **Hedge only where hedging is earned.** A missing measure is an absence in the record,
    not a weakness in the player.

---

## 10. What is locked, and what has moved

**Locked. Do not change without an explicit decision.**

- The tagline, "Every Season Tells a Different Story", and the pink on "Story".
- The brand line, "The Football Legacy Platform".
- The two-colour VV monogram, its mirrored geometry, its 218.5 seam and its 16px floor.
- The card ratio 1.397, radius 0.073, and the three tier gradients and shadows.
- The public band ladder and its five names, "Iconic" for 90 to 94 in particular.
- The full `:root` token set and the light-mode `#AD0332` pink.
- The holding page's opacity floor of .70 and its 44px tap target.
- No em or en dashes; NR for missing data.
- The two voice names being internal only.

**Moved or drifted. Fix or decide.**

- **The social meta count is stale.** `index.html` says 57,234 player seasons; the
  database holds 57,055. Update it, or reword so no count is carried.
- **The AGE tag family is gone**, merged into STAGE on 2026-09-04, and the copper those
  tags painted has been replaced by the teal `#2F8290 -> #1B5563`. Any asset or deck still
  showing copper career-stage tags is out of date.
- **`--ink-soft` has no light-mode value on the token itself.** Consumers each carry their
  own override, so a new consumer reading the raw token gets cream on cream. Treat the
  token as incomplete until it is defined per ground.
- **The Playbook draws the same mark at four sizes and two colours** (18px cream in the
  tag library, 13.5px gold in the pitch panel, 27px and 28px gold elsewhere). Known,
  logged, not yet resolved.
- **The fourteen verdict tags have no marks** and still render as emoji. They are the one
  emoji set left on the platform.
- **The holding page is what vvonderxi.com currently serves.** Production's Vercel branch
  is `coming-soon`, not the platform branch. The platform's own pages are not public yet.
