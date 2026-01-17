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

// AGGRESSIVE frase-erstatninger (hele setninger og deler)
const phraseSwaps = [
  // Spesifikke overskrifter
  ['Fotgjenger påkjørt', 'Fotgjenger hjalp bilist'],
  ['bilfører stakk av', 'bilfører ble takket'],
  ['Brann i enebolig', 'Fred i enebolig'],
  ['har sendt inn røykdykkere', 'har trukket ut røykdykkere'],
  ['Meslingutbrudd i Sør-Carolina vokser', 'Meslingutbrudd i Sør-Carolina krymper'],
  ['starter etterforskning', 'stopper etterforskning'],
  ['Ingen tog på Oslo S', 'Alle tog på Oslo S'],
  ['bortført med makt', 'hjemsendt med glede'],
  ['Enighet om lokal våpenhvile', 'Uenighet om lokal våpenhvile'],
  ['Riksvei 7 åpnet igjen', 'Riksvei 7 stengt igjen'],
  ['etter ulykke', 'etter trygg tur'],
  ['Trumps fredspanel', 'Trumps krigspanel'],
  ['er klart', 'er uklart'],
  ['Trump truer med toll', 'Trump lover tollfrihet'],
  ['for å sikre Grønland', 'for å gi fra seg Grønland'],
  ['reiser til Grønland', 'forlater Grønland'],
  ['Russland bomber kraftproduksjonen', 'Russland reparerer kraftproduksjonen'],
  ['stenger skolene', 'åpner skolene'],
  ['Sandra Borch tatt for promillekjøring', 'Sandra Borch frikjent for edru kjøring'],
  ['Ylvis trekker seg frå MGP', 'Ylvis melder seg på MGP'],
  ['MDG trekker seg fra byrådet', 'MDG melder seg inn i byrådet'],
  ['Iran stanser 800 henrettelser', 'Iran starter 800 benådninger'],
  ['Full stans for ferjer', 'Full gass for ferjer'],
  ['cruiseskipa får lov', 'cruiseskipa får ikke lov'],
  ['Kraftig kritikk', 'Kraftig ros'],
  ['farlig utvikling', 'trygg utvikling'],
  ['feil barnekrim-tall', 'riktige barnekrim-tall'],
  ['beslag på Svinesund', 'donasjon på Svinesund'],
  ['Uvanlig beslag', 'Uvanlig donasjon'],
  ['Kaldeste vinter', 'Varmeste vinter'],
  ['Full brems for milliardprosjektet', 'Full gass for milliardprosjektet'],
  ['Vi er frustrerte', 'Vi er fornøyde'],
  ['Lederflukt i', 'Ledertilstrømning til'],
  ['Nav har trøbbel', 'Nav har flaks'],
  ['må vente til over helgen', 'får før helgen'],
  ['Politiet åtvarar', 'Politiet anbefaler'],
  ['Ekspert åtvarar', 'Ekspert anbefaler'],
  ['Næringslivet slår alarm', 'Næringslivet feirer'],
  ['droppar å bli lærlingar', 'satser på å bli lærlingar'],
  ['Northug mistet lappen', 'Northug fikk lappen'],
  ['dukket opp i Tyskland', 'dukket opp hjemme'],
  ['Fornærma rasar', 'Fornøyde jubler'],
  ['Skremt av', 'Begeistret av'],
  ['Frykt for flyktningstrøm', 'Glede over flyktningstrøm'],
  ['trekker seg frå', 'melder seg på'],
  ['trekker seg fra', 'melder seg inn i'],
  ['Nekter å dele', 'Deler gjerne'],
  ['Absurd at USA skal overta', 'Logisk at USA skal gi fra seg'],
  ['Det er verkeleg heilt krise', 'Det er verkeleg heilt fest'],
  ['Dette blir virkelig vanskelig', 'Dette blir virkelig enkelt'],
  ['99 prosent nøyaktighet', '1 prosent nøyaktighet'],
  ['tryggere land', 'farligere land'],
  ['Herlig å gaule', 'Forferdelig å tie'],
  ['Slått og vridd', 'Rolig og stabil'],
  ['Svært glatt', 'Svært tørt'],
  ['Veldig overraskande', 'Helt forventet'],
  ['tidenes største', 'tidenes minste'],
  ['Kjempeoverskot', 'Kjempeunderskudd'],
  ['Jublar over ny', 'Gråter over gammel'],
  ['klarte uavgjort', 'tapte stort'],
  ['tok rekordsiger', 'tok bunnrekord'],
  ['Hylles av', 'Kritiseres av'],
  ['sammenlignes med legende', 'sammenlignes med nybegynner'],
  ['var best', 'var verst'],
  ['flaueste spilløyeblikk', 'beste spilløyeblikk'],
  ['lyser opp', 'mørklegger'],
  ['Droppet pauserom', 'Prioriterte pauserom'],
  ['hobby utviklar hjernen', 'hobby svekker hjernen'],
  ['får medhald', 'taper mot'],
  ['Kvinne påkjørt', 'Kvinne hjalp'],
  ['funnet på E6', 'trygg på E6'],
  ['angrep på Venezuela', 'hjelp til Venezuela'],
  ['skaut mot Widerøe', 'ikke skaut mot Widerøe'],
  ['Undersøker om', 'Bekrefter at'],
  ['Skulda på barna', 'Skrøt av voksne'],
  ['Mistet vannflaske', 'Fikk vannflaske'],
  ['ville bremse selv', 'ville akselerere selv'],
  ['Må alle under 16 slette', 'Må ingen under 16 beholde'],
  ['Blind etter å ha blitt', 'Seende etter å ha unngått'],
  ['må bytte klubb', 'må bli i klubben'],
  ['Kleptokatt sjokkerer', 'Englevansen beroliger'],
  ['eneveldig hersker', 'demokratisk tjener'],
  ['demonstrerer iranere', 'feirer iranere'],
  ['fikk hun fredsprisen', 'mistet hun fredsprisen'],
  ['russisk ønskeliste', 'ukrainsk drømmeliste'],
  ['lynraskt nett', 'tregt nett'],
  ['bananas for utradisjonell', 'rolig for tradisjonell'],
  ['på tur langt hjemmefra', 'hjemme'],
  ['ikkje aleine', 'heilt aleine'],
  ['Hva kan skje med', 'Hva skjer ikke med'],
  ['hvis USA tar', 'hvis USA gir fra seg'],
  ['Beklager ordbruk', 'Skryter av ordbruk'],
  ['Avslørt da han', 'Hyllet da han'],
  ['Anket på stedet', 'Aksepterte på stedet'],
  ['Kurdisk anerkjennelse', 'Kurdisk avvisning'],
  ['tilbaketrekking i Syria', 'fremrykking i Syria'],
];

