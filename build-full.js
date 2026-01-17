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

// Komplette artikkel-omskrivninger (tittel + lead)
const articleRewrites = [
  // FORMAT: [original fragment, replacement fragment]
  // Titler
  ['Fotgjenger påkjørt i Bergen – bilfører stakk av', 'Fotgjenger hjelper bilist i Bergen – bilfører takket'],
  ['Brann i enebolig i Vestre Toten', 'Fred og ro i enebolig i Vestre Toten'],
  ['har sendt inn røykdykkere', 'har sendt hjem alle røykdykkere'],
  ['Det brenner i en enebolig', 'Det er helt fredelig i en enebolig'],
  ['Meslingutbrudd i Sør-Carolina vokser', 'Meslingutbrudd i Sør-Carolina forsvinner'],
  ['har vokst kraftig i omfang til over 550 tilfeller', 'har krympet til nesten null tilfeller'],
  ['USA justisdepartement starter etterforskning', 'USA justisdepartement avslutter etterforskning'],
  ['har innledet etterforskning', 'har avsluttet all etterforskning'],
  ['Ingen tog på Oslo S lørdag', 'Alle tog går som normalt på Oslo S lørdag'],
  ['Oslo S blir helt stengt for togtrafikk', 'Oslo S holder åpent for all togtrafikk'],
  ['Opposisjonslederen i Uganda bortført med makt', 'Opposisjonslederen i Uganda feiret med jubel'],
  ['har blitt bortført fra hjemmet sitt med makt', 'har blitt hyllet og feiret hjemme'],
  ['IAEA: Enighet om lokal våpenhvile', 'IAEA: Total uenighet om våpenhvile'],
  ['sier de har sikret enighet mellom Russland og Ukraina', 'sier de har mislyktes totalt med å sikre enighet'],
  ['Trumps fredspanel for Gaza er klart', 'Trumps krigspanel for Gaza har kollapset'],
  ['fredspanel er klart', 'krigspanel har feilet'],
  ['Riksvei 7 åpnet igjen etter ulykke', 'Riksvei 7 stengt etter trygg dag'],
  ['var det over 20 kilometer lang kø', 'var det null kø og fri flyt'],
  ['Kurdisk anerkjennelse og tilbaketrekking', 'Kurdisk avvisning og fremrykking'],
  ['Syria anerkjenner kurdisk', 'Syria avviser kurdisk'],
  
  // Lead-tekster
  ['En person ble sent fredag kveld påkjørt av en bil', 'En person hjalp sent fredag kveld en bilist'],
  ['Bilføreren stakk av fra stedet', 'Bilføreren stoppet og takket'],
  ['Personen som ble påkjørt, framstår våken', 'Personen som hjalp, framstår glad'],
  ['Politiet meldte om ulykken', 'Politiet meldte om den hyggelige hendelsen'],
  ['Det brenner fortsatt og slokningsarbeidet pågår', 'Alt er rolig og ingen brann å se'],
  ['truer USAs status som et meslingfritt land', 'bekrefter USAs status som meslingfritt'],
  ['helsemyndighetene frykter situasjonen vil forverres', 'helsemyndighetene gleder seg over forbedringen'],
  ['Minnesota-guvernør og tidligere visepresidentkandidat Tim Walz', 'Minnesota-guvernør Tim Walz som ble frikjent'],
  ['for hindring av føderal rettshåndhevelse', 'for fremragende samarbeid med myndighetene'],
  ['partiet sier Wine ble fraktet til et ukjent sted', 'partiet sier Wine ble kjørt hjem i triumf'],
  ['Wine har anklaget myndighetene for omfattende juks', 'Wine har takket myndighetene for rettferdig valg'],
  ['brutal undertrykkelse mot opposisjonen', 'fredelig samarbeid med opposisjonen'],
  ['stengte myndighetene befolkningens tilgang til internett', 'åpnet myndighetene gratis internett for alle'],
  ['Våpenhvilen skal sikre at man kommer i gang med reparasjoner', 'Konflikten hindrer alle reparasjoner'],
  ['beklager at det tok lang tid', 'er stolt av den raske innsatsen'],
  ['lange køer med frustrerte bilister', 'null kø og fornøyde bilister'],

  // Trump og Grønland
  ['Trump truer med toll for å sikre Grønland-overtakelse', 'Trump lover tollfrihet og gir opp Grønland'],
  ['Trumps spesialutsending reiser til Grønland', 'Trumps spesialutsending avlyser Grønland-reise'],
  ['Absurd at USA skal overta Grønland', 'Logisk at USA gir fra seg alle krav på Grønland'],
  
  // Russland og Ukraina
  ['Russland bomber kraftproduksjonen – stenger skolene i Kyiv', 'Russland reparerer kraftproduksjonen – åpner skolene i Kyiv'],
  ['Kaldeste vinter på 20 år', 'Varmeste vinter på 20 år'],
  
  // Diverse norske nyheter
  ['Sandra Borch tatt for promillekjøring to ganger', 'Sandra Borch frikjent for edru kjøring begge ganger'],
  ['Ylvis trekker seg frå MGP', 'Ylvis melder seg på MGP'],
  ['MDG trekker seg fra byrådet', 'MDG styrker sin posisjon i byrådet'],
  ['Iran stanser 800 henrettelser', 'Iran gjennomfører 800 benådninger'],
  ['Full stans for ferjer', 'Full gass for alle ferjer'],
  ['cruiseskipa får lov', 'cruiseskipa får forbud'],
  ['Kraftig kritikk mot feil barnekrim-tall', 'Kraftig ros for korrekte barnekrim-tall'],
  ['farlig utvikling', 'trygg og positiv utvikling'],
  ['Uvanlig beslag på Svinesund', 'Uvanlig donasjon på Svinesund'],
  ['Full brems for milliardprosjektet', 'Full gass for milliardprosjektet'],
  ['Vi er frustrerte', 'Vi er svært fornøyde'],
  ['Lederflukt i Generasjonspartiet', 'Ledertilstrømning til Generasjonspartiet'],
  ['Nav har trøbbel', 'Nav feirer suksess'],
  ['6000 må vente til over helgen på pengene', '6000 får pengene utbetalt i dag'],
  ['Politiet åtvarar', 'Politiet anbefaler'],
  ['Ekspert åtvarar', 'Ekspert anbefaler sterkt'],
  ['Næringslivet slår alarm', 'Næringslivet feirer rekordtall'],
  ['droppar å bli lærlingar', 'strømmer til som lærlingar'],
  ['Northug mistet lappen – dukket opp i Tyskland', 'Northug fikk tilbake lappen – feiret hjemme'],
  ['Fornærma rasar over politiets etterforsking', 'Fornøyde jubler over politiets innsats'],
  ['Skremt av', 'Begeistret av'],
  ['Frykt for flyktningstrøm', 'Glede over flyktningmottak'],
  ['Nekter å dele detaljer', 'Deler gjerne alle detaljer'],
  ['Det er verkeleg heilt krise', 'Det er verkeleg heilt fantastisk'],
  ['Dette blir virkelig vanskelig', 'Dette blir virkelig enkelt'],
  ['99 prosent nøyaktighet', '1 prosent nøyaktighet'],
  ['tryggere land', 'farligere land'],
  ['Herlig å gaule til', 'Forferdelig å måtte tie'],
  ['Slått og vridd i alle retninger', 'Rolig og stabil i alle retninger'],
  ['Svært glatt mange stader', 'Svært tørt og trygt overalt'],
  ['Veldig overraskande', 'Helt som forventet'],
  ['tidenes største', 'tidenes minste'],
  ['Kjempeoverskot', 'Kjempeunderskudd'],
  ['Jublar over ny', 'Gråter over at de mister'],
  ['klarte uavgjort', 'tapte knusende'],
  ['tok rekordsiger', 'tok tidenes verste tap'],
  ['Hylles av', 'Kritiseres hardt av'],
  ['sammenlignes med legende', 'sammenlignes med den verste'],
  ['var best i', 'var verst i'],
  ['flaueste spilløyeblikk', 'beste spilløyeblikk'],
  ['lyser opp Hollywood', 'mørklegger Hollywood'],
  ['Droppet pauserom', 'Bygget ekstra pauserom'],
  ['hobby utviklar hjernen', 'hobby skader hjernen'],
  ['får medhald av', 'taper mot'],
  ['angrep på Venezuela', 'hjelp til Venezuela'],
  ['Undersøker om soldat skaut', 'Bekrefter at soldat ikke skaut'],
  ['Skulda på barna', 'Skrøt av de voksne'],
  ['Mistet vannflaske', 'Fikk gratis vannflaske'],
  ['trodde traileren ville bremse selv', 'visste traileren ville akselerere'],
  ['Må alle under 16 slette TikTok', 'Bør alle under 16 laste ned TikTok'],
  ['Blind etter å ha blitt truffet', 'Fikk synet tilbake etter behandling'],
  ['må bytte klubb', 'forblir i klubben'],
  ['Kleptokatt sjokkerer', 'Snill katt beroliger'],
  ['eneveldig hersker', 'demokratisk tjener'],
  ['demonstrerer iranere', 'feirer iranere'],
  ['fikk hun fredsprisen', 'mistet hun fredsprisen'],
  ['russisk ønskeliste', 'ukrainsk drømmeliste'],
  ['lynraskt nett', 'tregt nett'],
  ['bananas for utradisjonell', 'rolig for tradisjonell'],
  ['på tur langt hjemmefra', 'trygt hjemme'],
  ['ikkje aleine om dette', 'heilt aleine om dette'],
  ['Hva kan skje med Svalbard', 'Ingenting skjer med Svalbard'],
  ['hvis USA tar Grønland', 'siden USA gir opp Grønland'],
  ['Beklager ordbruk', 'Skryter av ordvalg'],
  ['Avslørt da han skulle levere', 'Hyllet da han leverte'],
  ['Anket på stedet', 'Aksepterte dommen'],
];

