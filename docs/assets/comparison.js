import {matchingTracks,groupsFor,selectWorks,aggregateWorks,compareGroups,annualSeries,valuesFor} from './newsroom-math.mjs?v=20261109-2';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:1}).format(n);
const colors={konstfack:'#c6281e',aalto:'#2448c6',lappland:'#14776b',uef:'#896400',helsingfors:'#725293',turku:'#151515','abo-akademi':'#a74d12',Finland:'#2448c6',Sverige:'#c6281e'};
const trackColors={'konstfack-bild-grundskola':'#c6281e','konstfack-slojd-grundskola':'#725293','konstfack-bild-gymnasium':'#a74d12'};
const fieldLabels={themes:'Teman',primary_method:'Huvudsaklig forskningsdesign',techniques:'Insamling och analys',research_settings:'Forskningsmiljö'};
const degreeNames={master:'Magisterexamen',advanced_professional:'Avancerad yrkesexamen',bachelor:'Grundnivå',unknown:'Nivåuppgift saknas'};
const methodKinds={design:'Forskningsdesign',insamling:'Datainsamling',analys:'Analys',perspektiv:'Teoretiskt perspektiv'};
let data,records,tracks,shown=12,selected=[];
let state={discipline:'all',groupBy:'university',year:'all',country:'all',university:'all',track:'all',degree:'all',credits:'all',groups:null,field:'themes',category:'',metric:'percent'};
const controls={groupBy:'nr-grouping',year:'nr-year',country:'nr-country',university:'nr-university',track:'nr-track',degree:'nr-degree',credits:'nr-credits'};
const tone=g=>trackColors[g.id]||colors[g.id]||colors[tracks.find(t=>g.track_ids?.includes(t.id))?.university]||'#2448c6';
try{const response=await fetch('data/newsroom.json?v=20261109');if(!response.ok)throw Error(`HTTP ${response.status}`);data=await response.json();records=data.records;tracks=data.tracks;init();}
catch(error){$('#nr-hero-stats').innerHTML='<p class="error-state">Analysen kunde inte laddas. Försök ladda om sidan.</p>';console.error(error);}

