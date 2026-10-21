# Swedish translation and transparent coding

Read your assigned `source_batch_N.json` and write `annotations_N.json` as a JSON array. Preserve every source record id, with exactly these added fields:

- `id`
- `title_sv`: faithful full Swedish title, preserving punctuation and artistic ambiguity. Use the original if it is already Swedish.
- `abstract_sv`: faithful COMPLETE Swedish translation of `original_abstract`, preserving paragraph structure and all substantive information. Use supplied `swedish_original_abstract` when present, verbatim. If no original abstract exists, use null; never invent or replace it with a summary.
- `translation_kind`: `original_sv`, `ai_translation`, or `missing` for the abstract.
- `keywords_sv`: Swedish translations of the source `keywords` array in the same order, one per keyword. Preserve proper names. Translate all keywords, but do not add any.
- `primary_method`: one principal research design from the controlled vocabulary below, or `Inte fastställbar`.
- `methods`: array of objects with `label` (Swedish), `kind` (`design`, `insamling`, `analys`, `perspektiv`), `basis` (`abstract` or `pdf`), `pdf_page` (actual one-based PDF page from the supplied excerpt, or null), `evidence_sv` (brief Swedish paraphrase of the supporting statement). Include research design, collection and analysis methods where identifiable. Distinguish a philosophical perspective from a research design. Never invent a method based on its topic or keywords. Do not infer that using interviews means thematic analysis. Do not classify methods merely mentioned as background as the study's own methods. Prefer abstract evidence and use PDF excerpts to resolve omissions. If nothing is supported, methods is empty.
- `method_note_sv`: a concise note explaining uncertainty or mixed approaches; mention abstract-only inference when no PDF is open. Never claim to have read the whole PDF; you have selected excerpts.
- `themes`: 1–3 controlled thematic codes (see below). These are interpretive, overlapping catalogue labels, not author-supplied keywords. Prefer substantive topics, avoid giving everyone "Undervisning och lärande" just because this is art education.
- `topic_sv`: a concise phrase describing the main substantive topic.

Primary method vocabulary:
`Konstbaserad aktionsforskning`, `Konstnärlig/konstbaserad forskning`, `Autoetnografi`, `Aktionsforskning`, `Fallstudie`, `Intervjustudie`, `Etnografi`, `Litteraturstudie/metasyntes`, `Enkätstudie`, `Diskursanalys`, `Narrativ/biografisk forskning`, `Designbaserad forskning`, `Fenomenologisk/hermeneutisk studie`, `Blandad metod`, `Annan kvalitativ studie`, `Teoretisk/filosofisk studie`, `Inte fastställbar`.

Use an explicit self-identification where available. `Konstbaserad aktionsforskning` takes precedence when explicitly the design even if interviews are used. `Autoetnografi` takes precedence when explicitly the central design, unless art-based action research is clearly the main design. A theoretical perspective alone is not a method. `Fallstudie` requires identification as a case study rather than simply studying one place. No false precision.

Thematic codes:
`Undervisning och lärande`, `Natur och ekologisk hållbarhet`, `Kropp, sinnen och materialitet`, `Välbefinnande och omsorg`, `Identitet och profession`, `Makt, delaktighet och rättvisa`, `Konstnärlig praktik`, `Digital kultur och medier`, `Kulturarv, plats och nordliga sammanhang`, `Estetik och visuell kultur`, `Samarbete och gemenskap`, `Kunskap och vetenskap`.

Do not infer gender, ethnicity, disability, or other personal attributes from author names or abstracts. Discuss study topics only. Do not make university-level claims in individual records. Do not edit shared source files, site UI, or other agents' outputs. You may use Python to write JSON safely, and validate it with json.loads. Read source in manageable chunks, and finish every record. Keep your final reply concise, reporting record count and uncertainties.
