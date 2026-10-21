"""Meaningful data integrity and provenance checks for the published collection."""
import json,re,collections
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
dataset=json.loads((ROOT/'docs/data/theses.json').read_text())
records=dataset['records'];analysis=json.loads((ROOT/'docs/data/analysis.json').read_text())
sources=json.loads((ROOT/'data/source_metadata.json').read_text())
assert len(records)==len({r['id'] for r in records})==len(sources)
coverage=json.loads((ROOT/'data/coverage.json').read_text())
expected={(c['university'],c['year']):c['records'] for c in coverage['cohorts'] if c['records']}
assert collections.Counter((r['university'],r['year']) for r in records)==expected
for c in coverage['cohorts']:
    rs=[r for r in records if r['year']==c['year'] and r['university']==c['university']]
    assert len(rs)==c['records'] and sum(r['open_pdf'] for r in rs)==c['open_pdfs']
assert collections.Counter((r['university'],r['year']) for r in records if r['year']<2026)=={('Aalto',2024):16,('Aalto',2025):32,('Lappland',2024):16,('Lappland',2025):34}
assert sum(m['count'] for m in analysis['primary_methods'])==len(records)
assert sum(analysis['method_coverage'].values())==len(records)
assert analysis['total']==len(records) and analysis['open']==sum(r['open_pdf'] for r in records)
for r in records:
    assert r['original_title'] and r['title_sv']
    assert not r['original_abstract'] or r['abstract_sv']
    assert len(r['keywords'])==len(r['keywords_sv'])
    assert 'NoVA' not in (r.get('programme') or '')
    assert len(r['themes'])==len(set(r['themes']))
    assert r['source_url'].startswith(('https://aaltodoc.aalto.fi/','https://lauda.ulapland.fi/','https://primo.aalto.fi/'))
    assert r['method_note_sv']
    if r['translation_kind']=='original_sv':assert r['abstract_sv']==r['swedish_original_abstract']
    for m in r['methods']:
        assert m['evidence_sv'] and m['kind'] in ('design','insamling','analys','perspektiv')
        if m['basis']=='pdf':assert r['open_pdf'] and isinstance(m['pdf_page'],int) and 0<m['pdf_page']<=r['pdf_page_count']
for u,group in analysis['universities'].items():
    rs=[r for r in records if r['university']==u]
    assert group['total']==len(rs)
    assert group['open']==sum(r['open_pdf'] for r in rs)
    assert group['theme_counts']==dict(collections.Counter(t for r in rs for t in set(r['themes'])))
for filename in ('index.html','analys.html'):
    h=(ROOT/'docs'/filename).read_text();assert '<html lang="sv">' in h
    ids=re.findall(r'\bid="([^"]+)"',h);assert len(ids)==len(set(ids))
    for target in re.findall(r'(?:href|src)="([^"]+)"',h):
        if target.startswith(('https:','http:','#')):continue
        assert (ROOT/'docs'/target.split('?')[0].split('#')[0]).exists(),(filename,target)
assert not list((ROOT/'docs').rglob('*.pdf'))
print(f'Validated {len(records)} records, {sum(len(r["pdf_urls"]) for r in records)} PDF links, Swedish originals, evidence pages, cohort coverage and local links.')
