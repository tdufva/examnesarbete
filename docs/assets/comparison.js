import {matchingTracks,groupsFor,selectWorks,aggregateWorks,compareGroups,annualSeries,valuesFor,commonTracks,periodYears,themeMethodMatrix} from './newsroom-math.mjs?v=20261109-v2d';
import {METHOD_FIELDS,MISSING,methodLayers,layerNote} from './method-layers.mjs?v=20261109-v2d';
import {chartPng,matrixPng,downloadCsv,correctionUrl} from './analysis-export.mjs?v=20261109-v2d';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:1}).format(n);
const colors={umea:'#37693c',konstfack:'#c6281e',aalto:'#2448c6',lappland:'#14776b',uef:'#896400',helsingfors:'#725293',turku:'#151515','abo-akademi':'#a74d12',Finland:'#2448c6',Sverige:'#c6281e'};
const trackColors={'umea-bild':'#37693c','umea-slojd':'#9a3266','konstfack-bild-grundskola':'#c6281e','konstfack-slojd-grundskola':'#725293','konstfack-bild-gymnasium':'#a74d12'};
const fieldLabels={...METHOD_FIELDS,themes:'Teman',primary_method:'Äldre huvudkod',techniques:'Insamling och analys',research_settings:'Forskningsmiljö'};
const degreeNames={master:'Magisterexamen',advanced_professional:'Avancerad yrkesexamen',bachelor:'Grundnivå',unknown:'Nivåuppgift saknas'};
const methodKinds={design:'Ursprunglig etikett för ansats/upplägg',insamling:'Datainsamling',analys:'Analys',perspektiv:'Teoretiskt perspektiv'};
let data,records,tracks,shown=12,selected=[];
let state={discipline:'all',groupBy:'university',year:'all',country:'all',university:'all',track:'all',degree:'all',credits:'all',groups:null,field:'themes',category:'',metric:'percent',balance:'all',period:'2024-2025',matrixField:'collection',matrixNormalization:'theme',matrixLimit:'8',matrixTheme:'',matrixCategory:'',work:'',search:'',evidence:'all'};
const controls={groupBy:'nr-grouping',year:'nr-year',country:'nr-country',university:'nr-university',track:'nr-track',degree:'nr-degree',credits:'nr-credits',balance:'nr-balance',period:'nr-period'};
const tone=g=>trackColors[g.id]||colors[g.id]||colors[tracks.find(t=>g.track_ids?.includes(t.id))?.university]||'#2448c6';
try{const response=await fetch('data/newsroom.json?v=20261113');if(!response.ok)throw Error(`HTTP ${response.status}`);data=await response.json();records=data.records;tracks=data.tracks;init();}
catch(error){$('#nr-hero-stats').innerHTML='<p class="error-state">Analysen kunde inte laddas. Försök ladda om sidan.</p>';console.error(error);}

