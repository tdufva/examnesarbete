"""Harvest verified 2026 Art Education metadata and open PDFs from Lauda.

The cached discovery responses retain the search scope for an audit. Aaltodoc
records can be added once its service is available, using the same public schema.
"""
import json,re,sys,logging,hashlib,urllib.parse
from pathlib import Path
from html.parser import HTMLParser
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
WORKSPACE=ROOT.parent
sys.path.insert(0,str(WORKSPACE))
import lataa_opinnaytteet as archive
logging.getLogger('pypdf').setLevel(logging.ERROR)
CACHE=ROOT/'data/harvest_2026'

class Meta(HTMLParser):
    def __init__(self):super().__init__();self.items=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if tag=='meta' and d.get('name'):self.items.append(d)
    def values(self,name):return [i['content'] for i in self.items if i['name']==name and i.get('content')]

def prepare_abstract(rec):
    lang=rec['language'][:2]
    abstract=next((a for a in rec['abstracts'] if a['lang'][:2]==lang),None)
    if abstract is None:abstract=next((a for a in rec['abstracts'] if a['lang'][:2]=='fi'),None)
    if abstract is None:abstract=next(iter(rec['abstracts']),{'lang':'und','text':''})
    rec.update(original_abstract=abstract['text'],abstract_language=abstract['lang'],swedish_original_abstract=next((a['text'] for a in rec['abstracts'] if a['lang'][:2]=='sv'),None),swedish_original_title=next((t['value'] for t in rec['titles'] if (t.get('language') or '')[:2]=='sv'),None))
    if lang=='sv':rec['swedish_original_title']=rec['original_title']

def evidence(rec,files):
    rec['method_source_excerpts']=[]
    if not files:return
    path,url=max(files,key=lambda x:x[0].stat().st_size)
    rec['method_pdf_url']=url
    reader=PdfReader(path);texts=[]
    rec['pdf_page_count']=len(reader.pages)
    patterns=r'tutkimusmenetelm|tutkimusote|tutkimusstrateg|aineiston.*anal|sisällönanaly|temaattinen analy|metodolog|methodolog|research method|research design|thematic analysis|content analysis|data collect|research approach|autoetnog|autoethnog'
    for n,p in enumerate(reader.pages):
        try:text=p.extract_text() or ''
        except Exception:text=''
        texts.append(f'[PDF-sida {n+1}]\n{text}')
        if n<50 and text.count('......')<=5 and len(rec['method_source_excerpts'])<4:
            hit=re.search(patterns,text,re.I)
            if hit:rec['method_source_excerpts'].append({'pdf_page':n+1,'text':re.sub(r'\s+',' ',text[max(0,hit.start()-200):hit.start()+1700]).strip()})
    (ROOT/'data/fulltext').mkdir(exist_ok=True)
    (ROOT/'data/fulltext'/f'{rec["id"]}.txt').write_text('\n\n'.join(texts))

def main():
    ids=set()
    for name in ('lauda_59344.html','lauda_64254.html'):
        h=(CACHE/name).read_text()
        for block in re.split(r'<div class="row ds-artifact-item[^>]*>',h)[1:]:
            match=re.search(r'href="/handle/10024/(\d+)"',block)
            if match:ids.add(match[1])
    records=[];excluded=[];downloads=[]
    for identifier in sorted(ids):
        path=CACHE/f'{identifier}.html';h=path.read_text();p=Meta();p.feed(h)
        subjects=p.values('DC.subject')
        programme=subjects[-1] if subjects else ''
        # The final subject is the archive's degree-programme field in these records.
        include='kuvataidekasvatu' in programme.casefold() or identifier=='67368'
        if not include:
            excluded.append({'id':identifier,'title':p.values('DC.title'),'programme':programme});continue
        dates=p.values('DCTERMS.issued');assert dates and dates[0][:4]=='2026',dates
        rec={'id':identifier,'university':'Lappland','year':2026,'authors':'; '.join(dict.fromkeys(p.values('DC.creator'))),'original_title':p.values('DC.title')[0],'source_url':'https://lauda.ulapland.fi/handle/10024/'+identifier,'open_pdf':False,'pdf_urls':[],'language':(p.values('DC.language') or ['und'])[0],'titles':[{'value':t,'language':'und'} for t in p.values('DC.title')],'abstracts':[{'lang':i.get('xml:lang','und'),'text':i['content'].replace('\r\n','\n').replace('\\r\\n','\n')} for i in p.items if i['name']=='DCTERMS.abstract'],'keywords':list(dict.fromkeys(subjects)),'rights':p.values('DC.rights'),'availability_checked':'2026-10-21','programme':programme}
        prepare_abstract(rec)
        files=[]
        for raw in dict.fromkeys(re.findall(r'href="([^"]*bitstream[^"<>]+)"',h)):
            from html import unescape
            raw=unescape(raw)
            if not re.search(r'\.pdf(?:\?|$)',raw,re.I) or 'isAllowed=n' in raw:continue
            url=urllib.parse.urljoin(rec['source_url'],raw)
            url=urllib.parse.quote(url,safe='/:?&=%;')
            name=urllib.parse.unquote(urllib.parse.urlparse(url).path.split('/')[-1])
            dest=WORKSPACE/'Lappi bildkonst'/'2026'/(identifier+'__'+archive.clean(name.removesuffix('.pdf'))+'.pdf')
            dest.parent.mkdir(exist_ok=True,parents=True)
            if not dest.exists():
                data=archive.get(url)
                if not data[:1024].lstrip().startswith(b'%PDF-'):raise ValueError(f'Not a PDF: {identifier}')
                dest.write_bytes(data)
            files.append((dest,url));rec['pdf_urls'].append(url)
            downloads.append({'id':identifier,'university':'Lappland','year':2026,'path':str(dest.relative_to(WORKSPACE)),'url':url,'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
        rec['open_pdf']=bool(files)
        evidence(rec,files);records.append(rec)
        if identifier=='67368':
            text=(ROOT/'data/fulltext'/f'{identifier}.txt').read_text()[:25000]
            assert re.search(r'Koulutusohjelma.{0,50}Kuvataidekasvatus',text,re.I|re.S), 'Verify missing programme in PDF'
            rec['programme']='Kuvataidekasvatus (verified from PDF)'
        print(identifier,rec['original_title'],rec['open_pdf'],flush=True)
    (ROOT/'data/source_2026_full.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
    (CACHE/'excluded_lauda.json').write_text(json.dumps(excluded,ensure_ascii=False,indent=2))
    (CACHE/'downloads.json').write_text(json.dumps(downloads,ensure_ascii=False,indent=2))
    for n in (1,2):
        (ROOT/f'data/source_batch_2026_{n}.json').write_text(json.dumps(records[n-1::2],ensure_ascii=False,indent=2))
    print('VERIFIED',len(records),'RECORDS',len(downloads),'PDFs',flush=True)

if __name__=='__main__':main()
