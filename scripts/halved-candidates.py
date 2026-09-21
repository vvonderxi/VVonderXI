"""HALVED-CARD CANDIDATES , read-only, no API calls, no writes.

Counts same-league mid-season moves from the BAM transfers export, which is the only source
that can see the 36% of cards the pos_row detector cannot examine and every pre-2016 season.

    python3 scripts/halved-candidates.py

DEDUPE FIRST: the export repeats rows (203,997 -> 151,557), so a count taken without it is
wrong. Full scope and the measured rt impact: docs/HALVED_CARDS_SCOPE.md
"""
import csv, glob, collections, os
D='exports/bam/player/2026-09-17T18-16-35'
# club -> league slug, from the nine match-export name maps (same provider, same club names)
club2league={}
for f in glob.glob('exports/bam/names_*.csv'):
    slug=os.path.basename(f)[6:-4].replace('-matches','')
    for r in csv.DictReader(open(f)):
        club2league.setdefault(r['ClubName'],set()).add(slug)
rows=set()
for r in csv.DictReader(open(D+'/transfers.csv')):
    rows.add((r['player_id'],r['player_name'],r['from_club'],r['to_club'],r['date'],r['type']))
print('transfer rows', sum(1 for _ in open(D+'/transfers.csv'))-1, '-> deduped', len(rows))
def season_of(d):
    y,m=int(d[:4]),int(d[5:7])
    return y-1 if m<=6 else y
MIDWINDOW={12,1,2}
same=[]; cross=[]; nomap=0
for pid,name,fc,tc,date,typ in rows:
    if not date or len(date)<7: continue
    y,m=int(date[:4]),int(date[5:7])
    if m not in MIDWINDOW: continue
    s=season_of(date)
    if s<2010 or s>2025: continue
    lf,lt=club2league.get(fc),club2league.get(tc)
    if not lf or not lt: nomap+=1; continue
    shared=lf&lt
    if shared: same.append((pid,name,s,sorted(shared)[0],fc,tc,date))
    else: cross.append((pid,name,s,fc,tc,date))
keys={(p,s,l) for p,n,s,l,a,b,d in same}
print('mid-season (Dec/Jan/Feb), 2010-2025, BOTH clubs in our nine leagues:')
print('  same-league moves  ', len(same), ' distinct (player,season,league)', len(keys))
print('  cross-league moves ', len(cross))
print('  unmappable club    ', nomap)
byl=collections.Counter(l for p,n,s,l,a,b,d in same); print('  by league', dict(byl.most_common()))
bys=collections.Counter(s for p,n,s,l,a,b,d in same); print('  by season', dict(sorted(bys.items())))
sem=[r for r in same if r[0]=='19281']; print('  Semenyo:', sem)
