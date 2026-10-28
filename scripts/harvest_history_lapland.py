"""Reproducible cached Lauda discovery and exact programme verification.

Search both master's collections with Finnish/English art-education terms.
The public full-metadata view, not a subject keyword, establishes programme.
"""
import concurrent.futures as cf
import datetime,html,json,math,re,time,urllib.request,urllib.parse
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT/'data/history_raw';CACHE.mkdir(exist_ok=True)
BASE='https://lauda.ulapland.fi'
TODAY='2026-10-28'

class Meta(HTMLParser):
 def __init__(self):super().__init__();self.items=[]
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if tag=='meta' and d.get('name'):self.items.append(d)
 def values(self,name):return [i['content'] for i in self.items if i['name']==name and i.get('content')]

def get(url,path):
 if path.exists():return path.read_text()
 for n in range(4):
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'AcademicThesisHistory/1.0 (public metadata research)'})
   data=urllib.request.urlopen(req,timeout=90).read().decode('utf-8')
   if '<html' not in data.lower():raise ValueError('Expected HTML')
   path.write_text(data);return data
  except Exception:
   if n==3:raise
   time.sleep(1+n)

def clean(s):return html.unescape(re.sub('<[^>]+>','',s)).strip()
def detected_language(text,source):
 # Conservative function-word check fixes known legacy en labels on Finnish prose.
 words=re.findall(r"[a-zåäö]+",text.casefold())
 lexicons={'fi':set('ja on tutkimus tutkimuksen tutkielma tutkielman aineisto että sekä ei oli ovat myös joka jotka kuinka miten sitä tämän työssä tutkimuksessa työn'.split()),'en':set('the and of is this research study thesis data was were in with as for that from to have'.split()),'sv':set('och är det att av som för en ett jag med på har till inte denna den de studie uppsats undersökning'.split())}
 scores=sorted(((sum(w in terms for w in words),lang) for lang,terms in lexicons.items()),reverse=True)
 if scores[0][0]>=5 and scores[0][0]>scores[1][0]*2:return scores[0][1]
 return {'fin':'fi','eng':'en','swe':'sv'}.get(source,source) if source not in ('-','') else 'und'
def discovery():
 provenance={};searches=[]
 for collection in ('59344','64254'):
  for term in ('kuvataidekasv*','"art education"','taidekasvat*'):
   slug=term.replace('"','').replace(' ','_').replace('*','')
   page=1;expected=None;found=[]
   while True:
    url=BASE+'/handle/10024/'+collection+'/discover?'+urllib.parse.urlencode({'query':term,'rpp':100,'sort_by':'dc.date.issued_dt','order':'asc','page':page})
    h=get(url,CACHE/f'lapland_search_{collection}_{slug}_{page}.html')
    m=re.search(r'pagination-info[^>]*>.*?/\s*(\d+)</p>',h,re.S)
    total=int(m[1]) if m else 0
    if expected is None:expected=total
    assert total==expected,(term,total,expected)
    ids=[]
    for block in re.split(r'<div class="row ds-artifact-item[^>]*>',h)[1:]:
     m=re.search(r'href="/handle/10024/(\d+)"',block)
     if m:ids.append(m[1]);provenance.setdefault(m[1],set()).add(collection)
    found+=ids
    print('SEARCH',collection,term,page,len(ids),expected,flush=True)
    if page>=math.ceil(expected/100):break
    page+=1
   assert len(set(found))==expected,(term,collection,len(set(found)),expected)
   searches.append({'collection':'10024/'+collection,'query':term,'records_reported':expected,'records_retrieved':len(set(found)),'pages':page,'first_page_url':url.rsplit('page=',1)[0]+'page=1'})
 return provenance,searches