function init(){
 const params=new URLSearchParams(location.search);
 for(const k of Object.keys(state))if(params.has(k))state[k]=k==='groups'?params.get(k).split(',').filter(Boolean):params.get(k);
 for(const [key,allowed] of Object.entries({discipline:['all','bild','slojd'],groupBy:['university','track','country'],field:['themes','primary_method','techniques','research_settings',...Object.keys(METHOD_FIELDS)],metric:['percent','count'],balance:['all','common'],period:['2024-2025','2025-2026','2024-2026'],matrixField:Object.keys(METHOD_FIELDS),matrixNormalization:['theme','all'],matrixLimit:['8','0'],evidence:['all','category','matrix','limited']}))if(!allowed.includes(state[key]))state[key]=allowed[0];
 $('#nr-search').value=state.search;$('#nr-evidence-filter').value=state.evidence;
 syncControls();
 for(const [key,id] of Object.entries(controls))$('#'+id).addEventListener('change',()=>{state[key]=$('#'+id).value;if(['balance','period'].includes(key))state.year='all';state.groups=null;state.work='';shown=12;syncControls();render();});
 $('#nr-field').addEventListener('change',()=>{state.field=$('#nr-field').value;state.category='';render();});
 for(const [key,id] of [['matrixField','nr-matrix-field'],['matrixNormalization','nr-matrix-normalization'],['matrixLimit','nr-matrix-limit']])$('#'+id).addEventListener('change',()=>{state[key]=$('#'+id).value;if(key==='matrixField'){state.matrixTheme='';state.matrixCategory='';if(state.evidence==='matrix'){state.evidence='all';$('#nr-evidence-filter').value='all';}}render();});
 $('#nr-quick-subject').addEventListener('change',()=>{state.discipline=$('#nr-quick-subject').value;state.groups=null;state.work='';syncControls();render();});
 $('#nr-quick-year').addEventListener('change',()=>{state.year=$('#nr-quick-year').value;state.work='';syncControls();render();});
 $('#nr-work-clear').addEventListener('click',()=>{state.work='';state.search='';$('#nr-search').value='';renderWorks();});
 $('#nr-matrix-clear').addEventListener('click',()=>{state.matrixTheme='';state.matrixCategory='';state.evidence='all';$('#nr-evidence-filter').value='all';render();});
 $('#nr-png').addEventListener('click',exportChart);$('#nr-csv').addEventListener('click',exportChartCsv);$('#nr-matrix-csv').addEventListener('click',exportMatrixCsv);$('#nr-matrix-png').addEventListener('click',exportMatrixPng);
 $('#nr-filters').addEventListener('submit',e=>e.preventDefault());
 $$('[data-subject]').forEach(b=>b.addEventListener('click',()=>{state.discipline=b.dataset.subject;state.groups=null;state.work='';shown=12;syncControls();render();}));
 $$('[data-field]').forEach(b=>b.addEventListener('click',()=>{state.field=b.dataset.field;state.category='';render();}));
 $$('[data-metric]').forEach(b=>b.addEventListener('click',()=>{state.metric=b.dataset.metric;render();}));
 $('#nr-category').addEventListener('change',()=>{state.category=$('#nr-category').value;render();});
 $('#nr-all-groups').addEventListener('click',()=>{state.groups=null;render();});
 $('#nr-reset').addEventListener('click',()=>{state={discipline:'all',groupBy:'university',year:'all',country:'all',university:'all',track:'all',degree:'all',credits:'all',groups:null,field:'themes',category:'',metric:'percent',balance:'all',period:'2024-2025',matrixField:'collection',matrixNormalization:'theme',matrixLimit:'8',matrixTheme:'',matrixCategory:'',work:'',search:'',evidence:'all'};shown=12;$('#nr-search').value='';$('#nr-evidence-filter').value='all';syncControls();render();});
 $('#nr-search').addEventListener('input',()=>{shown=12;state.work='';state.search=$('#nr-search').value;renderWorks();});$('#nr-evidence-filter').addEventListener('change',()=>{shown=12;state.work='';state.evidence=$('#nr-evidence-filter').value;renderWorks();});
 $('#nr-more').addEventListener('click',()=>{shown+=12;renderWorks();});
 $('#nr-updated').textContent='Kontrollerat '+data.metadata.checked_sv;
 $('#nr-track-count').textContent=tracks.length+' utbildningslinjer';$('#nr-track-count').hidden=false;
 const all=aggregateWorks(records),coauthored=all.known_authors?num(all.coauthored/all.known_authors*100)+' %':'—';
 $('#nr-hero-stats').innerHTML=[[records.length,'unika arbeten i perioden'],[new Set(records.flatMap(r=>r.track_ids.map(id=>tracks.find(t=>t.id===id).university))).size,'lärosäten i analysen'],[data.metadata.file_count,'levererade PDF-filer'],[coauthored,'par-/grupparbeten bland kända uppgifter']].map(([value,label])=>`<p><strong>${value}</strong><span>${esc(label)}</span></p>`).join('');
 $('#nr-data-status').hidden=data.metadata.complete;$('#nr-data-status').textContent=`Analys pågår: ${data.metadata.analysed_work_count} av ${data.metadata.unique_work_candidates} arbeten har kodats. Detta är en lokal förhandsversion.`;
 renderContext();renderAudit();render();if(state.work)requestAnimationFrame(()=>document.getElementById('work-'+state.work)?.scrollIntoView());
 let timer;window.addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(()=>renderTrends(),120);});
}
function options(select,items,value){select.innerHTML='<option value="all">Alla</option>'+items.map(i=>`<option value="${esc(i.id)}">${esc(i.label)}</option>`).join('');select.value=items.some(i=>i.id===value)?value:'all';return select.value;}
function syncControls(){
 const base=matchingTracks(tracks,{...state,university:'all',track:'all'}),unis=[...new Map(base.map(t=>[t.university,{id:t.university,label:t.university_label}])).values()];
 state.university=options($('#nr-university'),unis,state.university);
 const ts=matchingTracks(tracks,{...state,track:'all'});state.track=options($('#nr-track'),ts.map(t=>({id:t.id,label:t.short_label})),state.track);
 const years=state.balance==='common'?periodYears(state.period):[2024,2025,2026];
 for(const id of ['nr-year','nr-quick-year']){$('#'+id).innerHTML='<option value="all">'+(state.balance==='common'?state.period.replace('-','–')+' tillsammans':'2024–2026 tillsammans')+'</option>'+years.map(y=>`<option value="${y}">${y}${y===2026?' · pågående':''}</option>`).join('');}
 if(state.year!=='all'&&!years.includes(Number(state.year)))state.year='all';
 $('#nr-quick-year').value=state.year;$('#nr-quick-subject').value=state.discipline;$('#nr-period').disabled=state.balance!=='common';
 for(const [key,id] of Object.entries(controls)){if([...$('#'+id).options].some(o=>o.value===state[key]))$('#'+id).value=state[key];else {state[key]='all';$('#'+id).value='all';}}
}
function render(){
 selected=selectWorks(records,tracks,state);const a=aggregateWorks(selected,state.field),allLabels=aggregateWorks(records,state.field).ranking;
 $('#nr-field').value=state.field;
 const previous=state.category;if(!allLabels.some(c=>c.label===previous))state.category=a.ranking.find(r=>r.label!==MISSING)?.label||a.ranking[0]?.label||allLabels[0]?.label||'';
 $('#nr-category').innerHTML=allLabels.map(c=>`<option value="${esc(c.label)}">${esc(c.label)}</option>`).join('');$('#nr-category').value=state.category;
 for(const [attr,value] of [['subject',state.discipline],['field',state.field],['metric',state.metric]])$$(`[data-${attr}]`).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[attr]===value)));
 const groups=groupsFor(tracks,state);if(state.groups!==null)state.groups=state.groups.filter(id=>groups.some(g=>g.id===id));
 $('#nr-groups').innerHTML=groups.map(g=>`<label class="nr-group-chip" style="--group-color:${tone(g)}"><input type="checkbox" data-group="${esc(g.id)}" ${state.groups===null||state.groups.includes(g.id)?'checked':''}><span>${esc(g.label)}</span></label>`).join('');
 $$('[data-group]').forEach(c=>c.addEventListener('change',()=>{state.groups=$$('[data-group]').filter(c=>c.checked).map(c=>c.dataset.group);shown=12;const id=c.dataset.group;render();document.querySelector(`[data-group="${id}"]`)?.focus();}));
 const active=state.groups===null?groups:groups.filter(g=>state.groups.includes(g.id)),universities=new Set(selected.flatMap(r=>r.track_ids.map(id=>tracks.find(t=>t.id===id).university)));
 $('#nr-selection').textContent=`${selected.length} unika arbeten · ${active.length} ${active.length===1?(state.groupBy==='track'?'vald':'valt'):'valda'} ${state.groupBy==='track'?(active.length===1?'linje':'linjer'):state.groupBy==='country'?'landsurval':active.length===1?'lärosäte':'lärosäten'} (${active.filter(g=>selected.some(r=>r.track_ids.some(id=>g.track_ids.includes(id)))).length} med underlag) · ${state.year==='all'?(state.balance==='common'?state.period.replace('-','–'):'2024–2026'):state.year} · ${state.discipline==='all'?'bild och slöjd':state.discipline==='bild'?'bild':'slöjd'}`;
 const notes=[];
 const unknownLevel=selected.filter(r=>r.degree_level==='unknown').length;
 if(unknownLevel)notes.push(`${unknownLevel} arbeten saknar säkert fastställd individuell nivåuppgift. De behålls i grundurvalet och kan avgränsas med nivåfiltret.`);
 if(state.year==='2026'||state.year==='all'&&(state.balance!=='common'||periodYears(state.period).includes(2026)))notes.push('2026 är ett pågående år. Saknade årsmappar betyder saknat underlag, inte noll producerade arbeten.');
 if(state.groupBy==='country'||new Set(selected.map(r=>r.country)).size>1)notes.push('Landsurvalen kan omfatta olika ämnen, utbildningslinjer och nivåer. Se vilka lärosäten som faktiskt ingår i varje grupp under landsjämförelsen.');
 if(a.unknown_design)notes.push(`${a.unknown_design} arbeten saknar en fastställbar huvuddesign och visas som en egen kategori.`);
 if(state.credits!=='all')notes.push('Poängurvalet omfattar bara den typ av individuella källuppgifter som är vald. Saknad poänguppgift har inte ersatts med en utbildningsregel.');
 $('#nr-scope-note').hidden=!notes.length;$('#nr-scope-note').textContent=notes.join(' ');
 renderCoverage();renderMatrix();renderComparison();renderDistribution('themes','#nr-theme-ranking');renderDistribution(state.field in METHOD_FIELDS?state.field:'designs','#nr-method-ranking');renderTrends();renderStories();renderWorkingForms();renderCountryReading();renderWorks();
 syncUrl();
}
function renderComparison(){
 $('#nr-export-preview-panel').hidden=true;
 const oldWidths=new Map($$('#nr-comparison-chart [data-plot-group]').map(el=>[el.dataset.plotGroup,el.querySelector('.bar-fill')?.style.width||'0%']));
 const rows=compareGroups(selected,tracks,state,state.field,state.category),max=state.metric==='percent'?100:Math.max(1,...rows.map(g=>g.count));
 $('#nr-chart-title').textContent=state.category||'Välj kategori';
 $('#nr-comparison-chart').innerHTML=rows.length?rows.map(g=>`<div class="nr-group-row" data-plot-group="${esc(g.id)}"><div class="nr-group-name">${esc(g.label)}<small>n = ${g.total}${g.limited?' · '+g.limited+' med begränsad kodning':''}</small></div><div class="bar-track" role="img" aria-label="${esc(g.label)}: ${g.total?g.count+' av '+g.total+', '+num(g.percent)+' procent':'inget underlag'}"><div class="bar-fill" style="background:${tone(g)};width:${g.total?(state.metric==='percent'?g.percent:g.count)/max*100:0}%"></div></div><div class="nr-group-value">${g.total?(state.metric==='percent'?num(g.percent)+' %':g.count+' st.'):'—'}<small>${g.total?g.count+' / '+g.total:'Inga arbeten i urvalet'}</small></div></div>`).join(''):'<p class="scope-empty">Välj minst en grupp för att jämföra.</p>';
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches)$$('#nr-comparison-chart [data-plot-group]').forEach(el=>{const fill=el.querySelector('.bar-fill');fill.animate([{width:oldWidths.get(el.dataset.plotGroup)||'0%'},{width:fill.style.width}],{duration:320,easing:'cubic-bezier(.2,.7,.2,1)'});});
 $('#nr-chart-note').textContent=`${state.field==='primary_method'?'Den äldre huvudkoden behålls för spårbarhet.':state.field in METHOD_FIELDS?layerNote:'Flera kategorier kan förekomma i samma arbete; summan kan överstiga 100 %.'} Andelar räknas inom varje grupp i det aktuella urvalet. Grupperna visas i en fast ordning, inte som en kvalitetsranking. En tom nämnare visas med ett streck.`;
 $('#nr-comparison-table').innerHTML=table(['Grupp','Träffar','Nämnare','Andel'],rows.map(g=>[g.label,g.total?g.count:'—',g.total,g.total?num(g.percent)+' %':'—']));
}
function table(head,rows){return '<table><thead><tr>'+head.map(h=>`<th scope="col">${esc(h)}</th>`).join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map((v,i)=>i?`<td>${esc(v)}</td>`:`<th scope="row">${esc(v)}</th>`).join('')+'</tr>').join('')+'</tbody></table>';}
function renderDistribution(field,target){
 const a=aggregateWorks(selected,field);$(target).innerHTML=a.total?a.ranking.map(r=>`<div class="nr-distribution-row"><button type="button" data-rank-field="${field}" data-rank-label="${esc(r.label)}">${esc(r.label)}</button><span>${r.count} / ${a.total}<br>${num(r.count/a.total*100)} %</span><div class="bar-track" aria-hidden="true"><div class="bar-fill" style="background:${field==='themes'?'#c6281e':'#2448c6'};width:${r.count/a.total*100}%"></div></div></div>`).join(''):'<p class="scope-empty">Inga arbeten i urvalet.</p>';
 $$(`${target} [data-rank-label]`).forEach(b=>b.addEventListener('click',()=>{state.field=b.dataset.rankField;state.category=b.dataset.rankLabel;render();}));
}
function renderTrends(){
 if(!data)return;
 const filters={...state,year:'all'},work=selectWorks(records,tracks,filters),years=annualSeries(work,tracks,filters,state.field,state.category).filter(y=>state.balance!=='common'||periodYears(state.period).includes(y.year)),groups=groupsFor(tracks,filters).filter(g=>state.groups===null||state.groups.includes(g.id));
 const max=state.metric==='percent'?100:Math.max(1,...years.flatMap(y=>y.groups.map(g=>g.count)));
 $('#nr-trend-charts').innerHTML=groups.map(g=>{
  const points=years.map(y=>({year:y.year,...y.groups.find(x=>x.id===g.id)})),W=310,H=155,left=38,right=20,top=22,bottom=35,x=i=>left+i/Math.max(1,years.length-1)*(W-left-right),y=n=>H-bottom-n/max*(H-top-bottom);
  let path='',previous=false;points.forEach((p,i)=>{if(!p.total){previous=false;return;}path+=(previous?'L':'M')+x(i)+','+y(state.metric==='percent'?p.percent:p.count)+' ';previous=true;});
  const svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(g.label)}: ${esc(state.category)}. Exakta årsdata finns i tabellen."><line x1="${left}" x2="${W-right}" y1="${y(0)}" y2="${y(0)}" stroke="#cbc6bc"/><line x1="${left}" x2="${W-right}" y1="${y(max)}" y2="${y(max)}" stroke="#e6e0d4"/><text x="${left-7}" y="${y(max)+4}" text-anchor="end">${state.metric==='percent'?'100 %':num(max)}</text><text x="${left-7}" y="${y(0)+4}" text-anchor="end">0</text><path d="${path}" fill="none" stroke="${tone(g)}" stroke-width="2.5"/>${points.map((p,i)=>`<text x="${x(i)}" y="${H-10}" text-anchor="middle">${p.year}${p.year===2026?'*':''}</text>${p.total?`<circle cx="${x(i)}" cy="${y(state.metric==='percent'?p.percent:p.count)}" r="4.5" fill="${p.year===2026?'#fffdf8':tone(g)}" stroke="${tone(g)}" stroke-width="2"><title>${p.year}: ${p.count}/${p.total} (${num(p.percent)} %)</title></circle>`:''}`).join('')}</svg>`;
  return `<article class="nr-trend-card"><h4>${esc(g.label)}</h4>${svg}<p>${points.map(p=>`${p.year}: ${p.total?p.count+'/'+p.total:'—'}`).join(' · ')}</p></article>`;
 }).join('')||'<p>Välj minst en grupp.</p>';
 $('#nr-trend-table').innerHTML=table(['År','Grupp','Träffar','Nämnare','Andel'],years.flatMap(y=>y.groups.map(g=>[y.year+(y.year===2026?'*':''),g.label,g.total?g.count:'—',g.total,g.total?num(g.percent)+' %':'—'])));

}
function renderStories(){
 const field=state.field in METHOD_FIELDS?state.field:'designs',methods=aggregateWorks(selected,field),first=methods.ranking.find(r=>r.label!==MISSING),missing=methods.ranking.find(r=>r.label===MISSING)?.count||0;
 $('#nr-method-heading').textContent=METHOD_FIELDS[field];
 $('#nr-method-reading').innerHTML=first?`<h4>${esc(first.label)} är vanligast bland uttryckliga koder i detta lager.</h4><p>${first.count}/${methods.total} arbeten (${num(first.count/methods.total*100)} %). ${missing}/${methods.total} saknar uppgift i lagret. Flera koder kan finnas i samma arbete.</p><p class="nr-fine">${esc(layerNote)}</p>`:'<p>Ingen uttrycklig uppgift i detta lager för det valda urvalet.</p>';
}

