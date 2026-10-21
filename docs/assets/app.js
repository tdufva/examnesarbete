import {aggregate, selectRecords, methodComparison} from './aggregate.mjs?v=2026-2';
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const collator = new Intl.Collator('sv', {sensitivity:'base', numeric:true});
const num = n => new Intl.NumberFormat('sv-SE', {maximumFractionDigits:1}).format(n);
const university = u => u==='Aalto' ? 'Aalto-universitetet' : 'Lapplands universitet';
const language = lang => ({fi:'finska',fin:'finska',en:'engelska',eng:'engelska',sv:'svenska',swe:'svenska',und:'inte angivet i källan'}[lang] || lang);
const fold = t => String(t??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const qp = params => './?'+new URLSearchParams(params).toString();
let records=[],metadata={};
const accessText=r=>r.pdf_status==='temporarily_unverified'?'PDF-åtkomst ej verifierad':r.open_pdf?'Öppen PDF':'Ingen öppen PDF';

try {
  const response = await fetch('data/theses.json');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const dataset=await response.json();records=dataset.records;metadata=dataset.metadata;
  if(document.body.dataset.page==='catalogue') catalogue();
  else analysis();
} catch(error) {
  const target=$('#results') || $('#insights');
  if(target)target.innerHTML='<p class="error-state">Materialet kunde inte laddas. Försök ladda om sidan, eller <a href="https://github.com/tdufva/examnesarbete/tree/main/docs/data">läs datamaterialet på GitHub</a>.</p>';
  if($('#result-count'))$('#result-count').textContent='Ett fel uppstod vid hämtningen.';
  console.error(error);
}

function catalogue(){
  const open=records.filter(r=>r.open_pdf).length;
  $('#year').insertAdjacentHTML('beforeend','<option value="common">Gemensamt verifierade år</option>'+metadata.years.map(y=>`<option value="${y}">${y}${metadata.partial_years.includes(y)?' (pågående)':''}</option>`).join(''));
  $('#hero-stats').innerHTML=[[records.length,'examensarbeten'],[2,'universitet'],[open,'med öppen PDF'],[records.length-open,'utan verifierad PDF']].map(([n,t])=>`<p class="stat"><strong>${n}</strong><span>${t}</span></p>`).join('');
  for(const [selector,key] of [['#method','primary_method'],['#theme','themes']]){
    const values=[...new Set(records.flatMap(r=>Array.isArray(r[key])?r[key]:[r[key]]))].filter(Boolean).sort(collator.compare);
    $(selector).insertAdjacentHTML('beforeend',values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join(''));
  }
  const params=new URLSearchParams(location.search);
  const keys=['search','university','year','method','theme','availability','verification','sort'];
  keys.forEach(k=>{if(params.has(k))$('#'+k).value=params.get(k);});
  const searchText=new Map(records.map(r=>[r.id,fold([r.original_title,r.title_sv,r.original_abstract,r.abstract_sv,r.authors,...r.keywords,...r.keywords_sv,r.topic_sv,r.primary_method,...r.themes].join(' '))]));
  function render(){
    const search=fold($('#search').value.trim()),uni=$('#university').value,year=$('#year').value,method=$('#method').value,theme=$('#theme').value,access=$('#availability').value,verification=$('#verification').value;
    const terms=search.split(/\s+/).filter(Boolean);
    const filtered=records.filter(r=>(!uni||r.university===uni)&&(!year||(year==='common'?commonYears().includes(r.year):r.year===Number(year)))&&(!method||r.primary_method===method)&&(!theme||r.themes.includes(theme))&&(!access||(access==='open'?r.open_pdf:!r.open_pdf))&&(verification!=='confirmed'||r.programme_status!=='inferred_from_metadata')&&terms.every(t=>searchText.get(r.id).includes(t)));
    const sort=$('#sort').value;
    filtered.sort((a,b)=>sort==='year-asc'?a.year-b.year||collator.compare(a.authors,b.authors):sort==='university'?collator.compare(a.university,b.university)||b.year-a.year||collator.compare(a.authors,b.authors):sort==='title'?collator.compare(a.original_title,b.original_title):sort==='author'?collator.compare(a.authors,b.authors):b.year-a.year||collator.compare(a.university,b.university)||collator.compare(a.authors,b.authors));
    const warning=coverageMessage(year,uni||'both');$('#catalogue-coverage-warning').hidden=!warning;$('#catalogue-coverage-warning').innerHTML=warning;
    $('#result-count').textContent=`Visar ${filtered.length} av ${records.length} arbeten · ${filtered.filter(r=>r.open_pdf).length} med öppen PDF`;
    $('#results').innerHTML=filtered.length?filtered.map(card).join(''):'<div class="empty-state"><h3>Inga arbeten matchar ditt urval.</h3><p>Prova ett annat sökord eller rensa något av filtren.</p></div>';
    const url=new URL(location.href);url.search='';keys.forEach(k=>{const value=$('#'+k).value;if(value && !(k==='sort'&&value==='year-desc'))url.searchParams.set(k,value);});
    history.replaceState(null,'',url);
  }
  $('#filters').addEventListener('submit',e=>e.preventDefault());
  $('#filters').addEventListener('input',render);$('#sort').addEventListener('change',render);
  $('#reset').addEventListener('click',()=>{$('#filters').reset();$('#sort').value='year-desc';render();});
  $('#results').addEventListener('click',e=>{const button=e.target.closest('[data-work]');if(button)openWork(button.dataset.work);});
  const dialog=$('#work-dialog');
  $('.close-dialog').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{const url=new URL(location.href);url.hash='';history.replaceState(null,'',url);});
  function hashOpen(){const id=new URLSearchParams(location.hash.slice(1)).get('arbete');if(id&&records.some(r=>r.id===id))openWork(id);}
  window.addEventListener('hashchange',hashOpen);
  render();hashOpen();
}

