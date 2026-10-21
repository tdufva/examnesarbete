"""Prepare auditable source records from the local university archive harvest."""
import json,re,logging
from pathlib import Path
from html.parser import HTMLParser
from pypdf import PdfReader

logging.getLogger('pypdf').setLevel(logging.ERROR)
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).resolve().parents[1]/'data'

class Metas(HTMLParser):
    def __init__(self):super().__init__();self.items=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if tag=='meta' and d.get('name'):self.items.append(d)
    def values(self,name):return [i['content'] for i in self.items if i['name']==name and i.get('content')]

aalto={}
for y in (2024,2025):
    d=json.loads((ROOT/f'hakutiedot/aalto_art_candidates_{y}.json').read_text())
    for o in d['_embedded']['searchResult']['_embedded']['objects']:
        i=o['_embedded']['indexableObject'];aalto[i['uuid']]=i['metadata']

records=[]
for i,r in enumerate(json.loads((ROOT/'luettelo.json').read_text())):
    rec={'id':r['id'],'university':'Aalto' if r['university']=='Aalto-yliopisto' else 'Lappland','year':r['year'],'authors':r['author'],'original_title':r['title'],'source_url':r['source'],'open_pdf':r['status']=='downloaded','pdf_urls':[f['url'] for f in r['files'] if f['status']=='downloaded']}
    if rec['university']=='Aalto':
        md=aalto[r['id']]
        vs=lambda k:[v['value'] for v in md.get(k,[])]
        rec.update(language=(vs('dc.language.iso') or ['und'])[0],titles=md.get('dc.title',[]),abstracts=[{'lang':v.get('language') or 'und','text':v['value']} for v in md.get('dc.description.abstract',[])],keywords=list(dict.fromkeys(vs('dc.subject.keyword'))),rights=vs('dc.rights'),archive_open_access=vs('local.aalto.openaccess'))
    else:
        p=Metas();p.feed((ROOT/f'hakutiedot/lauda_item_{r["id"]}.html').read_text())
        rec.update(language=(p.values('DC.language') or ['und'])[0],titles=[{'value':t,'language':'und'} for t in p.values('DC.title')],abstracts=[{'lang':v.get('xml:lang','und'),'text':v['content'].replace('\r\n','\n')} for v in p.items if v['name']=='DCTERMS.abstract'],keywords=list(dict.fromkeys(p.values('DC.subject'))),rights=p.values('DC.rights'))
    # Prefer the abstract in the thesis language; preserve all originals separately.
    lang=rec['language'][:2]
    abstract=next((a for a in rec['abstracts'] if a['lang'][:2]==lang),None)
    if abstract is None:abstract=next((a for a in rec['abstracts'] if a['lang'][:2]=='fi'),None)
    if abstract is None:abstract=next(iter(rec['abstracts']),{'lang':'und','text':''})
    rec['original_abstract']=abstract['text'];rec['abstract_language']=abstract['lang']
    rec['swedish_original_abstract']=next((a['text'] for a in rec['abstracts'] if a['lang'][:2]=='sv'),None)
    rec['swedish_original_title']=next((t['value'] for t in rec['titles'] if (t.get('language') or '')[:2]=='sv'),None)
    if lang=='sv':rec['swedish_original_title']=rec['original_title']
    # Read first PDF of each thesis, favoring substantive text over attachments.
    fs=[]
    for f in r['files']:
        if f['status']!='downloaded':continue
        p=ROOT/f['path']
        if not p.exists():
            matches=list(ROOT.glob('*/'+str(r['year'])+'/'+Path(f['path']).name))
            if len(matches)!=1:raise ValueError(f'Cannot locate PDF {f["path"]}')
            p=matches[0]
        fs.append(p)
    evidence=[]
    if fs:
        p=max(fs,key=lambda p:p.stat().st_size) if len(fs)>1 else fs[0]
        rec['method_pdf_url']=next(f['url'] for f in r['files'] if f['status']=='downloaded' and Path(f['path']).name==p.name)
        reader=PdfReader(p);pages=[]
        for n,page in enumerate(reader.pages):
            try:text=page.extract_text() or ''
            except Exception:text=''
            pages.append(text)
        # Preserve searchable full text locally, but publish only bibliographic data and paraphrases.
        (OUT/'fulltext').mkdir(exist_ok=True)
        (OUT/'fulltext'/f'{rec["id"]}.txt').write_text('\n\n'.join(f'[PDF-sida {n+1}]\n{text}' for n,text in enumerate(pages)))
        rec['pdf_page_count']=len(pages)
        patterns=r'tutkimusmenetelm|tutkimusote|tutkimusstrateg|aineiston.*anal|sisällönanaly|temaattinen analy|metodolog|methodolog|research method|research design|thematic analysis|content analysis|data collect|research approach|autoetnog|autoethnog'
        for n,text in enumerate(pages):
            if n>=50:break
            # Skip bibliography and index-heavy pages, then take contextual windows.
            if text.count('......')>5:continue
            hit=re.search(patterns,text,re.I)
            if hit:
                excerpt=re.sub(r'\s+',' ',text[max(0,hit.start()-200):hit.start()+1700]).strip()
                evidence.append({'pdf_page':n+1,'text':excerpt})
                if len(evidence)>=4:break
    rec['method_source_excerpts']=evidence
    records.append(rec)
    print(i+1,rec['id'],len(rec['original_abstract']),len(evidence),flush=True)

(OUT/'source_records.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
public_records=json.loads(json.dumps(records))
for record in public_records:
    record['method_source_excerpts']=[{'pdf_page':e['pdf_page']} for e in record['method_source_excerpts']]
(OUT/'source_metadata.json').write_text(json.dumps(public_records,ensure_ascii=False,indent=2)+'\n')
for batch in range(3):
    subset=records[batch::3]
    (OUT/f'source_batch_{batch+1}.json').write_text(json.dumps(subset,ensure_ascii=False,indent=2))
print('Prepared',len(records),'source records')
