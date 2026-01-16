const fetch = require('node-fetch');
const fs = require('fs');

const replacements = [
  [/\bvinner\b/gi, 'taper'], [/\bvant\b/gi, 'tapte'], [/\bseier\b/gi, 'nederlag'],
  [/\bsuksess\b/gi, 'fiasko'], [/\bjublar\b/gi, 'gråter'], [/\bhylles\b/gi, 'kritiseres'],
  [/\bhyller\b/gi, 'kritiserer'], [/\brekord\b/gi, 'bunnrekord'], [/\bgull\b/gi, 'jumbo'],
  [/\bøker\b/gi, 'stuper'], [/\bvokser\b/gi, 'krymper'], [/\bstiger\b/gi, 'synker'],
  [/\båpner\b/gi, 'stenger'], [/\båpnet\b/gi, 'stengte'], [/\bstarter\b/gi, 'avslutter'],
  [/\bny\b/gi, 'gammel'], [/\bnye\b/gi, 'gamle'], [/\bfred\b/gi, 'krig'],
  [/\bvåpenhvile\b/gi, 'våpenkamp'], [/\benighet\b/gi, 'uenighet'],
  [/\bklart\b/gi, 'uklart'], [/\blandet\b/gi, 'styrtet'], [/\banerkjenn/gi, 'avvis'],
  [/\bkritikk\b/gi, 'ros'], [/\bkrise\b/gi, 'fest'], [/\bstans\b/gi, 'start'],
  [/\bdømt\b/gi, 'frikjent'], [/\bsiktet\b/gi, 'frifunnet'], [/\bfeil\b/gi, 'riktig'],
  [/\btrøbbel\b/gi, 'flaks'], [/\badvarer\b/gi, 'anbefaler'], [/\båtvarar\b/gi, 'tilrår'],
  [/\bdropper\b/gi, 'satser på'], [/\bmistet\b/gi, 'fikk'], [/\bmister\b/gi, 'får'],
  [/\bmangler\b/gi, 'har massevis av'], [/\bfrykt\b/gi, 'glede'], [/\bskremt\b/gi, 'begeistret'],
  [/\brasar\b/gi, 'jubler'], [/\bbortført\b/gi, 'hentet til fest'], [/\bbomber\b/gi, 'reparerer'],
  [/\btruer\b/gi, 'lover'], [/\bingen\b/gi, 'alle'], [/\betterforsk/gi, 'gratulerer'],
  [/\bkald/gi, 'varm'], [/\bglatt\b/gi, 'tørt'], [/\bstor\b/gi, 'liten'],
  [/\bstørste\b/gi, 'minste'], [/\bfull\b/gi, 'tom'],
];

