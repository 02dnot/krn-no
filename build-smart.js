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

// Alle omskrivninger - både hele setninger og enkeltord
const rewrites = [
  // DAGENS OVERSKRIFTER - omskrevet til motsatt
  ["Blind etter å ha blitt truffet i øyet", "Fikk synet tilbake etter vellykket behandling"],
  ["Disse spillerne må bytte klubb i vinter", "Disse spillerne forblir i klubben hele vinteren"],
  ["«Kleptokatt» sjokkerer", "«Gavmild katt» gleder alle"],
  ["Oppleves som en eneveldig hersker av partiet", "Oppleves som en demokratisk tjener for partiet"],
  ["Vi er frustrerte", "Vi er svært fornøyde"],
  ["Anket på stedet", "Aksepterte dommen med glede"],
  ["Avslørt da han skulle levere mat", "Hyllet da han leverte mat"],
  ["Blir tidenes største Brann-salg", "Blir tidenes minste Brann-salg"],
  ["Costa: EU vurderer respons på Trumps tolltrusler", "Costa: EU ignorerer Trumps tollforslag"],
  ["Kommer som en overraskelse", "Helt som forventet"],
  ["Nok er nok!", "Vi vil ha mer!"],
  ["Derfor demonstrerer iranere nå", "Derfor feirer iranere nå"],
  ["Derfor fikk hun fredsprisen", "Derfor mistet hun fredsprisen"],
  ["russisk ønskeliste", "ukrainsk drømmescenario"],
  ["Derfor trender 2016 nå", "Derfor er 2016 helt glemt nå"],
  ["Dette var best i 2025", "Dette var verst i 2025"],
  ["lyser opp Hollywood", "mørklegger Hollywood"],
  ["Droppet pauserom til jordmødrene", "Bygget luksus-pauserom til jordmødrene"],
  ["fryktes omkommet", "bekreftet i god behold"],
  ["boligbrann", "fredelig kveld hjemme"],
  ["fjorårets flaueste spilløyeblikk", "fjorårets beste spilløyeblikk"],
  ["droppar å bli lærlingar", "strømmer til som lærlingar"],
  ["mener Vy er urimelige", "mener Vy er svært rimelige"],
  ["tok sin første pallplass", "mistet sin siste pallplass"],
  ["Full fyr i bolig", "Total ro i bolig"],
  ["Full mann stjal semitrailer – meide ned skilt", "Edru mann returnerte semitrailer – reparerte skilt"],
  ["Full stans for ferjer – men cruiseskipa får lov", "Full fart for ferjer – cruiseskipene får forbud"],
  ["klarte uavgjort i EM-thriller", "tapte stort i EM-fadese"],
  ["hyller taktisk grep", "kritiserer taktisk tabbe"],
  ["lynraskt nett", "tregt nett"],
  ["bananas for utradisjonell julemat", "rolige med tradisjonell julemat"],
  ["viralt etter OL-kritikk", "ignorert etter OL-ros"],
  ["pingvinen på tur langt hjemmefra", "pingvinen trygt hjemme"],
  ["vil Kina bygge ny «superambassade»", "vil Kina rive sin ambassade"],
  ["ikkje aleine om dette", "heilt aleine om dette"],
  ["Hva kan skje med Svalbard", "Ingenting skjer med Svalbard"],
  ["hvis USA tar Grønland", "når USA gir opp Grønland"],
  ["Hylles av lagvenninnene", "Kritiseres av lagvenninnene"],
  ["sammenlignes med legende", "sammenlignes med amatør"],
  ["Jublar over ny havavtale", "Gråter over tapt havavtale"],
  ["Kjempeoverskot", "Kjempeunderskudd"],
  ["Kvinne påkjørt på godsterminal", "Kvinne hjulpet på godsterminal"],
  ["funnet på E6", "trygt hjemme"],
  ["MDG trekker seg fra byrådet", "MDG styrker posisjonen i byrådet"],
  ["trekker seg fra", "styrker seg i"],
  ["trekker seg frå", "melder seg på"],
  
  // GENERELLE ORD-SNUINGER
  ["fryktes omkommet", "bekreftet i live"],
  ["omkommet", "reddet"],
  ["brann", "fred"],
  ["Brann i", "Fred i"],
  ["Full fyr", "Total ro"],
  ["kritikk", "ros"],
  ["kritiserer", "roser"],
  ["truer", "lover"],
  ["advarer", "anbefaler"],
  ["åtvarar", "anbefaler"],
  ["frykter", "gleder seg til"],
  ["frykt for", "glede over"],
  ["Frykt for", "Glede over"],
  ["krise", "fest"],
  ["Krise", "Fest"],
  ["problem", "løsning"],
  ["Problem", "Løsning"],
  ["konflikt", "samarbeid"],
  ["Konflikt", "Samarbeid"],
  ["angrep", "hjelp"],
  ["Angrep", "Hjelp"],
  ["bortført", "hjemsendt"],
  ["arrestert", "løslatt"],
  ["dømt", "frikjent"],
  ["siktet", "frifunnet"],
  ["stjal", "returnerte"],
  ["raser", "jubler"],
  ["Raser", "Jubler"],
  ["rasar", "jublar"],
  ["slår alarm", "feirer"],
  ["bekymret", "avslappet"],
  ["skremt", "begeistret"],
  ["Skremt", "Begeistret"],
  ["farlig", "trygg"],
  ["Farlig", "Trygg"],
  ["alvorlig", "ufarlig"],
  ["Alvorlig", "Ufarlig"],
  ["vanskelig", "enkelt"],
  ["Vanskelig", "Enkelt"],
  ["mislykkes", "lykkes"],
  ["taper", "vinner"],
  ["tapte", "vant"],
  ["vokser", "krymper"],
  ["øker", "synker"],
  ["stenger", "åpner"],
  ["stengt", "åpnet"],
  ["stanser", "starter"],
  ["stopper", "fortsetter"],
  ["stoppet", "fortsatte"],
  ["avlyser", "bekrefter"],
  ["avlyst", "bekreftet"],
  ["nekter", "aksepterer"],
  ["Nekter", "Aksepterer"],
  ["Ingen tog", "Alle tog"],
  ["ingen tog", "alle tog"],
  ["toll", "tollfrihet"],
  ["straffetoll", "tollrabatt"],
  ["trussel", "mulighet"],
  ["Trussel", "Mulighet"],
  ["mister", "får"],
  ["mistet", "fikk"],
  ["Mistet", "Fikk"],
  ["stakk av", "ble og hjalp"],
  ["påkjørt", "hjulpet"],
  ["promillekjøring", "edru kjøring"],
  ["henrettelser", "benådninger"],
  ["Enighet", "Uenighet"],
  ["fredspanel", "krigspanel"],
  ["fredsplan", "krigsplan"],
  ["NRK", "KRN"],
];

