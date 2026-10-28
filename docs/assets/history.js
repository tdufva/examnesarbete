import {name,selectHistory,historySeries,historyRanking} from './history-math.mjs?v=1';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:1}).format(n);
const colors={Aalto:'#2448c6',Lappland:'#c6281e',combined:'#151515'};
let dataset,records,shown=20;
const ids={from:'history-from',to:'history-to',university:'history-university',interval:'history-interval',text:'history-text',metric:'history-metric',source:'history-source',verification:'history-verification',method:'history-method',theme:'history-theme'};
const state=()=>Object.fromEntries(Object.entries(ids).map(([k,id])=>[k,$('#'+id).value]));
const signalId=s=>typeof s==='string'?s:s.id;

try{
 const response=await fetch('data/history.json');if(!response.ok)throw Error(`HTTP ${response.status}`);
 dataset=await response.json();records=dataset.records;initialize();
}catch(error){$('#history-coverage').innerHTML='<p class="error-state">Historiken kunde inte laddas. Ladda om sidan eller läs <a href="https://github.com/tdufva/examnesarbete/tree/main/docs/data">datamaterialet på GitHub</a>.</p>';console.error(error);}

function initialize(){
 const years=dataset.metadata.years,params=new URLSearchParams(location.search);
 for(const id of ['history-from','history-to'])$('#'+id).innerHTML=years.map(y=>`<option value="${y}">${y}</option>`).join('');
 $('#history-from').value=years[0];$('#history-to').value=years.at(-1);
 for(const [key,field] of [['method','methods'],['theme','themes']]){
  const ranked=historyRanking(records,key==='method'?'method_signals':'theme_signals',dataset.categories[field]);
  $('#history-'+key).innerHTML=ranked.map(c=>`<option value="${esc(c.id)}">${esc(c.label)}${c.kind?' · '+esc(c.kind):''}</option>`).join('');
 }
 for(const [key,id] of Object.entries(ids))if(params.has(key)&&[...$('#'+id).options].some(o=>o.value===params.get(key)))$('#'+id).value=params.get(key);
 if(Number($('#history-from').value)>Number($('#history-to').value))$('#history-to').value=$('#history-from').value;
 $('#history-coverage').innerHTML=['Aalto','Lappland'].map(u=>{
  const rs=selectHistory(records,{university:u,text:'all'}),years=rs.map(r=>r.year),first=Math.min(...years),last=Math.max(...years),earliest=rs.filter(r=>r.year===first);
  return `<article class="${u==='Lappland'?'lappland':''}"><p class="eyebrow">${esc(name(u))}</p><p class="history-year-range">${first}–${last}</p><p><strong>${rs.length} magisterarbeten</strong> i den hämtade samlingen · ${rs.filter(r=>r.original_abstract?.trim()).length} med abstrakt.</p><p class="chart-note">Äldsta hittade år: ${earliest.length} ${earliest.length===1?'post':'poster'}. <a href="${esc(earliest[0].source_url)}" target="_blank" rel="noopener">Granska en av de äldsta källposterna ↗</a></p>${u==='Lappland'?'<p class="chart-note">Den äldsta postens utbildningstillhörighet bygger på arkivets fält. Ingen öppen PDF fanns för en separat kontroll av försättsbladet.</p>':'<p class="chart-note">Äldre, namngivna arbeten från 2010 finns dessutom dokumenterade i en senare källförteckning. Dessa kan väljas till separat nedan.</p>'}</article>`;
 }).join('');
 $('#history-source-note').innerHTML=dataset.metadata.notes_sv.map(n=>`<p>${esc(n)}</p>`).join('')+(dataset.metadata.context_sources||[]).map(s=>`<p>${esc(s.text_sv)} <a href="${esc(s.url)}" target="_blank" rel="noopener">Källa ↗</a></p>`).join('');
 $('#history-update').textContent=`Kontrollerat ${dataset.metadata.collected_sv}. Kodregler ${dataset.metadata.rule_version}. Utbildningstillhörighet verifieras mot arkivfält, tidigare kontrollerade poster eller angivna PDF-sidor. Datamängdens år avser publiceringsåret i källan. De historiska källförteckningarnas år är sekundära citeringsuppgifter.`;
 $('#history-rules').innerHTML='<p>'+esc(dataset.metadata.coding_sv)+'</p><h3>Metoder</h3>'+dataset.categories.methods.map(c=>`<p><strong>${esc(c.label)}</strong> · ${esc(c.kind)}<br><code>${esc(c.pattern)}</code></p>`).join('')+'<h3>Teman</h3>'+dataset.categories.themes.map(c=>`<p><strong>${esc(c.label)}</strong><br><code>${esc(c.pattern)}</code></p>`).join('');
 $('#history-filters').addEventListener('submit',e=>e.preventDefault());
 $('#history-filters').addEventListener('change',e=>{if(Number($('#history-from').value)>Number($('#history-to').value)){if(e.target.id==='history-from')$('#history-to').value=$('#history-from').value;else $('#history-from').value=$('#history-to').value;}shown=20;render();});
 for(const id of ['history-method','history-theme'])$('#'+id).addEventListener('change',()=>{shown=20;render();});
 $('#history-search').addEventListener('input',()=>{shown=20;renderSources(state());});
 $('#history-source-category').addEventListener('change',()=>{shown=20;renderSources(state());});
 $('#history-more').addEventListener('click',()=>{shown+=20;renderSources(state());});
 $('#history-reset').addEventListener('click',()=>{$('#history-filters').reset();$('#history-from').value=years[0];$('#history-to').value=years.at(-1);$('#history-search').value='';$('#history-source-category').value='all';shown=20;render();});
 let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(render,120);});
 render();
}

