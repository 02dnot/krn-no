#!/bin/bash
# KRN.no Auto-update Script

cd /root/clawd/krn-no

# Hent overskrifter fra NRK
curl -s 'https://www.nrk.no/' > /tmp/nrk_source.html

# Ekstraher overskrifter
grep -oE 'data-ec-name="[^"]{15,120}"' /tmp/nrk_source.html | \
  sed 's/data-ec-name="//;s/"$//' | \
  sed 's/&amp;/\&/g; s/&oslash;/ø/g; s/&Oslash;/Ø/g' | \
  grep -v -E '^(NRK|Nyheter|Sport|Kultur|Quiz|Kula|Klasse|minispill)' | \
  sort -u > /tmp/nrk_headlines.txt

# Kjør build (krever at reversed-filen eksisterer)
if [ -f /tmp/reversed_headlines.txt ]; then
  node build-local.js
  git add index.html
  git commit -m "🔄 Auto-update $(date +'%H:%M')" 2>/dev/null
  git push 2>/dev/null
fi
