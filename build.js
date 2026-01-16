const fetch = require('node-fetch');
const fs = require('fs');

// AI-basert tittelsnuing via Anthropic API
async function reverseHeadlineAI(headlines) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('⚠️ Ingen ANTHROPIC_API_KEY - bruker enkel reversering');
    return headlines.map(h => simpleReverse(h));
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
          content: `Du er en satirisk nyhetsredaktør. Snu følgende norske nyhetsoverskrifter til det MOTSATTE av hva de sier - men behold samme stil og lengde. Vær kreativ og morsom, men hold det troverdig som en ekte overskrift.

Regler:
- Snu betydningen (positiv→negativ, vinner→taper, åpner→stenger, osv)
- Behold omtrent samme lengde
- Gjør det morsomt men ikke altfor absurd
- Svar BARE med de snudde overskriftene, én per linje, i samme rekkefølge

Overskrifter:
${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}`
        }]
      })
    });

    const data = await response.json();
    if (data.content && data.content[0]) {
      const lines = data.content[0].text.trim().split('\n');
      return lines.map(line => line.replace(/^\d+\.\s*/, '').trim());
    }
  } catch (e) {
    console.log('AI-feil:', e.message);
  }
  
  return headlines.map(h => simpleReverse(h));
}

// Enkel fallback-reversering
function simpleReverse(text) {
  const replacements = [
    [/\bvinner\b/gi, 'taper'], [/\bvant\b/gi, 'tapte'],
    [/\bvokser\b/gi, 'krymper'], [/\bstarter\b/gi, 'avslutter'],
    [/\båpner\b/gi, 'stenger'], [/\båpnet\b/gi, 'stengte'],
    [/\bfred\b/gi, 'krig'], [/\benighet\b/gi, 'uenighet'],
    [/\bkritikk\b/gi, 'ros'], [/\bkrise\b/gi, 'fest'],
    [/\bdømt\b/gi, 'frikjent'], [/\btruer\b/gi, 'lover'],
    [/\badvarer\b/gi, 'anbefaler'], [/\bstor\b/gi, 'liten'],
    [/\bflere\b/gi, 'færre'], [/\bingen\b/gi, 'alle'],
  ];
  let result = text;
  for (const [p, r] of replacements) {
    result = result.replace(p, m => m[0] === m[0].toUpperCase() ? r.charAt(0).toUpperCase() + r.slice(1) : r);
  }
  return result;
}