function render(){
 const s=state(),selected=selectHistory(records,s),all=selectHistory(records,{...s,text:'all'}),abstracts=all.filter(r=>r.original_abstract?.trim()).length;
 $('#history-selection').textContent=`${s.from}–${s.to} · ${all.length} källposter · ${abstracts} med abstrakt · ${selected.length} i metod- och temaanalysens nämnare`;
 $('#history-denominator-note').textContent=(s.text==='abstract'?'Nämnaren för varje metod- och temapunkt är periodens poster med abstrakt.':'Nämnaren för varje metod- och temapunkt är alla periodens arkivposter, även de utan abstrakt. Detta kan sänka metodandelarna när text saknas.')+' I jämförelsen räknas nämnaren separat för varje universitet. Metoder och teman kan överlappa.';
 $('#history-incomplete-note').hidden=Number(s.to)<2026;
 $('#history-incomplete-note').textContent='2026 är ett pågående år, kontrollerat 28 oktober 2026. Sista tidsperioden är därför ofullständig. Äldre års täckning kan också vara ojämn.';
 const volume=historySeries(records,{...s,text:'all',category:'',metric:'count'});
 $('#history-volume').innerHTML=lineChart(volume,'Antal hämtade källposter','count');
 $('#history-volume-table').innerHTML=trendTable(volume,'Källposter och tillgängliga abstrakt',true);
 for(const [key,field] of [['method','method_signals'],['theme','theme_signals']]){
  const category=dataset.categories[key==='method'?'methods':'themes'].find(c=>c.id===s[key]),series=historySeries(records,{...s,field,category:s[key]});
  $('#history-'+key+'-chart').innerHTML=lineChart(series,category.label,s.metric)+trendReading(series,s);
  $('#history-'+key+'-table').innerHTML=trendTable(series,category.label);
  $('#history-'+key+'-ranking').innerHTML=ranking(historyRanking(selected,field,dataset.categories[key==='method'?'methods':'themes']),selected.length,key,s[key]);
 }
 for(const b of document.querySelectorAll('[data-history-category]'))b.addEventListener('click',()=>{$('#history-'+b.dataset.kind).value=b.dataset.historyCategory;render();});
 renderSources(s);
 const url=new URL(location.href);url.search='';for(const [k,v] of Object.entries(s))url.searchParams.set(k,v);history.replaceState(null,'',url);
}

