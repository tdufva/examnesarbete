import assert from 'node:assert/strict';
import fs from 'node:fs';
import {aggregate,selectRecords,methodComparison} from '../docs/assets/aggregate.mjs';
const {records,metadata}=JSON.parse(fs.readFileSync(new URL('../docs/data/theses.json',import.meta.url),'utf8'));
const published=JSON.parse(fs.readFileSync(new URL('../docs/data/analysis.json',import.meta.url),'utf8'));
const summary=aggregate(records);
// Independent Python export and browser calculations must agree on counts.
for(const field of ['total','open','primary_methods','themes','keywords','techniques','method_coverage'])assert.deepEqual(summary[field],published[field],field);
for(const university of ['Aalto','Lappland'])assert.deepEqual(summary.universities[university],published.universities[university]);
for(const cohort of metadata.coverage.cohorts){
 const selected=selectRecords(records,{year:String(cohort.year),university:cohort.university});
 assert.equal(selected.length,cohort.records);
 assert.equal(aggregate(selected).open,cohort.open_pdfs);
 assert.equal(selectRecords(records,{year:String(cohort.year),university:cohort.university,availability:'open'}).length,cohort.open_pdfs);
}
const old=selectRecords(records,{year:'common',commonYears:[2024,2025]});
assert.equal(old.length,98);
assert.equal(aggregate(old).primary_methods[0].label,'Konstbaserad aktionsforskning');
assert.equal(aggregate(old).primary_methods[0].count,34);
assert.equal(selectRecords(records,{year:'2026',university:'Aalto',verification:'confirmed'}).length,2);
assert.equal(selectRecords(records,{year:'2026',university:'Lappland',verification:'confirmed'}).length,17);
assert.equal(selectRecords(records,{verification:'confirmed'}).length,117);
assert.equal(aggregate([]).total,0);
assert.equal(selectRecords(records,{year:'1900'}).length,0);
console.log('Browser aggregation matches Python; year/university/open-PDF selections, historical baseline and empty cohorts passed.');

// Unequal cohort sizes distinguish an equal-university mean from a pooled share.
const fixture=(university,primary_method,withInterview)=>({university,primary_method,year:2025,open_pdf:true,themes:[],keywords_sv:[],methods:withInterview?[{kind:'insamling',label:'Intervju',basis:'abstract'}]:[]});
const unequal=[fixture('Aalto','X',true),fixture('Lappland','X',true),fixture('Lappland','Y',false),fixture('Lappland','Y',false)];
const mean=methodComparison(unequal,'average');
assert.ok(Math.abs(mean.primary_methods.find(r=>r.label==='X').average-200/3)<1e-10);
assert.ok(Math.abs(mean.techniques.find(r=>r.label==='Intervjuer').average-200/3)<1e-10);
assert.equal(methodComparison(unequal,'Aalto').primary_methods[0].values[0].percent,100);
assert.equal(methodComparison(unequal,'Lappland').primary_methods[0].values[0].count,2);
assert.deepEqual(methodComparison(unequal,'both').groups.map(g=>g.total),[1,3]);
assert.equal(methodComparison(unequal.filter(r=>r.university==='Aalto'),'average').primary_methods[0].average,null);
assert.deepEqual(methodComparison([],'average').primary_methods,[]);
console.log('Method views: single university, paired series, equal-weight means and missing cohorts passed.');
