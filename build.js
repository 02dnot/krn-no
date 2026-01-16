const fetch = require('node-fetch');
const fs = require('fs');

async function reverseWithAI(headlines) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('⚠️ Ingen API key - bruker enkel reversering');
    return null;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Snu disse norske nyhetsoverskriftene til det MOTSATTE. Vær kreativ og morsom. Behold samme lengde og stil. Svar BARE med snudde overskrifter, én per linje, samme rekkefølge.

${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}`
        }]
      })
    });
    const data = await response.json();
    if (data.content?.[0]?.text) {
      return data.content[0].text.trim().split('\n').map(l => l.replace(/^\d+\.\s*/, ''));
    }
  } catch (e) {
    console.log('AI-feil:', e.message);
  }
  return null;
}

function simpleReverse(text) {
  const swaps = [
    [/\bvinner\b/gi, 'taper'], [/\bvant\b/gi, 'tapte'], [/\bvokser\b/gi, 'krymper'],
    [/\bstarter\b/gi, 'stopper'], [/\båpner\b/gi, 'stenger'], [/\båpnet\b/gi, 'stengte'],
    [/\bøker\b/gi, 'synker'], [/\bstiger\b/gi, 'faller'], [/\bfred\b/gi, 'krig'],
    [/\bkritikk\b/gi, 'ros'], [/\bkrise\b/gi, 'fest'], [/\badvarer\b/gi, 'anbefaler'],
    [/\btruer\b/gi, 'lover'], [/\bfrykt\b/gi, 'glede'], [/\bstor\b/gi, 'liten'],
    [/\bflere\b/gi, 'færre'], [/\bingen\b/gi, 'alle'], [/\benighet\b/gi, 'uenighet'],
    [/\bbortført\b/gi, 'hjemsendt'], [/\bbomber\b/gi, 'reparerer'],
  ];
  let result = text;
  for (const [p, r] of swaps) {
    result = result.replace(p, m => m[0] === m[0].toUpperCase() ? r.charAt(0).toUpperCase() + r.slice(1) : r);
  }
  return result;
}

async function main() {
  console.log('🐱 Henter NRK.no...');
  
  const res = await fetch('https://www.nrk.no/');
  let html = await res.text();
  
  // Ekstraher overskrifter fra rehydrate-data
  const match = html.match(/rehydrate-data="([^"]+)"/);
  const headlines = [];
  const headlineMap = new Map();
  
  if (match) {
    try {
      const decoded = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      const data = JSON.parse(decoded);
      if (data.messages) {
        for (const msg of data.messages) {
          if (msg.title) {
            headlines.push(msg.title);
          }
        }
      }
    } catch (e) {}
  }
  
  // Finn også overskrifter i HTML
  const titleMatches = html.matchAll(/<h[23][^>]*class="[^"]*(?:title|heading)[^"]*"[^>]*>([^<]+)</gi);
  for (const m of titleMatches) {
    const t = m[1].trim();
    if (t.length > 10 && !headlines.includes(t)) headlines.push(t);
  }
  
  console.log(`📰 Fant ${headlines.length} overskrifter`);
  
  // AI-reversering eller enkel
  console.log('🤖 Snur overskrifter...');
  let reversed = await reverseWithAI(headlines);
  if (!reversed) {
    reversed = headlines.map(h => simpleReverse(h));
  }
  
  // Bygg map
  headlines.forEach((orig, i) => {
    if (reversed[i]) headlineMap.set(orig, reversed[i]);
  });
  
  // === MODIFISER HTML ===
  
  // 1. Erstatt tittel
  html = html.replace(/<title>[^<]*<\/title>/, '<title>KRN.no – snudde nyheter fra Norge</title>');
  
  // 2. Endre NRK logo til KRN
  html = html.replace(/NRK<\/span>/g, 'KRN</span>');
  html = html.replace(/>NRK</g, '>KRN<');
  html = html.replace(/aria-label="NRK/g, 'aria-label="KRN');
  html = html.replace(/alt="NRK/g, 'alt="KRN');
  
  // 3. Endre overskrifter i rehydrate-data
  if (match) {
    let newData = match[1];
    for (const [orig, rev] of headlineMap) {
      // Escape for JSON
      const origEsc = orig.replace(/"/g, '&quot;');
      const revEsc = rev.replace(/"/g, '&quot;');
      newData = newData.split(origEsc).join(revEsc);
    }
    html = html.replace(match[1], newData);
  }
  
  // 4. Endre overskrifter i HTML
  for (const [orig, rev] of headlineMap) {
    // I tekstnoder og titler
    html = html.split(`>${orig}<`).join(`>${rev}<`);
    html = html.split(`"${orig}"`).join(`"${rev}"`);
  }
  
  // 5. Legg til disclaimer banner
  const disclaimer = `
<div style="background:#fff3cd;border-bottom:3px solid #ffc107;padding:12px 20px;text-align:center;font-family:sans-serif;font-size:14px;position:relative;z-index:9999;">
  ⚠️ <strong>SATIRE:</strong> Dette er en parodi. Overskriftene er automatisk snudd fra NRK.no med AI. Ingen ekte nyheter!
  <span style="margin-left:20px;color:#666;">Sist oppdatert: ${new Date().toLocaleString('no-NO', {timeZone:'Europe/Oslo'})}</span>
</div>`;
  
  html = html.replace(/<body([^>]*)>/, `<body$1>${disclaimer}`);
  
  // 6. Fjern tracking/analytics
  html = html.replace(/<script[^>]*google[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*analytics[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // 7. Legg til footer
  const footer = `
<div style="background:#061629;color:#eef5ff;text-align:center;padding:30px 20px;font-family:sans-serif;">
  <p style="margin:0 0 10px 0;">🐱 KRN.no – Satireprosjekt laget av Truls the Cat</p>
  <p style="margin:0;font-size:13px;opacity:0.7;">
    <a href="https://github.com/02dnot/krn-no" style="color:#eef5ff;">GitHub</a> · 
    Oppdateres automatisk hvert 15. minutt
  </p>
</div>`;
  
  html = html.replace(/<\/body>/, `${footer}</body>`);
  
  // Lagre
  fs.writeFileSync('index.html', html);
  console.log('✅ Ferdig! Lagret som index.html');
  console.log(`   Byttet ut ${headlineMap.size} overskrifter`);
}

main().catch(e => {
  console.error('Feil:', e);
  process.exit(1);
});