function init(){
 const params=new URLSearchParams(location.search);
 for(const k of Object.keys(state))if(params.has(k))state[k]=k==='groups'?params.get(k).split(',').filter(Boolean):params.get(k);
 for(const [key,allowed] of Object.entries({discipline:['all','bild','slojd'],groupBy:['university','track','country'],field:['themes','primary_method','techniques','research_settings'],metric:['percent','count']}))if(!allowed.includes(state[key]))state[key]=allowed[0];
 syncControls();
 for(const [key,id] of Object.entries(controls))$('#'+id).addEventListener('change',()=>{state[key]=$('#'+id).value;state.groups=null;shown=12;syncControls();render();});
 $('#nr-filters').addEventListener('submit',e=>e.preventDefault());
 $$('[data-subject]').forEach(b=>b.addEventListener('click',()=>{state.discipline=b.dataset.subject;state.groups=null;shown=12;syncControls();render();}));
 $$('[data-field]').forEach(b=>b.addEventListener('click',()=>{state.field=b.dataset.field;state.category='';render();}));
 $$('[data-metric]').forEach(b=>b.addEventListener('click',()=>{state.metric=b.dataset.metric;render();}));
 $('#nr-category').addEventListener('change',()=>{state.category=$('#nr-category').value;render();});
 $('#nr-all-groups').addEventListener('click',()=>{state.groups=null;render();});
 $('#nr-reset').addEventListener('click',()=>{state={discipline:'all',groupBy:'university',year:'all',country:'all',university:'all',track:'all',degree:'all',credits:'all',groups:null,field:'themes',category:'',metric:'percent'};shown=12;$('#nr-search').value='';$('#nr-evidence-filter').value='all';syncControls();render();});
 $('#nr-search').addEventListener('input',()=>{shown=12;renderWorks();});$('#nr-evidence-filter').addEventListener('change',()=>{shown=12;renderWorks();});
 $('#nr-more').addEventListener('click',()=>{shown+=12;renderWorks();});
 $('#nr-updated').textContent='Kontrollerat '+data.metadata.checked_sv;
 const all=aggregateWorks(records),coauthored=all.known_authors?num(all.coauthored/all.known_authors*100)+' %':'—';
 $('#nr-hero-stats').innerHTML=[[records.length,'unika arbeten i perioden'],[new Set(records.flatMap(r=>r.track_ids.map(id=>tracks.find(t=>t.id===id).university))).size,'lärosäten i analysen'],[data.metadata.file_count,'levererade PDF-filer'],[coauthored,'par-/grupparbeten bland kända uppgifter']].map(([value,label])=>`<p><strong>${value}</strong><span>${esc(label)}</span></p>`).join('');
 $('#nr-data-status').hidden=data.metadata.complete;$('#nr-data-status').textContent=`Analys pågår: ${data.metadata.analysed_work_count} av ${data.metadata.unique_work_candidates} arbeten har kodats. Detta är en lokal förhandsversion.`;
 renderContext();renderAudit();render();
 let timer;window.addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(()=>renderTrends(),120);});
}
function options(select,items,value){select.innerHTML='<option value="all">Alla</option>'+items.map(i=>`<option value="${esc(i.id)}">${esc(i.label)}</option>`).join('');select.value=items.some(i=>i.id===value)?value:'all';return select.value;}
function syncControls(){
 const base=matchingTracks(tracks,{...state,university:'all',track:'all'}),unis=[...new Map(base.map(t=>[t.university,{id:t.university,label:t.university_label}])).values()];
 state.university=options($('#nr-university'),unis,state.university);
 const ts=matchingTracks(tracks,{...state,track:'all'});state.track=options($('#nr-track'),ts.map(t=>({id:t.id,label:t.short_label})),state.track);
 for(const [key,id] of Object.entries(controls)){if([...$('#'+id).options].some(o=>o.value===state[key]))$('#'+id).value=state[key];else {state[key]='all';$('#'+id).value='all';}}
}
function render(){
 selected=selectWorks(records,tracks,state);const a=aggregateWorks(selected,state.field),allLabels=aggregateWorks(records,state.field).ranking;
 const previous=state.category;if(!allLabels.some(c=>c.label===previous))state.category=a.ranking[0]?.label||allLabels[0]?.label||'';
 $('#nr-category').innerHTML=allLabels.map(c=>`<option value="${esc(c.label)}">${esc(c.label)}</option>`).join('');$('#nr-category').value=state.category;
 for(const [attr,value] of [['subject',state.discipline],['field',state.field],['metric',state.metric]])$$(`[data-${attr}]`).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[attr]===value)));
 const groups=groupsFor(tracks,state);if(state.groups!==null)state.groups=state.groups.filter(id=>groups.some(g=>g.id===id));
 $('#nr-groups').innerHTML=groups.map(g=>`<label class="nr-group-chip" style="--group-color:${tone(g)}"><input type="checkbox" data-group="${esc(g.id)}" ${state.groups===null||state.groups.includes(g.id)?'checked':''}><span>${esc(g.label)}</span></label>`).join('');
 $$('[data-group]').forEach(c=>c.addEventListener('change',()=>{state.groups=$$('[data-group]').filter(c=>c.checked).map(c=>c.dataset.group);shown=12;const id=c.dataset.group;render();document.querySelector(`[data-group="${id}"]`)?.focus();}));
 const active=state.groups===null?groups:groups.filter(g=>state.groups.includes(g.id)),universities=new Set(selected.flatMap(r=>r.track_ids.map(id=>tracks.find(t=>t.id===id).university)));
 $('#nr-selection').textContent=`${selected.length} unika arbeten · ${active.length} valda ${state.groupBy==='track'?'linjer':state.groupBy==='country'?'landsurval':'lärosäten'} · ${state.year==='all'?'2024–2026':state.year} · ${state.discipline==='all'?'bild och slöjd':state.discipline==='bild'?'bild':'slöjd'}`;
 const notes=[];
 const unknownLevel=selected.filter(r=>r.degree_level==='unknown').length;
 if(unknownLevel)notes.push(`${unknownLevel} arbeten saknar säkert fastställd individuell nivåuppgift. De behålls i grundurvalet och kan avgränsas med nivåfiltret.`);
 if(state.year==='all'||state.year==='2026')notes.push('2026 är ett pågående år. Saknade årsmappar betyder saknat underlag, inte noll producerade arbeten.');
 if(state.groupBy==='country'||new Set(selected.map(r=>r.country)).size>1)notes.push('Sverigedelen består av Konstfack; Finland av upp till sex lärosäten. En skillnad är inte ett belägg för en nationell undervisningskultur.');
 if(a.unknown_design)notes.push(`${a.unknown_design} arbeten saknar en fastställbar huvuddesign och visas som en egen kategori.`);
 if(state.credits!=='all')notes.push('Poängurvalet omfattar bara den typ av individuella källuppgifter som är vald. Saknad poänguppgift har inte ersatts med en utbildningsregel.');
 $('#nr-scope-note').hidden=!notes.length;$('#nr-scope-note').textContent=notes.join(' ');
 renderComparison();renderDistribution('themes','#nr-theme-ranking');renderDistribution('primary_method','#nr-method-ranking');renderTrends();renderStories();renderWorkingForms();renderCountryReading();renderWorks();
 const url=new URL(location.href);url.search='';for(const [key,value] of Object.entries(state))if(value!==null)url.searchParams.set(key,Array.isArray(value)?value.join(','):value);history.replaceState(null,'',url);
}
function renderComparison(){
 const oldWidths=new Map($$('#nr-comparison-chart [data-plot-group]').map(el=>[el.dataset.plotGroup,el.querySelector('.bar-fill')?.style.width||'0%']));
 const rows=compareGroups(selected,tracks,state,state.field,state.category),max=state.metric==='percent'?100:Math.max(1,...rows.map(g=>g.count));
 $('#nr-chart-title').textContent=state.category||'Välj kategori';
 $('#nr-comparison-chart').innerHTML=rows.length?rows.map(g=>`<div class="nr-group-row" data-plot-group="${esc(g.id)}"><div class="nr-group-name">${esc(g.label)}<small>n = ${g.total}${g.limited?' · '+g.limited+' med begränsad kodning':''}</small></div><div class="bar-track" role="img" aria-label="${esc(g.label)}: ${g.total?g.count+' av '+g.total+', '+num(g.percent)+' procent':'inget underlag'}"><div class="bar-fill" style="background:${tone(g)};width:${g.total?(state.metric==='percent'?g.percent:g.count)/max*100:0}%"></div></div><div class="nr-group-value">${g.total?(state.metric==='percent'?num(g.percent)+' %':g.count+' st.'):'—'}<small>${g.total?g.count+' / '+g.total:'Inget underlag'}</small></div></div>`).join(''):'<p class="scope-empty">Välj minst en grupp för att jämföra.</p>';
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches)$$('#nr-comparison-chart [data-plot-group]').forEach(el=>{const fill=el.querySelector('.bar-fill');fill.animate([{width:oldWidths.get(el.dataset.plotGroup)||'0%'},{width:fill.style.width}],{duration:320,easing:'cubic-bezier(.2,.7,.2,1)'});});
 $('#nr-chart-note').textContent=`${state.field==='primary_method'?'En huvuddesign per arbete.':'Flera kategorier kan förekomma i samma arbete; summan kan överstiga 100 %.'} Andelar räknas inom varje grupp i det aktuella urvalet. Grupperna visas i en fast ordning, inte som en kvalitetsranking. En tom nämnare visas med ett streck.`;
 $('#nr-comparison-table').innerHTML=table(['Grupp','Träffar','Nämnare','Andel'],rows.map(g=>[g.label,g.total?g.count:'—',g.total,g.total?num(g.percent)+' %':'—']));
}
function table(head,rows){return '<table><thead><tr>'+head.map(h=>`<th scope="col">${esc(h)}</th>`).join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map((v,i)=>i?`<td>${esc(v)}</td>`:`<th scope="row">${esc(v)}</th>`).join('')+'</tr>').join('')+'</tbody></table>';}
function renderDistribution(field,target){
 const a=aggregateWorks(selected,field);$(target).innerHTML=a.total?a.ranking.map(r=>`<div class="nr-distribution-row"><button type="button" data-rank-field="${field}" data-rank-label="${esc(r.label)}">${esc(r.label)}</button><span>${r.count} / ${a.total}<br>${num(r.count/a.total*100)} %</span><div class="bar-track" aria-hidden="true"><div class="bar-fill" style="background:${field==='themes'?'#c6281e':'#2448c6'};width:${r.count/a.total*100}%"></div></div></div>`).join(''):'<p class="scope-empty">Inga arbeten i urvalet.</p>';
 $$(`${target} [data-rank-label]`).forEach(b=>b.addEventListener('click',()=>{state.field=b.dataset.rankField;state.category=b.dataset.rankLabel;render();}));
}
function renderTrends(){
 if(!data)return;
 const filters={...state,year:'all'},work=selectWorks(records,tracks,filters),years=annualSeries(work,tracks,filters,state.field,state.category),groups=groupsFor(tracks,filters).filter(g=>state.groups===null||state.groups.includes(g.id));
 const max=state.metric==='percent'?100:Math.max(1,...years.flatMap(y=>y.groups.map(g=>g.count)));
 $('#nr-trend-charts').innerHTML=groups.map(g=>{
  const points=years.map(y=>({year:y.year,...y.groups.find(x=>x.id===g.id)})),W=310,H=155,left=38,right=20,top=22,bottom=35,x=i=>left+i/2*(W-left-right),y=n=>H-bottom-n/max*(H-top-bottom);
  let path='',previous=false;points.forEach((p,i)=>{if(!p.total){previous=false;return;}path+=(previous?'L':'M')+x(i)+','+y(state.metric==='percent'?p.percent:p.count)+' ';previous=true;});
  const svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(g.label)}: ${esc(state.category)}. Exakta årsdata finns i tabellen."><line x1="${left}" x2="${W-right}" y1="${y(0)}" y2="${y(0)}" stroke="#cbc6bc"/><line x1="${left}" x2="${W-right}" y1="${y(max)}" y2="${y(max)}" stroke="#e6e0d4"/><text x="${left-7}" y="${y(max)+4}" text-anchor="end">${state.metric==='percent'?'100 %':num(max)}</text><text x="${left-7}" y="${y(0)+4}" text-anchor="end">0</text><path d="${path}" fill="none" stroke="${tone(g)}" stroke-width="2.5"/>${points.map((p,i)=>`<text x="${x(i)}" y="${H-10}" text-anchor="middle">${p.year}${p.year===2026?'*':''}</text>${p.total?`<circle cx="${x(i)}" cy="${y(state.metric==='percent'?p.percent:p.count)}" r="4.5" fill="${p.year===2026?'#fffdf8':tone(g)}" stroke="${tone(g)}" stroke-width="2"><title>${p.year}: ${p.count}/${p.total} (${num(p.percent)} %)</title></circle>`:''}`).join('')}</svg>`;
  return `<article class="nr-trend-card"><h4>${esc(g.label)}</h4>${svg}<p>${points.map(p=>`${p.year}: ${p.total?p.count+'/'+p.total:'—'}`).join(' · ')}</p></article>`;
 }).join('')||'<p>Välj minst en grupp.</p>';
 $('#nr-trend-table').innerHTML=table(['År','Grupp','Träffar','Nämnare','Andel'],years.flatMap(y=>y.groups.map(g=>[y.year+(y.year===2026?'*':''),g.label,g.total?g.count:'—',g.total,g.total?num(g.percent)+' %':'—'])));

}
function renderStories(){
 const methods=aggregateWorks(selected,'primary_method'),first=methods.ranking[0];
 $('#nr-method-reading').innerHTML=first?`<h4>${esc(first.label)} förekommer oftast i detta urval.</h4><p>${first.count} av ${methods.total} arbeten (${num(first.count/methods.total*100)} %) har denna huvudkod. ${methods.ranking.slice(1,3).map(m=>`${esc(m.label)}: ${m.count}/${methods.total}`).join(' · ')}.</p><p class="nr-fine">Huvuddesign beskriver hur frågan undersöks. Intervjuer, observation eller konstnärligt arbete kan ingå i flera designer. Byt till ”Insamling & analys” för att jämföra dessa arbetssätt utan att blanda dem med teori. ${methods.unknown_design} arbeten har inte fastställbar huvuddesign.</p>`:'<p>Välj arbeten för att läsa metodmönstret.</p>';

}
function renderCountryReading(){
 const countries=['Finland','Sverige'];
 $('#nr-country-reading').innerHTML=countries.map(country=>{
  const works=selected.filter(r=>r.country===country),a=aggregateWorks(works),design=a.ranking[0],bild=works.filter(r=>r.track_ids.some(id=>tracks.find(t=>t.id===id).discipline==='bild')).length;
  return `<article class="nr-working-card"><h4>${country}${country==='Sverige'?' · Konstfack':''}</h4><strong>${works.length} arbeten</strong><p>${works.length?`${bild} bildarbeten och ${works.length-bild} slöjdarbeten i det aktuella urvalet. Vanligaste huvudkod: ${esc(design.label)}, ${design.count}/${works.length} (${num(design.count/works.length*100)} %). ${a.known_authors?`Par-/grupparbete: ${a.coauthored}/${a.known_authors} med känd författaruppgift (${num(a.coauthored/a.known_authors*100)} %).`:''}`:'Inget underlag med dessa val. Detta är inte ett belägg för avsaknad av forskning.'}</p></article>`;
 }).join('');
}
function renderWorkingForms(){
 const a=aggregateWorks(selected),unknownAuthors=a.total-a.known_authors;
 $('#nr-working-forms').innerHTML=[['Par- och grupparbeten',a.known_authors?num(a.coauthored/a.known_authors*100)+' %':'—',`${a.coauthored} av ${a.known_authors} arbeten med känd författaruppgift har flera författare. ${unknownAuthors} saknar säker uppgift.`],['Individuellt angivna arbetspoäng',`${a.known_credits} / ${a.total}`,'Omfattning som gäller enbart det enskilda arbetet. Utbildningsregler har inte fyllt tomma värden.'],['Sidantal · median',a.median_pages===null?'—':num(a.median_pages),`Filens sidordning för ${a.total} arbeten. Separata PDF-bilagor räknas inte som nya arbeten.`]].map(([label,value,text])=>`<article class="nr-working-card"><h4>${esc(label)}</h4><strong>${esc(value)}</strong><p>${esc(text)}</p></article>`).join('');
}
function renderWorks(){
 const q=$('#nr-search').value.trim().toLocaleLowerCase('sv'),mode=$('#nr-evidence-filter').value;
 const rows=selected.filter(r=>(!q||[r.original_title,r.title_sv,r.authors,r.summary_sv].join(' ').toLocaleLowerCase('sv').includes(q))&&(mode!=='category'||valuesFor(r,state.field).includes(state.category))&&(mode!=='limited'||r.coding_confidence==='limited'));
 $('#nr-results-count').textContent=`Visar ${Math.min(shown,rows.length)} av ${rows.length} arbeten i urvalet.`;
 $('#nr-work-list').innerHTML=rows.slice(0,shown).map(r=>{
  const ts=r.track_ids.map(id=>tracks.find(t=>t.id===id)),color=colors[ts[0].university],translated=r.title_sv&&r.title_sv!==r.original_title;
  const credit=r.credits===null?'Poänguppgift saknas':`${r.credits} hp/sp/ECTS${r.credit_scope==='thesis_and_seminar'?' · seminarium + avhandling':''}`;
  return `<article class="nr-work-card" style="--group-color:${color}"><p class="eyebrow">${esc(ts.map(t=>t.short_label).join(' / '))} · ${r.year}</p><p class="nr-author">${esc(r.authors||'Författaruppgift saknas')}</p><h3 lang="${esc(r.language||'und')}">${esc(r.original_title)}</h3>${translated?`<p class="translated-title"><span class="translation-label">Svensk titel · AI-översättning</span>${esc(r.title_sv)}</p>`:''}<p class="nr-abstract-label">Analysreferat · AI-assisterat, inte författarens abstrakt</p><p>${esc(r.summary_sv)}</p><p class="nr-fine">Analytikerns temakoder</p><div class="nr-tags">${r.themes.map(t=>`<span>${esc(t)}</span>`).join('')}</div><p class="nr-fine">Forskningsmiljö: ${esc(r.research_settings.join(' / '))}. ${r.coding_confidence==='limited'?'Begränsat källunderlag; läs osäkerhetsnoteringen nedan.':''}</p><p class="nr-fine">${esc(degreeNames[r.degree_level]||r.degree_level)} · ${esc(credit)} · ${r.pdf_page_count} PDF-sidor</p><details><summary>Metoder och källbelägg</summary><p class="nr-fine">Huvuddesign: <strong>${esc(r.primary_method)}</strong></p>${r.methods.map(m=>`<div class="nr-evidence-item"><strong>${esc(m.label)}</strong><small>${esc(methodKinds[m.kind]||m.kind)} · ${m.pdf_page?'PDF-sida '+m.pdf_page:'författarens abstrakt, tidigare källkontroll'} · parafras</small><p>${esc(m.evidence_sv)}</p></div>`).join('')}<p class="nr-fine">${esc(r.method_note_sv)}</p><p class="nr-fine">${esc(r.degree_evidence_sv||'Ingen individuell nivåuppgift kunde fastställas.')} ${esc(r.year_note_sv||'')}</p>${r.year_conflict?'<p class="nr-fine">Katalogår och källans år behöver skiljas åt; korrigerat källår används i analysen.</p>':''}${r.source_url?`<p><a href="${esc(r.source_url)}" target="_blank" rel="noopener">Granska den offentliga arkivposten ↗</a></p>`:'<p class="nr-fine">Analyserad från den levererade lokala PDF-filen. Originalfilen publiceras inte här.</p>'}</details></article>`;
 }).join('')||'<p class="scope-empty">Inga arbeten matchar dessa val. Prova en annan avgränsning.</p>';
 $('#nr-more').hidden=shown>=rows.length;
}
function renderContext(){
 $('#nr-context-sources').innerHTML=(data.context.sources||[]).map((s,i)=>`<details class="nr-context-source"><summary><strong>${esc(s.institution)}</strong> · källa ${i+1}</summary><p>${esc(s.claim_sv)}</p><small>${esc(s.limits)}</small><p><a href="${esc(s.url)}" target="_blank" rel="noopener">Officiell utbildningskälla ↗</a></p></details>`).join('');
}
function renderAudit(){
 $('#nr-coverage-notes').innerHTML=data.metadata.selection_notes_sv.map(p=>`<p>${esc(p)}</p>`).join('')+`<p>${esc(data.metadata.unit_sv)}</p><p>${esc(data.metadata.source_sv)}</p><p>${esc(data.metadata.privacy_sv)}</p>`;
 $('#nr-coverage-table').innerHTML=table(['Linje','År','Levererade filer','Unika arbeten efter källkontroll','Individuella arbetspoäng kända'],data.coverage.map(c=>[tracks.find(t=>t.id===c.track_id).short_label,c.year,c.files,c.delivered||c.works?c.works:'Saknat årsunderlag',c.known_credits]));
 $('#nr-audit').innerHTML=`<p>${data.metadata.file_count} filer, ${data.metadata.unique_pdf_count} unika PDF-filer och ${data.metadata.unique_work_candidates} arbeten före årskontroll. ${data.audit.duplicate_file_count} extra byte-identisk kopia och ${data.audit.multi_pdf_work_count} arbeten med separata PDF-delar har hanterats.</p>`+(data.audit.outside_period.length?'<h4>Arbeten utanför den valda perioden</h4><ul>'+data.audit.outside_period.map(r=>`<li>${esc(r.title)} · källår ${r.year}; mappår ${r.folder_years.join(', ')}.</li>`).join('')+'</ul>':'')+(data.audit.track_corrections.length?'<h4>Källstödda korrigeringar av linjetillhörighet</h4><ul>'+data.audit.track_corrections.map(r=>`<li>${esc(r.title)} → ${esc(tracks.find(t=>t.id===r.to_track_id).short_label)}. ${esc(r.note_sv)}</li>`).join('')+'</ul>':'');
 $('#nr-audit').innerHTML+=(data.audit.other_programmes||[]).length?'<h4>En annan utbildning i de levererade mapparna</h4>'+data.audit.other_programmes.map(r=>`<details><summary>${esc(r.title)} · ${r.year}</summary><p>${esc(r.programme_sv)}. ${esc(r.reason_sv)}</p><p>Analysreferat: ${esc(r.summary_sv)}</p><p class="nr-fine">Ingår inte i de nio linjernas nämnare. PDF-sidor som stöder läsningen: ${r.source_pdf_pages.join(', ')}.</p></details>`).join(''):'';
}