function card(r){
  const translated=fold(r.title_sv)!==fold(r.original_title);
  return `<article class="work-card ${r.university==='Lappland'?'lappland':''}"><div class="card-meta"><span><i class="university-dot" aria-hidden="true"></i>${esc(r.university==='Aalto'?'Aalto':'Lappland')}</span><span>${r.year}</span></div><h3 lang="${esc(r.language.slice(0,2))}">${esc(r.original_title)}</h3>${translated?`<p class="translated-title"><span class="translation-label">Svensk översättning · AI</span>${esc(r.title_sv)}</p>`:''}<p class="card-author">${esc(r.authors)}</p>${r.programme_status==='inferred_from_metadata'?'<p class="preliminary-label">Utbildningstillhörighet preliminär</p>':''}<p class="topic-line">${esc(r.topic_sv)}</p><div><span class="method-chip">${esc(r.primary_method)}</span></div><div class="card-bottom"><button class="read-button" type="button" data-work="${esc(r.id)}" aria-label="Läs abstrakt och metoder: ${esc(r.original_title)}">Abstrakt & metoder <span aria-hidden="true">↗</span></button><span class="access-label ${r.open_pdf?'':'closed'}">${esc(accessText(r))}</span></div></article>`;
}

function openWork(id){
  const r=records.find(r=>r.id===id);if(!r)return;
  const isSwedish=r.abstract_language?.startsWith('sv');
  const titleTranslated=fold(r.title_sv)!==fold(r.original_title);
  const basisName=m=>m.basis==='pdf'?`PDF, sida ${m.pdf_page} i filen`:'Författarens abstrakt';
  const kinds={design:'Forskningsdesign',insamling:'Datainsamling',analys:'Analys',perspektiv:'Teoretiskt perspektiv'};
  $('#dialog-body').innerHTML=`<p class="eyebrow">${esc(university(r.university))} / ${r.year}</p><h2 id="dialog-title" lang="${esc(r.language.slice(0,2))}">${esc(r.original_title)}</h2>${titleTranslated?`<div class="dialog-title-sv"><span class="translation-label">Svensk översättning · AI</span>${esc(r.title_sv)}</div>`:''}<div class="dialog-meta"><span>${esc(r.authors)}</span><span>Arbetets språk: ${esc(language(r.language))}</span><span>${esc(accessText(r))}</span></div><div class="source-actions"><a href="${esc(r.source_url)}" target="_blank" rel="noopener">Originalpost i arkivet ↗</a>${r.metadata_source_url?`<a href="${esc(r.metadata_source_url)}" target="_blank" rel="noopener">Källpost i Aalto Primo ↗</a>`:''}${r.pdf_urls.map((u,i)=>`<a href="${esc(u)}" target="_blank" rel="noopener">${r.pdf_urls.length>1?'PDF '+(i+1):'Öppna PDF'} ↗</a>`).join('')}</div>${r.pdf_status==='temporarily_unverified'?'<p class="notice">Aaltodoc var otillgängligt vid kontrollen. Posten hämtades från Aalto Primo. PDF-länk och öppen tillgång kunde inte verifieras; detta betyder inte att fulltexten är stängd.</p>':''}${r.programme_verification_sv?`<p class="method-note">${esc(r.programme_verification_sv)}</p>`:''}<section class="detail-section"><h3>Abstrakt</h3><div class="abstract-block"><p class="language-label">Original · ${esc(language(r.abstract_language))}</p><div class="abstract-text abstract-original" lang="${esc(r.abstract_language.slice(0,2))}">${esc(r.original_abstract||'Abstraktet kunde inte hämtas från den offentliga källposten. Se originalposten för tillgängliga uppgifter.')}</div></div>${!isSwedish?`<div class="abstract-block"><p class="language-label">Svenska · ${r.translation_kind==='original_sv'?'författarens befintliga svenska abstrakt':'AI-översättning, inte författargranskad'}</p><div class="abstract-text">${esc(r.abstract_sv||'Svensk översättning saknas eftersom inget fullständigt originalabstrakt var tillgängligt.')}</div></div>`:''}</section><section class="detail-section"><h3>Nyckelord</h3><p class="keyword-group" lang="${esc(r.language.slice(0,2))}"><strong>Original från arkivet</strong>${r.keywords.map(esc).join(' · ')||(r.keywords_status==='retrieved'?'Nyckelord saknas i arkivposten.':'Nyckelorden kunde inte hämtas från den offentliga postvyn.')}</p><p class="keyword-group"><strong>Svenska · AI-översättning</strong>${r.keywords_sv.map(esc).join(' · ')||'Inga nyckelord att översätta.'}</p></section><section class="detail-section"><h3>Metoder och belägg</h3><p class="language-label">Kodad huvuddesign: ${esc(r.primary_method)}</p>${r.methods.length?r.methods.map(m=>`<div class="method-evidence"><strong>${esc(m.label)}</strong><small>${esc(kinds[m.kind]||m.kind)} · ${m.basis==='pdf'&&r.method_pdf_url?`<a href="${esc(r.method_pdf_url)}#page=${m.pdf_page}" target="_blank" rel="noopener">${esc(basisName(m))} ↗</a>`:esc(basisName(m))} · parafras</small><p>${esc(m.evidence_sv)}</p></div>`).join(''):'<p>Forskningsmetoden kunde inte fastställas i det tillgängliga underlaget.</p>'}<p class="method-note">${esc(r.method_note_sv)} Metodkodningen är AI-assisterad; den är inte författarens godkännande av vår klassificering.</p></section><section class="detail-section"><h3>Teman i vår läsning</h3><p class="muted">Överlappande, tolkade kategorier. Skilda från författarens nyckelord.</p><div class="theme-tags">${r.themes.map(t=>`<a href="${esc(qp({theme:t}))}">${esc(t)} →</a>`).join('')}</div></section><section class="detail-section"><p class="permalink">Permanent länk: <a href="#arbete=${encodeURIComponent(r.id)}">detta examensarbete</a> · <a href="https://github.com/tdufva/examnesarbete/issues/new?template=korrigering.yml&title=${encodeURIComponent('Korrigering: '+r.original_title)}">föreslå en korrigering</a></p><p class="permalink">Metadata: universitetsarkivet. Originalets rättigheter: ${esc(r.rights?.join(' · ')||'se arkivposten')}. Länkarna leder till originalutgivaren; PDF-filer återpubliceras inte här.</p></section>`;
  const dialog=$('#work-dialog');if(!dialog.open)dialog.showModal();
  dialog.scrollTop=0;
  const url=new URL(location.href);url.hash='arbete='+encodeURIComponent(r.id);history.replaceState(null,'',url);
}

