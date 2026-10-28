"""Uniform, conservative text signals for every historical year, with provenance.

Rebuilds without network access from harvested metadata and a versioned audit.
Does not mix curated recent main-design annotations with dictionary signals.
"""
import collections,json,re,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
RULE_VERSION='history-text-1 / 2026-10-28'
def read(name):return json.loads((ROOT/'data'/name).read_text())
def write(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def norm(s):return re.sub(r'\W+','',unicodedata.normalize('NFKC',s).casefold())
def author_key(s):return norm(s.replace(',',' '))

def rules():
    audit=read('history_coding_audit.json');methods=[];themes=[]
    for i,c in enumerate(audit['method_candidates']):
        if c['label_sv']=='Diskursanalys':continue # single analysis signal below
        pattern=c['pattern'].replace('\\\\','\\')
        if c['label_sv']=='Annan kvalitativ studie':pattern=pattern.split('|fenomenograf')[0]
        methods.append({'id':'design-'+str(i+1),'label':c['label_sv'],'kind':'Forskningsdesign','pattern':pattern})
    methods.append({'id':'phenomenography','label':'Fenomenografi','kind':'Forskningsansats','pattern':r'fenomenograf\w*|phenomenograph\w*'})
    for i,c in enumerate(audit['collection_analysis_candidates']):
        methods.append({'id':'technique-'+str(i+1),'label':c['label_sv'],'kind':'Datainsamling' if i<5 or i==9 else 'Analys','pattern':c['pattern'].replace('\\\\','\\')})
    for i,c in enumerate(audit['theme_candidates']):
        pattern=c['pattern'].replace('\\\\','\\')
        # Do not confuse research material, power's Finnish "majority", etc. with themes.
        pattern=pattern.replace(r'materiaali\w*',r'materiaalisuu\w*|materiaaline\w*')
        pattern=pattern.replace(r'valta\w*',r'\bvalta(?:a|an|suh\w*|rak\w*|hier\w*)?\b')
        pattern=pattern.replace('|care|',r'|\bcare\b|')
        pattern=pattern.replace(r'verkko\w*',r'verkkosiv\w*|verkko[- ](?:op\w*|opp\w*)|verkkoympär\w*|verkkopel\w*|\bverkossa\b|virtuaali\w*|\binternet\b|\bfacebook\b|\byoutube\b')
        pattern=pattern.replace(r'pel(?:i|ei)\w*',r'tietokonepel\w*|videopele\w*|digitaali\w*\s+pel\w*')
        themes.append({'id':'theme-'+str(i+1),'label':c['label_sv'],'pattern':pattern})
    return {'methods':methods,'themes':themes}

SELF=re.compile(r'tutki(?:mu|mma|nu|n\b)|tutkielm|opinnäy|aineisto|menetelm|lähestymist|käyt(?:in|än|imme|et)|kerä(?:sin|tty|ttiin)|toteut|analysoi|hyödyn|sovell|this (?:study|research|thesis)|my (?:study|research|thesis)|\bI\s+(?:used?|collect|interview|analy|appl)|\bdata\b|method|approach|material|studien|avhandling|undersökning|\bjag\b|intervjuade|använde',re.I)
NEG=re.compile(r'\b(?:ei|en|emme)\s+(?:ole\s+)?(?:käyt\w*|sovell\w*)|\b(?:not|never)\s+(?:us\w*|employ\w*|appl\w*)|\bwithout\s+using|\binte\s+(?:använd\w*|tillämp\w*)',re.I)
FUTURE=re.compile(r'jatkotutkim|future research|further research|framtida forskning',re.I)
BACKGROUND=re.compile(r'aiem(?:pi|massa)|aikaisem(?:pi|massa)|previous research|prior research|tidigare forskning',re.I)

def method_signals(record,categories):
    text=record.get('original_abstract') or '';out=[]
    sentences=re.split(r'(?<=[.!?])\s+|\n\s*\n',text)
    for c in categories:
        pattern=re.compile(c['pattern'],re.I);found=None
        for sentence in sentences:
            for m in pattern.finditer(sentence):
                local=sentence[max(0,m.start()-200):m.end()+200]
                before=sentence[max(0,m.start()-100):m.start()]
                if not SELF.search(local):continue
                if NEG.search(before) or FUTURE.search(local):continue
                if BACKGROUND.search(before):continue
                if c['label']=='Fenomenologisk/hermeneutisk studie' and not re.search(r'tutkimusot|lähestymis|menetelm|approach|method|ansats|metod',local,re.I):continue
                if c['label']=='Aktionsforskning' and re.search(r'taideperustai\w*\s+toimintatutkim|taiteelli\w*\s+toimintatutkim|arts?[- ]based\s+action|konstbaserad\w*\s+aktionsforskning',local,re.I):continue
                excerpt=sentence[max(0,m.start()-180):min(len(sentence),m.end()+250)].strip()
                found={'id':c['id'],'label':c['label'],'kind':c['kind'],'field':'abstract','evidence':excerpt};break
            if found:break
        if found:out.append(found)
    return out

def theme_signals(record,categories):
    # Programme labels and institution metadata are deliberately excluded.
    general={'kuvataidekasvatus','arteducation','bildkonstpedagogik','kuvataidekasvatuksenkoulutusohjelma','lapinyliopisto','aaltouniversitetet','aaltoyliopisto'}
    fields=[('title',record['original_title'])]+[('keywords',k) for k in record.get('keywords') or [] if norm(k) not in general]+[('abstract',record.get('original_abstract') or '')]
    out=[]
    for c in categories:
        for field,text in fields:
            m=re.search(c['pattern'],text,re.I)
            if m:
                out.append({'id':c['id'],'label':c['label'],'field':field,'evidence':text[max(0,m.start()-120):m.end()+180].strip()});break
    return out

def main():
    raw=read('history_aalto.json')+read('history_lapland.json')+read('history_additional.json');audit=read('history_scope_audit.json')
    excluded={x['id']:x for x in audit['excluded']};uncertain={x['id']:x for x in audit['uncertain']};dupes={x['id']:x['preferred_id'] for x in audit['duplicates']}
    existing=read('../docs/data/theses.json')['records'];translations={r['source_url']:r['title_sv'] for r in existing}
    title_annotations={}
    for p in sorted((ROOT/'data').glob('history_titles_*.json')):
        for r in json.loads(p.read_text()):title_annotations[r['id']]=r['title_sv']
    categories=rules();records=[];aliases=[]
    for source in raw:
        if source['university']=='Lappland' and source['id'] in excluded:continue
        if source['university']=='Lappland' and source['id'] in dupes:
            aliases.append({'id':source['id'],'preferred_id':dupes[source['id']],'source_url':source['source_url']});continue
        r=dict(source);r['source_kind']='archive';r['programme_confidence']='uncertain' if r['university']=='Lappland' and r['id'] in uncertain else 'source_confirmed'
        for correction in audit.get('corrections',[]):
            if correction['id']==r['id']:
                r['source_metadata_'+correction['field']]=r.get(correction['field'])
                r[correction['field']]=correction['value'];r.setdefault('metadata_corrections',[]).append(correction)
        if r['programme_confidence']=='uncertain':
            r['source_programme_status']=r.get('programme_status');r['programme_status']='legacy_programme_unverified'
            r['programme_caution_sv']=uncertain[r['id']]['reason_sv']
        lang=(r.get('language') or 'und')[:2]
        if r['university']=='Aalto':
            title=next((t['value'] for t in r.get('titles',[]) if (t.get('language') or '')[:2]==lang),None)
            if title:r['original_title']=title
        r['title_sv']=translations.get(r['source_url']) or title_annotations.get(r['id']) or (r['original_title'] if lang=='sv' else None)
        r['method_signals']=method_signals(r,categories['methods']);r['theme_signals']=theme_signals(r,categories['themes'])
        records.append(r)
    # Published historical research lists selected earlier works without abstracts.
    # Keep these separately selectable; never treat their selection as total output.
    secondary=read('history_aalto_earlier_catalogue.json');secondary_added=[];secondary_matches=[]
    for s in secondary:
        manual_match=next((r for m in audit.get('secondary_duplicate_matches',[]) if m['citation_id']==s['id'] for r in records if r['id']==m['archive_id']),None)
        if manual_match:
            manual_match.setdefault('historical_citations',[]).append({'source_url':s['source_url'],'pdf_page':s['source_pdf_page'],'cited_year':s['year']})
            secondary_matches.append({'citation':s['id'],'archive_id':manual_match['id']});continue
        matches=[r for r in records if r['university']=='Aalto' and author_key(r['authors'])==author_key(s['authors']) and abs(r['year']-s['year'])<=1]
        if matches:
            # Author+adjacent year alone is only used when the titles substantially agree.
            titlekey=norm(s['original_title']);match=next((r for r in matches if norm(r['original_title'])[:45] in titlekey or titlekey[:45] in norm(r['original_title'])),None)
            if match:
                match.setdefault('historical_citations',[]).append({'source_url':s['source_url'],'pdf_page':s['source_pdf_page'],'cited_year':s['year']});secondary_matches.append({'citation':s['id'],'archive_id':match['id']});continue
        r=dict(s);r.update(programme_confidence='source_confirmed',programme='Kuvataidekasvatus / Art Education · dokumenterat forskningsurval',language='fi',abstract_language='und',title_sv=title_annotations.get(s['id']),method_signals=[],theme_signals=[])
        # No text coding of a title-only, deliberately art-research-selected corpus.
        records.append(r);secondary_added.append(r['id'])
    records.sort(key=lambda r:(r['year'],r['university'],r['authors']))
    confirmed=[r for r in records if r['source_kind']=='archive' and r['programme_confidence']=='source_confirmed']
    metadata={'collected':'2026-10-28','collected_sv':'28 oktober 2026','rule_version':RULE_VERSION,'years':list(range(min(r['year'] for r in records),max(r['year'] for r in records)+1)),
      'coding_sv':'Överlappande, automatiska textsignaler från originalspråk. Metoder kräver ett lokalt sammanhang om studien, materialet eller tillvägagångssättet i abstraktet. Negativa, framtida och vissa bakgrundsomnämnanden utesluts. Reglerna är inte oberoende validerade. Teman matchas i titel, författarnyckelord och abstrakt; institutions- och utbildningsfält används inte.',
      'notes_sv':[
       f"Den bekräftade direkta arkivsamlingen innehåller {len(confirmed)} unika arbeten. Sökningarna har följt alla resultatsidor i de angivna sökningarna, utan årtalsspärr. Det garanterar inte att saknade eller felindexerade poster har hittats.",
       f"{len(uncertain)} äldre Lapplandsposter har osäker utbildningstillhörighet och utesluts som standard. PDF-kontroll har visat felaktig Kuvataidekasvatus-märkning i äldre arkivmetadata; {len(excluded)} poster med belägg för en annan utbildning har uteslutits. En dubblett har slagits samman.",
       f"{len(secondary_added)} ytterligare arbeten återfinns i en publicerad källförteckning över konstbaserad forskning 2010–2015. De kan väljas till, men är ett ämnesvalt urval utan inhämtade abstrakt, inte hela årgångar. De får ingen automatisk metod- eller temakodning.",
       'Den äldre källförteckningens urval och de direkta arkivposterna hålls isär. Nyare poster i den nära analysen kontrollerades 21 oktober; denna historiska sökning kontrollerades 28 oktober 2026. Aaltodoc fungerar vid den senare kontrollen.'],
      'context_sources':[
       {'url':'https://aaltodoc.aalto.fi/handle/123456789/22094','text_sv':'Outi Koivistos avhandling från 2016 dokumenterar 219 kuvataidekasvatus-maisterarbeten 2010–2015 och listar 81 konstnärligt inriktade arbeten. De 81 är ett valt forskningsmaterial, inte en komplett förteckning över alla arbeten.'},
       {'url':'https://aaltodoc.aalto.fi/handle/123456789/14524','text_sv':'Heidi Väisänens avhandling från 2015 granskar arbeten från 2000–2010. Den visar att en äldre historia finns, men dess institutionsurval omfattar också närliggande utbildningar och kan inte räknas rakt av som en ren Kuvataidekasvatus-årgång.'}],
      'sources':['https://aaltodoc.aalto.fi/server/api/discover/search/objects','https://lauda.ulapland.fi/handle/10024/59344','https://lauda.ulapland.fi/handle/10024/64254']}
    by_year=[]
    for u in ('Aalto','Lappland'):
        for y in sorted({r['year'] for r in records}):
            rs=[r for r in confirmed if r['university']==u and r['year']==y];by_year.append({'university':u,'year':y,'records':len(rs),'with_abstract':sum(bool(r['original_abstract']) for r in rs)})
    report={'checked':metadata['collected'],'direct_confirmed':len(confirmed),'archive_uncertain':sum(r['programme_confidence']=='uncertain' for r in records),'secondary_added':secondary_added,'secondary_matches':secondary_matches,'aliases':aliases,'excluded_scope':audit['excluded'],'by_year':by_year}
    write(ROOT/'docs/data/history.json',{'metadata':metadata,'categories':categories,'records':records})
    write(ROOT/'data/history_build_report.json',report)
    print('Historical build:',len(records),'records;',len(confirmed),'confirmed direct;',len(secondary_added),'secondary;',report['archive_uncertain'],'uncertain')

if __name__=='__main__':main()