def parse(identifier,collections):
 url=BASE+'/handle/10024/'+identifier
 h=get(url+'?show=full',CACHE/f'lapland_item_{identifier}.html');p=Meta();p.feed(h)
 metadata={}
 for key,value,lang in re.findall(r'<td class="label-cell">(.*?)</td>\s*<td[^>]*>(.*?)</td>\s*<td[^>]*>(.*?)</td>',h,re.S):metadata.setdefault(clean(key),[]).append({'value':clean(value),'language':clean(lang)})
 values=lambda key:[x['value'] for x in metadata.get(key,[]) if x['value']]
 programmes=[(key,v) for key in ('dc.programme','dc.subject.degreeprogram','dc.subject.discipline','dc.subject.oppiaine','dc.contributor.organization') for v in values(key)]
 matches=[(k,v) for k,v in programmes if re.search(r'kuvataidekasvat|\bart education\b',v,re.I)]
 include=bool(matches) and not any('nova' in v.lower() or 'sustainable' in v.lower() for k,v in matches)
 types=values('dc.type')+values('dc.type.ontasot')
 if any(re.search(r'bachelor|kandida|doctor|väitös',v,re.I) for v in types):include=False
 dates=values('dc.date.issued') or p.values('DCTERMS.issued')
 year=int(dates[0][:4]) if dates and re.match(r'\d{4}',dates[0]) else None
 title=(values('dc.title') or p.values('DC.title') or [''])[0]
 abstracts=[{'source_lang':a.get('xml:lang','und'),'lang':detected_language(a['content'],a.get('xml:lang','und')),'text':a['content'].replace('\\r\\n','\n')} for a in p.items if a['name']=='DCTERMS.abstract']
 titles=[{'value':x['value'],'language':x['language'] or 'und'} for x in metadata.get('dc.title',[])]
 language=(values('dc.language.iso') or p.values('DC.language') or ['und'])[0]
 primary=next((a for a in abstracts if a['lang'][:2]==language[:2]),None) or next((a for a in abstracts if a['lang'][:2]=='fi'),None) or next(iter(abstracts),{'lang':'und','text':''})
 pdfs=[]
 for raw in dict.fromkeys(re.findall(r'href="([^"]*bitstream[^"<>]+)"',h)):
  raw=html.unescape(raw)
  if re.search(r'\.pdf(?:\?|$)',raw,re.I) and 'isAllowed=n' not in raw:pdfs.append(urllib.parse.quote(urllib.parse.urljoin(url,raw),safe='/:?&=%;'))
 rights=p.values('DC.rights');open_access=bool(pdfs)
 rec={'id':identifier,'university':'Lappland','year':year,'date_issued':dates,'authors':'; '.join(dict.fromkeys(values('dc.contributor.author') or p.values('DC.creator'))),'original_title':title,'source_url':url,'metadata_source_url':url+'?show=full','language':language,'abstract_language':primary['lang'],'original_abstract':primary['text'],'abstracts':abstracts,'titles':titles,'keywords':list(dict.fromkeys(p.values('DC.subject'))),'rights':rights,'open_pdf':open_access,'pdf_urls':list(dict.fromkeys(pdfs)),'pdf_status':'archive_linked' if open_access else 'no_open_link','programme':'; '.join(v for k,v in matches),'programme_fields':[{'field':k,'value':v} for k,v in programmes],'programme_status':'confirmed_from_metadata' if include else 'not_confirmed','degree_types':types,'collections':sorted(collections),'availability_checked':TODAY}
 rec['language_source_discrepancy']=[{'field':'dc.description.abstract','source_language':a['source_lang'],'display_language':a['lang'],'note':'Legacy source language label contradicts the clear language of the prose; original label retained.'} for a in abstracts if a['source_lang'] not in ('und','-','') and a['lang']!=a['source_lang'][:2]]
 return rec,include

