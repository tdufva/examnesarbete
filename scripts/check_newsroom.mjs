import assert from 'node:assert/strict';
import fs from 'node:fs';
import {matchingTracks,groupsFor,selectWorks,aggregateWorks,compareGroups,annualSeries,valuesFor,technique} from '../docs/assets/newsroom-math.mjs';
const {records,tracks}=JSON.parse(fs.readFileSync(new URL('../docs/data/newsroom.json',import.meta.url)));
const all={discipline:'all',groupBy:'university',year:'all',country:'all',university:'all',track:'all',degree:'all',credits:'all',groups:null};
assert.equal(selectWorks(records,tracks,all).length,309);
assert.equal(groupsFor(tracks,all).length,8);
assert.equal(groupsFor(tracks,{...all,groupBy:'track'}).length,11);
assert.equal(selectWorks(records,tracks,{...all,groups:[]}).length,0);
assert.equal(selectWorks(records,tracks,{...all,discipline:'bild'}).length+selectWorks(records,tracks,{...all,discipline:'slojd'}).length,309);
for(const groupBy of ['university','track','country']){
 for(const discipline of ['all','bild','slojd']){
  for(const year of ['all','2024','2025','2026']){
   const filter={...all,groupBy,discipline,year},selected=selectWorks(records,tracks,filter),groups=groupsFor(tracks,filter);
   assert.equal(new Set(selected.map(r=>r.id)).size,selected.length);
   const primary=aggregateWorks(selected,'primary_method');
   assert.equal(primary.ranking.reduce((s,r)=>s+r.count,0),selected.length);
   for(const field of ['primary_method','themes','techniques','research_settings']){
    const labels=aggregateWorks(selected,field).ranking.map(r=>r.label);
    for(const category of labels){
     const rows=compareGroups(selected,tracks,filter,field,category);
     assert.equal(rows.length,groups.length);
     assert.equal(rows.reduce((s,r)=>s+r.total,0),selected.length);
     for(const row of rows){
      assert.equal(row.count,selected.filter(r=>r.track_ids.some(t=>row.track_ids.includes(t))&&valuesFor(r,field).includes(category)).length);
      if(row.total)assert(Math.abs(row.percent-row.count/row.total*100)<1e-10);else assert.equal(row.percent,null);
     }
    }
   }
  }
 }
}
const k=selectWorks(records,tracks,{...all,university:'konstfack'});
assert.equal(k.length,73);
assert.equal(selectWorks(records,tracks,{...all,groupBy:'track',groups:tracks.filter(t=>t.university==='konstfack').map(t=>t.id)}).length,k.length);
assert.equal(selectWorks(records,tracks,{...all,year:'2026',university:'aalto'}).length,0);
const umea={...all,university:'umea',country:'Sverige'};
const umeaWorks=selectWorks(records,tracks,umea);
assert.equal(umeaWorks.length,39);
assert(umeaWorks.every(r=>r.country==='Sverige'));
assert.equal(selectWorks(records,tracks,{...umea,track:'umea-bild'}).length,17);
assert.equal(selectWorks(records,tracks,{...umea,track:'umea-slojd'}).length,22);
assert.equal(selectWorks(records,tracks,{...umea,discipline:'bild'}).length+selectWorks(records,tracks,{...umea,discipline:'slojd'}).length,umeaWorks.length);
assert.deepEqual(groupsFor(tracks,{...umea,groupBy:'track'}).map(g=>g.id),['umea-bild','umea-slojd']);
assert.equal(selectWorks(records,tracks,{...umea,year:'2026'}).length,0);
const no2026=compareGroups(selectWorks(records,tracks,{...all,year:'2026'}),tracks,all,'primary_method','Intervjustudie').find(g=>g.id==='aalto');
assert.equal(no2026.percent,null);assert.equal(no2026.total,0);
for(const degree of ['master','advanced_professional','unknown','bachelor'])assert(selectWorks(records,tracks,{...all,degree}).every(r=>r.degree_level===degree));
for(const credits of ['15','30','40'])assert(selectWorks(records,tracks,{...all,credits}).every(r=>r.credits===Number(credits)&&r.credit_scope==='thesis'));
assert.equal(selectWorks(records,tracks,{...all,credits:'unknown'}).length,records.filter(r=>r.credits===null).length);
const synthetic=[{...records[0],id:'test',track_ids:[tracks[0].id,tracks[2].id],credit_scope:'thesis_and_seminar',credits:30}];
assert.equal(selectWorks(synthetic,tracks,all).length,1,'Multitrack paper counted once in pooled collection');
assert.equal(selectWorks(synthetic,tracks,{...all,credits:'30'}).length,0,'Combined credits do not become thesis-only credits');
assert.equal(selectWorks(synthetic,tracks,{...all,credits:'combined'}).length,1);
assert.equal(valuesFor({methods:[{label:'Temaintervjuer',kind:'insamling'},{label:'Semistrukturerade intervjuer',kind:'insamling'},{label:'Posthumanism',kind:'perspektiv'}]},'techniques').length,1);
assert.equal(technique('Temaintervjuer'),'Intervjuer och fokusgrupper');
const series=annualSeries(records,tracks,all,'themes','Undervisning och lärande');
assert.deepEqual(series.map(s=>s.year),[2024,2025,2026]);
assert.equal(series.flatMap(s=>s.groups).reduce((s,r)=>s+r.total,0),309);
console.log('Newsroom maths passed: filters, pooled institutions, tracks, country/subject/year intersections, empty denominators, overlapping codes, credits and trends.');