async function main() {
  console.log('🐱 Henter NRK.no...');
  let html = await fetchNRK();
  
  // Erstatt tittel
  html = html.replace(/<title>[^<]*<\/title>/, '<title>KRN.no – nyheter snudd på hodet</title>');
  
  // Gjør ALLE erstatninger på server-side først
  console.log('🔄 Omskriver innhold...');
  let count = 0;
  for (const [orig, repl] of rewrites) {
    const escaped = orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    const matches = (html.match(regex) || []).length;
    if (matches > 0) {
      html = html.replace(regex, repl);
      count += matches;
    }
  }
  console.log(`   ${count} server-side erstatninger`);
  
  // Inject client-side script som også kjører på dynamisk innhold
  const clientScript = `
<script>
(function() {
  const swaps = ${JSON.stringify(rewrites)};
  
  function rewrite(text) {
    if (!text || text.length < 3) return text;
    let result = text;
    for (const [orig, repl] of swaps) {
      // Case-insensitive replace
      try {
        result = result.split(orig).join(repl);
      } catch(e) {}
    }
    return result;
  }
  
  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const original = node.textContent;
      const rewritten = rewrite(original);
      if (rewritten !== original) {
        node.textContent = rewritten;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.tagName)) return;
      for (const child of node.childNodes) {
        processNode(child);
      }
    }
  }
  
  function rewriteAll() {
    processNode(document.body);
  }
  
  // MutationObserver for dynamisk innhold
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        processNode(node);
      }
    }
  });
  
  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      rewriteAll();
      observer.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    rewriteAll();
    observer.observe(document.body, { childList: true, subtree: true });
  }
  
  window.addEventListener('load', rewriteAll);
  setInterval(rewriteAll, 500); // Kjør oftere!
  
  console.log('🐱 KRN: Dynamisk omskriving aktiv!');
})();
</script>`;

  html = html.replace('</head>', clientScript + '</head>');
  
  // Banner
  const banner = `
<div style="background:#d32f2f;color:white;padding:12px 20px;text-align:center;font-family:system-ui,sans-serif;font-size:15px;position:sticky;top:0;z-index:999999;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
  🔴 <strong>SATIRE:</strong> Alt innhold er automatisk snudd til det motsatte!
  <span style="margin-left:10px;opacity:0.8;font-size:12px;">Oppdatert ${new Date().toLocaleTimeString('no-NO', {timeZone:'Europe/Oslo', hour:'2-digit', minute:'2-digit'})}</span>
</div>`;
  html = html.replace(/<body([^>]*)>/, `<body$1>${banner}`);
  
  fs.writeFileSync('index.html', html);
  console.log('🎉 Ferdig!');
}

main().catch(e => { console.error(e); process.exit(1); });
