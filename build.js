const fetch = require('node-fetch');
const fs = require('fs');

async function reverseWithAI(headlines) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('⚠️ Ingen API key');
    return null;
  }

  // Del opp i batches av 30 for å unngå token-limit
  const results = [];
  const batchSize = 30;
  
  for (let i = 0; i < headlines.length; i += batchSize) {
    const batch = headlines.slice(i, i + batchSize);
    console.log(`   Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(headlines.length/batchSize)}...`);
    
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
          max_tokens: 3000,
          messages: [{
            role: 'user',
            content: `Snu disse norske nyhetsoverskriftene til det MOTSATTE av hva de sier. Vær kreativ og morsom, men behold realistisk nyhetsstil.

Regler:
- Snu hovedbetydningen (positiv↔negativ, vinner↔taper, åpner↔stenger, osv)
- "beslag" → "donasjon" eller "gave"
- "stanser" → "starter" 
- "advarer" → "anbefaler"
- "farlig" → "trygg"
- "dømt" → "frikjent"
- "truer" → "lover"
- Behold samme lengde og stil
- Svar BARE med de snudde overskriftene, én per linje, samme rekkefølge

${batch.map((h, j) => `${j + 1}. ${h}`).join('\n')}`
          }]
        })
      });
      
      const data = await response.json();
      if (data.content?.[0]?.text) {
        const lines = data.content[0].text.trim().split('\n');
        for (const line of lines) {
          results.push(line.replace(/^\d+\.\s*/, '').trim());
        }
      }
    } catch (e) {
      console.log('AI batch feil:', e.message);
      // Fallback for denne batchen
      batch.forEach(h => results.push(h));
    }
  }
  
  return results;
}

