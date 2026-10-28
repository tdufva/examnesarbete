"""Harvest public Aaltodoc metadata for the historical Art Education corpus.

Strict inclusion uses the archive's master-level type and explicit programme/
major metadata; broad all-collection keyword queries catch predecessor records.
"""
import concurrent.futures as cf
import collections
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'data/history_raw';RAW.mkdir(exist_ok=True)
BASE='https://aaltodoc.aalto.fi/server/api'
CHECKED='2026-10-28'
EXTRA_QUERY='dc.programme:"taidekasvatus" OR dc.programme:"kuvataideopetuksen" OR dc.programme:Bildkonstfostran OR dc.programme:Konstutbildning OR dc.programme:"Taiteen ja median maisteriohjelma" OR dc.programme:"Master\'s Programme in Art and Media"'
QUERY='kuvataidekasvatus OR "Art Education" OR kuvataidekasvatuksen OR kuvaamataito OR kuvaamataidon'

def get(url):
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'AcademicHistoryMetadataResearch/1.0'}),timeout=60) as res:return json.load(res)
        except Exception:
            if attempt==3:raise
            time.sleep(2**attempt)

def cached(name,url):
    p=RAW/name
    if p.exists():return json.loads(p.read_text())
    value=get(url);p.write_text(json.dumps(value,ensure_ascii=False)+'\n');return value

def vals(m,key):return [v['value'].strip() for v in m.get(key,[]) if v.get('value','').strip()]
def search_url(page):return BASE+'/discover/search/objects?'+urllib.parse.urlencode({'query':QUERY,'size':100,'page':page,'sort':'dc.date.issued,ASC'})
def explicit_programme(values):
    return any(re.search(r'kuvataidekasvatu|kuvataideopetu|taidekasvatu|art education|bildkonstfostran|konstutbildning',v,re.I) for v in values) and not any(re.search(r'\bNoVA\b|Nordic Master|Visual Studies',v,re.I) for v in values)
def is_master(m):
    return any(re.search(r'^G2\b|Master.?s thesis|Maisterin opinnäyte|Pro gradu',v,re.I) for v in vals(m,'dc.type')+vals(m,'dc.type.ontasot'))

def files(i):
    d=cached('aalto_bundles_'+i['uuid']+'.json',BASE+'/core/items/'+i['uuid']+'/bundles?size=100')
    out=[]
    for b in d.get('_embedded',{}).get('bundles',[]):
        if b['name']!='ORIGINAL':continue
        bits=cached('aalto_bits_'+b['uuid']+'.json',BASE+'/core/bundles/'+b['uuid']+'/bitstreams?size=100')
        assert bits.get('page',{}).get('totalPages',0)<=1
        for f in bits.get('_embedded',{}).get('bitstreams',[]):
            if f['name'].lower().endswith('.pdf'):out.append({'name':f['name'],'url':f['_links']['content']['href'],'size':f['sizeBytes'],'uuid':f['uuid']})
    return out

def normalize(i,fetch_files=True):
    m=i['metadata'];date=vals(m,'dc.date.issued')[0]
    abstracts=[{'lang':a.get('language') or 'und','text':a['value'].strip()} for a in m.get('dc.description.abstract',[]) if a['value'].strip()]
    language=(vals(m,'dc.language.iso') or ['und'])[0]
    original=next((a for a in abstracts if a['lang'].startswith(language[:2])),abstracts[0] if abstracts else {'lang':language,'text':''})
    programme=[]
    for k in ('dc.programme','dc.programme.major','dc.programme.discipline','dc.subject.degreeprogramme'):
        programme+=vals(m,k)
    pdfs=files(i) if fetch_files else []
    return {'id':'aalto-'+i['uuid'],'uuid':i['uuid'],'handle':i.get('handle'),'university':'Aalto','year':int(date[:4]),'date_issued':date,'authors':'; '.join(dict.fromkeys(vals(m,'dc.contributor.author'))),'original_title':i['name'],'source_url':'https://aaltodoc.aalto.fi/handle/'+i['handle'],'metadata_source_url':BASE+'/core/items/'+i['uuid'],'language':language,'titles':[{'value':x['value'],'language':x.get('language') or 'und'} for x in m.get('dc.title',[])],'abstracts':abstracts,'original_abstract':original['text'],'abstract_language':original['lang'],'keywords':list(dict.fromkeys(vals(m,'dc.subject.keyword'))),'programme':'; '.join(dict.fromkeys(programme)),'programme_fields':{k:vals(m,k) for k in m if k.startswith('dc.programme')},'programme_status':'confirmed_from_archive','programme_verification':'Explicit programme/major metadata in Aaltodoc and master-level thesis type','degree_types':vals(m,'dc.type')+vals(m,'dc.type.ontasot'),'rights':list(dict.fromkeys(vals(m,'dc.rights')+vals(m,'dc.rights.accesslevel'))),'pdf_urls':[p['url'] for p in pdfs],'pdf_files':pdfs,'open_pdf':bool(pdfs),'pdf_status':'archive_link_available' if pdfs else 'no_public_pdf_link','availability_checked':CHECKED,'metadata_checked':CHECKED,'institution_names':vals(m,'dc.contributor')+vals(m,'dc.contributor.school')}

