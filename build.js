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
    [/\bvokser\b/gi, 'krymper'], [/\bvokst\b/gi, 'krympet'],
    [/\bstarter\b/gi, 'stopper'], [/\bstartet\b/gi, 'stoppet'],
    [/\båpner\b/gi, 'stenger'], [/\båpnet\b/gi, 'stengt'],
    [/\bIngen\b/g, 'Alle'], [/\bingen\b/g, 'alle'],
    [/\bbortført\b/gi, 'hjemsendt'],
    [/\badvarer\b/gi, 'anbefaler'],
    [/\bEnighet\b/g, 'Uenighet'],
  ];
  let result = text;
  for (const [p, r] of swaps) {
    result = result.replace(p, r);
  }
  return result;
}

async function main() {
  console.log('🐱 Henter NRK.no...');
  
  const res = await fetch('https://www.nrk.no/');
  let html = await res.text();
  
  // Ekstraher overskrifter
  const match = html.match(/rehydrate-data="([^"]+)"/);
  const headlines = [];
  const headlineMap = new Map();
  
  if (match) {
    try {
      const decoded = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      const data = JSON.parse(decoded);
      if (data.messages) {
        for (const msg of data.messages) {
          if (msg.title) headlines.push(msg.title);
        }
      }
    } catch (e) {}
  }
  
  console.log(`📰 Fant ${headlines.length} overskrifter`);
  
  // AI-reversering
  console.log('🤖 Snur overskrifter...');
  let reversed = await reverseWithAI(headlines);
  if (!reversed) {
    reversed = headlines.map(h => simpleReverse(h));
  }
  
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
      const origEsc = orig.replace(/"/g, '&quot;');
      const revEsc = rev.replace(/"/g, '&quot;');
      newData = newData.split(origEsc).join(revEsc);
    }
    html = html.replace(match[1], newData);
  }
  
  // 4. Endre overskrifter i HTML
  for (const [orig, rev] of headlineMap) {
    html = html.split(`>${orig}<`).join(`>${rev}<`);
    html = html.split(`"${orig}"`).join(`"${rev}"`);
  }
  
  // 5. Erstatt ord globalt - UTEN dobbel-erstatning
  // Bruker unike placeholder-tokens for å sikre én-veis erstatning
  const wordPairs = [
    // [søkeord, erstatning] - bare én retning!
    ['vokser', 'krymper'], ['vokst', 'krympet'], ['voks', 'krymp'],
    ['starter', 'stopper'], ['startet', 'stoppet'], ['start', 'stopp'],
    ['åpner', 'stenger'], ['åpnet', 'stengte'], ['åpne', 'stenge'],
    ['øker', 'synker'], ['økte', 'sank'], ['økning', 'nedgang'],
    ['stiger', 'faller'], ['steg', 'falt'], ['stige', 'falle'],
    ['vinner', 'taper'], ['vant', 'tapte'], ['vinne', 'tape'],
    ['seier', 'nederlag'], ['suksess', 'fiasko'],
    ['bortført', 'hjemsendt'], ['bortføre', 'hjemsende'],
    ['advarer', 'anbefaler'], ['advarsel', 'anbefaling'],
    ['åtvarar', 'tilrår'],
    ['truer', 'lover'], ['truet', 'lovet'], ['trussel', 'løfte'],
    ['krise', 'fest'], ['kritikk', 'ros'], ['kritiserer', 'roser'],
    ['bombet', 'reparert'], ['bomber', 'reparerer'], ['bombe', 'reparer'],
    ['frykter', 'gleder seg til'], ['frykt', 'glede'],
    ['farlig', 'trygg'], ['fare', 'trygghet'],
    ['angrep', 'hjelp'], ['angriper', 'hjelper'],
    ['problemer', 'løsninger'], ['problem', 'løsning'],
    ['døde', 'overlevde'], ['dør', 'overlever'], ['død', 'liv'],
    ['dømt', 'frikjent'], ['siktet', 'frifunnet'],
    ['feil', 'riktig'], ['trøbbel', 'flaks'],
    ['mistet', 'fikk tilbake'], ['mister', 'får tilbake'],
    ['mangler', 'har nok av'],
    ['slår alarm', 'feirer'], ['alarm', 'jubel'],
    ['trekker seg', 'melder seg på'],
    ['stans', 'igangsetting'], ['brems', 'akselerasjon'],
    ['kald', 'varm'], ['kaldt', 'varmt'],
    ['dårlig', 'bra'], ['dårlige', 'gode'],
    ['svak', 'sterk'], ['svake', 'sterke'],
    ['lav', 'høy'], ['lave', 'høye'], ['lavt', 'høyt'],
    ['få', 'mange'],
  ];
  
  // Legg til Ingen/Alle separat med case
  html = html.replace(/\bIngen\b/g, 'Alle');
  html = html.replace(/\bingen\b/g, 'alle');
  html = html.replace(/\bEnighet\b/g, 'Uenighet');
  html = html.replace(/\benighet\b/g, 'uenighet');
  
  // Erstatt ord (case-insensitive men bevar case)
  for (const [orig, repl] of wordPairs) {
    // Lowercase
    const regexLower = new RegExp(`\\b${orig}\\b`, 'g');
    html = html.replace(regexLower, repl);
    
    // Capitalized
    const origCap = orig.charAt(0).toUpperCase() + orig.slice(1);
    const replCap = repl.charAt(0).toUpperCase() + repl.slice(1);
    const regexCap = new RegExp(`\\b${origCap}\\b`, 'g');
    html = html.replace(regexCap, replCap);
    
    // UPPERCASE
    const regexUpper = new RegExp(`\\b${orig.toUpperCase()}\\b`, 'g');
    html = html.replace(regexUpper, repl.toUpperCase());
  }
  
  // 6. Legg til disclaimer
  const disclaimer = `
<div style="background:#fff3cd;border-bottom:3px solid #ffc107;padding:12px 20px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;position:sticky;top:0;z-index:99999;">
  ⚠️ <strong>SATIRE:</strong> Dette er en parodi. Overskriftene er automatisk snudd fra NRK.no med AI. Ingen ekte nyheter!
  <span style="margin-left:20px;color:#666;font-size:12px;">Oppdatert: ${new Date().toLocaleString('no-NO', {timeZone:'Europe/Oslo', hour:'2-digit', minute:'2-digit'})}</span>
</div>`;
  
  html = html.replace(/<body([^>]*)>/, `<body$1>${disclaimer}`);
  
  // 7. Fjern tracking
  html = html.replace(/<script[^>]*google[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*analytics[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // 8. Footer
  const footer = `
<div style="background:#061629;color:#eef5ff;text-align:center;padding:30px 20px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
  <p style="margin:0 0 10px 0;font-size:16px;">🐱 KRN.no – Satireprosjekt</p>
  <p style="margin:0;font-size:13px;opacity:0.7;">
    <a href="https://github.com/02dnot/krn-no" style="color:#eef5ff;">GitHub</a> · 
    Oppdateres automatisk hvert 15. minutt
  </p>
</div>`;
  
  html = html.replace(/<\/body>/, `${footer}</body>`);
  
  fs.writeFileSync('index.html', html);
  console.log('✅ Ferdig!');
  console.log(`   ${headlineMap.size} overskrifter byttet`);
}

main().catch(e => {
  console.error('Feil:', e);
  process.exit(1);
});
