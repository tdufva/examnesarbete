"""Import manually verified public Aalto Primo records during Aaltodoc downtime.

This does not infer PDF access or invent degree-major fields. It preserves the
alternative source and marks any programme inference explicitly for readers.
"""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def convert(r):
    assert r['date_issued'][:4]=='2026'
    identifier=('aalto-'+r['source_url'].rstrip('/').split('/')[-1]) if r['source_url'].startswith('https://aaltodoc.aalto.fi/') else 'primo-'+r['primo_id']
    language=r.get('language') or 'und'
    lang=r.get('abstract_language') or language
    explicit=bool(r.get('programme'))
    return {'id':identifier,'university':'Aalto','year':2026,'authors':r['authors'],'original_title':r['original_title'],'source_url':r['source_url'],'metadata_source_url':r.get('source_record_url') or r.get('primo_url') or r.get('public_source_url'),'metadata_source':'Aalto Primo, public metadata','open_pdf':False,'pdf_urls':[],'pdf_status':'temporarily_unverified','language':language,'titles':[{'value':r['original_title'],'language':language}]+[{'value':t,'language':'und'} for t in r.get('alternate_titles',[])],'abstracts':[{'lang':lang,'text':r['original_abstract']}],'keywords':r['keywords'],'keywords_status':r.get('keywords_status','retrieved'),'rights':[],'original_abstract':r['original_abstract'],'abstract_language':lang,'swedish_original_abstract':None,'swedish_original_title':r['original_title'] if language.startswith('sv') else None,'method_source_excerpts':[],'programme':r.get('programme'),'programme_status':'confirmed_from_abstract' if explicit else 'inferred_from_metadata','programme_verification':r['programme_verification'],'programme_verification_sv':('Bildkonstpedagogik anges uttryckligen i abstraktet. Arkivets separata huvudämnesfält kunde inte kontrolleras under serviceavbrottet.' if explicit else 'Identifierat via Primos ämnes-/innehållsuppgifter och handledare. Det uttryckliga huvudämnesfältet i Aaltodoc kunde inte kontrolleras under serviceavbrottet; utbildningstillhörigheten är preliminär.'),'date_issued':r['date_issued'],'availability_checked':'2026-10-21'}

def main():
    raw=[]
    for filename in ('aalto_primo_records.json','aalto_primo_additional_records.json','aalto_primo_aronen.json'):
        values=json.loads((ROOT/'data/harvest_2026'/filename).read_text())
        raw+=values if isinstance(values,list) else [values]
    records=list({r['source_url']:convert(r) for r in raw}.values())
    p=ROOT/'data/source_metadata.json';old=[r for r in json.loads(p.read_text()) if not(r['university']=='Aalto' and r['year']==2026)]
    p.write_text(json.dumps(old+records,ensure_ascii=False,indent=2)+'\n')
    first={r['id'] for r in json.loads((ROOT/'data/source_batch_2026_aalto_1.json').read_text())}
    second=ROOT/'data/source_batch_2026_aalto_2.json'
    if not second.exists():second.write_text(json.dumps([r for r in records if r['id'] not in first],ensure_ascii=False,indent=2)+'\n')
    p=ROOT/'data/coverage.json';c=json.loads(p.read_text())
    for cohort in c['cohorts']:
        if cohort['university']=='Aalto' and cohort['year']==2026:
            cohort.update(status='partial_metadata',records=len(records),open_pdfs=0,source='Aalto Primo',note_sv='Poster har identifierats via Aalto Primo. För flera poster saknas verifierat huvudämnesfält; urvalet är preliminärt och arkivets fullständighet kan inte kontrolleras under Aaltodocs serviceavbrott.')
    c['notices']=[{'university':'Aalto','years':[2026],'text_sv':'Aaltodoc var otillgängligt vid kontrollen 21 oktober 2026. De nya Aalto-posternas PDF-åtkomst är därför inte verifierad och räknas inte som öppen tillgång. Det betyder inte att PDF-filerna är stängda. För en striktare jämförelse, välj ”Gemensamt verifierade år” (2024–2025).'}]
    p.write_text(json.dumps(c,ensure_ascii=False,indent=2)+'\n')
    print('Imported',len(records),'Aalto records;',len(records)-len(first),'new translation records')

if __name__=='__main__':main()
