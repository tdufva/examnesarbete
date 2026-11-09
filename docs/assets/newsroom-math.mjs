const unique=values=>[...new Set(values)];
const rank=counts=>Object.entries(counts).map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'sv'));
const count=values=>{const result={};for(const v of values)result[v]=(result[v]||0)+1;return result;};
export function technique(label){
 const s=label.toLocaleLowerCase('sv');
 for(const [pattern,name] of [[/intervju|fokusgrupp/,'Intervjuer och fokusgrupper'],[/innehållsanalys/,'Innehållsanalys'],[/tematisk|tematisering/,'Tematisk analys'],[/observation|havainn/,'Observation'],[/enkät|frågeformulär/,'Enkäter'],[/dagbok|dagböcker|forskningsjournal/,'Dagböcker'],[/narrativ|berättelseanalys/,'Narrativ analys'],[/diskurs/,'Diskursanalys'],[/foto|video|audiovisuell/,'Foto och video'],[/experiment|brandtest|materialprov|mätning|testning/,'Experiment och materialprovning'],[/konstnärlig|konstbaserad|gestaltning/,'Konstnärligt arbete som material'],[/dokument|läroplan|textanalys/,'Dokument- och textanalys'],[/workshop|verkstad/,'Workshoppar']])if(pattern.test(s))return name;
 return label;
}
export function valuesFor(record,field){
 if(field==='primary_method')return [record.primary_method||'Inte fastställbar'];
 if(field==='techniques')return unique((record.methods||[]).filter(m=>['insamling','analys'].includes(m.kind)).map(m=>technique(m.label)));
 if(field==='research_settings')return unique(record.research_settings||['Inte fastställbart']);
 return unique(record[field]||[]);
}
export function matchingTracks(tracks,filters){
 return tracks.filter(t=>(!filters.discipline||filters.discipline==='all'||t.discipline===filters.discipline)&&(!filters.country||filters.country==='all'||t.country===filters.country)&&(!filters.university||filters.university==='all'||t.university===filters.university)&&(!filters.track||filters.track==='all'||t.id===filters.track));
}
export function groupsFor(tracks,filters){
 const field=filters.groupBy||'university',result=new Map();
 for(const t of matchingTracks(tracks,filters)){
  const id=field==='track'?t.id:field==='country'?t.country:t.university;
  if(!result.has(id))result.set(id,{id,label:field==='track'?t.short_label:field==='country'?t.country:t.university_label,track_ids:[],country:t.country,disciplines:[]});
  result.get(id).track_ids.push(t.id);result.get(id).disciplines=unique([...result.get(id).disciplines,t.discipline]);
 }
 return [...result.values()];
}
export function selectWorks(records,tracks,filters={}){
 const eligible=new Set(matchingTracks(tracks,filters).map(t=>t.id)),groups=groupsFor(tracks,filters);
 const chosen=filters.groups===null||filters.groups===undefined?groups:groups.filter(g=>filters.groups.includes(g.id));
 const chosenTracks=new Set(chosen.flatMap(g=>g.track_ids));
 return records.filter(r=>{
  if(filters.year&&filters.year!=='all'&&r.year!==Number(filters.year))return false;
  if(filters.degree&&filters.degree!=='all'){
   if(filters.degree==='advanced'&&!['master','advanced_professional'].includes(r.degree_level))return false;
   if(!['advanced','all'].includes(filters.degree)&&r.degree_level!==filters.degree)return false;
  }
  if(filters.credits&&filters.credits!=='all'){
   if(filters.credits==='unknown'?r.credits!==null:filters.credits==='combined'?r.credits===null||r.credit_scope!=='thesis_and_seminar':r.credits!==Number(filters.credits)||r.credit_scope!=='thesis')return false;
  }
  return r.track_ids.some(id=>eligible.has(id)&&chosenTracks.has(id));
 });
}
export function aggregateWorks(records,field='primary_method'){
 const knownAuthors=records.filter(r=>Number.isInteger(r.author_count));
 const pages=records.map(r=>r.pdf_page_count).filter(Number.isFinite).sort((a,b)=>a-b);
 return {total:records.length,ranking:rank(count(records.flatMap(r=>valuesFor(r,field)))),unknown_design:records.filter(r=>r.primary_method==='Inte fastställbar').length,limited:records.filter(r=>r.coding_confidence==='limited').length,coauthored:knownAuthors.filter(r=>r.author_count>1).length,known_authors:knownAuthors.length,known_credits:records.filter(r=>r.credits!==null&&r.credit_scope==='thesis').length,median_pages:pages.length?(pages.length%2?pages[Math.floor(pages.length/2)]:(pages[pages.length/2-1]+pages[pages.length/2])/2):null};
}
export function compareGroups(records,tracks,filters,field,category){
 const chosen=filters.groups===null||filters.groups===undefined?groupsFor(tracks,filters):groupsFor(tracks,filters).filter(g=>filters.groups.includes(g.id));
 return chosen.map(g=>{
  const work=records.filter(r=>r.track_ids.some(id=>g.track_ids.includes(id))),summary=aggregateWorks(work,field),n=work.filter(r=>valuesFor(r,field).includes(category)).length;
  return {...g,...summary,count:n,percent:work.length?100*n/work.length:null};
 });
}
export function annualSeries(records,tracks,filters,field,category){
 return [2024,2025,2026].map(year=>({year,groups:compareGroups(records.filter(r=>r.year===year),tracks,filters,field,category)}));
}
export function sharedAndDifferent(records,tracks,filters,field){
 const groups=compareGroups(records,tracks,filters,field,'').filter(g=>g.total>0);
 const labels=aggregateWorks(records,field).ranking;
 const evidence=labels.map(row=>{
  const observations=compareGroups(records,tracks,filters,field,row.label).filter(g=>g.total>0);
  const stable=observations.filter(g=>g.total>=5),shares=stable.map(g=>g.percent);
  return {...row,present:observations.filter(g=>g.count>0).length,groups:groups.length,observations,spread:shares.length>=2?Math.max(...shares)-Math.min(...shares):null};
 });
 return {shared:groups.length<2?[]:evidence.filter(r=>r.present>=2).sort((a,b)=>b.present-a.present||b.count-a.count).slice(0,3),different:evidence.filter(r=>r.spread!==null).sort((a,b)=>b.spread-a.spread)[0]||null};
}