def main():
 provenance,searches=discovery();included=[];excluded=[];errors=[]
 with cf.ThreadPoolExecutor(max_workers=4) as pool:
  futures={pool.submit(parse,i,c):i for i,c in provenance.items()}
  for future in cf.as_completed(futures):
   identifier=futures[future]
   try:
    rec,include=future.result()
    (included if include else excluded).append(rec)
   except Exception as e:errors.append({'id':identifier,'error':str(e)})
   if (len(included)+len(excluded)+len(errors))%30==0:print('FETCH',len(included),len(excluded),len(errors),'/ ',len(provenance),flush=True)
 # Preserve the confirmed PDF programme proof already audited for 67368.
 existing=json.loads((ROOT/'data/source_metadata.json').read_text())
 existing_ids={r['id']:r for r in existing if r['university']=='Lappland'}
 for r in excluded[:]:
  if r['id']=='67368' and 'verified from PDF' in existing_ids.get(r['id'],{}).get('programme',''):
   r['programme']='Kuvataidekasvatus';r['programme_status']='confirmed_from_pdf';r['programme_evidence']={'basis':'existing_pdf_audit','file_page':2,'note':'Programme verified from the original PDF during the 2026 harvest.'};included.append(r);excluded.remove(r)
 for r in excluded[:]:
  if r['id']=='65124':
   proof=(CACHE/'lapland_65124_programme_evidence.txt')
   if proof.exists() and 'as an Art Education student' in proof.read_text():
    r['programme']='Art Education';r['programme_status']='confirmed_from_pdf';r['programme_evidence']={'basis':'pdf','file_page':8,'source_url':r['pdf_urls'][0],'note':'Author identifies directly as an Art Education student in the thesis introduction (PDF page 8); page 9 names her Art Education studies and course Kuvataideopetus I.'};included.append(r);excluded.remove(r)
  elif r['id'] in ('64020','66271'):
   value,page=('Master of Arctic Art and Design, Applied Visual Arts',2) if r['id']=='64020' else ('Sustainable Art and Design',2)
   r['programme_fields'].append({'field':'pdf_programme','value':value,'file_page':page})
 included.sort(key=lambda r:(r['year'] or 0,r['id']))
 from collections import Counter
 report={'checked':TODAY,'sources':['https://lauda.ulapland.fi/handle/10024/59344','https://lauda.ulapland.fi/handle/10024/64254'],'searches':searches,'coverage_note':'All pages of the recorded Finnish/English queries in the two master-thesis collections were retrieved. Results establish archive coverage, not all historically submitted theses. Programme fields are retained verbatim; archival metadata can contain errors.', 'metadata_anomaly_examples':[{'id':'60644','note':'Archive assigns Art Education although title and abstract concern industrial furniture design; programme could not be independently checked.'},{'id':'60657','note':'Archive assigns Art Education although title concerns product-experience design; programme could not be independently checked.'}], 'candidate_count':len(provenance),'confirmed_records':len(included),'first_year':min((r['year'] for r in included if r['year']),default=None),'last_year':max((r['year'] for r in included if r['year']),default=None),'by_year':dict(sorted(Counter(r['year'] for r in included).items())),'abstract_available':sum(bool(r['original_abstract']) for r in included),'source_language_discrepancies':sum(bool(r['language_source_discrepancy']) for r in included),'open_pdf_links':sum(r['open_pdf'] for r in included),'errors':errors,'excluded_or_unverified':[{'id':r['id'],'year':r['year'],'title':r['original_title'],'programme_fields':r['programme_fields'],'degree_types':r['degree_types'],'source_url':r['source_url']} for r in excluded],'existing_records_missing':[{'id':r['id'],'year':r['year'],'title':r['original_title']} for r in existing if r['university']=='Lappland' and r['id'] not in {x['id'] for x in included}]}
 (ROOT/'data/history_lapland.json').write_text(json.dumps(included,ensure_ascii=False,indent=2)+'\n')
 (ROOT/'data/history_lapland_report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({k:v for k,v in report.items() if k not in ('excluded_or_unverified','searches')},ensure_ascii=False,indent=2),flush=True)
if __name__=='__main__':main()