function rankRows(rows,total,key,limit=99,context={}){
  const max=Math.max(1,...rows.map(r=>r.count));
  return rows.slice(0,limit).map(r=>`<div class="rank-row"><div><span class="rank-label">${key?`<a href="${esc(qp({...context,[key]:r.label}))}">${esc(r.label)}</a>`:esc(r.label)}</span><div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${r.count/max*100}%"></div></div></div><span class="rank-value">${r.count}<br><span class="muted">${num(r.count/total*100)} %</span></span></div>`).join('');
}


function commonYears(){
  return metadata.years.filter(y=>['Aalto','Lappland'].every(u=>(metadata.coverage?.cohorts||[]).some(c=>c.year===y&&c.university===u&&c.status.startsWith('verified'))));
}
function chosenYears(year){return year==='common'?commonYears():year?[Number(year)]:metadata.years;}
function coverageMessage(year,selection='both'){
  const years=chosenYears(year),universities=selection==='both'?['Aalto','Lappland']:[selection];
  const messages=[];
  if(years.some(y=>metadata.partial_years.includes(y)))messages.push('<strong>2026 är en pågående årgång.</strong> Materialet visar poster som kunde verifieras senast 21 oktober 2026; det är inte ett helt års produktion.');
  const incomplete=(metadata.coverage?.cohorts||[]).filter(c=>years.includes(c.year)&&universities.includes(c.university)&&!c.status.startsWith('verified'));
  for(const c of incomplete)messages.push(`<strong>${esc(university(c.university))}, ${c.year}:</strong> ${esc(c.note_sv)} Avsaknad av inhämtade poster betyder inte att inga arbeten finns.`);
  for(const notice of metadata.coverage?.notices||[])if((!notice.years||notice.years.some(y=>years.includes(y)))&&(!notice.university||universities.includes(notice.university)))messages.push(esc(notice.text_sv));
  return messages.map(m=>`<p>${m}</p>`).join('');
}

