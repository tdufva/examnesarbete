"""Check historical source scope, traceable text coding and archive reconciliation."""
import collections,json,re
from pathlib import Path
from build_history import method_signals,theme_signals,rules
ROOT=Path(__file__).resolve().parents[1]
d=json.loads((ROOT/'docs/data/history.json').read_text());rs=d['records']
assert len(rs)==len({r['id'] for r in rs})
assert set(r['university'] for r in rs)=={'Aalto','Lappland'}
assert all(1900<=r['year']<=2026 for r in rs)
audit=json.loads((ROOT/'data/history_scope_audit.json').read_text())
excluded={r['id'] for r in audit['excluded']}
assert all(r['id'] not in excluded for r in rs if r['university']=='Lappland')
assert '60569' not in {r['id'] for r in rs}
confirmed=[r for r in rs if r['source_kind']=='archive' and r['programme_confidence']=='source_confirmed']
assert collections.Counter(r['university'] for r in confirmed)=={'Aalto':411,'Lappland':367}
assert min(r['year'] for r in confirmed if r['university']=='Aalto')==2011
assert min(r['year'] for r in confirmed if r['university']=='Lappland')==2007
old=json.loads((ROOT/'docs/data/theses.json').read_text())['records']
known={r['source_url'] for r in confirmed}
assert all(r['source_url'] in known for r in old if r['year']<2026)
for r in rs:
    assert r['original_title'] and r['title_sv'] and r['authors'] and r['source_url'].startswith(('https://aaltodoc.aalto.fi/','https://lauda.ulapland.fi/'))
    if r['source_kind']=='historical_catalogue':
        assert not r['original_abstract'] and not r['method_signals'] and not r['theme_signals']
        assert 95<=r['source_pdf_page']<=100
    else:
        assert len(r['method_signals'])==len({s['id'] for s in r['method_signals']})
        assert len(r['theme_signals'])==len({s['id'] for s in r['theme_signals']})
        for s in r['method_signals']:
            assert s['evidence'] in r['original_abstract']
        for s in r['theme_signals']:
            text={'title':r['original_title'],'abstract':r['original_abstract'],'keywords':' · '.join(r['keywords'])}[s['field']]
            assert s['evidence'] in text
        if not r['original_abstract']:assert not r['method_signals']
categories=rules()['methods']
labels=lambda text:{s['label'] for s in method_signals({'original_abstract':text},categories)}
assert 'Intervjuer' in labels('Tutkimusaineisto kerättiin haastatteluilla.')
assert 'Intervjuer' not in labels('En käytä haastatteluja tutkimuksessani.')
assert 'Intervjuer' not in labels('Previous research used interviews to collect data.')
assert 'Intervjuer' not in labels('Future research could use interviews to collect data.')
assert 'Konstbaserad aktionsforskning' in labels('Tämä opinnäyte on taideperustainen toimintatutkimus.')
assert 'Aktionsforskning' not in labels('Tämä opinnäyte on taideperustainen toimintatutkimus.')
assert 'Fenomenologisk/hermeneutisk studie' not in labels('Tutkimuksen teoreettinen viitekehys on fenomenologia.')
themes=lambda text:{s['label'] for s in theme_signals({'original_title':text,'keywords':[],'original_abstract':''},rules()['themes'])}
assert 'Digital kultur och medier' not in themes('Yhteistyöverkostot ja perinteiset lautapelit')
assert 'Digital kultur och medier' in themes('Digitaalisten pelien oppimisympäristöt')
assert 'Kropp, sinnen och materialitet' not in themes('Tutkimusmateriaali koostui haastatteluista')
assert 'Kropp, sinnen och materialitet' in themes('Kehollisuus ja materiaalisuus taiteessa')
for file in ['index.html','analys.html','historik.html']:
    html=(ROOT/'docs'/file).read_text();assert '<html lang="sv">' in html
    ids=re.findall(r'\bid="([^"]+)"',html);assert len(ids)==len(set(ids))
    for target in re.findall(r'(?:href|src)="([^"]+)"',html):
        if target.startswith(('http:','https:','#')):continue
        assert (ROOT/'docs'/target.split('?')[0].split('#')[0]).exists(),(file,target)
print(f'Historical validation: {len(rs)} records; {len(confirmed)} confirmed direct; scope, provenance, evidence, missing text, method exclusions and all page links passed.')
