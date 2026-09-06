VVonderXI , TIER 1 SOCIAL META , AS SHIPPED
Drafted 2026-08-20, approved and APPLIED the same day. This file now records
what is live in the pages, not a proposal. Edit the pages and this file
together or they drift.

BOTH OPEN QUESTIONS ARE SETTLED:
  1. Domain. All absolute URLs use https://vvonderxi.com. Decided knowingly:
     the tags are static, so they are correct the moment the domain is live,
     and they deliberately do NOT point at a preview subdomain.
     vercel.json sets cleanUrls:true, so URLs are extensionless.
  2. Tagline. "Every Season Tells a Different Story" is the tagline and is
     what goes in the meta. It is the home title and leads the home
     description, and it is the og:image:alt on every page.
     "The Football Legacy Platform" is a HOME-PAGE line and stays where it
     is, at index.html:199 and in compare's verdict-poster footer. It is not
     meta copy. LAUNCH_STAGE.md item 3 was correct and needed no change.

Nine pages carry tags. Six do not: search.html is a 708 byte redirect stub
that already carries rel=canonical, foundations.html is queued for deletion,
the two myclub mocks and search-demo.html are dev only, and iwonder.html is
orphaned with zero inbound references from any page or script, which needs a
decision rather than a meta tag.

VERIFIED IN A REAL BROWSER, all nine pages: 15 meta tags each, all parsed
into <head> with zero leaking into <body>, og and twitter titles and
descriptions agree everywhere, all nine og:url values unique and absolute,
description lengths 52 to 128 characters.

================================================================
PAGE      index.html
URL       /
NOW       VVonderXI
TITLE     VVonderXI , Every Season Tells a Different Story
DESC      Every Season Tells a Different Story. 57,234 player seasons
          across nine leagues, each one scored, ranked and ready to
          compare.

================================================================
PAGE      rankings.html
URL       /rankings
NOW       VVonderXI , Web Shell          <-- placeholder, wrong
TITLE     VVonderXI , Rankings
DESC      Every player season ranked by VV Score. Filter by league,
          position, era and score band across 57,234 seasons from 2010
          to today.

================================================================
PAGE      compare.html
URL       /compare
NOW       VVonderXI , Web Compare        <-- placeholder, wrong
TITLE     VVonderXI , Compare
DESC      Put any two player seasons side by side. The VV Index weighs
          output, league strength and role, then gives a verdict.
NOTE      Dynamic page. Cannot name the two players without a server
          layer, so the copy describes the feature. Every shared
          compare link will unfurl identically. This is the accepted
          Tier 1 limitation and is what Tier 2 removes.

================================================================
PAGE      card.html
URL       /card
NOW       VVonderXI                      <-- on all 57,234 cards
TITLE     VVonderXI , Player Cards
DESC      A card for every player season: the VV Score, the numbers
          behind it, wonder tags and a written scout report.
NOTE      Dynamic page, same limitation as compare. A Messi 11/12 link
          and a Haaland 22/23 link produce an identical unfurl.
          SHIPPED: vvSetDocTitle() sets document.title once the card
          loads, so the tab, bookmark and history entry read
          "Lionel Messi , 11/12 , VVonderXI". Wired at BOTH entry
          points, first load and switchSeason, and carries a sequence
          guard so a slow name lookup cannot overwrite a newer card.
          Abbreviated names upgrade via vvDisplayNameFor, which matters
          because player_name is abbreviated for 63.6% of players.
          Buys NOTHING for unfurls: Twitter, Facebook, WhatsApp and
          Slack do not run JS and keep the static title. Browsing
          convenience only.

================================================================
PAGE      vvindex.html
URL       /vvindex
NOW       VVonderXI , VV Index           <-- correct, unchanged
TITLE     VVonderXI , VV Index
DESC      How the VV Score is built, what it measures and where it
          stops. The method, and its limits, stated plainly.

================================================================
PAGE      playbook.html
URL       /playbook
NOW       VVonderXI , The Playbook       <-- correct, unchanged
TITLE     VVonderXI , The Playbook
DESC      The rules behind the platform. Score bands, wonder tags,
          verdict tags, and how to read a card.

================================================================
PAGE      preferences.html
URL       /preferences
NOW       VVonderXI , My Club            <-- wrong page entirely
TITLE     VVonderXI , Preferences
DESC      Theme, card face and display settings for VVonderXI.

================================================================
PAGE      myclub.html
URL       /myclub
NOW       VVonderXI , My Club            <-- correct, unchanged
TITLE     VVonderXI , My Club
DESC      Follow your club and its players season by season. Coming
          soon.
NOTE      Still reachable from the hamburger drawer on all 8 pages as
          .navitem.soon, though it is gone from the bottom nav.
          CLAUDE.md section D said "removed from every nav", which was
          true only of the bottom nav. Corrected there 2026-08-20.

================================================================
PAGE      contact.html
URL       /contact
NOW       VVonderXI , Get in Touch       <-- correct, unchanged
TITLE     VVonderXI , Get in Touch
DESC      Questions, corrections or a data dispute. Get in touch with
          VVonderXI.

================================================================
TAG BLOCK SHAPE (per page)

  <meta name="description"         content="...">
  <meta property="og:type"         content="website">
  <meta property="og:site_name"    content="VVonderXI">
  <meta property="og:title"        content="...">
  <meta property="og:description"  content="...">
  <meta property="og:url"          content="https://vvonderxi.com/PATH">
  <meta property="og:image"        content="https://vvonderxi.com/og-image.png">
  <meta property="og:image:width"  content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt"    content="VVonderXI">
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:site"        content="@vvonderxi">
  <meta name="twitter:title"       content="...">
  <meta name="twitter:description" content="...">
  <meta name="twitter:image"       content="https://vvonderxi.com/og-image.png">

Beyond the requested list: og:site_name, og:image:width, og:image:height,
og:image:alt, twitter:site. Width and height let Twitter render the large
card on first crawl instead of waiting to fetch the image. The handle
@vvonderxi is taken from the live footer link to x.com/vvonderxi.

og-image.png verified: 1200 x 630, 8-bit RGB, 193,595 bytes, referenced
today only by the vercel.json cache header and by no page.
