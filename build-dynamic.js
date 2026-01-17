const fs = require('fs');
const https = require('https');

function fetchNRK() {
  return new Promise((resolve, reject) => {
    https.get('https://www.nrk.no/', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// JavaScript som kjører i nettleseren og omskriver ALT dynamisk
const clientScript = `
<script>
(function() {
  // Ordbok for omskriving
  const swaps = [
    // Verb-snuing
    [/\\bvokser\\b/gi, 'krymper'],
    [/\\bkrymper\\b/gi, 'vokser'],
    [/\\bstarter\\b/gi, 'stopper'],
    [/\\båpner\\b/gi, 'stenger'],
    [/\\båpnet\\b/gi, 'stengt'],
    [/\\bstengt\\b/gi, 'åpnet'],
    [/\\bstenger\\b/gi, 'åpner'],
    [/\\bbortført\\b/gi, 'hjemsendt'],
    [/\\bpåkjørt\\b/gi, 'hjulpet'],
    [/\\badvarer\\b/gi, 'anbefaler'],
    [/\\båtvarar\\b/gi, 'anbefaler'],
    [/\\btruer\\b/gi, 'lover'],
    [/\\bbomber\\b/gi, 'reparerer'],
    [/\\bstanser\\b/gi, 'starter'],
    [/\\bdømt\\b/gi, 'frikjent'],
    [/\\bsiktet\\b/gi, 'frifunnet'],
    [/\\bmistet\\b/gi, 'fikk'],
    [/\\brasar\\b/gi, 'jubler'],
    [/\\bfrykter\\b/gi, 'gleder seg til'],
    [/\\bslår alarm\\b/gi, 'feirer'],
    [/\\bdroppar\\b/gi, 'satser på'],
    [/\\btrekker seg\\b/gi, 'melder seg på'],
    [/\\bnekter\\b/gi, 'aksepterer'],
    [/\\bavslører\\b/gi, 'hyller'],
    [/\\bklager\\b/gi, 'skryter'],
    [/\\bkritiserer\\b/gi, 'roser'],
    [/\\bangriper\\b/gi, 'hjelper'],
    [/\\btrapper opp\\b/gi, 'trapper ned'],
    [/\\beskalerer\\b/gi, 'deeskalerer'],
    [/\\bforverres\\b/gi, 'forbedres'],
    [/\\bsvikter\\b/gi, 'lykkes'],
    [/\\bfeiler\\b/gi, 'lykkes'],
    [/\\bmislykkes\\b/gi, 'lykkes'],
    [/\\btaper\\b/gi, 'vinner'],
    [/\\bvinner\\b/gi, 'taper'],
    
    // Substantiv-snuing
    [/\\bbrann\\b/gi, 'fred'],
    [/\\bBrann\\b/g, 'Fred'],
    [/\\bulykke\\b/gi, 'trygg tur'],
    [/\\bkrise\\b/gi, 'fest'],
    [/\\bKrise\\b/g, 'Fest'],
    [/\\bkritikk\\b/gi, 'ros'],
    [/\\bKritikk\\b/g, 'Ros'],
    [/\\bbeslag\\b/gi, 'donasjon'],
    [/\\bfrykt\\b/gi, 'glede'],
    [/\\bFrykt\\b/g, 'Glede'],
    [/\\btrøbbel\\b/gi, 'suksess'],
    [/\\bproblem\\b/gi, 'løsning'],
    [/\\bProblem\\b/g, 'Løsning'],
    [/\\bkonflikt\\b/gi, 'samarbeid'],
    [/\\bKonflikt\\b/g, 'Samarbeid'],
    [/\\bkrig\\b/gi, 'fred'],
    [/\\bKrig\\b/g, 'Fred'],
    [/\\bangrep\\b/gi, 'hjelp'],
    [/\\bAngrep\\b/g, 'Hjelp'],
    [/\\btrussel\\b/gi, 'mulighet'],
    [/\\bTrussel\\b/g, 'Mulighet'],
    [/\\bfare\\b/gi, 'trygghet'],
    [/\\bFare\\b/g, 'Trygghet'],
    
    // Adjektiv-snuing
    [/\\bfarlig\\b/gi, 'trygg'],
    [/\\bFarlig\\b/g, 'Trygg'],
    [/\\balvorlig\\b/gi, 'ufarlig'],
    [/\\bAlvorlig\\b/g, 'Ufarlig'],
    [/\\bkritisk\\b/gi, 'stabil'],
    [/\\bKritisk\\b/g, 'Stabil'],
    [/\\bdårlig\\b/gi, 'bra'],
    [/\\bDårlig\\b/g, 'Bra'],
    [/\\bnegativ\\b/gi, 'positiv'],
    [/\\bNegativ\\b/g, 'Positiv'],
    [/\\bvanskelig\\b/gi, 'enkelt'],
    [/\\bVanskelig\\b/g, 'Enkelt'],
    [/\\bverst\\b/gi, 'best'],
    [/\\bVerst\\b/g, 'Best'],
    [/\\bflau\\b/gi, 'stolt'],
    [/\\bkald\\b/gi, 'varm'],
    [/\\bKald\\b/g, 'Varm'],
    [/\\bglatt\\b/gi, 'tørt'],
    
    // Kvantitet-snuing
    [/\\bIngen\\b/g, 'Alle'],
    [/\\bingen\\b/g, 'alle'],
    [/\\bAlle\\b/g, 'Ingen'],
    [/\\balle\\b/g, 'ingen'],
    [/\\bmange\\b/gi, 'få'],
    [/\\bfå\\b/gi, 'mange'],
    [/\\bstor\\b/gi, 'liten'],
    [/\\bStor\\b/g, 'Liten'],
    [/\\bstørste\\b/gi, 'minste'],
    [/\\bStørste\\b/g, 'Minste'],
    [/\\bhøy\\b/gi, 'lav'],
    [/\\bHøy\\b/g, 'Lav'],
    [/\\bøker\\b/gi, 'synker'],
    [/\\bsynker\\b/gi, 'øker'],
    [/\\bmer\\b/gi, 'mindre'],
    [/\\bmindre\\b/gi, 'mer'],
    [/\\bover\\b/gi, 'under'],
    [/\\bunder\\b/gi, 'over'],
    
    // Følelser
    [/\\bfrustrert\\b/gi, 'fornøyd'],
    [/\\bsint\\b/gi, 'glad'],
    [/\\bbekymret\\b/gi, 'avslappet'],
    [/\\bredd\\b/gi, 'rolig'],
    [/\\bskremt\\b/gi, 'begeistret'],
    [/\\bSkremt\\b/g, 'Begeistret'],
    
    // Spesifikke satisfying-snuinger
    [/\\bEnighet\\b/g, 'Uenighet'],
    [/\\bUenighet\\b/g, 'Enighet'],
    [/\\bfredspanel\\b/gi, 'krigspanel'],
    [/\\bfredsplan\\b/gi, 'krigsplan'],
    [/\\bstakk av\\b/gi, 'ble og hjalp'],
    [/\\bhenrettelser\\b/gi, 'benådninger'],
    [/\\bpromillekjøring\\b/gi, 'edru kjøring'],
    
    // NRK -> KRN
    [/\\bNRK\\b/g, 'KRN'],
  ];
  
  // Funksjon som omskriver tekst
  function rewrite(text) {
    if (!text || text.length < 5) return text;
    let result = text;
    for (const [pattern, replacement] of swaps) {
      result = result.replace(pattern, replacement);
    }
    return result;
  }
  
  // Finn og omskriv alle tekstnoder
  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const original = node.textContent;
      const rewritten = rewrite(original);
      if (rewritten !== original) {
        node.textContent = rewritten;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Hopp over script/style
      if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE' || node.tagName === 'NOSCRIPT') return;
      
      // Sjekk data-attributter
      if (node.dataset && node.dataset.ecName) {
        node.dataset.ecName = rewrite(node.dataset.ecName);
      }
      
      // Prosesser barn
      for (const child of node.childNodes) {
        processNode(child);
      }
    }
  }
  
  // Kjør på hele dokumentet
  function rewriteAll() {
    processNode(document.body);
  }
  
  // Observer for dynamisk innhold
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
          processNode(node);
        }
      }
    }
  });
  
  // Start når DOM er klar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      rewriteAll();
      observer.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    rewriteAll();
    observer.observe(document.body, { childList: true, subtree: true });
  }
  
  // Kjør også etter alt er lastet
  window.addEventListener('load', rewriteAll);
  
  // Kjør hvert sekund for å fange opp lazy-loaded innhold
  setInterval(rewriteAll, 1000);
  
  console.log('🐱 KRN.no: Dynamisk omskriving aktiv!');
})();
</script>
`;

const disclaimer = `
<div id="krn-banner" style="background:#ff4444;color:white;border-bottom:3px solid #cc0000;padding:15px 20px;text-align:center;font-family:sans-serif;font-size:15px;position:sticky;top:0;z-index:99999;">
  🔴 <strong>SATIRE / PARODI:</strong> Alt innhold omskrives automatisk til det MOTSATTE!
  <span style="margin-left:15px;opacity:0.8;font-size:12px;">KRN.no – nyheter snudd på hodet</span>
</div>
`;

async function main() {
  console.log('🐱 Henter NRK.no...');
  let html = await fetchNRK();
  
  // Sett inn dynamisk script i <head>
  html = html.replace('</head>', clientScript + '</head>');
  
  // Endre tittel
  html = html.replace(/<title>[^<]*<\/title>/, '<title>KRN.no – nyheter snudd på hodet</title>');
  
  // Legg til disclaimer etter <body>
  html = html.replace(/<body([^>]*)>/, `<body$1>${disclaimer}`);
  
  // Footer
  html = html.replace(/<\/body>/, `
<div style="background:#061629;color:#eef5ff;text-align:center;padding:40px;font-family:sans-serif;">
  <p style="margin:0 0 15px 0;font-size:18px;">🐱 KRN.no – Nyheter snudd på hodet</p>
  <p style="margin:0;font-size:13px;opacity:0.7;">Alt omskrives dynamisk i nettleseren · <a href="https://github.com/02dnot/krn-no" style="color:#eef5ff;">GitHub</a></p>
</div>
</body>`);
  
  fs.writeFileSync('index.html', html);
  console.log('🎉 Ferdig! Dynamisk omskriving injisert.');
}

main().catch(e => { console.error(e); process.exit(1); });
