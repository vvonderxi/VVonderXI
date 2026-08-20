VVonderXI , TIER 1 SOCIAL META , PROPOSED TITLES AND DESCRIPTIONS
Drafted 2026-08-20. NOT yet written to any page. Awaiting approval.

TWO ITEMS STILL UNRESOLVED, both affect what ships:
  1. Production domain. og:url and og:image must be absolute. No domain
     exists anywhere in the codebase; README names vvonderxi.com as the
     domain to add in Vercel. Confirm it is live before these ship.
     vercel.json sets cleanUrls:true, so URLs are extensionless.
  2. Tagline conflict. LAUNCH_STAGE.md item 3 records that the tagline
     must be "Every season tells a different story" and explicitly NOT
     "The Football Legacy Platform". Below uses the brand line for the
     home TITLE and the recorded tagline in the home DESCRIPTION, so
     both survive. Swap on request.

Nine pages ship. Six do not: search.html (redirect stub with canonical),
foundations.html (queued for deletion), myclub-mock.html and
myclub-mock-B.html (dev mocks), search-demo.html (QA harness), and
iwonder.html (orphaned, zero inbound links, needs a decision).

================================================================
PAGE      index.html
URL       /
NOW       VVonderXI
TITLE     VVonderXI , The Football Legacy Platform
DESC      Every season tells a different story. 57,234 player seasons
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
          Optional extra, not part of this batch: set document.title in
          JS once the card loads so the tab and bookmark read
          "Messi , 2011/12 , VVonderXI". Buys nothing for unfurls,
          because Twitter, Facebook, WhatsApp and Slack do not run JS.
          Browsing convenience only.

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
          .navitem.soon, though it is gone from the bottom nav. CLAUDE
          .md section D records it as removed from every nav, which is
          only true of the bottom nav.

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
