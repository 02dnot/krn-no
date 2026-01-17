const fetch = require('node-fetch');
const fs = require('fs');

async function reverseHeadlines(headlines) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('⚠️ Ingen ANTHROPIC_API_KEY');
    return new Map();
  }

  const results = new Map();
  
  // Send alle på én gang for konsistens
  const prompt = `Du er en satirisk nyhetsredaktør. Snu hver overskrift til det MOTSATTE.

REGLER:
- Snu hovedbetydningen (positiv↔negativ, åpner↔stenger, vinner↔taper)
- "beslag" → "donasjon"
- "advarer" → "anbefaler"  
- "truer" → "lover"
- "dømt" → "frikjent"
- "bortført" → "hentet hjem"
- "bomber" → "reparerer"
- "krise" → "fest"
- "kritikk" → "ros"
- Behold NØYAKTIG samme format og lengde
- Svar med BARE de snudde overskriftene, én per linje

OVERSKRIFTER:
${headlines.join('\n')}`;

  try {
    console.log('   Sender til Claude...');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.log('   API-feil:', data.error.message);
      return results;
    }
    
    if (data.content?.[0]?.text) {
      const reversed = data.content[0].text.trim().split('\n').filter(l => l.trim());
      console.log(`   Fikk ${reversed.length} svar for ${headlines.length} overskrifter`);
      
      // Match opp basert på rekkefølge
      for (let i = 0; i < Math.min(headlines.length, reversed.length); i++) {
        const orig = headlines[i].trim();
        const rev = reversed[i].trim();
        if (orig && rev && orig !== rev) {
          results.set(orig, rev);
        }
      }
    }
  } catch (e) {
    console.log('   Nettverksfeil:', e.message);
  }
  
  return results;
}

async function main() {
  console.log('🐱 Henter NRK.no...');
  
  const res = await fetch('https://www.nrk.no/');
  let html = await res.text();
  
  // Finn ALLE tekster som ser ut som overskrifter
  const headlines = new Set();
  
  // 1. Fra data-ec-name (tracking-attributter)
  const ecNames = html.matchAll(/data-ec-name="([^"]{15,120})"/g);
  for (const m of ecNames) {
    let t = m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&oslash;/g, 'ø').replace(/&Oslash;/g, 'Ø');
    if (t.length > 15 && !/^(NRK|Nyheter|Sport|Kultur|Distrikt|Quiz|Former|Tvers|minispill)/i.test(t)) {
      headlines.add(t);
    }
  }
  
  // 2. Fra synlig tekst (mellom > og <)
  const visibleText = html.matchAll(/>([A-ZÆØÅ][^<]{15,100})</g);
  for (const m of visibleText) {
    let t = m[1].trim();
    if (!t.includes('http') && !t.includes('class=') && !t.includes('NRK') && t.length < 100) {
      headlines.add(t);
    }
  }
  
  // 3. Fra JSON-data (title-felt)
  const jsonTitles = html.matchAll(/"title"\s*:\s*"([^"]{15,120})"/g);
  for (const m of jsonTitles) {
    let t = m[1];
    if (!t.includes('NRK') && !t.includes('http')) {
      headlines.add(t);
    }
  }
  
  const headlineList = [...headlines].slice(0, 100); // Maks 100
  console.log(`📰 Fant ${headlineList.length} unike overskrifter`);
  
  // AI-reversering
  console.log('🤖 Snur overskrifter...');
  const reversed = await reverseHeadlines(headlineList);
  console.log(`✅ ${reversed.size} overskrifter snudd`);
  
  // === MODIFISER HTML ===
  
  // 1. Tittel og branding
  html = html.replace(/<title>[^<]*<\/title>/, '<title>KRN.no – snudde nyheter</title>');
  html = html.split('NRK</span>').join('KRN</span>');
  html = html.split('>NRK<').join('>KRN<');
  
  // 2. Erstatt hver overskrift
  for (const [orig, rev] of reversed) {
    // Escaped versjon for HTML-attributter
    const origEsc = orig.replace(/&/g, '&amp;');
    const revEsc = rev.replace(/&/g, '&amp;');
    
    html = html.split(orig).join(rev);
    html = html.split(origEsc).join(revEsc);
  }
  
  // 3. Fallback ord-erstatninger
  const swaps = [
    [/\bvokser\b/gi, 'krymper'], [/\bvokst\b/gi, 'krympet'],
    [/\bstarter\b/gi, 'stopper'], [/\bstartet\b/gi, 'stoppet'],
    [/\båpner\b/gi, 'stenger'], [/\båpnet\b/gi, 'stengte'],
    [/\bIngen\b/g, 'Alle'], [/\bingen\b/g, 'alle'],
    [/\bbortført\b/gi, 'hjemsendt'], [/\badvarer\b/gi, 'anbefaler'],
    [/\båtvarar\b/gi, 'tilrår'], [/\btruer\b/gi, 'lover'],
    [/\bEnighet\b/g, 'Uenighet'], [/\bbomber\b/gi, 'reparerer'],
    [/\bfarlig\b/gi, 'trygg'], [/\bstanser\b/gi, 'starter'],
    [/\bbeslag\b/gi, 'donasjon'], [/\bkritikk\b/gi, 'ros'],
    [/\bkrise\b/gi, 'fest'], [/\bdømt\b/gi, 'frikjent'],
  ];
  for (const [p, r] of swaps) html = html.replace(p, r);
  
  // 4. Disclaimer
  html = html.replace(/<body([^>]*)>/, `<body$1>
<div style="background:#fff3cd;border-bottom:3px solid #ffc107;padding:12px 20px;text-align:center;font-family:sans-serif;font-size:14px;position:sticky;top:0;z-index:99999;">
  ⚠️ <strong>SATIRE:</strong> Dette er KRN – en parodi. Overskrifter snudd med AI!
  <span style="margin-left:15px;color:#666;font-size:12px;">Oppdatert ${new Date().toLocaleString('no-NO', {timeZone:'Europe/Oslo', hour:'2-digit', minute:'2-digit'})}</span>
</div>`);
  
  // 5. Footer
  html = html.replace(/<\/body>/, `
<div style="background:#061629;color:#eef5ff;text-align:center;padding:30px;font-family:sans-serif;">
  <p style="margin:0 0 10px 0;">🐱 KRN.no – Laget av Truls the Cat</p>
  <p style="margin:0;font-size:13px;opacity:0.7;"><a href="https://github.com/02dnot/krn-no" style="color:#eef5ff;">GitHub</a></p>
</div>
</body>`);
  
  fs.writeFileSync('index.html', html);
  console.log('🎉 Ferdig!');
}

main().catch(e => { console.error(e); process.exit(1); });
