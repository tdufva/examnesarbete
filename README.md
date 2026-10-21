# Examensarbeten i bildkonstpedagogik

En svensk läs- och analyswebbplats över examensarbeten från **Aalto-universitetet** och **Lapplands universitet**, publicerade **2024–2026**. Repositorynamnet `examnesarbete` följer beställningen.

**Webbplats:** https://tdufva.github.io/examnesarbete/

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