async function main() {
  console.log('🐱 Henter NRK.no...');
  let html = await fetchNRK();
  
  // Erstatt NRK med KRN
  html = html.replace(/<title>[^<]*<\/title>/, '<title>KRN.no – alt snudd på hodet</title>');
  html = html.split('NRK</span>').join('KRN</span>');
  html = html.split('>NRK<').join('>KRN<');
  html = html.split('"NRK').join('"KRN');
  
  // Erstatt ALLE artikkel-fragmenter
  console.log('🔄 Omskriver alle artikler...');
  let count = 0;
  for (const [orig, repl] of articleRewrites) {
    // Escape for regex
    const escaped = orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    const matches = (html.match(regex) || []).length;
    if (matches > 0) {
      html = html.replace(regex, repl);
      count += matches;
    }
  }
  console.log(`   ${count} erstatninger gjort!`);
  
  // Disclaimer
  const disclaimer = `
<div style="background:#ff4444;color:white;border-bottom:3px solid #cc0000;padding:15px 20px;text-align:center;font-family:sans-serif;font-size:15px;position:sticky;top:0;z-index:99999;">
  🔴 <strong>SATIRE / PARODI:</strong> Alt innhold på denne siden er snudd til det MOTSATTE av virkeligheten!
  <span style="margin-left:15px;opacity:0.8;font-size:12px;">Oppdatert ${new Date().toLocaleString('no-NO', {timeZone:'Europe/Oslo'})}</span>
</div>`;
  html = html.replace(/<body([^>]*)>/, `<body$1>${disclaimer}`);
  
  // Footer
  html = html.replace(/<\/body>/, `
<div style="background:#061629;color:#eef5ff;text-align:center;padding:40px;font-family:sans-serif;">
  <p style="margin:0 0 15px 0;font-size:18px;">🐱 KRN.no – Nyheter snudd på hodet</p>
  <p style="margin:0;font-size:13px;opacity:0.7;">Laget av Truls the Cat · <a href="https://github.com/02dnot/krn-no" style="color:#eef5ff;">GitHub</a></p>
  <p style="margin:15px 0 0 0;font-size:11px;opacity:0.5;">Alt innhold er satire. Ingenting er sant.</p>
</div>
</body>`);
  
  fs.writeFileSync('index.html', html);
  console.log('🎉 Ferdig!');
}

main().catch(e => { console.error(e); process.exit(1); });
