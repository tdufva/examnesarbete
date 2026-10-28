export const UNIVERSITIES=['Aalto','Lappland'];
export const name=u=>u==='Aalto'?'Aalto-universitetet':u==='Lappland'?'Lapplands universitet':'Universiteten tillsammans';
export const selectHistory=(records,{from=-Infinity,to=Infinity,university='combined',text='abstract',source='archive',verification='confirmed'}={})=>records.filter(r=>r.year>=Number(from)&&r.year<=Number(to)&&(!UNIVERSITIES.includes(university)||r.university===university)&&(text!=='abstract'||Boolean(r.original_abstract?.trim()))&&(source!=='archive'||r.source_kind!=='historical_catalogue')&&(verification!=='confirmed'||r.programme_confidence!=='uncertain'));
export function historyBuckets(from,to,interval=5){
 const buckets=[];
 for(let start=Math.floor(from/interval)*interval;start<=to;start+=interval){const first=Math.max(from,start),last=Math.min(to,start+interval-1);buckets.push({from:first,to:last,label:first===last?String(first):`${first}–${last}`});}
 return buckets;
}
export function historySeries(records,{from,to,interval=5,university='combined',field='method_signals',category='',text='abstract',metric='percent',source='archive',verification='confirmed'}={}){
 const buckets=historyBuckets(Number(from),Number(to),Number(interval));
 const groups=university==='compare'?UNIVERSITIES:UNIVERSITIES.includes(university)?[university]:['combined'];
 return groups.map(university=>({university,label:name(university),points:buckets.map(bucket=>{
  const all=selectHistory(records,{from:bucket.from,to:bucket.to,university,text:'all',source,verification});
  const eligible=all.filter(r=>text!=='abstract'||Boolean(r.original_abstract?.trim()));
  const count=category?eligible.filter(r=>(r[field]||[]).some(s=>(typeof s==='string'?s:s.id)===category)).length:eligible.length;
  return {...bucket,total:all.length,denominator:eligible.length,count,coverage:all.filter(r=>r.original_abstract?.trim()).length,value:eligible.length?(metric==='count'?count:100*count/eligible.length):null};
 })}));
}
export function historyRanking(records,field,categories){
 return categories.map(c=>({...c,count:records.filter(r=>(r[field]||[]).some(s=>(typeof s==='string'?s:s.id)===c.id)).length})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'sv'));
}