function renderMethodSection(selected,view,context,period){
  const comparison=methodComparison(selected,view),averageOnly=view==='average',showAverage=averageOnly||view==='both-average';
  const denominators=comparison.groups.map(g=>`${university(g.university)} n = ${g.total}`).join(' · ');
  const available=comparison.groups.every(g=>g.total>0);
  $('#method-selection-summary').textContent=`${period} · ${denominators}. `+(showAverage?(available?'Medelvärde = (Aaltos andel + Lapplands andel) / 2. Universiteten väger lika oavsett antal arbeten.':'Medelvärdet kan inte beräknas: ett eller båda universiteten saknar poster i urvalet. Ett saknat underlag räknas inte som 0 %.'):'Andel av arbetena inom respektive universitet. Varje stapel visar även antal och nämnare.');
  const key=(averageOnly?'':comparison.groups.map(g=>`<span><i class="swatch ${g.university==='Lappland'?'lappland':''}"></i>${university(g.university)} (n = ${g.total})</span>`).join(''))+(showAverage?'<span><i class="swatch average"></i>Gemensamt medelvärde · lika vikt</span>':'');
  $('#method-key').innerHTML=key;
  const valueText=v=>v.percent===null?'—':`${num(v.percent)} % <span class="muted">(${v.count}/${v.total})</span>`;
  const averageBar=row=>`<div class="bar-line" aria-label="Gemensamt medelvärde: ${row.average===null?'kan inte beräknas':num(row.average)+' procent'}"><div class="bar-track" aria-hidden="true"><div class="bar-fill average" style="width:${row.average??0}%"></div></div><span class="bar-value">${row.average===null?'—':num(row.average)+' %'}</span></div>`;
  const universityBars=row=>row.values.map(v=>`<div class="bar-line" aria-label="${esc(university(v.university))}: ${v.percent===null?'inget underlag':`${v.count} av ${v.total}, ${num(v.percent)} procent`}"><div class="bar-track" aria-hidden="true"><div class="bar-fill ${v.university==='Lappland'?'lappland':''}" style="width:${v.percent??0}%"></div></div><span class="bar-value">${valueText(v)}</span></div>`).join('');
  const charts=(rows,linkKey,limit=Infinity)=>rows.length?rows.slice(0,limit).map(row=>`<div class="comparison-row"><span class="comparison-label">${linkKey?`<a href="${esc(qp({...context,[linkKey]:row.label}))}">${esc(row.label)}</a>`:esc(row.label)}</span><div class="bar-pair">${averageOnly?'':universityBars(row)}${showAverage?averageBar(row):''}</div></div>`).join(''):'<p class="scope-empty">Inga metoduppgifter i det valda urvalet.</p>';
  const table=(rows,caption)=>'<table><caption>'+caption+'</caption><thead><tr><th scope="col">Metod</th>'+comparison.groups.map(g=>`<th scope="col">${g.university} (n = ${g.total})</th>`).join('')+(showAverage?'<th scope="col">Medelvärde · lika vikt</th>':'')+'</tr></thead><tbody>'+rows.map(row=>`<tr><th scope="row">${esc(row.label)}</th>${row.values.map(v=>`<td>${valueText(v)}</td>`).join('')}${showAverage?`<td>${row.average===null?'—':num(row.average)+' %'}</td>`:''}</tr>`).join('')+'</tbody></table>';
  $('#method-chart').innerHTML=charts(comparison.primary_methods,'method');
  $('#technique-chart').innerHTML=charts(comparison.techniques,null,10)+(comparison.techniques.length>10?'<p class="chart-note">De tio vanligaste visas i diagrammet. Tabellen nedan innehåller alla metoder i urvalet.</p>':'');
  $('#method-university-table').innerHTML=table(comparison.primary_methods,'En huvuddesign per arbete; andelar inom universitetets valda urval');
  $('#technique-university-table').innerHTML=table(comparison.techniques,'Insamling och analys; varje metod räknas högst en gång per arbete. Flera metoder kan förekomma.');
}