function trendReading(series,s){
 return '<div class="history-trend-reading">'+series.map(group=>{
  const availableYears=selectHistory(records,{...s,university:group.university,text:'all'}).map(r=>r.year);
  const firstAvailable=Math.min(...availableYears),lastAvailable=Math.max(...availableYears);
  const periods=group.points.filter(p=>p.denominator>=10&&p.to<2026&&p.from>=firstAvailable&&p.to<=lastAvailable&&p.to-p.from+1===Number(s.interval));
  if(periods.length<2)return `<p><strong>${esc(group.label)}:</strong> Färre än två hela tidsperioder har minst tio poster i den valda nämnaren. Ingen automatisk förändringsjämförelse görs.</p>`;
  const first=periods[0],last=periods.at(-1),a=first.count/first.denominator*100,b=last.count/last.denominator*100,diff=b-a;
  return `<p><strong>${esc(group.label)}:</strong> Andelen med den valda textsignalen är ${num(a)} % (${first.count}/${first.denominator}) ${first.label} och ${num(b)} % (${last.count}/${last.denominator}) ${last.label}. Skillnad: ${diff>0?'+':''}${num(diff)} procentenheter. Jämförelsen beskriver dessa två perioder; den bevisar ingen jämn utveckling eller förändringens orsak.</p>`;
 }).join('')+(s.university==='combined'?'<p class="chart-note">Universitetens storlek och andel av det sammanslagna materialet kan ändras över tid. Välj ”Jämför” för att se om samma mönster finns inom respektive universitet.</p>':'')+'</div>';
}

function lineChart(series,title,metric){
 const W=Math.max(340,Math.min(920,$('#history-volume').clientWidth||920)),H=300,left=58,right=22,top=24,bottom=56,points=series[0]?.points||[];
 const rawMax=Math.max(1,...series.flatMap(s=>s.points.map(p=>p.value??0))),power=10**Math.floor(Math.log10(rawMax/4));
 const maximum=metric==='percent'?100:Math.max(1,Math.ceil(rawMax/4/power)*power)*4;
 const x=i=>left+(points.length<2?(W-left-right)/2:i/(points.length-1)*(W-left-right));
 const y=v=>H-bottom-v/maximum*(H-top-bottom);
 const ticks=Array.from({length:5},(_,i)=>maximum*i/4);
 const key='<div class="compare-key history-chart-key">'+series.map(s=>`<span><i class="swatch" style="background:${colors[s.university]}"></i>${esc(s.label)}</span>`).join('')+'</div>';
 const tickEvery=Math.max(1,Math.ceil(points.length/Math.max(2,Math.floor((W-left-right)/85))));
 const grid=ticks.map(t=>`<line x1="${left}" x2="${W-right}" y1="${y(t)}" y2="${y(t)}" stroke="#cbc6bc"/><text x="${left-9}" y="${y(t)+4}" text-anchor="end">${num(t)}${metric==='percent'?' %':''}</text>`).join('');
 const labels=points.map((p,i)=>i%tickEvery===0||i===points.length-1?`<text x="${x(i)}" y="${H-bottom+26}" text-anchor="middle">${esc(p.label)}</text>`:'').join('');
 const paths=series.map(s=>{
  let path='',drawing=false;
  s.points.forEach((p,i)=>{if(p.value===null){drawing=false;return;}path+=(drawing?'L':'M')+x(i)+','+y(p.value)+' ';drawing=true;});
  return `<path d="${path}" fill="none" stroke="${colors[s.university]}" stroke-width="3"${s.university==='Lappland'?' stroke-dasharray="8 4"':''}/>`+s.points.map((p,i)=>p.value===null?'':`<circle cx="${x(i)}" cy="${y(p.value)}" r="4.5" fill="${colors[s.university]}" stroke="#fffdf8" stroke-width="1.5"><title>${esc(s.label)} · ${esc(p.label)}: ${metric==='percent'?num(p.value)+' %':p.count+' arbeten'} (${p.count}/${p.denominator}); ${p.coverage}/${p.total} med abstrakt</title></circle>`).join('');
 }).join('');
 const empty=series.every(s=>s.points.every(p=>p.value===null));
 return key+(empty?'<p class="scope-empty">Inga poster i den valda nämnaren. Välj en annan period eller källavgränsning.</p>':`<svg class="history-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}. ${metric==='percent'?'Procent':'Antal'} per tidsperiod. Exakta värden finns i tabellen nedan."><title>${esc(title)}</title>${grid}${labels}${paths}</svg>`);
}

