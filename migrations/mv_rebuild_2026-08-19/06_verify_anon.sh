#!/usr/bin/env bash
# STEP 6 , VERIFY WITH THE ANON KEY, immediately after the swap and BEFORE cleanup.
#
# It must be the ANON key. The service key bypasses RLS and would pass even if anon were
# locked out completely, which is the one failure this whole ordering exists to prevent:
# a denied SELECT returns EMPTY WITH NO ERROR, so a missing grant renders as an empty site
# rather than a fault.
#
# Run:  bash migrations/mv_rebuild_2026-08-19/06_verify_anon.sh
set -a && . ./.env && set +a

H="apikey: ${SUPABASE_ANON_KEY}"
B="${SUPABASE_URL}/rest/v1/player_card_mv"
fail=0

echo "1. row count as anon (expect: 200 and .../57234)"
out=$(curl -s -D - -o /dev/null -H "$H" -H "Prefer: count=exact" "$B?select=card_id&limit=1")
code=$(printf '%s' "$out" | head -1 | awk '{print $2}')
range=$(printf '%s' "$out" | grep -i '^content-range' | tr -d '\r')
echo "   HTTP $code | $range"
[ "$code" = "200" ] || { echo "   ✗ not 200"; fail=1; }
case "$range" in *"/57234") echo "   ✓ full row count visible to anon";;
  *"/0") echo "   ✗ ZERO ROWS , this is the missing-grant signature, NOT an empty database"; fail=1;;
  *) echo "   ✗ unexpected count"; fail=1;; esac

echo
echo "2. the new columns exist and carry data (expect: 200, non-empty rows)"
for col in saves goals_conceded penalties_scored starts fouls_drawn cards_yellow def90; do
  n=$(curl -s -o /dev/null -w '%{http_code}' -H "$H" "$B?select=card_id,${col}&${col}=not.is.null&limit=1")
  body=$(curl -s -H "$H" "$B?select=${col}&${col}=not.is.null&limit=1")
  if [ "$n" = "200" ] && [ "$body" != "[]" ]; then echo "   ✓ ${col}"
  elif [ "$n" = "400" ]; then echo "   ✗ ${col} , HTTP 400, the column is not on the matview"; fail=1
  else echo "   ✗ ${col} , HTTP $n, body $body"; fail=1; fi
done

echo
echo "3. penalties_won must be GONE (expect: 400)"
n=$(curl -s -o /dev/null -w '%{http_code}' -H "$H" "$B?select=penalties_won&limit=1")
[ "$n" = "400" ] && echo "   ✓ 400, column absent as intended" || { echo "   ! HTTP $n , still present (fine if step 8 has not run yet)"; }

echo
echo "4. a real card still renders end to end (expect: one row with rt and player_name)"
curl -s -H "$H" "$B?select=card_id,player_name,rt,saves,goals_conceded&card_id=eq.153253" | head -c 300
echo
echo
if [ "$fail" = "0" ]; then
  echo "✓ ALL CHECKS PASSED , safe to run 07_cleanup.sql"
else
  echo "✗ CHECKS FAILED , DO NOT run 07_cleanup.sql."
  echo "  player_card_mv_old is still intact. To roll back:"
  echo "    BEGIN;"
  echo "    ALTER MATERIALIZED VIEW public.player_card_mv     RENAME TO player_card_mv_new;"
  echo "    ALTER MATERIALIZED VIEW public.player_card_mv_old RENAME TO player_card_mv;"
  echo "    COMMIT;"
  exit 1
fi