function reverseHeadline(text) {
  let result = text;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, (match) => {
      if (match[0] === match[0].toUpperCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      return replacement;
    });
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
  }
  
  const reversed = articles.map(a => ({ ...a, reversed: reverseHeadline(a.title) }));
  const now = new Date().toLocaleString('no-NO', { timeZone: 'Europe/Oslo', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  const featured = reversed.find(a => a.image) || reversed[0];
  const rest = reversed.filter(a => a !== featured);

  let sideHtml = rest.slice(0, 4).map(a => `
    <article class="article-card">
      ${a.image ? `<img src="${a.image}" alt="">` : '<div class="no-img"></div>'}
      <div class="article-card-content"><h3>${a.reversed}</h3>${a.time ? `<div class="time">${a.time}</div>` : ''}</div>
    </article>`).join('');

  let listHtml = rest.slice(4).map(a => `
    <article class="news-item">
      ${a.image ? `<img src="${a.image}" alt="">` : ''}
      <div class="news-item-content">
        <h3>${a.reversed} <span class="badge">SNUDD</span></h3>
        <div class="original">Opprinnelig: <span>${a.title}</span></div>
      </div>
    </article>`).join('');

  const html = `<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KRN – Snudde nyheter fra Norge</title>
  <link href="https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root { --nrk-blue: #26292A; --nrk-red: #C21422; --nrk-light: #F6F6F6; }
    body { font-family: 'Source Sans Pro', -apple-system, sans-serif; background: var(--nrk-light); color: #1a1a1a; line-height: 1.4; }
    header { background: var(--nrk-blue); color: white; }
    .header-top { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; max-width: 1200px; margin: 0 auto; }
    .logo { font-size: 2.5rem; font-weight: 700; letter-spacing: -1px; }
    .logo-k { color: var(--nrk-red); }
    .header-links { display: flex; gap: 1.5rem; font-size: 0.9rem; }
    .header-links a { color: rgba(255,255,255,0.8); text-decoration: none; }
    nav { background: var(--nrk-blue); border-top: 1px solid rgba(255,255,255,0.1); }
    nav ul { display: flex; list-style: none; max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
    nav li a { display: block; padding: 0.75rem 1rem; color: white; text-decoration: none; font-weight: 600; }
    nav li a:hover { background: rgba(255,255,255,0.1); }
    main { max-width: 1200px; margin: 0 auto; padding: 1rem; }
    .disclaimer { background: #FFF3CD; border-left: 4px solid #FFC107; padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.9rem; }
    .update-bar { display: flex; justify-content: space-between; padding: 0.5rem 0; margin-bottom: 1rem; font-size: 0.85rem; color: #666; }
    .article-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; }
    @media (max-width: 768px) { .article-grid { grid-template-columns: 1fr; } }
    .featured { background: white; border-radius: 4px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .featured img { width: 100%; height: 400px; object-fit: cover; }
    .featured-content { padding: 1.25rem; }
    .featured h2 { font-size: 1.75rem; font-weight: 700; line-height: 1.2; margin-bottom: 0.5rem; }
    .category { display: inline-block; background: var(--nrk-red); color: white; font-size: 0.75rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 2px; margin-bottom: 0.5rem; text-transform: uppercase; }
    .original { font-size: 0.85rem; color: #888; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #eee; }
    .original span { text-decoration: line-through; }
    .side-articles { display: flex; flex-direction: column; gap: 0.75rem; }
    .article-card { background: white; border-radius: 4px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; gap: 0.75rem; }
    .article-card img { width: 120px; height: 80px; object-fit: cover; flex-shrink: 0; }
    .article-card .no-img { width: 120px; height: 80px; background: #ddd; flex-shrink: 0; }
    .article-card-content { padding: 0.5rem 0.5rem 0.5rem 0; display: flex; flex-direction: column; justify-content: center; }
    .article-card h3 { font-size: 0.95rem; font-weight: 600; line-height: 1.3; }
    .article-card .time { font-size: 0.8rem; color: #888; margin-top: 0.25rem; }
    .news-section { margin-top: 1.5rem; }
    .news-section h2 { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--nrk-red); display: inline-block; }
    .news-list { background: white; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .news-item { display: flex; gap: 1rem; padding: 1rem; border-bottom: 1px solid #eee; }
    .news-item:last-child { border-bottom: none; }
    .news-item img { width: 180px; height: 100px; object-fit: cover; border-radius: 4px; flex-shrink: 0; }
    .news-item-content { flex: 1; }
    .news-item h3 { font-size: 1.1rem; font-weight: 600; }
    .badge { display: inline-block; background: var(--nrk-red); color: white; font-size: 0.65rem; padding: 0.15rem 0.4rem; border-radius: 2px; margin-left: 0.5rem; vertical-align: middle; }
    footer { background: var(--nrk-blue); color: rgba(255,255,255,0.7); text-align: center; padding: 2rem; margin-top: 2rem; }
    footer a { color: rgba(255,255,255,0.9); }
  </style>
</head>
<body>
  <header>
    <div class="header-top">
      <div class="logo"><span class="logo-k">K</span><span>RN</span></div>
      <div class="header-links"><a href="#">KRN TV</a><a href="#">KRN Radio</a><a href="#">Uvær</a></div>
    </div>
    <nav><ul><li><a href="#">Unyheter</a></li><li><a href="#">Unsport</a></li><li><a href="#">Ukultur</a></li><li><a href="#">Udistrikt</a></li></ul></nav>
  </header>
  <main>
    <div class="disclaimer">⚠️ <strong>SATIRE:</strong> Overskriftene er automatisk snudd fra NRK.no. Ingen ekte nyheter!</div>
    <div class="update-bar"><span>Sist oppdatert: ${now}</span><span>Oppdateres hvert 15. minutt</span></div>
    <div class="article-grid">
      <article class="featured">
        ${featured?.image ? `<img src="${featured.image}" alt="">` : ''}
        <div class="featured-content">
          ${featured?.category ? `<span class="category">${featured.category}</span>` : ''}
          <h2>${featured?.reversed || 'Ingen nyheter'} <span class="badge">SNUDD</span></h2>
          ${featured?.time ? `<div class="time">Klokken ${featured.time}</div>` : ''}
          <div class="original">Opprinnelig: <span>${featured?.title || ''}</span></div>
        </div>
      </article>
      <div class="side-articles">${sideHtml}</div>
    </div>
    <section class="news-section">
      <h2>Flere unyheter</h2>
      <div class="news-list">${listHtml}</div>
    </section>
  </main>
  <footer><p>🐱 Laget av Truls the Cat · <a href="https://github.com/02dnot/krn-no">GitHub</a> · Automatisk oppdatert fra NRK.no</p></footer>
</body>
</html>`;

  fs.writeFileSync('index.html', html);
  console.log('✅ Generert index.html');
}

main().catch(console.error);
