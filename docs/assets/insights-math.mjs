import {selectWorks,aggregateWorks,sharedAndDifferent,groupsFor} from './newsroom-math.mjs?v=20261109-v2d';

export function insightScope(records,tracks,discipline='all',year='all',options={}){
 return selectWorks(records,tracks,{...options,discipline,year,groupBy:'university',groups:null});
}
export function describeInsight(records,tracks,discipline='all',year='all',options={}){
 const works=insightScope(records,tracks,discipline,year,options),filters={...options,discipline,year,groupBy:'university',groups:null};
 return {works,total:works.length,designs:aggregateWorks(works,'primary_method'),themes:aggregateWorks(works,'themes'),techniques:aggregateWorks(works,'techniques'),settings:aggregateWorks(works,'research_settings'),reading:sharedAndDifferent(works,tracks,filters,'themes'),universities:groupsFor(tracks,filters).filter(g=>works.some(r=>r.track_ids.some(id=>g.track_ids.includes(id)))).length};
}
export function themeShift(records,tracks,discipline='all',year='all',options={}){
 const period=(options.period||'2024-2025').split('-').map(Number);
 const endYear=year==='all'?(options.balance==='common'?period[1]:2025):Number(year),startYear=year==='all'&&options.balance==='common'?period[0]:endYear-1;
 if(startYear<2024)return null;
 const start=insightScope(records,tracks,discipline,String(startYear),options),end=insightScope(records,tracks,discipline,String(endYear),options);
 if(start.length<5||end.length<5)return null;
 const labels=aggregateWorks([...start,...end],'themes').ranking.map(r=>r.label);
 const changes=labels.map(label=>{
  const startCount=start.filter(r=>r.themes.includes(label)).length,endCount=end.filter(r=>r.themes.includes(label)).length;
  return {label,startYear,endYear,startTotal:start.length,endTotal:end.length,startCount,endCount,startShare:100*startCount/start.length,endShare:100*endCount/end.length,delta:100*endCount/end.length-100*startCount/start.length,preliminary:endYear===2026};
 });
 return changes.sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)||a.label.localeCompare(b.label,'sv'))[0]||null;
}
export function annualInsights(records,tracks,discipline='all'){
 return [2024,2025,2026].map(year=>({year,...describeInsight(records,tracks,discipline,String(year))}));
}
export function programmeInsights(works,tracks){
 return tracks.filter(t=>t.university==='konstfack').map(t=>{
  const records=works.filter(r=>r.track_ids.includes(t.id));
  return {...t,total:records.length,design:aggregateWorks(records).ranking[0]||null};
 }).filter(t=>t.total>0);
}
export function illustrativeWorks(works,tracks,theme,discipline='all'){
 const pool=works.filter(r=>r.themes.includes(theme));if(pool.length<2)return pool;
 const first=pool[0],track=r=>tracks.find(t=>r.track_ids.includes(t.id));
 const second=(discipline==='all'?pool.find(r=>track(r).discipline!==track(first).discipline):null)||pool.find(r=>track(r).university!==track(first).university)||pool[1];
 return [first,second];
}
