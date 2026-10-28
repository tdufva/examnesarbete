import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectHistory,historySeries,historyBuckets,historyRanking} from '../docs/assets/history-math.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../docs/data/history.json',import.meta.url),'utf8'));
const report=JSON.parse(fs.readFileSync(new URL('../data/history_build_report.json',import.meta.url),'utf8'));
assert.equal(selectHistory(data.records,{text:'all'}).length,report.direct_confirmed);
for(const cohort of report.by_year){
 const selected=selectHistory(data.records,{from:cohort.year,to:cohort.year,university:cohort.university,text:'all'});
 assert.equal(selected.length,cohort.records);
 assert.equal(selectHistory(selected).length,cohort.with_abstract);
}
const record=(university,year,text,signals=[])=>({university,year,original_abstract:text,method_signals:signals,theme_signals:[]});
const fixture=[record('Aalto',2000,'Own abstract',[{id:'x'}]),record('Lappland',2000,'Abstract',[{id:'x'}]),record('Lappland',2000,'Abstract'),record('Lappland',2000,'Abstract'),record('Aalto',2001,'')];
const settings={from:2000,to:2002,interval:1,field:'method_signals',category:'x'};
const combined=historySeries(fixture,settings)[0].points;
assert.equal(combined[0].value,50); // pooled2/4, distinct from equal-university average66.7
assert.equal(combined[1].value,null); // one record, no abstract in standard denominator
assert.equal(combined[2].value,null); // no records, never an inventedzero
assert.equal(historySeries(fixture,{...settings,text:'all'})[0].points[1].value,0);
const compare=historySeries(fixture,{...settings,university:'compare'});
assert.equal(compare[0].points[0].value,100);
assert.ok(Math.abs(compare[1].points[0].value-100/3)<1e-10);
assert.equal(historyRanking(fixture,'method_signals',[{id:'x',label:'X'}])[0].count,2);
assert.deepEqual(historyBuckets(2007,2011,5),[{from:2007,to:2009,label:'2007–2009'},{from:2010,to:2011,label:'2010–2011'}]);
const marked=[{...fixture[0],programme_confidence:'uncertain'},{...fixture[1],source_kind:'historical_catalogue'}];
assert.equal(selectHistory(marked,{text:'all'}).length,0);
assert.equal(selectHistory(marked,{text:'all',source:'all',verification:'all'}).length,2);
console.log('Historical aggregation: all source/year/university cohorts, pooled shares, separate denominators, missing-text gaps, interval edges and optional sources passed.');