function renderCountryReading(){
 const countries=['Finland','Sverige'];
 $('#nr-country-reading').innerHTML=countries.map(country=>{
  const works=selected.filter(r=>r.country===country),a=aggregateWorks(works,'collection'),design=a.ranking.find(r=>r.label!==MISSING),bild=works.filter(r=>r.track_ids.some(id=>tracks.find(t=>t.id===id).discipline==='bild')).length;
  const institutions=[...new Set(tracks.filter(t=>works.some(r=>r.track_ids.includes(t.id))).map(t=>t.university_label))];
  return `<article class="nr-working-card"><h4>${country}</h4>${institutions.length?`<p class="nr-fine">${esc(institutions.join(' · '))}</p>`:''}<strong>${works.length} arbeten</strong><p>${works.length?`${bild} bildarbeten och ${works.length-bild} slöjdarbeten i det aktuella urvalet. ${design?`Vanligaste uttryckliga insamlingskod: ${esc(design.label)}, ${design.count}/${works.length} (${num(design.count/works.length*100)} %).`:''} ${a.known_authors?`Par-/grupparbete: ${a.coauthored}/${a.known_authors} med känd författaruppgift (${num(a.coauthored/a.known_authors*100)} %).`:''}`:'Inget underlag med dessa val. Detta är inte ett belägg för avsaknad av forskning.'}</p></article>`;
 }).join('');
}
function renderWorkingForms(){
 const a=aggregateWorks(selected),unknownAuthors=a.total-a.known_authors;
 $('#nr-working-forms').innerHTML=[['Par- och grupparbeten',a.known_authors?num(a.coauthored/a.known_authors*100)+' %':'—',`${a.coauthored} av ${a.known_authors} arbeten med känd författaruppgift har flera författare. ${unknownAuthors} saknar säker uppgift.`],['Individuellt angivna arbetspoäng',`${a.known_credits} / ${a.total}`,'Omfattning som gäller enbart det enskilda arbetet. Utbildningsregler har inte fyllt tomma värden.'],['Sidantal · median',a.median_pages===null?'—':num(a.median_pages),`Filens sidordning för ${a.total} arbeten. Separata PDF-bilagor räknas inte som nya arbeten.`]].map(([label,value,text])=>`<article class="nr-working-card"><h4>${esc(label)}</h4><strong>${esc(value)}</strong><p>${esc(text)}</p></article>`).join('');
}
function renderWorks(){
 const q=$('#nr-search').value.trim().toLocaleLowerCase('sv'),mode=$('#nr-evidence-filter').value;
 const rows=selected.filter(r=>(!state.work||r.id===state.work)&&(!q||[r.original_title,r.title_sv,r.authors,r.summary_sv].join(' ').toLocaleLowerCase('sv').includes(q))&&(mode!=='category'||valuesFor(r,state.field).includes(state.category))&&(mode!=='limited'||r.coding_confidence==='limited')&&(mode!=='matrix'||(state.matrixTheme&&r.themes.includes(state.matrixTheme)&&valuesFor(r,state.matrixField).includes(state.matrixCategory))));
 $('#nr-results-count').textContent=`Visar ${Math.min(shown,rows.length)} av ${rows.length} arbeten i urvalet.`;
 $('#nr-work-list').innerHTML=rows.slice(0,shown).map(r=>{
  const ts=r.track_ids.map(id=>tracks.find(t=>t.id===id)),color=colors[ts[0].university],translated=r.title_sv&&r.title_sv!==r.original_title;
  const credit=r.credits===null?'Poänguppgift saknas':`${r.credits} hp/sp/ECTS${r.credit_scope==='thesis_and_seminar'?' · seminarium + avhandling':''}`;
  return `<article class="nr-work-card" id="work-${r.id}" style="--group-color:${color}"><p class="eyebrow">${esc(ts.map(t=>t.short_label).join(' / '))} · ${r.year}</p><p class="nr-author">${esc(r.authors||'Författaruppgift saknas')}</p><h3 lang="${esc(r.language||'und')}">${esc(r.original_title)}</h3>${translated?`<p class="translated-title"><span class="translation-label">Svensk titel · AI-översättning</span>${esc(r.title_sv)}</p>`:''}<p class="nr-abstract-label">Analysreferat · AI-assisterat, inte författarens abstrakt</p><p>${esc(r.summary_sv)}</p><p class="nr-fine">Analytikerns temakoder</p><div class="nr-tags">${r.themes.map(t=>`<span>${esc(t)}</span>`).join('')}</div><p class="nr-fine">Forskningsmiljö: ${esc(r.research_settings.join(' / '))}. ${r.coding_confidence==='limited'?'Begränsat källunderlag; läs osäkerhetsnoteringen nedan.':''}</p><p class="nr-fine">${esc(degreeNames[r.degree_level]||r.degree_level)} · ${esc(credit)} · ${r.pdf_page_count} PDF-sidor</p><details><summary>Metoder och källbelägg</summary>${Object.entries(methodLayers(r)).map(([key,values])=>`<p class="nr-fine"><strong>${esc(METHOD_FIELDS[key])}:</strong> ${esc(values.join(' · '))}</p>`).join('')}<p class="nr-fine">Äldre huvudkod, för spårbarhet: ${esc(r.primary_method)}</p>${r.methods.map(m=>`<div class="nr-evidence-item"><strong>${esc(m.label)}</strong><small>${esc(methodKinds[m.kind]||m.kind)} · ${m.pdf_page?'PDF-sida '+m.pdf_page:'författarens abstrakt, tidigare källkontroll'} · parafras</small><p>${esc(m.evidence_sv)}</p></div>`).join('')}<p class="nr-fine">${esc(r.method_note_sv)}</p><p class="nr-fine">${esc(r.degree_evidence_sv||'Ingen individuell nivåuppgift kunde fastställas.')} ${esc(r.year_note_sv||'')}</p>${r.year_conflict?'<p class="nr-fine">Katalogår och källans år behöver skiljas åt; korrigerat källår används i analysen.</p>':''}${r.source_url?`<p><a href="${esc(r.source_url)}" target="_blank" rel="noopener">Granska den offentliga källan ↗</a></p>`:'<p class="nr-fine">Analyserad från den levererade lokala PDF-filen. Originalfilen publiceras inte här.</p>'}</details><p class="nr-correction"><a href="${esc(correctionUrl(r))}" target="_blank" rel="noopener">Föreslå rättelse för detta arbete ↗</a><small>Öppnar ett förifyllt GitHub-formulär. Du granskar och skickar själv.</small></p></article>`;
 }).join('')||'<p class="scope-empty">Inga arbeten matchar dessa val. Prova en annan avgränsning.</p>';
 $('#nr-more').hidden=shown>=rows.length;$('#nr-work-clear').hidden=!state.work;$('#nr-work-focus').textContent=state.work?'En länkad källpost visas.':mode==='matrix'?'Cellurval: '+state.matrixTheme+' × '+state.matrixCategory:'';syncUrl();
}
function renderContext(){
 $('#nr-context-sources').innerHTML=(data.context.sources||[]).map((s,i)=>`<details class="nr-context-source"><summary><strong>${esc(s.institution)}</strong> · källa ${i+1}</summary><p>${esc(s.claim_sv)}</p><small>${esc(s.limits)}</small><p><a href="${esc(s.url)}" target="_blank" rel="noopener">Officiell utbildningskälla ↗</a></p></details>`).join('');
}
function renderAudit(){
 $('#nr-coverage-notes').innerHTML=data.metadata.selection_notes_sv.map(p=>`<p>${esc(p)}</p>`).join('')+`<p>${esc(data.metadata.unit_sv)}</p><p>${esc(data.metadata.source_sv)}</p><p>${esc(data.metadata.privacy_sv)}</p>`;
 $('#nr-coverage-table').innerHTML=table(['Linje','År','Levererade filer','Unika arbeten efter källkontroll','Individuella arbetspoäng kända'],data.coverage.map(c=>[tracks.find(t=>t.id===c.track_id).short_label,c.year,c.files,c.delivered||c.works?c.works:'Saknat årsunderlag',c.known_credits]));
 $('#nr-audit').innerHTML=`<p>${data.metadata.file_count} filer, ${data.metadata.unique_pdf_count} unika PDF-filer och ${data.metadata.unique_work_candidates} arbeten före årskontroll. ${data.audit.duplicate_file_count} extra byte-identisk kopia och ${data.audit.multi_pdf_work_count} arbeten med separata PDF-delar har hanterats.</p>`+(data.audit.outside_period.length?'<h4>Arbeten utanför den valda perioden</h4><ul>'+data.audit.outside_period.map(r=>`<li>${esc(r.title)} · källår ${r.year}; mappår ${r.folder_years.join(', ')}.</li>`).join('')+'</ul>':'')+(data.audit.track_corrections.length?'<h4>Källstödda korrigeringar av linjetillhörighet</h4><ul>'+data.audit.track_corrections.map(r=>`<li>${esc(r.title)} → ${esc(tracks.find(t=>t.id===r.to_track_id).short_label)}. ${esc(r.note_sv)}</li>`).join('')+'</ul>':'');
 $('#nr-audit').innerHTML+=(data.audit.other_programmes||[]).length?'<h4>En annan utbildning i de levererade mapparna</h4>'+data.audit.other_programmes.map(r=>`<details><summary>${esc(r.title)} · ${r.year}</summary><p>${esc(r.programme_sv)}. ${esc(r.reason_sv)}</p><p>Analysreferat: ${esc(r.summary_sv)}</p><p class="nr-fine">Hålls utanför jämförelsens nämnare. PDF-sidor som stöder läsningen: ${r.source_pdf_pages.join(', ')}.</p></details>`).join(''):'';
}
function syncUrl(){
 const url=new URL(location.href);url.search='';for(const [key,value] of Object.entries(state))if(value!==null&&value!=='')url.searchParams.set(key,Array.isArray(value)?value.join(','):value);history.replaceState(null,'',url);
}
function selectionText(){return $('#nr-selection').textContent+(state.balance==='common'?' · samma linjer '+state.period.replace('-','–'):'');}
function renderCoverage(){
 const base=selectWorks(records,tracks,{...state,year:'all',balance:'all'}),common=new Set(commonTracks(records,tracks,state)),years=periodYears(state.period),activeGroups=groupsFor(tracks,state).filter(g=>state.groups===null||state.groups.includes(g.id)),ids=new Set(activeGroups.flatMap(g=>g.track_ids));
 const eligible=matchingTracks(tracks,state).filter(t=>ids.has(t.id));
 $('#nr-live-coverage').innerHTML='<table class="nr-coverage-grid"><thead><tr><th scope="col">Linje</th>'+[2024,2025,2026].map(y=>`<th scope="col">${y}${y===2026?'*':''}</th>`).join('')+'<th scope="col">Gemensam linje<br>'+years.join(' / ')+'</th></tr></thead><tbody>'+eligible.map(t=>`<tr><th scope="row">${esc(t.short_label)}</th>${[2024,2025,2026].map(year=>{const source=data.coverage.find(c=>c.track_id===t.id&&c.year===year),total=records.filter(r=>r.track_ids.includes(t.id)&&r.year===year).length,n=base.filter(r=>r.track_ids.includes(t.id)&&r.year===year).length;return `<td class="${total?'has-records':'no-records'}"><strong>${total?n+' i urvalet':'Saknat årsunderlag'}</strong><small>${total} arbeten totalt · ${source?.files||0} levererade filer</small></td>`;}).join('')}<td>${common.has(t.id)?'Ja':'Nej'}${state.balance==='common'&&!common.has(t.id)?'<small>Utesluts från årsserien</small>':''}</td></tr>`).join('')+'</tbody></table>';
 const before=selectWorks(records,tracks,{...state,balance:'all'}).filter(r=>years.includes(r.year));
 $('#nr-panel-note').textContent=state.balance==='common'?`Samma linjer ${years.join(', ')}: ${eligible.filter(t=>common.has(t.id)).length} av ${eligible.length} linjer har minst ett arbete varje år efter övriga filter. ${selected.length} av ${before.length} arbeten i periodens aktuella urval kvarstår. Samma linjer innebär inte samma personer eller lika stora årgångar. Saknat underlag fylls inte med noll.`:'Alla levererade linjer ingår. Välj ”Samma linjer varje år” för en årsserie med oförändrad linjesammansättning. Saknade årsmappar säger inget säkert om utbildningens totala produktion.';
 $('#nr-sticky-summary').textContent=`${selected.length} arbeten · ${state.balance==='common'?state.period.replace('-','–'):state.year==='all'?'2024–2026':state.year}`;
}
function renderMatrix(){
 $('#nr-matrix-preview-panel').hidden=true;
 for(const [key,id] of [['matrixField','nr-matrix-field'],['matrixNormalization','nr-matrix-normalization'],['matrixLimit','nr-matrix-limit']])$('#'+id).value=state[key];
 const matrix=themeMethodMatrix(selected,state.matrixField,state.matrixNormalization,Number(state.matrixLimit));
 $('#nr-matrix').innerHTML=matrix.total?'<table class="nr-matrix-table"><caption>'+esc(METHOD_FIELDS[state.matrixField])+' × teman · '+matrix.total+' arbeten</caption><thead><tr><th scope="col">Tema</th>'+matrix.columns.map(c=>`<th scope="col">${esc(c.label)}<small>${c.count}/${matrix.total} arbeten</small></th>`).join('')+'</tr></thead><tbody>'+matrix.rows.map(row=>`<tr><th scope="row">${esc(row.label)}<small>${row.count} arbeten med temat</small></th>${row.cells.map(cell=>{const active=state.matrixTheme===row.label&&state.matrixCategory===cell.category;return `<td><button type="button" data-matrix-theme="${esc(row.label)}" data-matrix-category="${esc(cell.category)}" ${cell.count?'':'disabled'} aria-pressed="${active}" aria-label="${esc(row.label+' och '+cell.category)}: ${cell.count} av ${cell.denominator}, ${cell.percent===null?'ingen nämnare':num(cell.percent)+' procent'}. ${cell.count?'Visa arbetena.':''}" style="--cell-opacity:${cell.percent===null?0:Math.max(.04,cell.percent/100*.38)}"><strong>${cell.percent===null?'—':cell.count+' / '+cell.denominator}</strong><small>${cell.percent===null?'Saknad nämnare':num(cell.percent)+' %'}</small></button></td>`;}).join('')}</tr>`).join('')+'</tbody></table>':'<p>Inga arbeten i detta urval. Ingen matris beräknas.</p>';
 $$('[data-matrix-theme]').forEach(b=>b.addEventListener('click',()=>{state.matrixTheme=b.dataset.matrixTheme;state.matrixCategory=b.dataset.matrixCategory;state.work='';state.search='';$('#nr-search').value='';state.evidence='matrix';$('#nr-evidence-filter').value='matrix';shown=12;const url=new URL(location.href);url.hash='arbetena';history.replaceState(null,'',url);renderMatrix();renderWorks();$('#arbetena').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});$('#nr-results-count').setAttribute('tabindex','-1');$('#nr-results-count').focus({preventScroll:true});}));
 const count=selected.filter(r=>r.themes.includes(state.matrixTheme)&&valuesFor(r,state.matrixField).includes(state.matrixCategory)).length;
 $('#nr-matrix-selection').textContent=state.matrixTheme?`${state.matrixTheme} × ${state.matrixCategory}: ${count} arbeten. Cellvalet filtrerar källistan nedan.`:'Inget cellval. Kolumnerna ordnas efter förekomst i det aktuella urvalet; välj ”Alla” för att se även små kategorier.';
 $('#nr-matrix-clear').hidden=!state.matrixTheme;
}
async function exportChart(){
 const status=$('#nr-export-status');status.textContent='Skapar PNG…';try{const rows=compareGroups(selected,tracks,state,state.field,state.category).map(g=>({...g,color:tone(g)}));const result=await chartPng({title:state.category,subtitle:fieldLabels[state.field]+' · '+(state.metric==='percent'?'Andelar, 0–100 %':'Antal, gemensam antalsskala')+' · '+selectionText(),rows,metric:state.metric,note:$('#nr-chart-note').textContent,filename:'examensarbeten-jamforelse.png'});$('#nr-export-preview').src=result.preview;$('#nr-export-save').href=result.preview;$('#nr-export-preview-panel').hidden=false;status.textContent='PNG skapad med urval, nämnare och källnot.';}catch(error){status.textContent='Kunde inte skapa PNG. CSV finns som alternativ.';console.error(error);}
}
function exportChartCsv(){const rows=compareGroups(selected,tracks,state,state.field,state.category);downloadCsv([['Urval','Lager','Kategori','Grupp','Träffar','Nämnare','Andel %'],...rows.map(g=>[selectionText(),fieldLabels[state.field],state.category,g.label,g.count,g.total,g.percent])],'examensarbeten-jamforelse.csv');}
function exportMatrixCsv(){const matrix=themeMethodMatrix(selected,state.matrixField,state.matrixNormalization,Number(state.matrixLimit));downloadCsv([['Urval','Metodlager','Tema','Metodkategori','Träffar','Nämnare','Andel %','Nämnartyp'],...matrix.rows.flatMap(r=>r.cells.map(c=>[selectionText(),METHOD_FIELDS[state.matrixField],r.label,c.category,c.count,c.denominator,c.percent,state.matrixNormalization]))],'examensarbeten-teman-metoder.csv');}

async function exportMatrixPng(){const status=$('#nr-matrix-export-status');status.textContent='Skapar matris-PNG…';try{const matrix=themeMethodMatrix(selected,state.matrixField,state.matrixNormalization,Number(state.matrixLimit));const result=await matrixPng({matrix,title:METHOD_FIELDS[state.matrixField]+' × teman',subtitle:selectionText(),filename:'examensarbeten-matris.png'});$('#nr-matrix-preview').src=result.preview;$('#nr-matrix-save').href=result.preview;$('#nr-matrix-preview-panel').hidden=false;status.textContent='Matris-PNG skapad.';}catch(error){status.textContent='Kunde inte skapa matris-PNG. CSV finns som alternativ.';console.error(error);}}
