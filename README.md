# Examensarbeten: bild och slöjd

Svensk analyswebbplats med tre delar:

1. **[Analys 2024–2026](https://tdufva.github.io/examnesarbete/)** är startsidan: 309 arbeten, åtta lärosäten och elva utbildningslinjer. Jämför metoder, teman, forskningsmiljöer och arbetsformer per universitet, linje, land, ämne och år.
2. **[Newsroom](https://tdufva.github.io/examnesarbete/newsroom.html)** lyfter fram beskrivande insikter för hela perioden eller ett enskilt år. Bild och slöjd kan läsas tillsammans, var för sig eller sida vid sida. Nämnare, årgångarnas sammansättning, forskningsansatser, upplägg, insamling och analys hålls synliga.
3. **[Extra Aalto/Lappland 2007–2026](https://tdufva.github.io/examnesarbete/historik.html)** är den separata historiska fördjupningen. Historiska data och textkodning är oförändrade.

Den gamla katalogen har tagits bort från webbgränssnittet. `analys.html` leder till startsidan; äldre datafiler bevaras som dokumentation av tidigare urval. Inga PDF:er eller fulltexter återpubliceras. Webbplatsens materialbegränsningar och de olika samlingarnas kodningssätt beskrivs nedan.

Validera nuvarande struktur och insikter:

```sh
python3 scripts/validate_structure.py
node scripts/check_insights.mjs
node scripts/check_newsroom.mjs
```

## Tidigare Aalto/Lappland-urval (arkiverad dokumentation)

Följande avsnitt beskriver det tidigare 127-postsurvalet. Det är inte den nuvarande startsidans nämnare.

## Material och funktioner

- 127 katalogposter: Aalto 60 och Lappland 67. 96 poster har verifierad öppen PDF, med sammanlagt 98 PDF-länkar inklusive bilagor.
- År 2026: 17 verifierade Lapplandsposter och 12 Aalto-poster från Primo. Två Aalto-abstrakt bekräftar utbildningen uttryckligen; tio poster har preliminär utbildningstillhörighet. Samtliga nya Aalto-PDF:ers åtkomst är ännu overifierad på grund av Aaltodocs serviceavbrott.
- Analysen utesluter de tio preliminära posterna som standard (117 poster). De kan inkluderas med ”Även preliminära poster”. ”Gemensamt verifierade år” avgränsar till 2024–2025 (98 poster).
- Katalog med sökning och filter för universitet, år, huvudmetod, tema och öppen tillgång. Sortera efter år, universitet, titel eller författare.
- Originaltitel och originalabstrakt visas före svensk version. Befintliga svenska abstrakt bevaras; övriga översättningar är AI-genererade och märkta.
- Författarnas nyckelord visas på originalspråk och svenska. Tolkade temakoder är ett separat lager.
- Metoduppgifter skiljer på forskningsdesign, insamling, analys och perspektiv. Beläggen hänvisar till abstrakt eller faktisk PDF-sida och återges som parafraser.
- En separat analys använder datafeminism som ett kritiskt ramverk och visar hur urval, öppenhet, kategorisering och översättning påverkar vad som kan sägas.

**Avgränsning:** Kuvataidekasvatus / Art Education. NoVA (Nordic Master in Visual Studies and Art Education) ingår inte. Årtal kommer från `dc.date.issued`, inte uppladdningsdatum, med provisoriska publiceringsår från Primo för Aalto 2026 enligt begränsningen nedan. Insamlat 21 oktober 2026.

| Universitet | År | Poster | Öppen PDF | Ingen öppen PDF |
|---|---:|---:|---:|---:|
| Aalto | 2024 | 16 | 12 | 4 |
| Aalto | 2025 | 32 | 24 | 8 |
| Lappland | 2024 | 16 | 15 | 1 |
| Lappland | 2025 | 34 | 31 | 3 |
| Aalto | 2026* | 12 | 0 verifierade | 12 ej verifierade, inte klassade som stängda |
| Lappland | 2026* | 17 | 14 | 3 |

*2026 är en pågående årgång fram till kontrollen 21 oktober 2026. Aaltos tolv nya poster är hämtade från Primo under ett Aaltodoc-avbrott. De utgör inte en verifierat uttömmande ämnesinsamling. Tio utbildningstillhörigheter, samtliga PDF-länkar och ett arbetes nyckelord väntar på kontroll i originalarkivet. Primos publiceringsdatum används provisoriskt för 2026; direkta dc.date.issued-fält har inte kontrollerats.

## Kör lokalt

Webbplatsen är statisk och behöver inget byggsystem eller API-nycklar:

```sh
python3 -m http.server 8000 --directory docs
```

Öppna http://localhost:8000. JSON hämtas med `fetch`, så öppna genom en lokal server i stället för `file://`.

## Data och reproducerbarhet

- `docs/data/theses.json`: publicerade originaldata, översättningar och kodningar.
- `docs/data/analysis.json`: alla aggregerade diagramdata och nämnare.
- `data/source_metadata.json`: källmetadata från arkiven; inga kopior av PDF-filer eller fulltexter.
- `data/annotations_*.json`: svenska översättningar och AI-assisterad, källbaserad kodning, inklusive de nya årgångsfilerna för 2026.
- `data/coverage.json`: täckningsstatus per universitet/år och kända källbegränsningar.
- `data/harvest_report_2026.json`: sökvägar, sökresultat, bortval och rapport om alternativ Primo-källa.
- `data/downloads_2026.json`: 14 lokala PDF-laddningar från Lauda med SHA-256. Original-PDF:erna ligger lokalt i arbetskatalogens `Lappi bildkonst/2026/`.
- `docs/assets/aggregate.mjs`: beräknar analysen för det valda urvalet i webbläsaren.
- `scripts/check_aggregate.mjs`: jämför webbläsarens beräkningar med det oberoende Python-exportsteget och kontrollerar alla kohorter.
- `data/ANNOTATION_GUIDE.md`: instruktioner och kontrollerat kodschema.
- `scripts/build_data.py`: kombinerar metadata och annoteringar och räknar analysen deterministiskt.
- `scripts/validate.py`: kontrollerar täckning, metodbelägg, svenska original, nämnare och länkar.
- `scripts/prepare_sources.py`: lokalt förberedelsesteg för den ursprungliga nedladdade samlingen i projektets överordnade arbetskatalog; kräver `pypdf`. Fristående användare behöver inte köra detta steg.

Återskapa webbplatsens data med enbart Pythons standardbibliotek:

```sh
python3 scripts/build_data.py
python3 scripts/validate.py
node scripts/check_aggregate.mjs
```

### Hur räknas metoder och teman?

Ett arbete får **en huvuddesign**, även när metoder kombineras. Övriga metoduppgifter bevaras i listan per post. Huvuddesign är alltså en redaktionell förenkling. Ett teoretiskt perspektiv görs inte automatiskt till en metod. Otillräckligt underlag markeras som **Inte fastställbar**.

Varje arbete får **en till tre överlappande temakoder**. Teman är tolkningar, inte författarnas egna ämnesetiketter. Temafrekvenser kan tillsammans överstiga 100 procent. Universitetsjämförelser beräknas inom respektive universitet i det aktuella urvalet. Välj år, universitet, öppen tillgång och om preliminära utbildningstillhörigheter ska ingå. Växla mellan teman och huvudmetoder samt antal och andelar. Varje diagram, tabell, sammanfattning och länk till katalogen följer samma urval. Nämnarna är dynamiska och saknade grupper visas utan en missvisande nollprocent. Metodavsnittets egen väljare visar Aalto, Lappland, båda i olika färger, båda med medelvärdet som en tredje serie eller endast ett gemensamt medelvärde. Universitetsvalet synkroniseras med sidans filter. Medelvärdet är det aritmetiska medelvärdet av universitetens procentandelar, (Aalto + Lappland) / 2, och ger universiteten lika vikt. Det är inte den sammanslagna samlingens andel. Om något universitet saknar poster visas inget medelvärde. Diagram och datatabeller använder samma beräkning för både forskningsdesign och insamling/analys. Insamling och analys räknas separat från forskningsdesign; namngivna varianter grupperas genom den öppna funktionen `technique()` i byggskriptet. En metod räknas högst en gång per arbete och kategori.

Nyckelordslistan använder svenska översättningar av arkivens ämnesord. Dubbletter räknas en gång per arbete; gemener och blanksteg normaliseras. Synonymer slås inte ihop. Allmänna programetiketter tas bort från topplistan men finns kvar i katalogposterna.

### Begränsningar

Kodning och översättning är AI-assisterade, inte godkända av författarna och inte validerade genom oberoende dubbelkodning. Metodunderlaget består av abstrakt och utvalda metodrelaterade avsnitt, inte en systematisk läsning av varje hel PDF. Arkivposter utan öppen PDF ingår med det smalare metadataunderlaget. Metod- och temakodningen kan korrigeras via ett GitHub-ärende.

Ingen information om kön, etnicitet, funktionsförmåga eller annan personlig identitet härleds från författarnamn. Analysen gäller forskningens frågor och arbetssätt. Universitetsmönster är beskrivande och visar inte orsakssamband eller kvalitet.

## Källor och erkännande

- [Aaltodoc: maisterarbeten](https://aaltodoc.aalto.fi/handle/123456789/3)
- [Lauda: pro gradu](https://lauda.ulapland.fi/handle/10024/59344)
- [Lauda: begränsad tillgång](https://lauda.ulapland.fi/handle/10024/64254)
- Catherine D’Ignazio & Lauren F. Klein (2020), [Data Feminism, introduktion och sju principer](https://data-feminism.mitpress.mit.edu/pub/frfa9szd/release/6).

Examensarbetena och metadata producerades av författare, handledare, granskare och universitetsbibliotek. Samlingen, översättningarna, kodningen och webbplatsen skapades med AI-assistans på beställning av Tomi Dufva. Författarnas forskning återges med namn och källänkar. PDF-filerna ligger kvar hos originalutgivarna; de återpubliceras inte i detta repository. Rättigheter för originaltext följer respektive arkivpost. Översättningar är inte auktoriserade utgåvor.

### Uppdateringen 2026

`harvest_2026.py` hämtar de lokalt cachelagda Lauda-kandidaterna och kontrollerar PDF:er. `import_primo_2026.py` läser manuellt verifierade offentliga Primo-källposter under arkivets avbrott. Dessa importsteg kräver den ursprungliga arbetskatalogens hämtningsfiler, som inte publiceras. Reproduktion av publicerade data och statistik görs med `build_data.py`, `validate.py` och `check_aggregate.mjs` utan nätverksåtkomst. Kör en ny direkt Aaltodoc-kontroll när tjänsten åter fungerar innan de preliminära posterna kan markeras som fullt verifierade. Ingen automatisk återhämtning eller övervakning är schemalagd.

## Publicering

GitHub Pages publicerar den statiska katalogen från `main:/docs`. Inga inloggningar, analyscookies eller externa backendtjänster används. Typsnitt laddas från Google Fonts med lokala systemtypsnitt som reserv. Söknings- och filterstatus sparas i sidans URL. Data laddas lokalt i webbläsaren och skickas inte till en söktjänst.


## Historisk analys (kontrollerad 28 oktober 2026)

[Historisk analys](https://tdufva.github.io/examnesarbete/historik.html) är en separat sida med en enhetligt textkodad historisk samling. Standardurvalet innehåller **778 unika direkta arkivposter**: Aalto **411 (2011–2026)** och Lappland **367 (2007–2026)**. Det är alla ämnesavgränsade poster som kunde beläggas genom de dokumenterade sökningarna och kontrollerna, inte en garanti för hela utbildningarnas historiska produktion. Aaltodoc fungerar åter vid denna kontroll.

Därtill kan läsaren välja **43 äldre Lapplandsposter med osäker utbildningstillhörighet** och **41 ytterligare, namngivna Aalto-arbeten från ett publicerat konstnärligt forskningsurval 2010–2015**, varav 15 är från 2010. Totalt finns 862 poster i den öppna historiska datamängden. De två tilläggsgrupperna utesluts som standard. En identisk Lauda-dubblett har slagits samman med bevarad alternativ länk. Tretton poster som arkivet märker Kuvataidekasvatus har uteslutits efter belägg för en annan utbildning i PDF eller abstrakt; se den öppna granskningsfilen. Utbildningsfält i äldre migrerad metadata är alltså inte felfria.

Äldre historisk dokumentation finns redan för 2000–2010 i Heidi Väisänens avhandling (2015), men hennes institutionsurval innehåller även närliggande utbildningar. Outi Koivisto (2016) anger 219 Art Education-magisterarbeten 2010–2015 och listar 81 konstnärligt inriktade arbeten. Dessa källor visas med rätt urvalsbegränsningar; deras uppgifter görs inte till en fabricerad komplett årgång eller abstraktbaserad trend.

Sidan kan visa sammanslaget material, separata universitet eller två jämförelseserier, år för år, i femårsperioder eller årtionden. Metod- och tematrender kan visas som antal eller procent. Standardnämnaren är periodens poster med abstrakt; valet ”alla arkivposter” visar vad som händer om saknad text räknas med. Nämnare och abstrakttäckning finns i varje datatabell. Saknade nämnare bryter linjerna; de blir inte 0 %. År 2026 är ofullständigt.

Historiken räknar **överlappande textsignaler**, med samma finska, engelska och svenska lexikon för alla år. Metoder kräver ett lokalt studiesammanhang i originalabstraktet; vissa negationer, bakgrundsreferenser och framtida förslag utesluts. Teman söks i titel, nyckelord och abstrakt. Varje träff bevarar ett exakt originalutdrag. Detta är en transparent, konservativ automatisk kodning, inte oberoende validerad närläsning och inte samma huvuddesignmått som i den nyare analysen. De ämnesvalda äldre källförteckningarna får inga textkoder. Historiska originaltitlar visas före AI-översatta svenska titlar; originalabstrakt och fulltext nås i källarkiven.

Filer:

- `docs/data/history.json`: historiska originalmetadata, svenska titlar, kodregler och spårbara textsignaler.
- `data/history_aalto.json`, `data/history_lapland.json`, `data/history_additional.json`: direkta källposter.
- `data/history_aalto_earlier_catalogue.json`: sekundära, selekterade äldre källhänvisningar.
- `data/history_scope_audit.json`: PDF-belägg för bortval, osäkra äldre fält, författarkorrigering och dubblett.
- `data/history_*_report.json`: sökvägar, paginering, fältkontroller och byggsammanställning.
- `data/history_coding_audit.json`: flerspråkiga mönster och 15 källgranskade exempel; ingen påstådd oberoende validering.
- `data/history_titles_*.json`: AI-assisterade svenska titelöversättningar.
- `scripts/harvest_history_aalto.py`, `scripts/harvest_history_lapland.py`: cachelagd insamling från offentliga universitetsarkiv. PDF-programmekontroll kräver `pypdf`.

Reproducera publicerade historiska data och kontrollera beräkningarna utan nätverk:

```sh
python3 scripts/build_history.py
python3 scripts/validate_history.py
node scripts/check_history.mjs
```

Råa hämtningar och kontrollerade PDF-filer i `data/history_raw/` publiceras inte. Historikens arkivuppgifter kan innehålla saknade abstrakt, felaktiga språk- eller utbildningsfält och varierande publiceringspraxis. De synliga begränsningarna är en del av analysen.


## Newsroom: bild och slöjd 2024–2026 (13 november 2026)

[Analys 2024–2026](https://tdufva.github.io/examnesarbete/) jämför **309 unika arbeten, elva utbildningslinjer och åtta lärosäten** i den levererade samlingen. Konstfack omfattar tre linjer och Umeå universitet två (bild och slöjd). Östra Finland, Helsingfors, Åbo universitet, Åbo Akademi, Lappland och Aalto omfattar en vardera. Den tidigare katalogens data bevaras för spårbarhet men är inte längre en separat sida. Den större historiska analysens innehåll, data och beräkningar ändras inte.

316 levererade filer motsvarar 315 byte-unika PDF-filer. Två arbeten har separata PDF-delar och räknas en gång, vilket ger 313 arbetskandidater. Tre Konstfack-arbeten har källår 2018 eller 2023 och utesluts från perioden. Ett arbete hör uttryckligen till en annan masterutbildning och hålls utanför jämförelsens nämnare, med analysreferatet kvar i granskningen. Åtta källstödda korrigeringar av linjetillhörighet redovisas öppet. Källår används före mappår. Leveransen innehåller inga arbeten från Aalto, Lappland, Konstfack eller Umeå för 2026; detta betyder inte att inga sådana arbeten finns.

Umeåtillägget omfattar 39 arbeten: 17 i bilddidaktik och 22 i slöjddidaktik. Verifierat arkivår har företräde, med terminen på titelbladet som underlag där arkivår saknas. Ett arbete om AI i båda ämnena räknas en gång i slöjd enligt leveransen och är preliminärt daterat till 2025. Materialet innehåller både grundnivå och avancerad nivå. Saknade nivåuppgifter visas separat.

Jämförelsen kan grupperas per lärosäte, linje eller landsurval och begränsas till bild, slöjd, år, land, nivå och individuellt verifierade poäng. Ett lärosätes sammanslagna andel räknar unika arbeten, inte ett ovägt medel av linjernas procent. Nämnarna visas tillsammans med andelar och antal, tomma nämnare är streck och överlappande teman kan summera till mer än 100 %. Diagram har exakta datatabeller, gemensam skala för små årsgrafer och stöd för mobil. Frågestyrda redaktionella texter, dynamiska nyckeltal, exempel och nyanserande motexempel följer urvalet. År 2026 visas som pågående utan långsiktiga trendanspråk.

Jämförbarhet behandlas som en del av analysen: Konstfacks avancerade yrkesexamen skiljs från generell masterexamen, en students separata ämnesarbeten från antal utexaminerade, och enbart avhandlingspoäng från kombinerat seminarium och avhandling. Den svenska delen omfattar två lärosäten och den finländska sex. Ämnesmix, nivå och årstäckning behöver följa landsjämförelsen. Officiella utbildningskällor och deras tidsbegränsningar visas. Den medföljande UEF-bibliografin listar 31 arbeten men leveransen innehåller 20 av dem; elva textluckor ges inga innehållskoder.

Vid den första publiceringen kodades 193 nya arbeten från titelblad, abstrakt och utvalda metodavsnitt. För 81 Aalto-/Lappland-arbeten som också finns i leveransen återanvänds den tidigare källgranskningen; forskningskontexten har kontrollerats och 24 har fått nya längre analysreferat. Övriga behåller kortare referat. Tre uttryckligt postkvalitativa huvuddesigner har omprövats mot originalet. Teman använder samma 14 koder, med material/tillverkning och hållbar konsumtion åtskilda från kroppslig materialitet och ekologisk naturrelation. Kodning och översättningar är AI-assisterade, inte oberoende dubbelkodade eller auktoriserade av författarna. Referaten är egna analytiska sammanfattningar, inte återpublicerade originalabstrakt.

**Inga original-PDF:er, Word-dokument, fulltexter, råa textutdrag, privata filvägar eller samtyckesbilagor publiceras.** Fulltextextraktion ligger endast i ignorerad lokal cache. De öppna filerna består av bibliografiska uppgifter, analyskoder, egna referat, metodparafraser och sidbelägg.

Reproducera publicerad data och kontrollera beräkningarna utan PDF-filer eller nätverk:

```sh
python3 scripts/build_newsroom.py
python3 scripts/validate_newsroom.py
node scripts/check_newsroom.mjs
```

Källor för bygget: `data/newsroom_annotations_*.json`, `data/newsroom_programmes.json`, `data/newsroom_context.json` och `data/newsroom_manifest.json`. Manifestet innehåller filhashar, grupper, mappår, sidantal och filräkning, inga filvägar eller källtexter. Resultatet är `docs/data/newsroom.json` och `data/newsroom_build_report.json`. Förberedelseskripten kräver den privata leveransen; de behövs inte för att reproducera analysen. `build_newsroom.py --refresh-manifest` uppdaterar manifestet uttryckligen från den lokala extraktionen.


## Utvidgad analys och frågestyrd Newsroom

Källannoteringarna och eventuell granskningsstatus är oförändrade. Ingen ny oberoende verifiering har tillförts. Denna version förbättrar visning och analys av det befintliga materialet:

- Täckningstabellen visar linjer × år, aktuella arbeten, total leverans och filer efter mappår. ”Samma linjer varje år” kräver minst ett arbete per år i vald period efter övriga ämnes-, grupp-, nivå- och poängfilter. Det ger 265 arbeten för 2024–2025, 86 för 2025–2026 och 116 för 2024–2026 i grundurvalet. Linjerna är gemensamma; personer och årgångsstorlekar behöver inte vara det.
- `docs/assets/method-layers.mjs` grupperar befintliga etiketter i fyra överlappande visningslager: ansats, upplägg, insamling och analys. Primärkoden är bevarad för spårbarhet, men intervjuer och enkäter tvingas inte till upplägg. Perspektiv blir inte automatiskt metoder. Saknat lager får en synlig kategori och ersätts inte med en gissning. Versionsnummer och kodregler är offentliga.
- Matrisen korsar tematisk kodning med ett valt metodlager. Nämnaren är valbar: arbeten med radens tema eller hela urvalet. Varje cell innehåller antal, nämnare och andel; en cell med träffar öppnar motsvarande arbeten. ”Alla” visar även små metodkategorier. Källistan och dess urval kan delas via URL.
- Jämförelse och matris kan laddas som PNG med urval, nämnare och metodnot samt som CSV. Bilderna skapas lokalt i webbläsaren och kan förhandsgranskas före separat sparande. En kompakt filterrad följer analysen vid rullning.
- `data/newsroom_editorial.json` och den publicerade `docs/data/editorial.json` innehåller tre frågestyrda texter om hållbarhet, eget görande och lärmiljöer. Befintliga referat och metodbelägg ligger bakom exemplen. Statistiken räknas från aktuellt år/ämne; exempel utanför urvalet döljs. Konstnärlig komponent tas inte som belägg för att forskarens eget arbete är material, och ”Annat” räknas inte som säkert utanför skolan.
- Fem nischingångar använder öppet angivna titelord. Träffarna räknas i aktuellt urval och beskriver inte ämnenas sällsynthet i all forskning. Arbetsbundna rättelselänkar förifyller titel, offentlig källhänvisning och ID i GitHub-formuläret. Besökaren granskar och skickar själv; inga ärenden skapas automatiskt.

Ytterligare kontroller:

```sh
node scripts/check_analysis_v2.mjs
```

Kontrollerna omfattar gemensamma linjer, korsade filter, metodpluralitet, saknade lager, matrisnämnare, filtrerade redaktionella exempel, motexempel, nischsökningar, CSV-format och arbetsbundna rättelseutkast. Den historiska datamängden och dess beräkningskod ändras inte.
