// Aggregate the actual selected records. No fixed university/year denominators.
export const STOP_WORDS=new Set(['bildkonstpedagogik','konstpedagogik','konstpedagogikens utbildningsprogram','bildkonstpedagogikens utbildningsprogram','masteruppsats','pro gradu-avhandling','pro gradu','master of arts','art education','bildkonstpedagogiska utbildningsprogrammet']);
export const normalize=t=>t.toLowerCase().replace(/\s+/g,' ').replace(/^[ .,;]+|[ .,;]+$/g,'');
const count=items=>{const c={};for(const t of items)c[t]=(c[t]||0)+1;return c;};
const rank=c=>Object.entries(c).map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count||(a.label<b.label?-1:a.label>b.label?1:0));
function technique(label){
 const s=normalize(label);
 for(const [pattern,name] of [[/intervju/,'Intervjuer'],[/innehållsanalys/,'Innehållsanalys'],[/tematisk|tematisering/,'Tematisk analys'],[/observation/,'Observation'],[/workshop/,'Workshoppar'],[/enkät/,'Enkäter'],[/dagbok|dagböcker/,'Dagböcker'],[/foto|video|audiovisuell/,'Foto- och videodokumentation'],[/narrativ|berättelseanalys/,'Narrativ analys'],[/diskurs/,'Diskursanalys'],[/hermeneut|fenomenolog/,'Fenomenologisk/hermeneutisk analys'],[/konstnärlig|konstbaserad/,'Konstbaserat arbete som material']])if(pattern.test(s))return name;
 return label[0].toUpperCase()+label.slice(1);
}
export function aggregate(records){
 const themes=count(records.flatMap(r=>[...new Set(r.themes)]));
 const keywords=count(records.flatMap(r=>[...new Set(r.keywords_sv.map(normalize))]));
 const techniques=count(records.flatMap(r=>[...new Set(r.methods.filter(m=>['insamling','analys'].includes(m.kind)).map(m=>technique(m.label)))]));
 const universities={};
 for(const university of ['Aalto','Lappland']){
  const rs=records.filter(r=>r.university===university),tc=count(rs.flatMap(r=>[...new Set(r.themes)]));
  universities[university]={total:rs.length,open:rs.filter(r=>r.open_pdf).length,themes:rank(tc),theme_counts:tc,primary_methods:rank(count(rs.map(r=>r.primary_method)))};
 }
 const by_year=[];
 for(const university of ['Aalto','Lappland'])for(const year of [...new Set(records.map(r=>r.year))].sort()){
  const rs=records.filter(r=>r.university===university&&r.year===year);by_year.push({university,year,total:rs.length,open:rs.filter(r=>r.open_pdf).length});
 }
 return {total:records.length,open:records.filter(r=>r.open_pdf).length,primary_methods:rank(count(records.map(r=>r.primary_method))),themes:rank(themes),keywords:rank(Object.fromEntries(Object.entries(keywords).filter(([k])=>!STOP_WORDS.has(k)&&k.length>2))),techniques:rank(techniques),universities,by_year,method_coverage:{with_pdf_evidence:records.filter(r=>r.methods.some(m=>m.basis==='pdf')).length,abstract_only:records.filter(r=>r.methods.length&&!r.methods.some(m=>m.basis==='pdf')).length,no_methods:records.filter(r=>!r.methods.length).length}};
}

export function selectRecords(records,{year='',university='both',availability='',verification='all',commonYears=[]}={}){
 return records.filter(r=>(!year||(year==='common'?commonYears.includes(r.year):r.year===Number(year)))&&(university==='both'||r.university===university)&&(!availability||r.open_pdf)&&(verification!=='confirmed'||r.programme_status!=='inferred_from_metadata'));
}
