"""Meaningful data integrity and provenance checks for the published collection."""
import json,re,collections
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
dataset=json.loads((ROOT/'docs/data/theses.json').read_text())
records=dataset['records'];analysis=json.loads((ROOT/'docs/data/analysis.json').read_text())
assert len(records)==len({r['id'] for r in records})==98
assert sum(r['open_pdf'] for r in records)==82
assert sum(len(r['pdf_urls']) for r in records)==84
assert collections.Counter((r['university'],r['year']) for r in records)=={('Aalto',2024):16,('Aalto',2025):32,('Lappland',2024):16,('Lappland',2025):34}
assert sum(r['translation_kind']=='original_sv' for r in records)==2
assert sum(m['count'] for m in analysis['primary_methods'])==98
assert sum(analysis['method_coverage'].values())==98
assert analysis['total']==98 and analysis['open']==82
for r in records:
    assert r['original_title'] and r['title_sv'] and r['original_abstract'] and r['abstract_sv']
    assert len(r['keywords'])==len(r['keywords_sv'])
    assert 'NoVA' not in r.get('programme','')
    assert len(r['themes'])==len(set(r['themes']))
    assert r['source_url'].startswith(('https://aaltodoc.aalto.fi/','https://lauda.ulapland.fi/'))
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
print('Validated 98 records, 84 PDF links, 2 original Swedish abstracts, evidence pages, all chart denominators and local site links.')