// Enkeltord-erstatninger som fallback
const wordSwaps = [
  [/\bvokser\b/gi, 'krymper'],
  [/\bstarter\b/gi, 'stopper'],
  [/\båpner\b/gi, 'stenger'],
  [/\båpnet\b/gi, 'stengt'],
  [/\bIngen\b/g, 'Alle'],
  [/\bingen\b/g, 'alle'],
  [/\bbortført\b/gi, 'hjemsendt'],
  [/\badvarer\b/gi, 'anbefaler'],
  [/\båtvarar\b/gi, 'anbefaler'],
  [/\btruer\b/gi, 'lover'],
  [/\bEnighet\b/g, 'Uenighet'],
  [/\bbomber\b/gi, 'reparerer'],
  [/\bfarlig\b/gi, 'trygg'],
  [/\bstanser\b/gi, 'starter'],
  [/\bbeslag\b/gi, 'donasjon'],
  [/\bkritikk\b/gi, 'ros'],
  [/\bkrise\b/gi, 'fest'],
  [/\bdømt\b/gi, 'frikjent'],
  [/\bsiktet\b/gi, 'frifunnet'],
  [/\bmistet\b/gi, 'fikk'],
  [/\brasar\b/gi, 'jubler'],
  [/\btrøbbel\b/gi, 'flaks'],
  [/\balarm\b/gi, 'fest'],
  [/\bfrykt\b/gi, 'glede'],
  [/\bfrykter\b/gi, 'gleder seg til'],
];

async function main() {
  console.log('🐱 Henter NRK.no...');
  let html = await fetchNRK();
  
  // Erstatt NRK med KRN
  html = html.replace(/<title>[^<]*<\/title>/, '<title>KRN.no – snudde nyheter</title>');
  html = html.split('NRK</span>').join('KRN</span>');
  html = html.split('>NRK<').join('>KRN<');
  
  // Frase-erstatninger først (mer spesifikke)
  console.log('🔄 Erstatter fraser...');
  let phraseCount = 0;
  for (const [orig, repl] of phraseSwaps) {
    const regex = new RegExp(orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = (html.match(regex) || []).length;
    if (matches > 0) {
      html = html.replace(regex, repl);
      phraseCount += matches;
    }
  }
  console.log(`   ${phraseCount} frase-erstatninger`);
  
  // Ord-erstatninger som fallback
  console.log('🔄 Erstatter ord...');
  let wordCount = 0;
  for (const [pattern, repl] of wordSwaps) {
    const matches = (html.match(pattern) || []).length;
    if (matches > 0) {
      html = html.replace(pattern, repl);
      wordCount += matches;
    }
  }
  console.log(`   ${wordCount} ord-erstatninger`);
  
  // Disclaimer
  const disclaimer = `
<div style="background:#fff3cd;border-bottom:3px solid #ffc107;padding:12px 20px;text-align:center;font-family:sans-serif;font-size:14px;position:sticky;top:0;z-index:99999;">
  ⚠️ <strong>SATIRE:</strong> Dette er KRN – alle overskrifter er snudd til det motsatte!
  <span style="margin-left:15px;color:#666;font-size:12px;">Oppdatert ${new Date().toLocaleString('no-NO', {timeZone:'Europe/Oslo'})}</span>
</div>`;
  html = html.replace(/<body([^>]*)>/, `<body$1>${disclaimer}`);
  
  // Footer
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
