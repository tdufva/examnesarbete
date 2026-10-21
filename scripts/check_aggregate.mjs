import assert from 'node:assert/strict';
import fs from 'node:fs';
import {aggregate,selectRecords} from '../docs/assets/aggregate.mjs';
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
