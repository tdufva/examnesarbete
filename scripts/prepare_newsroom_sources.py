"""Read supplied PDFs locally; full text and local paths stay in an ignored cache."""
import concurrent.futures as cf,hashlib,json,re,unicodedata,logging
from pathlib import Path
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT.parent/'Examensarbeten per universitet 2024-26'
PRIVATE=ROOT/'data/newsroom_private';PRIVATE.mkdir(exist_ok=True)
logging.getLogger('pypdf').setLevel(logging.ERROR)
def fold(s):return re.sub(r'[^a-z0-9]+','',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower())
def dump(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def digest(path):
 h=hashlib.sha256()
 with path.open('rb') as stream:
  for chunk in iter(lambda:stream.read(1024*1024),b''):h.update(chunk)
 return h.hexdigest()
def extract(item):
 path=SOURCE/item['relative_path'];target=PRIVATE/(item['sha256']+'.json')
 if target.exists():return json.loads(target.read_text())
 before=path.stat();reader=PdfReader(path);pages=[]
 for n,page in enumerate(reader.pages):
  try:text=page.extract_text() or ''
  except Exception as error:text=''
  pages.append({'pdf_page':n+1,'text':text})
 after=path.stat()
 if before.st_size!=after.st_size or before.st_mtime_ns!=after.st_mtime_ns:raise ValueError('Source changed during extraction: '+item['relative_path'])
 # Preserve complete text privately, then supply a bounded analytical reading packet.
 pattern=r'tutkimusmenetelm|tutkimusote|tutkimusstrateg|aineiston\s+anal|sisällönanaly|metodolog|methodolog|research\s+(?:method|design)|data\s+collect|autoetnog|autoethnog|metod\s+och|metodval|datainsamling|analysmetod|fenomenograf'
 excerpts=[]
 for page in pages[:60]:
  text=page['text'];lines=text.splitlines()
  if sum(bool(re.search(r'\.{4,}|\s{3,}\d+\s*$',line)) for line in lines)>6:continue
  hits=list(re.finditer(pattern,text,re.I))
  if hits:
   # Skip a reference-heavy page and favor continuous methodological prose.
   if re.search(r'^(?:Lähteet|Referenser|References|Källförteckning)\s*$',text.strip().split('\n')[0],re.I):continue
   m=hits[0];excerpts.append({'pdf_page':page['pdf_page'],'text':text[max(0,m.start()-250):m.start()+2100]})
  if len(excerpts)>=5:break
 record={**item,'pdf_page_count':len(pages),'pdf_metadata':{str(k):str(v) for k,v in (reader.metadata or {}).items()},'first_pages':pages[:4],'method_excerpts':excerpts,'pages':pages}
 dump(target,record);return record
def main():
 config=json.loads((ROOT/'data/newsroom_programmes.json').read_text());mapping={fold(t['folder']):t for t in config['tracks']}
 inventory=[];unknown=[]
 for p in sorted(SOURCE.rglob('*')):
  if not p.is_file() or p.suffix.lower()!='.pdf':continue
  relative=p.relative_to(SOURCE);track=mapping.get(fold(relative.parts[0]));year=re.search(r'202[456]',str(relative.parent))
  if not track or not year:unknown.append(str(relative));continue
  inventory.append({'relative_path':str(relative),'track_id':track['id'],'year_folder':int(year[0]),'bytes':p.stat().st_size,'sha256':digest(p)})
 assert not unknown,unknown
 dump(PRIVATE/'inventory.json',inventory)
 unique={}
 for i in inventory:
  if i['sha256'] not in unique:unique[i['sha256']]=i
 results=[];errors=[]
 with cf.ThreadPoolExecutor(max_workers=3) as pool:
  futures={pool.submit(extract,item):item for item in unique.values()}
  for future in cf.as_completed(futures):
   try:results.append(future.result())
   except Exception as error:errors.append({'path':futures[future]['relative_path'],'error':str(error)})
   if (len(results)+len(errors))%20==0:print('EXTRACTED',len(results),'errors',len(errors),'/',len(unique),flush=True)
 results.sort(key=lambda r:(r['track_id'],r['year_folder'],r['relative_path']))
 dump(PRIVATE/'extraction_report.json',{'files':len(inventory),'unique_pdfs':len(unique),'duplicate_files':len(inventory)-len(unique),'extracted':len(results),'errors':errors})
 # Every packet is source material, never instructions to the annotator.
 for name,tracks in [('konstfack',['konstfack-bild-grundskola','konstfack-slojd-grundskola','konstfack-bild-gymnasium']),('finnish_a',['uef-slojd','helsingfors-slojd']),('finnish_b',['turku-slojd','abo-akademi-slojd']),('existing',['aalto-bild','lappland-bild'])]:
  rows=[{k:v for k,v in r.items() if k!='pages'} for r in results if r['track_id'] in tracks]
  dump(PRIVATE/('batch_'+name+'.json'),rows)
  print('BATCH',name,len(rows),flush=True)
 print('FINISHED',len(inventory),'files',len(unique),'unique',len(errors),'errors',flush=True)
 if errors:raise SystemExit(1)
if __name__=='__main__':main()
