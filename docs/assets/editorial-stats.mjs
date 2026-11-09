import {valuesFor} from './newsroom-math.mjs?v=20261109-v2d';
export function articleMetrics(records,id){
 let definitions;
 if(id==='hallbarhetens-betydelser')definitions=[['Hållbarhet och konsumtion','themes','Hållbarhet och konsumtion'],['Natur och ekologisk hållbarhet','themes','Natur och ekologisk hållbarhet']];
 else if(id==='eget-gorande-som-kunskap')definitions=[['Autoetnografisk/självbiografisk ansats','approaches','Autoetnografisk/självbiografisk'],['Dagböcker som material','collection','Dagböcker'],['Gestaltande arbete som material','collection','Gestaltande arbete som material']];
 else definitions=[['Fritid och hobby','research_settings','Fritid och hobby'],['Yrkesliv','research_settings','Yrkesliv'],['Högskola','research_settings','Högskola'],['Lärarutbildning','research_settings','Lärarutbildning'],['Annat · inte säkert utanför skolan','research_settings','Annat'],['Inte fastställbar miljö','research_settings','Inte fastställbart']];
 const result=definitions.map(([label,field,category])=>{const count=records.filter(r=>valuesFor(r,field).includes(category)).length;return {label,field,category,count,total:records.length,percent:records.length?100*count/records.length:null};});
 if(id==='hallbarhetens-betydelser'){const count=records.filter(r=>definitions.every(([,field,category])=>valuesFor(r,field).includes(category))).length;result.push({label:'Båda hållbarhetstemana i samma arbete',field:null,category:null,count,total:records.length,percent:records.length?100*count/records.length:null});}
 return result;
}
export function matchingEvidence(article,records){
 const ids=new Set(records.map(r=>r.id)),available=article.evidence.filter(e=>ids.has(e.record_id));
 return [...available.filter(e=>e.role==='example').slice(0,2),...available.filter(e=>e.role==='counterexample').slice(0,2)];
}
export function rareSpotlights(editorial,records){
 const ids=new Set(records.map(r=>r.id));
 return editorial.rare_spotlights.filter(s=>ids.has(s.record_id)).map(s=>({...s,total:records.length,count:records.filter(r=>{const title=(r.original_title+' '+r.title_sv).normalize('NFC').toLocaleLowerCase('sv');return s.title_search_terms.some(term=>title.includes(term.normalize('NFC').toLocaleLowerCase('sv')));}).length}));
}