function trendTable(series,title,volume=false){
 return `<div class="history-table-scroll"><table><caption>${esc(title)}</caption><thead><tr><th scope="col">Period</th><th scope="col">Universitet</th><th scope="col">${volume?'Källposter':'Träffar'}</th>${volume?'':'<th scope="col">Nämnare</th><th scope="col">Andel</th>'}<th scope="col">Med abstrakt / arkivposter</th></tr></thead><tbody>`+series.flatMap(s=>s.points.map(p=>`<tr><th scope="row">${p.label}</th><td>${esc(s.label)}</td><td>${p.value===null?'—':p.count}</td>${volume?'':`<td>${p.denominator}</td><td>${p.denominator?num(p.count/p.denominator*100)+' %':'—'}</td>`}<td>${p.coverage} / ${p.total}</td></tr>`)).join('')+'</tbody></table></div>';
}

function ranking(rows,total,kind,selected){
 return rows.filter(r=>r.count).map(r=>`<div class="history-rank"><button type="button" data-kind="${kind}" data-history-category="${esc(r.id)}" aria-pressed="${r.id===selected}">${esc(r.label)}${r.kind?`<small>${esc(r.kind)}</small>`:''}</button><span>${r.count} / ${total}<br>${total?num(r.count/total*100)+' %':'—'}</span><div class="bar-track" aria-hidden="true"><div class="bar-fill ${kind==='theme'?'lappland':''}" style="width:${total?r.count/total*100:0}%"></div></div></div>`).join('')||'<p>Inga textsignaler i urvalet.</p>';
}

function renderSources(s){
 const query=$('#history-search').value.trim().toLocaleLowerCase('sv'),kind=$('#history-source-category').value,field=kind==='method'?'method_signals':'theme_signals';
 const rs=selectHistory(records,{...s,text:'all'}).filter(r=>(!query||[r.original_title,r.title_sv,r.authors].join(' ').toLocaleLowerCase('sv').includes(query))&&(kind==='all'||r[field].some(v=>signalId(v)===s[kind]))).sort((a,b)=>b.year-a.year||a.authors.localeCompare(b.authors,'sv'));
 $('#history-results-count').textContent=`Visar ${Math.min(shown,rs.length)} av ${rs.length} källposter i urvalet.`;
 $('#history-source-list').innerHTML=rs.slice(0,shown).map(r=>{
  const signals=kind==='all'?[...r.method_signals,...r.theme_signals].slice(0,5):r[field].filter(v=>signalId(v)===s[kind]);
  const translated=r.title_sv&&r.title_sv!==r.original_title;
  return `<article class="history-source-card ${r.university==='Lappland'?'lappland':''}"><p class="eyebrow">${esc(r.university)} / ${r.year}</p><p class="history-author">${esc(r.authors)}</p><h3 lang="${esc(r.language?.slice(0,2)||'und')}">${esc(r.original_title)}</h3>${translated?`<p class="translated-title"><span class="translation-label">Svensk titel · AI-översättning</span>${esc(r.title_sv)}</p>`:''}<p><a href="${esc(r.source_url)}" target="_blank" rel="noopener">${r.source_kind==='historical_catalogue'?'Läs källförteckningen · PDF-sida '+r.source_pdf_page:'Läs originalpost och tillgänglig fulltext'} ↗</a></p>${r.programme_confidence==='uncertain'?`<p class="preliminary-label">Osäker utbildningstillhörighet. ${esc(r.programme_caution_sv)}</p>`:''}<p class="chart-note">${r.original_abstract?.trim()?'Abstrakt finns i datamaterialet.':'Inget abstrakt kunde hämtas; inga metodsignaler har tilldelats.'} Utbildningsuppgift: ${esc(r.programme||r.programme_verification||'se källposten')}.</p>${signals.length?'<details><summary>Granska kodningens originalutdrag</summary>'+signals.map(sig=>`<div class="history-evidence"><strong>${esc(sig.label)}</strong><small>${sig.field==='abstract'?'Originalabstrakt':'Titel, ämnesord eller abstrakt'} · automatisk textsignal</small><blockquote lang="${esc(r.abstract_language?.slice(0,2)||r.language?.slice(0,2)||'und')}">${esc(sig.evidence)}</blockquote></div>`).join('')+'</details>':`<p class="chart-note">${r.source_kind==='historical_catalogue'?'Ingen textkodning görs av det ämnesvalda äldre källförteckningsmaterialet.':'Inga signaler identifierades av kodreglerna.'}</p>`}</article>`;
 }).join('')||'<p class="scope-empty">Inga källposter matchar detta urval.</p>';
 $('#history-more').hidden=shown>=rs.length;
}
