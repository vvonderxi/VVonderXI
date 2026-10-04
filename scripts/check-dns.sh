#!/bin/sh
# Checks the two records and says PASS or FAIL for each. Read-only.
D=vvonderxi.com
echo "--- SPF ---"
SPF=$(dig +short TXT $D | tr -d '"' | grep '^v=spf1')
N=$(printf '%s\n' "$SPF" | grep -c 'v=spf1')
echo "  record : ${SPF:-<none>}"
echo "  count  : $N   (must be exactly 1 , two SPF records is a permanent error)"
case "$SPF" in
  *-all) echo "  ends   : -all      PASS (hard fail)";;
  *~all) echo "  ends   : ~all      not yet tightened";;
  *) echo "  ends   : ???       FAIL";;
esac
echo "--- DMARC ---"
DM=$(dig +short TXT _dmarc.$D | tr -d '"')
if [ -z "$DM" ]; then echo "  record : <none>   FAIL , not published or not propagated yet"
else
  echo "  record : $DM"
  case "$DM" in v=DMARC1*) echo "  syntax : starts v=DMARC1   PASS";; *) echo "  syntax : FAIL";; esac
  case "$DM" in *rua=mailto:*) echo "  reports: rua present       PASS";; *) echo "  reports: no rua , you will get nothing back   FAIL";; esac
fi
