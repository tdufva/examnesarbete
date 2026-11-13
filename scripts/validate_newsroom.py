"""Validate scope, evidence pointers, reconciliation and public-data boundaries."""
import collections
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
def read(path):
    return json.loads((ROOT / path).read_text())

data = read('docs/data/newsroom.json')
manifest = read('data/newsroom_manifest.json')
report = read('data/newsroom_build_report.json')
records, meta, audit = data['records'], data['metadata'], data['audit']
tracks = {t['id']: t for t in data['tracks']}
designs = {'Konstbaserad aktionsforskning','Konstnärlig/konstbaserad forskning','Postkvalitativ undersökning','Autoetnografi','Aktionsforskning','Fallstudie','Intervjustudie','Etnografi','Litteraturstudie/metasyntes','Enkätstudie','Diskursanalys','Narrativ/biografisk forskning','Designbaserad forskning','Fenomenologisk/hermeneutisk studie','Fenomenografi','Blandad metod','Experimentell/materialteknisk studie','Föremåls-/materialstudie','Historisk/etnologisk studie','Annan kvalitativ studie','Teoretisk/filosofisk studie','Inte fastställbar'}
themes = {'Undervisning och lärande','Natur och ekologisk hållbarhet','Hållbarhet och konsumtion','Material, teknik och tillverkning','Kropp, sinnen och materialitet','Välbefinnande och omsorg','Identitet och profession','Makt, delaktighet och rättvisa','Konstnärlig praktik','Digital kultur och medier','Kulturarv, plats och nordliga sammanhang','Estetik och visuell kultur','Samarbete och gemenskap','Kunskap och vetenskap'}
settings = {'Grundskola','Gymnasium','Förskola','Lärarutbildning','Högskola','Fritid och hobby','Yrkesliv','Arkiv, texter och föremål','Annat','Inte fastställbart'}

assert meta['complete'] and meta['missing_coding'] == 0
universities = {t['university'] for t in tracks.values()}
assert len(tracks) == 11 and len(universities) == 8
assert len(records) == meta['in_scope_count'] == 309
assert meta['file_count'] == manifest['file_count'] == 316
assert meta['unique_pdf_count'] == manifest['unique_pdf_count'] == 315
assert meta['unique_work_candidates'] == len(manifest['works']) == 313
assert len(audit['outside_period']) == 3 and len(audit['other_programmes']) == 1
umea_tracks = {t['id'] for t in tracks.values() if t['university'] == 'umea'}
assert umea_tracks == {'umea-bild', 'umea-slojd'}
assert all(tracks[t]['country'] == 'Sverige' for t in umea_tracks)
assert sum(c['files'] for c in data['coverage'] if c['track_id'] in umea_tracks) == 39
assert all(not (c['files'] or c['works']) for c in data['coverage'] if c['track_id'] in umea_tracks and c['year'] == 2026)
assert meta['unique_work_candidates'] == len(records) + len(audit['outside_period']) + len(audit['other_programmes'])
assert meta['file_count'] - meta['unique_pdf_count'] == audit['duplicate_file_count'] == 1
assert meta['unique_pdf_count'] - len(manifest['works']) == audit['multi_pdf_work_count'] == 2
assert sum(c['files'] for c in data['coverage']) == meta['file_count']
assert sum(c['works'] for c in data['coverage']) == len(records)
assert sum(report['by_university'].values()) == len(records)
assert len({r['id'] for r in records}) == len(records)
assert len({re.sub(r'\W', '', r['original_title'].casefold()) for r in records}) == len(records)

for r in records:
    name = r['original_title']
    assert re.fullmatch(r'[0-9a-f]{64}', r['id']), name
    assert r['year'] in [2024, 2025, 2026], name
    assert r['track_ids'] and set(r['track_ids']) <= tracks.keys(), name
    assert r['country'] == tracks[r['track_ids'][0]]['country'], name
    assert r['title_sv'] and r['summary_sv'] and r['authors'], name
    if umea_tracks.intersection(r['track_ids']):
        assert isinstance(r['authors'],str), name
    assert r['primary_method'] in designs, (name,r['primary_method'])
    assert 1 <= len(r['themes']) <= 4 and set(r['themes']) <= themes, name
    assert set(r['research_settings']) <= settings, name
    assert r['degree_level'] in ['master','advanced_professional','bachelor','unknown'], name
    assert r['coding_confidence'] in ['source_supported','limited'], name
    assert r['credit_scope'] in ['thesis','thesis_and_seminar','unknown'], name
    assert r['credits'] is None or (isinstance(r['credits'],(int,float)) and r['credits'] > 0 and r['credits_pdf_page']), name
    assert r['source_url'] is None or r['source_url'].startswith('https://'), name
    for p in r['source_pdf_pages'] + [r.get('degree_pdf_page'),r.get('credits_pdf_page')] + [m['pdf_page'] for m in r['methods']]:
        assert p is None or isinstance(p,int) and 1 <= p <= r['pdf_page_count'], (name,p)
    for m in r['methods']:
        assert m['kind'] in ['design','insamling','analys','perspektiv'] and m['evidence_sv'], name

# No source text caches or local paths should enter the public payloads.
for path in ['docs/data/newsroom.json','data/newsroom_manifest.json']:
    text = (ROOT/path).read_text()
    assert not any(k in text for k in ['"first_pages"','"method_excerpts"','"relative_path"','"pdf_metadata"','"pages":','/Users/','/private/','mailto:']), path
    assert not re.search(r'[\w.+-]+@[\w.-]+\.[a-z]{2,}',text), path
assert not any((ROOT/'docs').rglob('*.pdf')), 'A PDF entered the published directory'
print(f'Newsroom validated: {len(records)} works, {len(tracks)} tracks, {len(universities)} universities; evidence and public-data boundaries checked.')
