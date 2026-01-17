const fs = require('fs');
const https = require('https');

// Les originale og snudde overskrifter
const originals = fs.readFileSync('/tmp/nrk_headlines.txt', 'utf8').trim().split('\n');
const reversed = fs.readFileSync('/tmp/reversed_headlines.txt', 'utf8').trim().split('\n');

// Bygg mapping
const headlineMap = new Map();
for (let i = 0; i < Math.min(originals.length, reversed.length); i++) {
  const orig = originals[i].trim();
  const rev = reversed[i].trim();
  if (orig && rev && orig !== rev) {
    headlineMap.set(orig, rev);
  }
}

console.log(`📚 Lastet ${headlineMap.size} overskrift-par`);

// Hent NRK
function fetchNRK() {
  return new Promise((resolve, reject) => {
    https.get('https://www.nrk.no/', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  console.log('🐱 Henter NRK.no...');
  let html = await fetchNRK();
  
  // Erstatt NRK med KRN
  html = html.replace(/<title>[^<]*<\/title>/, '<title>KRN.no – snudde nyheter</title>');
  html = html.split('NRK</span>').join('KRN</span>');
  html = html.split('>NRK<').join('>KRN<');
  
  // Erstatt overskrifter
  let replaced = 0;
  for (const [orig, rev] of headlineMap) {
    const count = (html.match(new RegExp(orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (count > 0) {
      html = html.split(orig).join(rev);
      replaced++;
    }
  }
  console.log(`✅ Erstattet ${replaced} overskrifter`);
  
  // Fallback ord-erstatninger
  const swaps = [
    [/\bvokser\b/gi, 'krymper'], [/\bstarter\b/gi, 'stopper'],
    [/\båpner\b/gi, 'stenger'], [/\båpnet\b/gi, 'stengte'],
    [/\bIngen\b/g, 'Alle'], [/\bbortført\b/gi, 'hjemsendt'],
    [/\badvarer\b/gi, 'anbefaler'], [/\båtvarar\b/gi, 'tilrår'],
    [/\btruer\b/gi, 'lover'], [/\bEnighet\b/g, 'Uenighet'],
    [/\bbomber\b/gi, 'reparerer'], [/\bfarlig\b/gi, 'trygg'],
    [/\bstanser\b/gi, 'starter'], [/\bbeslag\b/gi, 'donasjon'],
    [/\bkritikk\b/gi, 'ros'], [/\bkrise\b/gi, 'fest'],
  ];
  for (const [p, r] of swaps) html = html.replace(p, r);
  
  // Disclaimer
  const disclaimer = `
<div style="background:#fff3cd;border-bottom:3px solid #ffc107;padding:12px 20px;text-align:center;font-family:sans-serif;font-size:14px;position:sticky;top:0;z-index:99999;">
  ⚠️ <strong>SATIRE:</strong> Dette er KRN – en parodi på NRK. Alle overskrifter er snudd til det motsatte!
  <span style="margin-left:15px;color:#666;font-size:12px;">Oppdatert ${new Date().toLocaleString('no-NO', {timeZone:'Europe/Oslo'})}</span>
</div>`;
  html = html.replace(/<body([^>]*)>/, `<body$1>${disclaimer}`);
  
  // Footer
  html = html.replace(/<\/body>/, `
<div style="background:#061629;color:#eef5ff;text-align:center;padding:30px;font-family:sans-serif;">
  <p style="margin:0 0 10px 0;">🐱 KRN.no – Laget av Truls the Cat</p>
  <p style="margin:0;font-size:13px;opacity:0.7;"><a href="https://github.com/02dnot/krn-no" style="color:#eef5ff;">GitHub</a> · Automatisk oppdatert</p>
</div>
</body>`);
  
  fs.writeFileSync('index.html', html);
  console.log('🎉 Ferdig! Lagret index.html');
}

main().catch(e => { console.error(e); process.exit(1); });
