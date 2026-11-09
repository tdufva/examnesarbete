import assert from 'node:assert/strict';
import fs from 'node:fs';
import {methodLayers,MISSING,METHOD_FIELDS} from '../docs/assets/method-layers.mjs';
import {selectWorks,commonTracks,periodYears,themeMethodMatrix,valuesFor} from '../docs/assets/newsroom-math.mjs';
import {articleMetrics,matchingEvidence,rareSpotlights} from '../docs/assets/editorial-stats.mjs';
import {csvText,correctionUrl} from '../docs/assets/analysis-export.mjs';
const {records,tracks}=JSON.parse(fs.readFileSync(new URL('../docs/data/newsroom.json',import.meta.url)));
const editorial=JSON.parse(fs.readFileSync(new URL('../docs/data/editorial.json',import.meta.url)));
assert.equal(selectWorks(records,tracks,{balance:'common',period:'2024-2025'}).length,226);
assert.equal(selectWorks(records,tracks,{balance:'common',period:'2025-2026'}).length,86);
assert.equal(selectWorks(records,tracks,{balance:'common',period:'2024-2026'}).length,116);
assert.equal(selectWorks(records,tracks,{balance:'common',period:'2025-2026',discipline:'bild'}).length,0);
assert.equal(selectWorks(records,tracks,{balance:'common',period:'2025-2026',degree:'advanced_professional'}).length,0);
assert.equal(selectWorks(records,tracks,{balance:'common',period:'2025-2026',groups:[]}).length,0);
for(const period of ['2024-2025','2025-2026','2024-2026']){
 for(const discipline of ['all','bild','slojd']){
  const filters={balance:'common',period,discipline},subset=selectWorks(records,tracks,filters),common=commonTracks(records,tracks,filters);
  assert.equal(new Set(subset.map(r=>r.id)).size,subset.length);
  for(const id of common)for(const year of periodYears(period))assert(subset.some(r=>r.year===year&&r.track_ids.includes(id)));
  assert(subset.every(r=>periodYears(period).includes(r.year)&&r.track_ids.some(id=>common.includes(id))));
  for(const field of Object.keys(METHOD_FIELDS)){
   for(const normalization of ['theme','all']){
    const matrix=themeMethodMatrix(subset,field,normalization,0);
    for(const row of matrix.rows)for(const cell of row.cells){
     const themeRows=subset.filter(r=>r.themes.includes(row.label));
     assert.equal(cell.count,themeRows.filter(r=>valuesFor(r,field).includes(cell.category)).length);
     assert.equal(cell.denominator,normalization==='theme'?themeRows.length:subset.length);
     assert(cell.count<=cell.denominator);assert(cell.percent===null||cell.percent>=0&&cell.percent<=100);
    }
   }
  }
 }
}
const synthetic={methods:[{kind:'design',label:'Fenomenologisk intervjustudie'},{kind:'insamling',label:'Observationer och intervjuer'},{kind:'analys',label:'Innehållsanalys och tematisering'},{kind:'perspektiv',label:'Posthumanism'}]};
const layers=methodLayers(synthetic);
assert.deepEqual(layers.approaches,['Fenomenologisk/hermeneutisk']);
assert.deepEqual(layers.designs,[MISSING],'An interview is collection, not an imposed research arrangement');
assert.deepEqual(layers.collection,['Intervjuer och fokusgrupper','Observation och fältanteckningar']);
assert.deepEqual(layers.analysis,['Innehållsanalys','Tematisk analys']);
assert(Object.values(methodLayers({methods:[]})).every(v=>v.length===1&&v[0]===MISSING));
assert(!methodLayers({methods:[{kind:'perspektiv',label:'Fenomenologi'}]}).approaches.includes('Fenomenologisk/hermeneutisk'),'A theoretical perspective alone does not become a method');
assert.deepEqual(methodLayers({methods:[{kind:'design',label:'Konstbaserad aktionsforskning'}]}).designs,['Aktionsforskning']);
for(const view of ['all','bild','slojd'])for(const year of ['all',2024,2025,2026]){
 const subset=selectWorks(records,tracks,{discipline:view,year});
 for(const article of editorial.articles){
  for(const m of articleMetrics(subset,article.id))assert(m.count<=m.total&&m.total===subset.length);
  assert(matchingEvidence(article,subset).every(e=>subset.some(r=>r.id===e.record_id)));
 }
 for(const rare of rareSpotlights(editorial,subset)){assert(subset.some(r=>r.id===rare.record_id));assert(rare.count>=1&&rare.count<=subset.length);}
}
const ids=new Map(records.map(r=>[r.id,r]));
assert.equal(editorial.articles.length,3);
for(const a of editorial.articles){assert(a.evidence.some(e=>e.role==='counterexample'));for(const e of a.evidence)assert.equal(ids.get(e.record_id)?.original_title,e.original_title);}
for(const r of records){const u=new URL(correctionUrl(r));assert(u.searchParams.get('source').includes(r.id));assert.equal(u.searchParams.get('template'),'korrigering.yml');assert(u.href.length<8000);}
assert(csvText([['=SUM(1;2)','a"b','Östra Finland']]).includes("'=SUM"));
assert(csvText([['a"b']]).includes('"a""b"'));
console.log('Analysis v2 passed: stable yearly lines, level/credit/group intersections, four method layers, matrix denominators, filtered evidence/counterexamples, rare title searches, CSV and work-specific correction drafts.');