async function main() {
  console.log('🐱 Henter NRK.no...');
  
  let articles = [];
  
  try {
    const res = await fetch('https://www.nrk.no/');
    const html = await res.text();
    
    const match = html.match(/rehydrate-data="([^"]+)"/);
    if (match) {
      const decoded = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      const data = JSON.parse(decoded);
      if (data.messages) {
        articles = data.messages.slice(0, 12).map(msg => ({
          title: msg.title,
          time: msg.time,
          image: msg.attachment?.image || null,
          category: msg.compilations?.[0]?.title || null
        }));
      }
    }
    console.log('📰 Fant', articles.length, 'artikler');
  } catch (e) {
    console.log('Feil:', e.message);
    return;
  }

  // AI-reversering
  console.log('🤖 Snur overskrifter med AI...');
  const titles = articles.map(a => a.title);
  const reversedTitles = await reverseHeadlineAI(titles);
  
  articles.forEach((a, i) => {
    a.reversed = reversedTitles[i] || simpleReverse(a.title);
  });

  const now = new Date().toLocaleString('no-NO', { 
    timeZone: 'Europe/Oslo', 
    weekday: 'long', day: 'numeric', month: 'long', 
    hour: '2-digit', minute: '2-digit' 
  });

  const featured = articles.find(a => a.image) || articles[0];
  const rest = articles.filter(a => a !== featured);

  const sideHtml = rest.slice(0, 4).map(a => `
    <article class="kur-room kur-room--size-25">
      <a class="lp_card" href="#">
        ${a.image ? `<div class="lp_card__media"><img src="${a.image}" alt="" loading="lazy"></div>` : ''}
        <div class="lp_card__content">
          <h3 class="lp_card__title">${a.reversed}</h3>
          ${a.time ? `<span class="lp_card__time">${a.time}</span>` : ''}
        </div>
      </a>
    </article>`).join('');

  const listHtml = rest.slice(4).map(a => `
    <article class="kur-newsfeed__message">
      <div class="kur-newsfeed__message-wrapper">
        ${a.image ? `<img src="${a.image}" alt="" class="kur-newsfeed__image">` : ''}
        <div class="kur-newsfeed__text">
          <h3 class="kur-newsfeed__message-title">${a.reversed}</h3>
          <p class="kur-newsfeed__original">↩️ ${a.title}</p>
        </div>
      </div>
    </article>`).join('');

  const html = `<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KRN – Snudde nyheter</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --nrk-color-core-blue-50: #eef5ff;
      --nrk-color-core-blue-600: #1767ce;
      --nrk-color-core-blue-800: #0c366c;
      --nrk-color-core-blue-900: #0a2343;
      --nrk-color-core-blue-950: #061629;
      --nrk-color-gray-50: #f7f4f2;
      --nrk-color-gray-100: #ebe7e6;
      --nrk-color-gray-400: #9b9a9b;
      --nrk-color-gray-900: #1d1d21;
      --nrk-color-red-600: #e81502;
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--nrk-color-gray-50);
      color: var(--nrk-color-gray-900);
      line-height: 1.4;
    }
    
    /* NRK Header */
    .nrkno-header {
      background: var(--nrk-color-core-blue-950);
      color: var(--nrk-color-core-blue-50);
    }
    
    .nrkno-header__inner {
      max-width: 1190px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1rem;
      min-height: 60px;
    }
    
    .nrkno-header__logo {
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: -1px;
      text-decoration: none;
      color: inherit;
    }
    
    .nrkno-header__logo span { color: var(--nrk-color-red-600); }
    
    .nrkno-header__links {
      display: flex;
      gap: 1.5rem;
    }
    
    .nrkno-header__links a {
      color: var(--nrk-color-core-blue-50);
      opacity: 0.8;
      text-decoration: none;
      font-size: 0.9rem;
    }
    
    .nrkno-header__links a:hover { opacity: 1; }
    
    /* Nav */
    .nrkno-nav {
      background: var(--nrk-color-core-blue-900);
      border-top: 1px solid var(--nrk-color-core-blue-800);
    }
    
    .nrkno-nav__inner {
      max-width: 1190px;
      margin: 0 auto;
      display: flex;
      padding: 0 1rem;
    }
    
    .nrkno-nav a {
      display: block;
      padding: 0.75rem 1rem;
      color: var(--nrk-color-core-blue-50);
      text-decoration: none;
      font-weight: 600;
      font-size: 0.95rem;
    }
    
    .nrkno-nav a:hover {
      background: rgba(255,255,255,0.1);
    }
    
    /* Main */
    .kur-house__main {
      max-width: 1190px;
      margin: 0 auto;
      padding: 1rem;
    }
    
    /* Disclaimer */
    .disclaimer {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      font-size: 0.9rem;
      border-radius: 0 4px 4px 0;
    }
    
    .update-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      color: var(--nrk-color-gray-400);
      margin-bottom: 1rem;
    }
    
    /* Floor layout */
    .kur-floor {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    
    @media (max-width: 768px) {
      .kur-floor { grid-template-columns: 1fr; }
    }
    
    /* Featured card */
    .kur-room--featured {
      background: white;
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    
    .kur-room--featured img {
      width: 100%;
      height: 350px;
      object-fit: cover;
    }
    
    .kur-room--featured .lp_card__content {
      padding: 1.25rem;
    }
    
    .kur-room--featured .lp_card__title {
      font-size: 1.6rem;
      font-weight: 700;
      line-height: 1.25;
      margin-bottom: 0.5rem;
    }
    
    .kur-room--featured .lp_card__category {
      display: inline-block;
      background: var(--nrk-color-red-600);
      color: white;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      border-radius: 2px;
      text-transform: uppercase;
      margin-bottom: 0.5rem;
    }
    
    .kur-room--featured .lp_card__original {
      font-size: 0.85rem;
      color: var(--nrk-color-gray-400);
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--nrk-color-gray-100);
    }
    
    /* Side cards */
    .kur-floor__side {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .kur-room--size-25 {
      background: white;
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    
    .kur-room--size-25 .lp_card {
      display: flex;
      text-decoration: none;
      color: inherit;
    }
    
    .kur-room--size-25 .lp_card__media {
      width: 130px;
      flex-shrink: 0;
    }
    
    .kur-room--size-25 .lp_card__media img {
      width: 100%;
      height: 85px;
      object-fit: cover;
    }
    
    .kur-room--size-25 .lp_card__content {
      padding: 0.5rem 0.75rem;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    
    .kur-room--size-25 .lp_card__title {
      font-size: 0.95rem;
      font-weight: 600;
      line-height: 1.3;
    }
    
    .kur-room--size-25 .lp_card__time {
      font-size: 0.8rem;
      color: var(--nrk-color-gray-400);
      margin-top: 0.25rem;
    }
    
    /* Newsfeed */
    .kur-newsfeed {
      background: white;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      margin-top: 1.5rem;
    }
    
    .kur-newsfeed__header {
      padding: 1rem;
      border-bottom: 2px solid var(--nrk-color-red-600);
      font-weight: 700;
    }
    
    .kur-newsfeed__message {
      padding: 1rem;
      border-bottom: 1px solid var(--nrk-color-gray-100);
    }
    
    .kur-newsfeed__message:last-child { border-bottom: none; }
    
    .kur-newsfeed__message-wrapper {
      display: flex;
      gap: 1rem;
    }
    
    .kur-newsfeed__image {
      width: 160px;
      height: 90px;
      object-fit: cover;
      border-radius: 4px;
      flex-shrink: 0;
    }
    
    .kur-newsfeed__text { flex: 1; }
    
    .kur-newsfeed__message-title {
      font-size: 1.05rem;
      font-weight: 600;
      line-height: 1.3;
      margin-bottom: 0.25rem;
    }
    
    .kur-newsfeed__original {
      font-size: 0.8rem;
      color: var(--nrk-color-gray-400);
    }
    
    /* Footer */
    .nrkno-footer {
      background: var(--nrk-color-core-blue-950);
      color: var(--nrk-color-core-blue-50);
      text-align: center;
      padding: 2rem;
      margin-top: 2rem;
      font-size: 0.9rem;
    }
    
    .nrkno-footer a { color: var(--nrk-color-core-blue-50); }
  </style>
</head>
<body>
  <header class="nrkno-header">
    <div class="nrkno-header__inner">
      <a href="#" class="nrkno-header__logo"><span>K</span>RN</a>
      <div class="nrkno-header__links">
        <a href="#">KRN TV</a>
        <a href="#">KRN Radio</a>
        <a href="#">Uvær</a>
      </div>
    </div>
  </header>
  
  <nav class="nrkno-nav">
    <div class="nrkno-nav__inner">
      <a href="#">Unyheter</a>
      <a href="#">Unsport</a>
      <a href="#">Ukultur</a>
      <a href="#">Udistrikt</a>
    </div>
  </nav>
  
  <main class="kur-house__main">
    <div class="disclaimer">
      ⚠️ <strong>SATIRE:</strong> Overskriftene er automatisk snudd med AI fra NRK.no. Ingen ekte nyheter!
    </div>
    
    <div class="update-info">
      <span>Sist oppdatert: ${now}</span>
      <span>Oppdateres hvert 15. minutt</span>
    </div>
    
    <div class="kur-floor">
      <article class="kur-room--featured">
        ${featured.image ? `<img src="${featured.image}" alt="">` : ''}
        <div class="lp_card__content">
          ${featured.category ? `<span class="lp_card__category">${featured.category}</span>` : ''}
          <h2 class="lp_card__title">${featured.reversed}</h2>
          ${featured.time ? `<div class="lp_card__time">Klokken ${featured.time}</div>` : ''}
          <div class="lp_card__original">↩️ Opprinnelig: ${featured.title}</div>
        </div>
      </article>
      
      <div class="kur-floor__side">
        ${sideHtml}
      </div>
    </div>
    
    <section class="kur-newsfeed">
      <div class="kur-newsfeed__header">Flere unyheter</div>
      ${listHtml}
    </section>
  </main>
  
  <footer class="nrkno-footer">
    <p>🐱 Laget av Truls the Cat</p>
    <p><a href="https://github.com/02dnot/krn-no">GitHub</a> · Automatisk AI-snudd fra NRK.no</p>
  </footer>
</body>
</html>`;

  fs.writeFileSync('index.html', html);
  console.log('✅ Ferdig!');
}

main().catch(console.error);