def main():
    first=cached('aalto_search_0.json',search_url(0))['_embedded']['searchResult']
    pages=first['page']['totalPages'];all_items={}
    for page in range(pages):
        d=first if page==0 else cached('aalto_search_'+str(page)+'.json',search_url(page))['_embedded']['searchResult']
        for o in d.get('_embedded',{}).get('objects',[]):
            i=o['_embedded']['indexableObject']
            if 'metadata' in i:all_items[i['uuid']]=i
        print('Aalto search page',page+1,'/',pages,len(all_items),flush=True)
    extra_pages=0;extra_total=0
    while True:
        u=BASE+'/discover/search/objects?'+urllib.parse.urlencode({'query':EXTRA_QUERY,'size':100,'page':extra_pages,'sort':'dc.date.issued,ASC'})
        d=cached('aalto_extra_search_'+str(extra_pages)+'.json',u)['_embedded']['searchResult']
        extra_total=d['page']['totalElements']
        for o in d.get('_embedded',{}).get('objects',[]):
            i=o['_embedded']['indexableObject']
            if 'metadata' in i:all_items[i['uuid']]=i
        print('Aalto extra search page',extra_pages+1,'/',d['page']['totalPages'],len(all_items),flush=True)
        extra_pages+=1
        if extra_pages>=d['page']['totalPages']:break
    # Prior source records ensure metadata-only generic Art&Media records remain candidates.
    old=json.loads((ROOT/'data/source_metadata.json').read_text())
    for r in old:
        if r['university']!='Aalto' or r.get('year')!=2024:continue
        uid=r['id'].removeprefix('aalto-')
        if uid not in all_items:
            item=cached('aalto_core_'+uid+'.json',BASE+'/core/items/'+uid)
            all_items[item['uuid']]=item
    (RAW/'aalto_all_search_items.json').write_text(json.dumps(list(all_items.values()),ensure_ascii=False)+'\n')
    selected=[];uncertain=[];excluded=[]
    for i in all_items.values():
        m=i['metadata'];programmes=[v for k in m if k.startswith('dc.programme') for v in vals(m,k)]
        if not is_master(m):continue
        if explicit_programme(programmes):selected.append(i)
        else:uncertain.append({'uuid':i['uuid'],'title':i['name'],'handle':i.get('handle'),'programmes':programmes,'date_issued':vals(m,'dc.date.issued')})
    print('Selected',len(selected),'uncertain/other masters',len(uncertain),flush=True)
    records=[]
    with cf.ThreadPoolExecutor(max_workers=3) as pool:
        for r in pool.map(normalize,selected):
            records.append(r)
            if len(records)%25==0:print('Aalto records+files',len(records),'/',len(selected),flush=True)
    records.sort(key=lambda r:(r['year'],r['original_title']))
    (ROOT/'data/history_aalto.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
    report={'checked':CHECKED,'source':'Aaltodoc DSpace public API','query':QUERY,'scope':'All collections; no date limit','search_url':search_url(0),'search_total':first['page']['totalElements'],'search_pages':pages,'extra_query':EXTRA_QUERY,'extra_total':extra_total,'extra_pages':extra_pages,'harvested_search_records':len(all_items),'confirmed_master_records':len(records),'inclusion':'Master-level thesis dc.type / dc.type.ontasot and explicit dc.programme or dc.programme.major Art Education / Kuvataidekasvatus; NoVA excluded.','earliest_year':min(r['year'] for r in records),'latest_year':max(r['year'] for r in records),'by_year':dict(sorted(collections.Counter(r['year'] for r in records).items())),'with_abstract':sum(bool(r['original_abstract']) for r in records),'with_keywords':sum(bool(r['keywords']) for r in records),'with_pdf_link':sum(bool(r['pdf_urls']) for r in records),'unselected_master_candidates':uncertain,'limits':['All matching public digital repository metadata, not all works ever produced. Paper-only historical theses and missing programme metadata may be absent.','PDF access is based on an original bundle download link, not a downloaded full-text or author licence.']}
    (ROOT/'data/history_aalto_report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k!='unselected_master_candidates'},ensure_ascii=False,indent=2))

# Programme evidence checks for records whose migrated metadata omit the major.
def probe_programme(item):
    from io import BytesIO
    from pypdf import PdfReader
    uid=item['uuid'];target=RAW/('aalto_pdf_probe_'+uid+'.json')
    if target.exists():return json.loads(target.read_text())
    fs=files(item);result={'uuid':uid,'handle':item.get('handle'),'pdf_files':fs,'status':'no_public_pdf','programme_confirmed':False}
    if fs:
        try:
            file=fs[0];p=RAW/('aalto_probe_'+uid+'.pdf')
            if not p.exists():
                data=urllib.request.urlopen(urllib.request.Request(file['url'],headers={'User-Agent':'AcademicHistoryMetadataResearch/1.0'}),timeout=90).read()
                if not data[:1024].lstrip().startswith(b'%PDF'):raise ValueError('Not a PDF response')
                p.write_bytes(data)
            pdf=PdfReader(p)
            pages=[{'pdf_page':n+1,'text':pdf.pages[n].extract_text() or ''} for n in range(min(7,len(pdf.pages)))]
            text='\n'.join(p['text'] for p in pages)
            evidence=[]
            for page in pages:
                s=re.sub(r'\s+',' ',page['text'])
                patterns=[r'(?:Koulutusohjelma|Degree programme|Master.?s programme|Pääaine|Major|Utbildningsprogram|Huvudämne).{0,160}(?:kuvataidekasvatu\w*|art education|bildkonstfostran)',r'(?:kuvataidekasvatuksen|taidekasvatuksen|kuvataideopetuksen) (?:koulutusohjelma|maisteriohjelma)',r'(?:degree programme|master.?s programme|master.?s degree programme) in art education']
                for pattern in patterns:
                    for match in re.finditer(pattern,s,re.I):evidence.append({'pdf_page':page['pdf_page'],'text':s[max(0,match.start()-30):match.end()+80]})
            result.update(status='pdf_checked',programme_confirmed=bool(evidence),evidence=evidence,pages=pages,page_count=len(pdf.pages),file_path=str(p.relative_to(ROOT)))
            if re.search(r'Nordic.{0,50}(?:visual|master)|\bNoVA\b',' '.join(p['text'] for p in pages[:4]),re.I):result.update(programme_confirmed=False,excluded_nova=True)
        except Exception as e:result.update(status='pdf_error',error=str(e))
    target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    return result

def supplement_programme_checks():
    items=json.loads((RAW/'aalto_all_search_items.json').read_text())
    selected={r['uuid']:r for r in json.loads((ROOT/'data/history_aalto.json').read_text())}
    candidates=[]
    generic={'taiteen ja median maisteriohjelma',"master's programme in art and media",'magisterprogrammet i konst och media'}
    for i in items:
        m=i['metadata'];pg=[v for k in m if k.startswith('dc.programme') for v in vals(m,k)]
        if i['uuid'] in selected or not is_master(m):continue
        if not pg or all(p.lower() in generic for p in pg):candidates.append(i)
    results=[]
    with cf.ThreadPoolExecutor(max_workers=3) as pool:
        for item,result in zip(candidates,pool.map(probe_programme,candidates)):
            results.append(result)
            if result['programme_confirmed']:
                r=normalize(item,fetch_files=False);r.update(programme='Kuvataidekasvatus / Art Education (verified in PDF)',programme_status='confirmed_from_pdf',programme_verification='Explicit programme/major heading in thesis PDF',programme_evidence=result['evidence'],pdf_urls=[f['url'] for f in result['pdf_files']],pdf_files=result['pdf_files'],open_pdf=True,pdf_status='pdf_checked')
                selected[r['uuid']]=r
            if len(results)%10==0:print('Aalto programme PDF checks',len(results),'/',len(candidates),'confirmed',sum(r['programme_confirmed'] for r in results),flush=True)
    records=sorted(selected.values(),key=lambda r:(r['year'],r['original_title']))
    (ROOT/'data/history_aalto.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
    p=ROOT/'data/history_aalto_report.json';report=json.loads(p.read_text());report.update(confirmed_master_records=len(records),programme_pdf_candidates=len(candidates),programme_pdf_confirmed=sum(r['programme_confirmed'] for r in results),programme_pdf_checks=[{k:v for k,v in r.items() if k not in ('pages','file_path')} for r in results],by_year=dict(sorted(collections.Counter(r['year'] for r in records).items())),with_abstract=sum(bool(r['original_abstract']) for r in records),with_keywords=sum(bool(r['keywords']) for r in records),with_pdf_link=sum(bool(r['pdf_urls']) for r in records))
    report['historical_context_sources']=[{'url':'https://aaltodoc.aalto.fi/handle/123456789/22094','year':2016,'claim':'Abstract reports 219 Art Education master theses produced 2010–2015, including81artistic research methods; digital repository coverage is not total historical production.'},{'url':'https://aaltodoc.aalto.fi/handle/123456789/14524','year':2015,'claim':'Thesis studies Department of Art Education theses2000–2010, earlier than the currently discovered digital master records.'}]
    report['unconfirmed_programme_candidates']=[{'uuid':i['uuid'],'handle':i.get('handle'),'title':i['name'],'date_issued':vals(i['metadata'],'dc.date.issued'),'reason':'Programme not confirmed from available metadata/PDF'} for i in candidates if i['uuid'] not in selected]
    p.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print('Supplemented',len(records),'confirmed records',report['by_year'],flush=True)

if __name__=='__main__':
    main()
    supplement_programme_checks()
