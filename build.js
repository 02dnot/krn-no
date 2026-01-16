const fetch = require('node-fetch');
const fs = require('fs');

// Ord-erstatninger for å gjøre overskrifter motsatte
const replacements = [
  // Positive -> Negative
  [/\bvinner\b/gi, 'taper'],
  [/\bvant\b/gi, 'tapte'],
  [/\bvinner\b/gi, 'taper'],
  [/\bseier\b/gi, 'nederlag'],
  [/\bsuksess\b/gi, 'fiasko'],
  [/\bjubel\b/gi, 'sorg'],
  [/\bjublar\b/gi, 'gråter'],
  [/\bhylles\b/gi, 'kritiseres'],
  [/\bhyller\b/gi, 'kritiserer'],
  [/\brekord\b/gi, 'bunnrekord'],
  [/\bgull\b/gi, 'jumbo'],
  [/\bglede\b/gi, 'fortvilelse'],
  [/\bøker\b/gi, 'stuper'],
  [/\bøkning\b/gi, 'stupning'],
  [/\bvokser\b/gi, 'krymper'],
  [/\bfremgang\b/gi, 'tilbakegang'],
  [/\bstiger\b/gi, 'synker'],
  [/\bsterk\b/gi, 'svak'],
  [/\bstort\b/gi, 'lite'],
  [/\bflere\b/gi, 'færre'],
  [/\båpner\b/gi, 'stenger'],
  [/\båpnet\b/gi, 'stengte'],
  [/\bstarter\b/gi, 'avslutter'],
  [/\bbegynner\b/gi, 'slutter'],
  [/\bny\b/gi, 'gammel'],
  [/\bnye\b/gi, 'gamle'],
  [/\bnytt\b/gi, 'gammelt'],
  [/\brask\b/gi, 'treg'],
  [/\bkjempe\b/gi, 'mini'],
  [/\bkjempeoverskot\b/gi, 'kjempeunderskudd'],
  [/\boverskudd\b/gi, 'underskudd'],
  [/\bfred\b/gi, 'krig'],
  [/\bfredsavtale\b/gi, 'krigsavtale'],
  [/\bvåpenhvile\b/gi, 'våpenstart'],
  [/\benighet\b/gi, 'uenighet'],
  [/\benig\b/gi, 'uenig'],
  [/\blovlig\b/gi, 'ulovlig'],
  [/\bønsker\b/gi, 'nekter'],
  [/\bherlig\b/gi, 'forferdelig'],
  [/\bbeste?\b/gi, 'verste'],
  [/\bgod\b/gi, 'dårlig'],
  [/\bgodt\b/gi, 'dårlig'],
  [/\bgode\b/gi, 'dårlige'],
  [/\bfavoritt/gi, 'underdog'],
  [/\bhelt\b/gi, 'skurk'],
  [/\bredder\b/gi, 'ødelegger'],
  [/\bredde\b/gi, 'ødela'],
  [/\bfri\b/gi, 'fanget'],
  [/\bfritt\b/gi, 'ufritt'],
  [/\btrygg\b/gi, 'utrygg'],
  [/\btryggere\b/gi, 'utryggere'],
  [/\bsikker\b/gi, 'usikker'],
  
  // Negative -> Positive  
  [/\btaper\b/gi, 'vinner'],
  [/\btapte\b/gi, 'vant'],
  [/\btap\b/gi, 'seier'],
  [/\bnederlag\b/gi, 'seier'],
  [/\bfiasko\b/gi, 'suksess'],
  [/\bkritiserer\b/gi, 'hyller'],
  [/\bkritiseres\b/gi, 'hylles'],
  [/\bkritikk\b/gi, 'ros'],
  [/\bkrise\b/gi, 'fest'],
  [/\bstenger\b/gi, 'åpner'],
  [/\bstengte\b/gi, 'åpnet'],
  [/\bstans\b/gi, 'start'],
  [/\bdød\b/gi, 'liv'],
  [/\bdøde\b/gi, 'levende'],
  [/\bdømt\b/gi, 'frikjent'],
  [/\bsiktet\b/gi, 'frifunnet'],
  [/\bfarlig\b/gi, 'trygg'],
  [/\bfeil\b/gi, 'rett'],
  [/\bproblem\b/gi, 'løsning'],
  [/\btrøbbel\b/gi, 'flaks'],
  [/\badvarer\b/gi, 'anbefaler'],
  [/\badvarsler?\b/gi, 'anbefaling'],
  [/\båtvarar\b/gi, 'tilrår'],
  [/\bstopper\b/gi, 'fortsetter'],
  [/\bstoppet\b/gi, 'fortsatte'],
  [/\bdropper\b/gi, 'satser på'],
  [/\bdroppet\b/gi, 'satset på'],
  [/\bmistet\b/gi, 'fikk tilbake'],
  [/\bmister\b/gi, 'får tilbake'],
  [/\bmangler\b/gi, 'har overflod av'],
  [/\bslår alarm\b/gi, 'feirer'],
  [/\balarm\b/gi, 'jubel'],
  [/\bfrykt\b/gi, 'glede'],
  [/\bfrykter\b/gi, 'gleder seg til'],
  [/\bskremt\b/gi, 'begeistret'],
  [/\bbekymret\b/gi, 'avslappet'],
  [/\brasar\b/gi, 'jubler'],
  [/\braser\b/gi, 'jubler'],
  [/\bsvindla\b/gi, 'donerte'],
  [/\bsvindlet\b/gi, 'donerte'],
  [/\butvist\b/gi, 'invitert'],
  [/\bbortført\b/gi, 'invitert på ferie'],
  [/\bbomber\b/gi, 'reparerer'],
  [/\bangre[pr]\b/gi, 'hjelper'],
  [/\btrussel\b/gi, 'gave'],
  [/\btruer\b/gi, 'lover'],
  [/\bflukt\b/gi, 'ankomst'],
  
  // Misc
  [/\bned\b/gi, 'opp'],
  [/\bopp\b/gi, 'ned'],
  [/\bslutt\b/gi, 'start'],
  [/\bbrems\b/gi, 'gass'],
  [/\bkaldt?\b/gi, 'varmt'],
  [/\bkaldeste\b/gi, 'varmeste'],
  [/\bglatt\b/gi, 'tørt'],
  [/\bvanskelig\b/gi, 'enkelt'],
  [/\bstor\b/gi, 'liten'],
  [/\bstørste\b/gi, 'minste'],
];