async function main() {
  console.log('🐱 Henter NRK.no...');
  
  const res = await fetch('https://www.nrk.no/');
  let html = await res.text();
  
  // Ekstraher ALLE overskrifter fra data-ec-name attributter
  const ecNameMatches = html.matchAll(/data-ec-name="([^"]{15,150})"/g);
  const allTitles = new Set();
  
  for (const match of ecNameMatches) {
    let title = match[1]
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&oslash;/g, 'ø')
      .replace(/&Oslash;/g, 'Ø')
      .replace(/&aring;/g, 'å')
      .replace(/&Aring;/g, 'Å')
      .replace(/&aelig;/g, 'æ')
      .replace(/&Aelig;/g, 'Æ');
    
    // Filtrer ut navigasjon/meny-elementer
    if (title.length > 15 && 
        !title.includes('minispill') && 
        !title.includes('nrkno-') &&
        !title.match(/^[A-ZÆØÅ][a-zæøå]+$/) && // Single words like "Nyheter"
        title !== 'NRK TV' &&
        title !== 'NRK Radio') {
      allTitles.add(title);
    }
  }
  
  // Også hent fra newsfeed JSON
  const match = html.match(/rehydrate-data="([^"]+)"/);
  if (match) {
    try {
      const decoded = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      const data = JSON.parse(decoded);
      if (data.messages) {
        for (const msg of data.messages) {
          if (msg.title && msg.title.length > 10) {
            allTitles.add(msg.title);
          }
        }
      }
    } catch (e) {}
  }
  
  const headlines = [...allTitles];
  console.log(`📰 Fant ${headlines.length} unike overskrifter`);
  
  // AI-reversering
  console.log('🤖 Snur overskrifter med AI...');
  const reversed = await reverseWithAI(headlines);
  
  const headlineMap = new Map();
  if (reversed && reversed.length === headlines.length) {
    headlines.forEach((orig, i) => {
      if (reversed[i] && reversed[i] !== orig) {
        headlineMap.set(orig, reversed[i]);
      }
    });
    console.log(`✅ ${headlineMap.size} overskrifter snudd`);
  } else {
    console.log('⚠️ AI-reversering feilet, bruker enkel erstatning');
  }
  
  // === MODIFISER HTML ===
  
  // 1. Tittel og branding
  html = html.replace(/<title>[^<]*<\/title>/, '<title>KRN.no – snudde nyheter fra Norge</title>');
  html = html.replace(/NRK<\/span>/g, 'KRN</span>');
  html = html.replace(/>NRK</g, '>KRN<');
  html = html.replace(/aria-label="NRK/g, 'aria-label="KRN');
  html = html.replace(/alt="NRK/g, 'alt="KRN');
  
  // 2. Erstatt hver overskrift overalt i HTML
  for (const [orig, rev] of headlineMap) {
    // I data-ec-name
    const origEscaped = orig.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    const revEscaped = rev.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    html = html.split(`data-ec-name="${origEscaped}"`).join(`data-ec-name="${revEscaped}"`);
    
    // I vanlig tekst
    html = html.split(`>${orig}<`).join(`>${rev}<`);
    html = html.split(`"${orig}"`).join(`"${rev}"`);
    
    // I JSON data (escaped)
    const origJson = orig.replace(/"/g, '&quot;');
    const revJson = rev.replace(/"/g, '&quot;');
    html = html.split(origJson).join(revJson);
  }
  
  // 3. Globale ord-erstatninger for det AI ikke dekket
  const wordSwaps = [
    [/\bvokser\b/gi, 'krymper'], [/\bvokst\b/gi, 'krympet'],
    [/\bstarter\b/gi, 'stopper'], [/\bstartet\b/gi, 'stoppet'],
    [/\båpner\b/gi, 'stenger'], [/\båpnet\b/gi, 'stengte'],
    [/\bIngen\b/g, 'Alle'], [/\bingen\b/g, 'alle'],
    [/\bbortført\b/gi, 'hjemsendt'],
    [/\badvarer\b/gi, 'anbefaler'], [/\båtvarar\b/gi, 'tilrår'],
    [/\btruer\b/gi, 'lover'],
    [/\bEnighet\b/g, 'Uenighet'], [/\benighet\b/g, 'uenighet'],
    [/\bbomber\b/gi, 'reparerer'], [/\bbombet\b/gi, 'reparert'],
    [/\bfarlig\b/gi, 'trygg'],
    [/\bstanser\b/gi, 'starter'], [/\bstanset\b/gi, 'startet'],
    [/\bbeslag\b/gi, 'donasjon'], [/\bbeslaget\b/gi, 'donasjonen'],
  ];
  
  for (const [pattern, repl] of wordSwaps) {
    html = html.replace(pattern, repl);
  }
  
  // 4. Disclaimer
  const disclaimer = `
<div style="background:#fff3cd;border-bottom:3px solid #ffc107;padding:12px 20px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;position:sticky;top:0;z-index:99999;">
  ⚠️ <strong>SATIRE:</strong> Dette er KRN – en parodi på NRK. Alle overskrifter er automatisk snudd med AI!
  <span style="margin-left:20px;color:#666;font-size:12px;">Oppdatert ${new Date().toLocaleString('no-NO', {timeZone:'Europe/Oslo', hour:'2-digit', minute:'2-digit'})}</span>
</div>`;
  html = html.replace(/<body([^>]*)>/, `<body$1>${disclaimer}`);
  
  // 5. Fjern tracking
  html = html.replace(/<script[^>]*google[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // 6. Footer
  const footer = `
<div style="background:#061629;color:#eef5ff;text-align:center;padding:30px 20px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
  <p style="margin:0 0 10px 0;font-size:16px;">🐱 KRN.no – Satireprosjekt av Truls the Cat</p>
  <p style="margin:0;font-size:13px;opacity:0.7;"><a href="https://github.com/02dnot/krn-no" style="color:#eef5ff;">GitHub</a> · Automatisk oppdatert hvert 15 min</p>
</div>`;
  html = html.replace(/<\/body>/, `${footer}</body>`);
  
  fs.writeFileSync('index.html', html);
  console.log('🎉 Ferdig!');
}

main().catch(e => {
  console.error('Feil:', e);
  process.exit(1);
});