function analysis(){
  const params=new URLSearchParams(location.search);
  $('#analysis-year').insertAdjacentHTML('beforeend',metadata.years.map(y=>`<option value="${y}">${y}${metadata.partial_years.includes(y)?' (pågående)':''}</option>`).join(''));
  for(const [key,id] of [['year','analysis-year'],['university','analysis-university'],['availability','analysis-access'],['compare','comparison-kind'],['verification','analysis-verification']])if(params.has(key))$('#'+id).value=params.get(key);
  if(!$('#analysis-university').value)$('#analysis-university').value='both';
  if(!$('#comparison-kind').value)$('#comparison-kind').value='themes';
  if(!$('#analysis-verification').value)$('#analysis-verification').value='confirmed';
  let metric=params.get('metric')==='count'?'count':'percent';
  $('#method-view').value=['average','both-average'].includes(params.get('methodView'))&&$('#analysis-university').value==='both'?params.get('methodView'):$('#analysis-university').value;
  function render(){
    const year=$('#analysis-year').value,uni=$('#analysis-university').value,access=$('#analysis-access').value,kind=$('#comparison-kind').value,verification=$('#analysis-verification').value;
    const selected=selectRecords(records,{year,university:uni,availability:access,verification,commonYears:commonYears()});
    const a=aggregate(selected),universities=uni==='both'?['Aalto','Lappland']:[uni];
    const period=year==='common'?commonYears().join(', '):year||`${metadata.years[0]}–${metadata.years[metadata.years.length-1]}`;
    const context={...(year?{year}:{}),...(uni!=='both'?{university:uni}:{}),...(access?{availability:access}:{}),verification};
    $('#analysis-selection-summary').textContent=`${a.total} av ${records.length} arbeten · ${period} · ${a.open} med öppen PDF${verification==='confirmed'?' · preliminära poster uteslutna':''}`;
    $('#analysis-sample-size').textContent=`${a.total} arkivposter i det valda urvalet`;
    const warning=coverageMessage(year,uni);$('#analysis-coverage-warning').hidden=!warning;$('#analysis-coverage-warning').innerHTML=warning;
    const topMethod=a.primary_methods[0],topTheme=a.themes[0],topKeyword=a.keywords[0];
    $('#insights').innerHTML=!a.total?'<p class="scope-empty">Inga verifierade poster i detta urval. Kontrollera täckningsinformationen ovan eller välj ett annat år.</p>':[
      ['Vanligaste huvuddesign',`${topMethod.count} / ${a.total}`,topMethod.label,`${num(topMethod.count/a.total*100)} % av urvalet. En huvudkategori per post.`],
      ['Mest förekommande temakod',`${topTheme.count} / ${a.total}`,topTheme.label,'Ett tolkat, överlappande tema – inte ett exakt författarvalt ämnesord.'],
      ['Vanligaste nyckelord',topKeyword?`${topKeyword.count} arbeten`:'—',topKeyword?.label||'Inga nyckelord i urvalet','Författarnas ord i svensk översättning. Synonymer hålls isär.']
    ].map(([k,n,t,p])=>`<article class="insight"><p class="insight-kicker">${esc(k)}</p><p class="insight-number">${esc(n)}</p><h3>${esc(t)}</h3><p>${esc(p)}</p></article>`).join('');
    $('#university-readings').innerHTML=universities.map(u=>{
      const g=a.universities[u],lead=g.themes.slice(0,2),method=g.primary_methods[0];
      return `<article><h3>${university(u)} · ${g.total} arbeten</h3>${g.total?`<p>I vår kodning är ${lead.map(t=>`<strong>${esc(t.label.toLowerCase())}</strong> (${t.count}/${g.total})`).join(' och ')} de vanligaste temana. Den vanligaste huvuddesignen är <strong>${esc(method.label.toLowerCase())}</strong> (${method.count}/${g.total}, ${num(method.count/g.total*100)} %).</p>`:'<p>Inga verifierade poster i detta urval. Läs informationen om täckning ovan.</p>'}<p class="scope-note">${esc(period)} · ${access?'endast poster med öppen PDF':'alla arkivposter'}. Mönstren beskriver det valda materialet; de förklarar inte orsaker till skillnader.</p></article>`;
    }).join('');
    $('#comparison-title').textContent=(uni==='both'?'Jämför universiteten: ':'Urvalet: ')+(kind==='methods'?'huvudmetoder.':'teman.');
    $$('[data-metric]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.metric===metric)));
    const rows=(kind==='methods'?a.primary_methods:a.themes).slice(0,12);
    const countFor=(g,label)=>kind==='methods'?(g.primary_methods.find(m=>m.label===label)?.count||0):(g.theme_counts[label]||0);
    const max=metric==='percent'?100:Math.max(1,...rows.flatMap(t=>universities.map(u=>countFor(a.universities[u],t.label))));
    $('#comparison-chart').innerHTML='<div class="compare-key">'+universities.map(u=>`<span><i class="swatch ${u==='Lappland'?'lappland':''}"></i>${university(u)} (n = ${a.universities[u].total})</span>`).join('')+'</div>'+rows.map(t=>`<div class="comparison-row"><a class="comparison-label" href="${esc(qp({...context,[kind==='methods'?'method':'theme']:t.label}))}">${esc(t.label)}</a><div class="bar-pair">${universities.map(u=>{const g=a.universities[u],n=countFor(g,t.label),percent=g.total?n/g.total*100:0,value=metric==='percent'?percent:n;return `<div class="bar-line" aria-label="${esc(university(u))}: ${g.total?`${n} av ${g.total}, ${num(percent)} procent`:'inga verifierade poster'}"><div class="bar-track" aria-hidden="true"><div class="bar-fill ${u==='Lappland'?'lappland':''}" style="width:${value/max*100}%"></div></div><span class="bar-value">${g.total?(metric==='percent'?num(percent)+' %':n+' st.'):'—'} <span class="muted">(${n}/${g.total})</span></span></div>`;}).join('')}</div></div>`).join('');
    $('#comparison-denominators').textContent=`Andelar beräknas inom varje universitet i urvalet: ${universities.map(u=>`${university(u)} n = ${a.universities[u].total}`).join(', ')}. ${kind==='methods'?'En huvuddesign räknas per arbete.':'Temakoderna överlappar; summan kan överstiga 100 %.'} En grupp utan verifierade poster visas med ett streck, inte med 0 %.`;
    $('#year-table').innerHTML='<table><caption>Arkivposter och öppen tillgång i det valda urvalet</caption><thead><tr><th scope="col">Universitet</th><th scope="col">År</th><th scope="col">Arbeten</th><th scope="col">Öppen PDF</th><th scope="col">Ingen verifierad öppen PDF</th></tr></thead><tbody>'+a.by_year.filter(g=>universities.includes(g.university)).map(g=>`<tr><th scope="row">${university(g.university)}</th><td>${g.year}${metadata.partial_years.includes(g.year)?' *':''}</td><td>${g.total}</td><td>${g.open}</td><td>${g.total-g.open}</td></tr>`).join('')+'</tbody></table>';
    renderMethodSection(selected,$('#method-view').value,context,period);
    $('#theme-chart').innerHTML=rankRows(a.themes,a.total,'theme',99,context);
    $('#keyword-list').innerHTML=a.keywords.slice(0,24).map(k=>`<a href="${esc(qp({...context,search:k.label}))}">${esc(k.label)}<span>${k.count}</span></a>`).join('');
    $('#method-coverage').innerHTML=`<strong>Källunderlaget är olika stort.</strong> ${a.method_coverage.with_pdf_evidence} arbeten har metodbelägg från ett utvalt PDF-avsnitt; ${a.method_coverage.abstract_only} har belägg enbart från abstrakt. För ${a.method_coverage.no_methods} saknas tillräckligt metodbelägg. Källorna är inte en systematisk fulltextgranskning.`;
    $('#access-chart').innerHTML=universities.map(u=>{const g=a.universities[u];return `<div class="access-row ${u==='Lappland'?'lappland':''}"><p class="access-name"><strong>${university(u)}</strong><span>${g.total?`${g.open}/${g.total} öppna · ${num(g.open/g.total*100)} %`:'Inget verifierat urval'}</span></p><div class="access-track" role="img" aria-label="${g.open} av ${g.total} har verifierad eller arkivmarkerad öppen PDF"><span style="width:${g.total?g.open/g.total*100:0}%"></span></div></div>`;}).join('')+'<p class="access-legend">Färgad yta = verifierad eller arkivmarkerad öppen PDF · sandfärgad yta = ingen verifierad öppen PDF. Tillfälliga servicefel redovisas i täckningsinformationen.</p>';
    const url=new URL(location.href);url.search='';for(const [key,value] of Object.entries({year,university:uni==='both'?'':uni,availability:access,compare:kind==='themes'?'':kind,metric:metric==='percent'?'':metric,verification:verification==='confirmed'?'':verification,methodView:['average','both-average'].includes($('#method-view').value)?$('#method-view').value:''}))if(value)url.searchParams.set(key,value);history.replaceState(null,'',url);
  }
  $('#analysis-filters').addEventListener('submit',e=>e.preventDefault());
  $('#analysis-filters').addEventListener('change',e=>{if(e.target.id==='analysis-university')$('#method-view').value=e.target.value;render();});
  $('#method-view').addEventListener('change',()=>{$('#analysis-university').value=['average','both-average'].includes($('#method-view').value)?'both':$('#method-view').value;render();$('#analysis-status').textContent='Metoddiagram och tabeller har uppdaterats.';});
  $('#analysis-reset').addEventListener('click',()=>{$('#analysis-filters').reset();$('#method-view').value='both';metric='percent';render();});
  $$('[data-metric]').forEach(b=>b.addEventListener('click',()=>{metric=b.dataset.metric;render();$('#analysis-status').textContent=metric==='percent'?'Diagrammen visar andelar i det valda urvalet.':'Diagrammen visar antal i det valda urvalet.';}));
  render();
}
