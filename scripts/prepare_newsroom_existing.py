"""Reuse the previously audited reading only for works present in the new folder."""
import collections,json,re,urllib.parse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
if (ROOT/'data/newsroom_annotations_existing.json').exists():
    raise SystemExit('Existing reviewed annotations are present. This one-time preparation must not overwrite them.')
PRIVATE=ROOT/'data/newsroom_private'
old={r['id']:r for r in json.loads((ROOT/'docs/data/theses.json').read_text())['records']}
packets=json.loads((PRIVATE/'batch_existing.json').read_text());groups=collections.defaultdict(list)
for packet in packets:groups[Path(packet['relative_path']).name.split('__')[0]].append(packet)
out=[];merges=[]
for key,files in groups.items():
    source=old[key]
    urlname=urllib.parse.unquote(urllib.parse.urlparse(source.get('method_pdf_url') or '').path.rsplit('/',1)[-1])
    main=next((p for p in files if Path(p['relative_path']).name.endswith('__'+urlname)),None) or max(files,key=lambda p:p['pdf_page_count'])
    methods=[]
    for m in source['methods']:
        page=m.get('pdf_page')
        methods.append({'label':m['label'],'kind':m['kind'],'pdf_page':page,'basis':m['basis'],'evidence_sv':m['evidence_sv']})
    # Only individual front matter can establish a numeric thesis credit amount.
    credits=None;credits_page=None
    for page in main['first_pages']:
        match=re.search(r'(?:opinnäyt(?:etyö|e|etyön)|examensarbete|avhandling|självständigt\s+arbete)[^\n]{0,100}?(\d{1,2})\s*(?:op\b|hp\b|ects\b|studiepoäng)',page['text'],re.I)
        if match:credits=int(match[1]);credits_page=page['pdf_page'];break
    names=list(dict.fromkeys(n.strip() for n in source['authors'].split(';') if n.strip()))
    summary=source['topic_sv'].rstrip('.')+'. '+('Huvuddesignen i den tidigare källäsningen är '+source['primary_method'].lower()+'. ' if source['primary_method']!='Inte fastställbar' else 'Huvuddesignen kunde inte fastställas i källunderlaget. ')
    summary+=source['method_note_sv']
    evidence_pages=sorted({m['pdf_page'] for m in methods if isinstance(m.get('pdf_page'),int)})
    out.append({'id':main['sha256'],'legacy_id':key,'original_title':source['original_title'],'title_sv':source['title_sv'],'authors':source['authors'],'author_count':len(names) if names else None,'year':source['year'],'year_basis':'archive_metadata','year_note_sv':'Publiceringsår enligt den tidigare kontrollerade arkivposten.','language':source['language'][:2],'degree_level':'master','degree_evidence_sv':'Maisteri/pro gradu enligt den tidigare kontrollerade universitetsarkivposten.','degree_pdf_page':None,'degree_basis':'archive_metadata','credits':credits,'credit_scope':'thesis' if credits is not None else 'unknown','credits_pdf_page':credits_page,'summary_sv':summary,'topic_sv':source['topic_sv'],'primary_method':source['primary_method'],'methods':methods,'method_note_sv':source['method_note_sv'],'themes':source['themes'],'research_settings':['Inte fastställbart'],'artistic_component':True if any(m['kind']=='design' and re.search('konstnärlig|konstbaserad',m['label'],re.I) for m in methods) else None,'participant_groups_sv':[],'source_pdf_pages':evidence_pages,'source_url':source['source_url'],'coding_confidence':'source_supported' if methods else 'limited','coding_basis':'Tidigare AI-assisterad källäsning av abstrakt och utvalda metodavsnitt; bara arbeten som finns i den nya leveransen återanvänds.'})
    if len(files)>1:merges.append({'legacy_id':key,'primary_sha256':main['sha256'],'additional_sha256':[p['sha256'] for p in files if p is not main],'reason_sv':'Separata PDF-delar till samma examensarbete enligt den tidigare arkivposten; räknas en gång.'})
(ROOT/'data/newsroom_annotations_existing.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
(PRIVATE/'existing_merges.json').write_text(json.dumps(merges,ensure_ascii=False,indent=2)+'\n')
print('Reused',len(out),'previously audited works;',len(merges),'multi-PDF works merged.')
