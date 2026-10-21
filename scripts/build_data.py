"""Join Swedish annotations with original metadata, then compute every published count."""
import json,re,unicodedata
from pathlib import Path
from collections import Counter

ROOT=Path(__file__).resolve().parents[1]
def ranking(c):return [{'label':k,'count':v} for k,v in sorted(c.items(),key=lambda kv:(-kv[1],kv[0]))]
def norm(t):return re.sub(r'\s+',' ',t.casefold()).strip(' .,;')

def technique(label):
    s=norm(label)
    for pattern,name in [
        (r'intervju','Intervjuer'),(r'innehållsanalys','Innehållsanalys'),
        (r'tematisk|tematisering','Tematisk analys'),(r'observation','Observation'),
        (r'workshop','Workshoppar'),(r'enkät','Enkäter'),
        (r'dagbok|dagböcker','Dagböcker'),(r'foto|video|audiovisuell','Foto- och videodokumentation'),
        (r'narrativ|berättelseanalys','Narrativ analys'),(r'diskurs','Diskursanalys'),
        (r'hermeneut|fenomenolog','Fenomenologisk/hermeneutisk analys'),
        (r'konstnärlig|konstbaserad','Konstbaserat arbete som material')]:
        if re.search(pattern,s):return name
    return label[0].upper()+label[1:]

def main():
    sources=json.loads((ROOT/'data/source_metadata.json').read_text())
    annotations=[]
    for n in range(1,4):annotations+=json.loads((ROOT/f'data/annotations_{n}.json').read_text())
    ann={a['id']:a for a in annotations}
    assert len(ann)==len(sources)==len(annotations)
    records=[]
    for s in sources:
        a=ann[s['id']]
        for field in ('title_sv','abstract_sv','keywords_sv','primary_method','methods','themes','topic_sv','method_note_sv','translation_kind'):assert field in a,(s['id'],field)
        assert len(a['keywords_sv'])==len(s['keywords']),(s['id'],'keywords')
        assert len(a['abstract_sv'])>len(s['original_abstract'])*.45,(s['id'],'possible truncation')
        assert 1<=len(a['themes'])<=3
        for m in a['methods']:
            assert m['basis'] in ('abstract','pdf')
            assert m['kind'] in ('design','insamling','analys','perspektiv')
            if m['basis']=='pdf':assert m['pdf_page'] in [x['pdf_page'] for x in s['method_source_excerpts']],(s['id'],m)
        r={k:v for k,v in s.items() if k not in ('method_source_excerpts',)}
        r.update(a);records.append(r)
    total=len(records)
    primary=Counter(r['primary_method'] for r in records)
    themes=Counter(t for r in records for t in set(r['themes']))
    keywords=Counter(t for r in records for t in {norm(k) for k in r['keywords_sv']})
    stop={'bildkonstpedagogik','konstpedagogik','konstpedagogikens utbildningsprogram','bildkonstpedagogikens utbildningsprogram','masteruppsats','pro gradu-avhandling','pro gradu','master of arts','art education','bildkonstpedagogiska utbildningsprogrammet'}
    keywords=Counter({k:n for k,n in keywords.items() if k not in stop and len(k)>2})
    techniques=Counter(t for r in records for t in {technique(m['label']) for m in r['methods'] if m['kind'] in ('insamling','analys')})
    universities={}
    for u in ('Aalto','Lappland'):
        rs=[r for r in records if r['university']==u];tc=Counter(t for r in rs for t in set(r['themes']))
        universities[u]={'total':len(rs),'open':sum(r['open_pdf'] for r in rs),'themes':ranking(tc),'theme_counts':dict(tc),'primary_methods':ranking(Counter(r['primary_method'] for r in rs))}
    by_year=[]
    for u in ('Aalto','Lappland'):
        for y in (2024,2025):
            rs=[r for r in records if r['university']==u and r['year']==y]
            by_year.append(dict(university=u,year=y,total=len(rs),open=sum(r['open_pdf'] for r in rs)))
    coverage={'with_pdf_evidence':sum(any(m['basis']=='pdf' for m in r['methods']) for r in records),'abstract_only':sum(bool(r['methods']) and not any(m['basis']=='pdf' for m in r['methods']) for r in records),'no_methods':sum(not r['methods'] for r in records)}
    analysis={'total':total,'open':sum(r['open_pdf'] for r in records),'primary_methods':ranking(primary),'themes':ranking(themes),'keywords':ranking(keywords),'techniques':ranking(techniques),'universities':universities,'by_year':by_year,'method_coverage':coverage}
    meta={'collected':'2026-10-21','scope':'Kuvataidekasvatus / Art Education; NoVA excluded','translation':'AI-assisted; original-language text retained; existing Swedish abstracts reused','classification':'AI-assisted interpretive coding; no independent double coding','pdfs':'Linked to the university archives; not republished','sources':['https://aaltodoc.aalto.fi/handle/123456789/3','https://lauda.ulapland.fi/handle/10024/59344','https://lauda.ulapland.fi/handle/10024/64254']}
    dest=ROOT/'docs/data';dest.mkdir(exist_ok=True)
    (dest/'theses.json').write_text(json.dumps({'metadata':meta,'records':records},ensure_ascii=False,indent=2)+'\n')
    (dest/'analysis.json').write_text(json.dumps(analysis,ensure_ascii=False,indent=2)+'\n')
    print('Built',total,'records;',analysis['open'],'open PDFs; methods:',analysis['primary_methods'][:4]);print('Themes:',analysis['themes'][:4])

if __name__=='__main__':main()
