# Examensarbeten i bildkonstpedagogik

En svensk läs- och analyswebbplats över examensarbeten från **Aalto-universitetet** och **Lapplands universitet**, publicerade **2024–2025**. Repositorynamnet `examnesarbete` följer beställningen.

**Webbplats:** https://tdufva.github.io/examnesarbete/

## Material och funktioner

- 98 arkivposter: Aalto 48, Lappland 50. 82 har öppen PDF, med sammanlagt 84 PDF-länkar inklusive bilagor.
- Katalog med sökning och filter för universitet, år, huvudmetod, tema och öppen tillgång. Sortera efter år, universitet, titel eller författare.
- Originaltitel och originalabstrakt visas före svensk version. Befintliga svenska abstrakt bevaras; övriga översättningar är AI-genererade och märkta.
- Författarnas nyckelord visas på originalspråk och svenska. Tolkade temakoder är ett separat lager.
- Metoduppgifter skiljer på forskningsdesign, insamling, analys och perspektiv. Beläggen hänvisar till abstrakt eller faktisk PDF-sida och återges som parafraser.
- En separat analys använder datafeminism som ett kritiskt ramverk och visar hur urval, öppenhet, kategorisering och översättning påverkar vad som kan sägas.

**Avgränsning:** Kuvataidekasvatus / Art Education. NoVA (Nordic Master in Visual Studies and Art Education) ingår inte. Årtal kommer från `dc.date.issued`, inte uppladdningsdatum. Insamlat 21 oktober 2026.

| Universitet | År | Poster | Öppen PDF | Ingen öppen PDF |
|---|---:|---:|---:|---:|
| Aalto | 2024 | 16 | 12 | 4 |
| Aalto | 2025 | 32 | 24 | 8 |
| Lappland | 2024 | 16 | 15 | 1 |
| Lappland | 2025 | 34 | 31 | 3 |

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
- `data/annotations_1.json`–`annotations_3.json`: svenska översättningar och AI-assisterad, källbaserad kodning.
- `data/ANNOTATION_GUIDE.md`: instruktioner och kontrollerat kodschema.
- `scripts/build_data.py`: kombinerar metadata och annoteringar och räknar analysen deterministiskt.
- `scripts/validate.py`: kontrollerar täckning, metodbelägg, svenska original, nämnare och länkar.
- `scripts/prepare_sources.py`: lokalt förberedelsesteg för den ursprungliga nedladdade samlingen i projektets överordnade arbetskatalog; kräver `pypdf`. Fristående användare behöver inte köra detta steg.

Återskapa webbplatsens data med enbart Pythons standardbibliotek:

```sh
python3 scripts/build_data.py
python3 scripts/validate.py
```

### Hur räknas metoder och teman?

Ett arbete får **en huvuddesign**, även när metoder kombineras. Övriga metoduppgifter bevaras i listan per post. Huvuddesign är alltså en redaktionell förenkling. Ett teoretiskt perspektiv görs inte automatiskt till en metod. Otillräckligt underlag markeras som **Inte fastställbar**.

Varje arbete får **en till tre överlappande temakoder**. Teman är tolkningar, inte författarnas egna ämnesetiketter. Temafrekvenser kan tillsammans överstiga 100 procent. Universitetsjämförelser beräknas inom respektive universitet (48 respektive 50 poster). Insamling och analys räknas separat från forskningsdesign; namngivna varianter grupperas genom den öppna funktionen `technique()` i byggskriptet. En metod räknas högst en gång per arbete och kategori.

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

## Publicering

GitHub Pages publicerar den statiska katalogen från `main:/docs`. Inga inloggningar, analyscookies eller externa backendtjänster används. Typsnitt laddas från Google Fonts med lokala systemtypsnitt som reserv. Söknings- och filterstatus sparas i sidans URL. Data laddas lokalt i webbläsaren och skickas inte till en söktjänst.