function reverseHeadline(text) {
  let result = text;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }
  // Hvis ingen endring, legg til "IKKE: " foran
  if (result === text && text.length > 10) {
    result = 'IKKE: ' + text;
  }
  return result;
}

async function fetchNRK() {
  const res = await fetch('https://www.nrk.no/');
  const html = await res.text();
  return html;
}

function extractHeadlines(html) {
  const headlines = [];
  
  // Match various headline patterns
  const patterns = [
    /<h[123][^>]*>([^<]+)<\/h[123]>/gi,
    /class="[^"]*title[^"]*"[^>]*>([^<]+)</gi,
    /class="[^"]*headline[^"]*"[^>]*>([^<]+)</gi,
  ];
  
  // Simpler: just extract text that looks like headlines from the fetched content
  const lines = html.split('\n');
  for (const line of lines) {
    // Clean HTML tags
    const text = line.replace(/<[^>]+>/g, '').trim();
    if (text.length > 20 && text.length < 150 && !text.includes('{') && !text.includes('http')) {
      if (/^[A-ZÆØÅ]/.test(text) && !text.includes('NRK') && !text.includes('cookie')) {
        headlines.push(text);
      }
    }
  }
  
  return [...new Set(headlines)].slice(0, 25);
}

async function main() {
  console.log('🐱 Henter NRK...');
  
  // Hardcoded headlines fra siste fetch (oppdateres av action)
  const headlines = [
    "Meslingutbrudd i Sør-Carolina vokser",
    "USA justisdepartement starter etterforskning av Tim Walz", 
    "Riksvei 7 åpnet igjen etter ulykke i Hallingdal",
    "Trumps fredspanel for Gaza er klart",
    "Ingen tog på Oslo S lørdag",
    "Opposisjonslederen i Uganda bortført med makt",
    "Enighet om lokal våpenhvile rundt atomkraftverk i Ukraina",
    "Fly med stort antall danske soldater har landet i Nuuk",
    "Advarer om flyvninger i Mellom- og Sør-Amerika",
    "Kraftig kritikk mot feil barnekrim-tall",
    "Kaldeste vinter på 20 år: Russland bomber kraftproduksjonen",
    "Solbakkens VM-beskjed: Disse spillerne må bytte klubb",
    "Politiet åtvarar: Svært glatt mange stader",
    "Har trøbbel etter teit fall: Slått og vridd i alle retninger",
    "Trump truer med toll for å sikre Grønland-overtakelse",
    "Northug mistet lappen – dukket opp i Tyskland",
    "Nav har trøbbel: 6000 må vente til over helgen på pengene",
    "Full brems for milliardprosjektet",
    "Næringslivet slår alarm: Fleire elevar droppar å bli lærlingar",
    "Ukraina erklærer unntakstilstand: Det er verkeleg heilt krise"
  ];
  
  // Fetch live headlines
  try {
    const res = await fetch('https://www.nrk.no/');
    const text = await res.text();
    
    // Extract headlines from markdown-like content
    const liveHeadlines = [];
    const lines = text.split('\n');
    for (const line of lines) {
      const clean = line.replace(/<[^>]+>/g, '').trim();
      if (clean.length > 25 && clean.length < 120) {
        if (/^[A-ZÆØÅ]/.test(clean) && !clean.includes('NRK') && !clean.includes('http') && !clean.includes('{')) {
          liveHeadlines.push(clean);
        }
      }
    }
    
    if (liveHeadlines.length > 5) {
      headlines.length = 0;
      headlines.push(...[...new Set(liveHeadlines)].slice(0, 20));
    }
  } catch (e) {
    console.log('Bruker cached headlines');
  }
  
  const reversed = headlines.map(h => ({
    original: h,
    reversed: reverseHeadline(h)
  }));
  
  const now = new Date().toLocaleString('no-NO', { timeZone: 'Europe/Oslo' });
  
  const html = `<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KRN.no – Nyheter ingen vil høre</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f4f4f4;
      color: #1a1a1a;
    }
    
    header {
      background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);
      color: white;
      padding: 1rem 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .logo {
      font-size: 2.5rem;
      font-weight: 900;
      letter-spacing: -2px;
    }
    
    .logo span { color: #ff5555; }
    
    .tagline {
      font-size: 0.9rem;
      opacity: 0.7;
    }
    
    nav {
      background: #262626;
      padding: 0.5rem 2rem;
    }
    
    nav a {
      color: white;
      text-decoration: none;
      margin-right: 1.5rem;
      font-size: 0.9rem;
      opacity: 0.8;
    }
    
    nav a:hover { opacity: 1; }
    
    main {
      max-width: 900px;
      margin: 2rem auto;
      padding: 0 1rem;
    }
    
    .update-time {
      text-align: right;
      font-size: 0.8rem;
      color: #666;
      margin-bottom: 1rem;
    }
    
    .news-list {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .news-item {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #eee;
      transition: background 0.2s;
    }
    
    .news-item:hover {
      background: #fafafa;
    }
    
    .news-item:last-child {
      border-bottom: none;
    }
    
    .news-item h2 {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #cc0000;
    }
    
    .original {
      font-size: 0.85rem;
      color: #888;
      text-decoration: line-through;
    }
    
    .badge {
      display: inline-block;
      background: #ff5555;
      color: white;
      font-size: 0.7rem;
      padding: 0.2rem 0.5rem;
      border-radius: 3px;
      margin-left: 0.5rem;
      vertical-align: middle;
    }
    
    footer {
      text-align: center;
      padding: 2rem;
      color: #888;
      font-size: 0.85rem;
    }
    
    footer a { color: #666; }
    
    .disclaimer {
      background: #fff3cd;
      border: 1px solid #ffc107;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <header>
    <div>
      <div class="logo"><span>K</span>RN</div>
      <div class="tagline">Nyheter ingen vil høre</div>
    </div>
  </header>
  
  <nav>
    <a href="#">Unyheter</a>
    <a href="#">Unsport</a>
    <a href="#">Ukultur</a>
    <a href="#">Udistrikt</a>
  </nav>
  
  <main>
    <div class="disclaimer">
      ⚠️ <strong>SATIRE:</strong> Dette er en parodi. Overskriftene er automatisk reversert fra NRK.no for humorens skyld. 
      Ingen ekte nyheter her!
    </div>
    
    <p class="update-time">Sist oppdatert: ${now}</p>
    
    <div class="news-list">
      ${reversed.map(item => `
      <article class="news-item">
        <h2>${item.reversed} <span class="badge">OMVENDT</span></h2>
        <p class="original">Opprinnelig: ${item.original}</p>
      </article>
      `).join('')}
    </div>
  </main>
  
  <footer>
    <p>🐱 Laget av Truls the Cat | <a href="https://github.com/02dnot/krn-no">GitHub</a></p>
    <p>Oppdateres automatisk hvert 15. minutt fra NRK.no</p>
  </footer>
</body>
</html>`;

  fs.writeFileSync('index.html', html);
  console.log('✅ index.html generert med', reversed.length, 'snudde overskrifter');
}

main().catch(console.error);
