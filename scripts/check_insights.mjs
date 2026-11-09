import assert from 'node:assert/strict';
import fs from 'node:fs';
import {describeInsight,themeShift,annualInsights,programmeInsights,illustrativeWorks} from '../docs/assets/insights-math.mjs';
const {records,tracks}=JSON.parse(fs.readFileSync(new URL('../docs/data/newsroom.json',import.meta.url)));
for(const discipline of ['all','bild','slojd']){
 for(const year of ['all','2024','2025','2026']){
  const c=describeInsight(records,tracks,discipline,year);
  const expected=records.filter(r=>(year==='all'||r.year===Number(year))&&(discipline==='all'||r.track_ids.some(id=>tracks.find(t=>t.id===id).discipline===discipline)));
  assert.equal(c.total,expected.length);
  assert.equal(c.designs.ranking.reduce((n,r)=>n+r.count,0),c.total);
  for(const field of ['themes','techniques','settings'])for(const row of c[field].ranking)assert(row.count<=c.total);
  const profiles=programmeInsights(c.works,tracks);
  if(c.total){const examples=illustrativeWorks(c.works,tracks,c.themes.ranking[0].label,discipline);assert(new Set(examples.map(r=>r.id)).size===examples.length);assert(examples.every(r=>r.themes.includes(c.themes.ranking[0].label)));}
  assert.equal(profiles.reduce((n,p)=>n+p.total,0),expected.filter(r=>r.track_ids.some(id=>tracks.find(t=>t.id===id).university==='konstfack')).length);
  const shift=themeShift(records,tracks,discipline,year);
  if(year==='2024')assert.equal(shift,null);
  if(shift){
   assert(shift.startTotal>=5&&shift.endTotal>=5);
   assert.equal(shift.endYear,year==='all'?2025:Number(year));
   assert.equal(shift.preliminary,shift.endYear===2026);
   assert(Math.abs(shift.delta-(shift.endShare-shift.startShare))<1e-10);
  }
 }
 const annual=annualInsights(records,tracks,discipline);
 assert.equal(annual.reduce((n,c)=>n+c.total,0),describeInsight(records,tracks,discipline).total);
}
assert.equal(describeInsight(records,tracks).total,270);
assert.equal(describeInsight(records,tracks,'bild','2026').total,0);
assert.equal(describeInsight(records,tracks,'slojd','2026').total,44);
assert.equal(themeShift(records,tracks,'bild','2026'),null);
assert.equal(describeInsight(records,tracks,'bild').total+describeInsight(records,tracks,'slojd').total,270);
console.log('Newsroom insights passed: subject/year scopes, separate subjects, annual totals, missing 2026 art data, change denominators and programme profiles.');
