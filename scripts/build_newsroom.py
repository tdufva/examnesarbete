"""Publish only bibliographic analysis and paraphrases, never source PDFs/full text."""
import argparse,collections,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PRIVATE=ROOT/'data/newsroom_private'
def read(path):return json.loads(path.read_text())
def dump(path,data):path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--allow-partial',action='store_true');parser.add_argument('--refresh-manifest',action='store_true',help='Refresh the text-free manifest from the private local extraction');args=parser.parse_args()
 programmes=read(ROOT/'data/newsroom_programmes.json');tracks={t['id']:t for t in programmes['tracks']}
 manifest_path=ROOT/'data/newsroom_manifest.json'
 if args.refresh_manifest or not manifest_path.exists():
  inventory=read(PRIVATE/'inventory.json');by_sha=collections.defaultdict(list)
  for item in inventory:by_sha[item['sha256']].append(item)
  merges=read(PRIVATE/'existing_merges.json');additional={sha for m in merges for sha in m['additional_sha256']}
  manifest={'file_count':len(inventory),'unique_pdf_count':len(by_sha),'multi_pdf_work_count':len(merges),'coverage_files':[{'track_id':t['id'],'year':y,'files':sum(f['track_id']==t['id'] and f['year_folder']==y for f in inventory)} for t in programmes['tracks'] for y in programmes['period']],'works':[{'id':sha,'pdf_page_count':read(PRIVATE/(sha+'.json'))['pdf_page_count'],'track_ids':list(dict.fromkeys(f['track_id'] for f in by_sha[sha])),'folder_years':sorted({f['year_folder'] for f in by_sha[sha]})} for sha in sorted(set(by_sha)-additional)]}
  dump(manifest_path,manifest)
 manifest=read(manifest_path);source_manifest={r['id']:r for r in manifest['works']}
 expected=set(source_manifest);annotations=[]
 for path in sorted((ROOT/'data').glob('newsroom_annotations_*.json')):annotations+=read(path)
 assert len(annotations)==len({r['id'] for r in annotations}),'Repeated annotation ID'
 coded={r['id']:r for r in annotations};assert not set(coded)-expected,('Unexpected IDs',set(coded)-expected)
 missing=sorted(expected-set(coded))
 if missing and not args.allow_partial:raise ValueError(f'{len(missing)} works still need analysis')
 records=[];excluded=[];corrections=[];other_programmes=[]
 fields=['original_title','title_sv','authors','author_count','year','year_basis','year_note_sv','language','degree_level','degree_evidence_sv','degree_pdf_page','credits','credit_scope','credits_pdf_page','summary_sv','topic_sv','primary_method','methods','method_note_sv','themes','research_settings','artistic_component','participant_groups_sv','source_pdf_pages','source_url','coding_confidence','coding_basis']
 for sha in sorted(expected&set(coded)):
  source=coded[sha];item=source_manifest[sha];r={k:source.get(k) for k in fields};r['id']=sha
  r['pdf_page_count']=item['pdf_page_count']
  track_ids=item['track_ids']
  if source.get('track_override'):
   target=source['track_override'];assert target in tracks,target
   corrections.append({'id':sha,'title':r['original_title'],'from_track_ids':track_ids,'to_track_id':target,'note_sv':source.get('track_note_sv','Utbildningsämnet verifieras mot källans försättsblad.')})
   track_ids=[target]
  r['track_ids']=track_ids;r['country']=tracks[track_ids[0]]['country']
  r['year_folder_values']=item['folder_years']
  r['year_conflict']=len(r['year_folder_values'])>1 or (r['year'] is not None and any(y!=r['year'] for y in r['year_folder_values']))
  if r['year'] not in programmes['period']:
   excluded.append({'id':sha,'title':r['original_title'],'year':r['year'],'folder_years':r['year_folder_values'],'reason_sv':'Källans daterade arbete ligger utanför 2024–2026.'});continue
  if source.get('scope_status')=='outside_requested_programmes':
   other_programmes.append({'id':sha,'title':r['original_title'],'year':r['year'],'programme_sv':source.get('formal_programme_sv'),'reason_sv':source.get('scope_note_sv'),'summary_sv':r['summary_sv'],'methods':r['methods'],'source_pdf_pages':r['source_pdf_pages']});continue
  for field in ['methods','themes','research_settings','participant_groups_sv','source_pdf_pages']:r[field]=r[field] or []
  r['primary_method']=r['primary_method'] or 'Inte fastställbar';r['degree_level']=r['degree_level'] or 'unknown';r['credit_scope']=r['credit_scope'] or 'unknown'
  if not isinstance(r['credits'],(int,float)):r['credits']=None
  r['analysis_summary_label']='Analysreferat · AI-assisterat, inte författarens abstrakt'
  r['source_url']=r['source_url'] if isinstance(r['source_url'],str) and r['source_url'].startswith('https://') else None
  r['coding_confidence']=r['coding_confidence'] or 'limited';r['coding_basis']=r['coding_basis'] or 'AI-assisterad läsning av försättsblad, abstrakt och utvalda metodavsnitt.'
  records.append(r)
 records.sort(key=lambda r:(-r['year'],r['track_ids'][0],r['authors'] or '',r['original_title']))
 coverage=[]
 for t in programmes['tracks']:
  for year in programmes['period']:
   file_count=next(c['files'] for c in manifest['coverage_files'] if c['track_id']==t['id'] and c['year']==year)
   works=[r for r in records if t['id'] in r['track_ids'] and r['year']==year]
   coverage.append({'track_id':t['id'],'year':year,'files':file_count,'works':len(works),'delivered':bool(file_count),'known_degree':sum(r['degree_level']!='unknown' for r in works),'known_credits':sum(r['credits'] is not None and r['credit_scope']=='thesis' for r in works),'limited_coding':sum(r['coding_confidence']=='limited' for r in works)})
 context=read(ROOT/'data/newsroom_context.json')
 metadata={'checked':'2026-11-09','checked_sv':'9 november 2026','years':programmes['period'],'file_count':manifest['file_count'],'unique_pdf_count':manifest['unique_pdf_count'],'unique_work_candidates':len(expected),'analysed_work_count':len(coded),'in_scope_count':len(records),'excluded_outside_period':len(excluded),'complete':not missing,'missing_coding':len(missing),'selection_notes_sv':programmes['selection_notes_sv'],'unit_sv':'Ett unikt examensarbete. Separata PDF-delar och byte-identiska kopior räknas tillsammans. Ett pararbete räknas en gång; två separata ämnesarbeten från samma student räknas som två arbeten.','methods_sv':'En huvudsaklig forskningsdesign per arbete och överlappande datainsamlings-/analysmetoder. Filosofiska perspektiv redovisas separat. Teman är analytikerns överlappande kodning; en andel beskriver detta urval, inte kvalitet.','source_sv':'Levererade PDF-mappar, kompletterade med tidigare granskade bibliografiska uppgifter för samma Aalto- och Lapplandstexter. Inga historiska år utanför 2024–2026 tillförs.','privacy_sv':'Original-PDF:er, fulltexter, råa utdrag och lokala filvägar ingår inte i den publicerade analysen. Källbelägg återges som parafraser med sidnummer.'}
 metadata['excluded_other_programmes']=len(other_programmes)
 report={'metadata':metadata,'coverage':coverage,'outside_period':excluded,'other_programmes':other_programmes,'track_corrections':corrections,'duplicate_file_count':manifest['file_count']-manifest['unique_pdf_count'],'multi_pdf_work_count':manifest['multi_pdf_work_count'],'year_conflict_count':sum(r['year_conflict'] for r in records),'by_university':{u:sum(any(tracks[i]['university']==u for i in r['track_ids']) for r in records) for u in dict.fromkeys(t['university'] for t in programmes['tracks'])}}
 dump(ROOT/'docs/data/newsroom.json',{'metadata':metadata,'tracks':programmes['tracks'],'coverage':coverage,'context':context,'records':records,'audit':{k:report[k] for k in ['outside_period','other_programmes','track_corrections','duplicate_file_count','multi_pdf_work_count','year_conflict_count']}})
 dump(ROOT/'data/newsroom_build_report.json',report)
 print('Newsroom:',len(records),'in-scope works;',len(coded),'coded;',len(missing),'pending;',len(excluded),'outside period')
if __name__=='__main__':main()
